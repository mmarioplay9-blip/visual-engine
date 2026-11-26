import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { ensureDir, newRunDir } from './paths.js';
import { startStatic, type StaticServer } from './static.js';

/**
 * Visual Debugger 0.5.
 *
 * Inspecciona el DOM renderizado, no una suposición. Devuelve selectores,
 * regiones, propiedades CSS, capas, animaciones y una correspondencia con el
 * código fuente sólo cuando la cadena aparece de verdad en un archivo del
 * proyecto. Esa correspondencia se marca `verified`; si no se encuentra, el
 * elemento queda sin archivo fuente en lugar de inventarlo.
 */

export interface SourceLocation {
  file: string;
  line: number;
  match: string;
  confidence: number;
  status: 'verified' | 'estimated';
}

export interface DebugElement {
  selector: string;
  tag: string;
  role: string | null;
  text: string;
  box: { x: number; y: number; width: number; height: number };
  region: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  classes: string[];
  id: string | null;
  effects: string[];
  motion: string | null;
  contrast: number | null;
  styles: {
    display: string;
    visibility: string;
    opacity: number;
    position: string;
    zIndex: string;
    color: string;
    backgroundColor: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: string;
    letterSpacing: string;
    borderRadius: string;
    boxShadow: string;
    filter: string;
    backdropFilter: string;
    transform: string;
    transition: string;
    animation: string;
    overflow: string;
  };
  source: SourceLocation | null;
}

export interface DebugAnimation {
  name: string;
  target: string | null;
  duration: number;
  delay: number;
  easing: string;
  iterations: number | typeof Infinity;
  playState: string;
  source: SourceLocation | null;
}

export interface DomSnapshot {
  url: string;
  title: string;
  viewport: { width: number; height: number };
  reducedMotion: boolean;
  scroll: { width: number; height: number; overflowX: number; overflowY: number };
  elements: DebugElement[];
  animations: DebugAnimation[];
  canvases: { selector: string; width: number; height: number; effect: string | null }[];
  brokenImages: { selector: string; src: string; alt: string }[];
  buttonsWithoutName: { selector: string; html: string }[];
  imagesWithoutAlt: { selector: string; src: string }[];
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  counts: {
    elements: number;
    headings: number;
    buttons: number;
    links: number;
    images: number;
    canvases: number;
    effects: number;
    layers: number;
    materials: number;
    transitions: number;
    animations: number;
  };
  contrast: { checked: number; violations: number; worst: number; average: number };
  sourceIndex: { files: number; bytes: number; truncated: boolean };
  warnings: string[];
  screenshot?: string;
}

export interface InspectDomOptions {
  target: string;
  targetDir?: string;
  width?: number;
  height?: number;
  waitMs?: number;
  timeoutMs?: number;
  outDir?: string;
  sourceRoot?: string;
  screenshot?: boolean;
}

interface SourceFile {
  file: string;
  text: string;
}

const SOURCE_EXT = new Set(['.html', '.htm', '.css', '.scss', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.astro']);
const SOURCE_SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.visual-engine', '.next', '.nuxt']);

function walkSource(root: string, maxFiles = 500, maxBytes = 2_000_000): { files: SourceFile[]; bytes: number; truncated: boolean } {
  const files: SourceFile[] = [];
  let bytes = 0;
  let truncated = false;
  const visit = (dir: string) => {
    if (files.length >= maxFiles || bytes >= maxBytes) {
      truncated = true;
      return;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles || bytes >= maxBytes) {
        truncated = true;
        return;
      }
      if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SOURCE_SKIP.has(entry.name)) visit(full);
      } else if (SOURCE_EXT.has(path.extname(entry.name).toLowerCase())) {
        try {
          const stat = fs.statSync(full);
          if (stat.size > 500_000) continue;
          const text = fs.readFileSync(full, 'utf8');
          files.push({ file: full, text });
          bytes += stat.size;
        } catch {
          /* archivo no legible: no se inventa correspondencia */
        }
      }
    }
  };
  visit(root);
  return { files, bytes, truncated };
}

function findSource(files: SourceFile[], root: string, tokens: string[]): SourceLocation | null {
  const useful = tokens.map((t) => t.trim()).filter((t) => t.length >= 3);
  for (const token of useful) {
    for (const entry of files) {
      const idx = entry.text.indexOf(token);
      if (idx < 0) continue;
      const line = entry.text.slice(0, idx).split('\n').length;
      return {
        file: path.relative(root, entry.file).replace(/\\/g, '/'),
        line,
        match: token.slice(0, 120),
        confidence: 0.9,
        status: 'verified',
      };
    }
  }
  return null;
}

function toUrl(target: string): string {
  if (/^https?:\/\//i.test(target) || /^file:\/\//i.test(target)) return target;
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) throw new Error(`No existe el destino: ${abs}`);
  return new URL(`file:///${abs.replace(/\\/g, '/')}`).href;
}

/** Inspecciona el DOM real de una página local o remota. */
export async function inspectDom(opts: InspectDomOptions): Promise<DomSnapshot> {
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const outDir = opts.outDir ? ensureDir(opts.outDir) : newRunDir('debug');
  let server: StaticServer | undefined;
  let target = opts.target;
  if (opts.targetDir) {
    server = await startStatic(opts.targetDir);
    target = `${server.url}${opts.target.replace(/^\/+/, '')}`;
  }
  const url = toUrl(target);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-dev-shm-usage'],
    });
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
    });
    page.on('pageerror', (err) => pageErrors.push(err.message.slice(0, 500)));
    page.on('requestfailed', (req) => {
      requestFailures.push(`${req.url().slice(0, 180)} (${req.failure()?.errorText ?? 'fallo'})`);
    });
    const resp = await page.goto(url, { waitUntil: 'load', timeout: opts.timeoutMs ?? 45_000 });
    if (resp && resp.status() >= 400) requestFailures.push(`HTTP ${resp.status()} en ${url}`);
    await page.waitForFunction(() => (window as any).__veReady === true, undefined, { timeout: 4000 }).catch(() => undefined);
    await page.waitForTimeout(opts.waitMs ?? 700);

    const data: any = await page.evaluate(() => {
      const MAX_ELEMENTS = 220;
      const cssEscape = (value: string) => {
        const escape = (window as any).CSS?.escape as ((v: string) => string) | undefined;
        return escape ? escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
      };
      const selector = (el: Element): string => {
        if (el.id) return `#${cssEscape(el.id)}`;
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && node.nodeType === 1 && parts.length < 4) {
          let part = node.tagName.toLowerCase();
          const classes = Array.from(node.classList).slice(0, 2);
          if (classes.length) part += `.${classes.map(cssEscape).join('.')}`;
          if (node.parentElement) {
            const same = Array.from(node.parentElement.children).filter((c) => c.tagName === node!.tagName);
            if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
          }
          parts.unshift(part);
          node = node.parentElement;
        }
        return parts.join(' > ');
      };
      const parse = (value: string): number[] => {
        const m = value.match(/rgba?\(([^)]+)\)/);
        if (!m) return [0, 0, 0, 0];
        const parts = m[1].split(',').map((v) => Number(v.trim()));
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
      };
      const lum = (rgb: number[]) => {
        const c = rgb.slice(0, 3).map((v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const bgOf = (el: Element): number[] => {
        let node: Element | null = el;
        while (node) {
          const c = parse(getComputedStyle(node).backgroundColor);
          if ((c[3] ?? 1) > 0.2) return c;
          node = node.parentElement;
        }
        return [5, 7, 13, 1];
      };
      const contrastOf = (el: Element): number | null => {
        const style = getComputedStyle(el);
        const fg = parse(style.color);
        if ((fg[3] ?? 0) < 0.1) return null;
        const a = lum(fg), b = lum(bgOf(el));
        return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
      };
      const regionOf = (r: DOMRect): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' => {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const hx = Math.abs(cx - window.innerWidth / 2) < window.innerWidth * 0.18;
        const hy = Math.abs(cy - window.innerHeight / 2) < window.innerHeight * 0.18;
        if (hx && hy) return 'center';
        return `${cy >= window.innerHeight / 2 ? 'bottom' : 'top'}-${cx >= window.innerWidth / 2 ? 'right' : 'left'}` as any;
      };
      const nodes = Array.from(document.querySelectorAll('body *')).filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
      });
      const priority = (el: Element): number => {
        const tag = el.tagName;
        if (/^(H1|H2|H3|BUTTON|CANVAS)$/.test(tag)) return 100;
        if (el.hasAttribute('data-effect') || el.hasAttribute('data-motion')) return 95;
        if (/^(MAIN|HEADER|NAV|SECTION|ARTICLE|IMG|A)$/.test(tag)) return 70;
        if (el.classList.length) return 40;
        return 10;
      };
      nodes.sort((a, b) => priority(b) - priority(a));
      const selected = nodes.slice(0, MAX_ELEMENTS);
      const elements = selected.map((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return {
          selector: selector(el),
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 140),
          box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
          region: regionOf(r),
          classes: Array.from(el.classList),
          id: el.id || null,
          effects: [el.getAttribute('data-effect') ?? '', ...Array.from(el.querySelectorAll('[data-effect]')).slice(0, 4).map((n) => n.getAttribute('data-effect') ?? '')].filter(Boolean),
          motion: el.getAttribute('data-motion'),
          contrast: contrastOf(el),
          styles: {
            display: s.display, visibility: s.visibility, opacity: Number(s.opacity), position: s.position, zIndex: s.zIndex,
            color: s.color, backgroundColor: s.backgroundColor, fontFamily: s.fontFamily, fontSize: Number.parseFloat(s.fontSize) || 0,
            fontWeight: Number(s.fontWeight) || 400, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
            borderRadius: s.borderRadius, boxShadow: s.boxShadow, filter: s.filter, backdropFilter: s.backdropFilter,
            transform: s.transform, transition: s.transition, animation: s.animation, overflow: s.overflow,
          },
        };
      });
      const animations = document.getAnimations().slice(0, 120).map((a) => {
        const effect = a.effect as KeyframeEffect | null;
        const timing = effect?.getTiming();
        const target = effect?.target as Element | null;
        // getTiming().easing es 'linear' para animaciones CSS: la curva real
        // vive en animation-timing-function / transition-timing-function.
        let easing = String(timing?.easing ?? 'linear');
        if (target) {
          const cs = getComputedStyle(target);
          if (a instanceof CSSAnimation) {
            const names = cs.animationName.split(',').map((s) => s.trim());
            const idx = Math.max(0, names.indexOf(a.animationName));
            const list = cs.animationTimingFunction.split(',').map((s) => s.trim());
            if (list[idx]) easing = list[idx];
          } else if (a instanceof CSSTransition) {
            const props = cs.transitionProperty.split(',').map((s) => s.trim());
            const idx = Math.max(0, props.indexOf(a.transitionProperty));
            const list = cs.transitionTimingFunction.split(',').map((s) => s.trim());
            if (list[idx]) easing = list[idx];
          }
        }
        return {
          name: (a as any).animationName ?? (a as any).transitionProperty ?? 'animation',
          target: target ? selector(target) : null,
          duration: typeof timing?.duration === 'number' ? timing.duration : 0,
          delay: typeof timing?.delay === 'number' ? timing.delay : 0,
          easing,
          iterations: timing?.iterations ?? 1,
          playState: a.playState,
        };
      });
      const canvases = Array.from(document.querySelectorAll('canvas')).map((c) => {
        const el = c as HTMLCanvasElement;
        return { selector: selector(el), width: el.width, height: el.height, effect: el.getAttribute('data-effect') };
      });
      const brokenImages = Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).map((img) => ({
        selector: selector(img), src: img.currentSrc || img.src, alt: img.alt,
      }));
      const buttonsWithoutName = Array.from(document.querySelectorAll('button,[role="button"]')).filter((el) => {
        const text = (el.textContent ?? '').trim();
        return !text && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title');
      }).map((el) => ({ selector: selector(el), html: (el as HTMLElement).outerHTML.slice(0, 180) }));
      const imagesWithoutAlt = Array.from(document.images).filter((img) => !img.alt && !img.getAttribute('aria-hidden')).map((img) => ({
        selector: selector(img), src: img.currentSrc || img.src,
      }));
      const textNodes = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,p,a,button,span,li,label,strong,em')).filter((el) => {
        const text = (el.textContent ?? '').trim();
        if (!text || text.length > 180) return false;
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) >= 0.1;
      });
      const contrasts = textNodes.map((el) => {
        const s = getComputedStyle(el);
        const size = Number.parseFloat(s.fontSize) || 0;
        const ratio = contrastOf(el);
        if (ratio === null) return null;
        const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
        return { ratio, required: large ? 3 : 4.5 };
      }).filter((v): v is { ratio: number; required: number } => v !== null && v.ratio > 0);
      const violationList = contrasts.filter((c) => c.ratio < c.required);
      return {
        elements, animations, canvases, brokenImages, buttonsWithoutName, imagesWithoutAlt,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        scroll: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          overflowY: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight),
        },
        counts: {
          elements: nodes.length,
          headings: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
          buttons: document.querySelectorAll('button,[role="button"]').length,
          links: document.querySelectorAll('a[href]').length,
          images: document.images.length,
          canvases: document.querySelectorAll('canvas').length,
          effects: document.querySelectorAll('[data-effect]').length,
          layers: Array.from(document.querySelectorAll('body *')).filter((el) => /absolute|fixed|sticky/.test(getComputedStyle(el).position)).length,
          materials: Array.from(document.querySelectorAll('body *')).filter((el) => {
            const s = getComputedStyle(el);
            return (s.boxShadow && s.boxShadow !== 'none') || (s.backdropFilter && s.backdropFilter !== 'none') || (s.filter && s.filter !== 'none') || Number.parseFloat(s.borderRadius) >= 8;
          }).length,
          transitions: Array.from(document.querySelectorAll('body *')).filter((el) => {
            const s = getComputedStyle(el);
            return (s.transitionDuration && s.transitionDuration !== '0s') || (s.animationName && s.animationName !== 'none');
          }).length,
          animations: document.getAnimations().length,
        },
        contrast: {
          checked: contrasts.length,
          violations: violationList.length,
          worst: contrasts.length ? Math.min(...contrasts.map((c) => c.ratio)) : 0,
          average: contrasts.length ? Math.round((contrasts.reduce((a, c) => a + c.ratio, 0) / contrasts.length) * 100) / 100 : 0,
        },
      };
    });

    const sourceRoot = path.resolve(opts.sourceRoot ?? opts.targetDir ?? process.cwd());
    const source = walkSource(sourceRoot);
    const elements: DebugElement[] = (data.elements as DebugElement[]).map((el) => {
      const tokens = [
        el.id ? `#${el.id}` : '',
        ...el.classes.map((c) => `.${c}`),
        ...el.effects.map((e) => `data-effect="${e}"`),
        el.motion ? `data-motion="${el.motion}"` : '',
      ].filter(Boolean);
      return { ...el, source: findSource(source.files, sourceRoot, tokens) };
    });
    const animations: DebugAnimation[] = (data.animations as DebugAnimation[]).map((a) => {
      const target = elements.find((el) => el.selector === a.target);
      return { ...a, source: target?.source ?? null };
    });
    let screenshot: string | undefined;
    if (opts.screenshot !== false) {
      screenshot = path.join(outDir, 'dom.png');
      await page.screenshot({ path: screenshot });
    }
    const warnings: string[] = [];
    if (source.truncated) warnings.push('El índice de fuentes se truncó por tamaño; puede faltar una correspondencia, no se inventa.');
    if (data.elements.length >= 220) warnings.push('Se inspeccionaron los 220 elementos prioritarios; no es un inventario exhaustivo del DOM.');
    const snapshot: DomSnapshot = {
      url,
      title: await page.title(),
      viewport: { width, height },
      reducedMotion: data.reducedMotion,
      scroll: data.scroll,
      elements,
      animations,
      canvases: data.canvases,
      brokenImages: data.brokenImages,
      buttonsWithoutName: data.buttonsWithoutName,
      imagesWithoutAlt: data.imagesWithoutAlt,
      consoleErrors,
      pageErrors,
      requestFailures,
      counts: data.counts,
      contrast: data.contrast,
      sourceIndex: { files: source.files.length, bytes: source.bytes, truncated: source.truncated },
      warnings,
      screenshot,
    };
    fs.writeFileSync(path.join(outDir, 'dom.json'), JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
    return snapshot;
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    await server?.close();
  }
}

export function describeDom(s: DomSnapshot): string[] {
  return [
    `DOM ${s.title || '(sin título)'} · ${s.counts.elements} elementos visibles, ${s.counts.headings} cabeceras, ${s.counts.buttons} botones.`,
    `Capas: ${s.counts.layers}; materiales: ${s.counts.materials}; animaciones: ${s.counts.animations}; efectos declarados: ${s.counts.effects}.`,
    `Contraste DOM: ${s.contrast.violations} incumplimiento(s) de ${s.contrast.checked}; peor ${s.contrast.worst}:1.`,
    `Overflow: ${s.scroll.overflowX}×${s.scroll.overflowY} px; imágenes rotas: ${s.brokenImages.length}; botones sin nombre: ${s.buttonsWithoutName.length}.`,
    `Código fuente indexado: ${s.sourceIndex.files} archivo(s)${s.sourceIndex.truncated ? ' (truncado)' : ''}.`,
    ...s.warnings.map((w) => `Límite: ${w}`),
  ];
}
