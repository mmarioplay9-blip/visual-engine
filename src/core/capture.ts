import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { analyzeSequence, type VisualProfile } from './analysis.js';
import { ensureDir, newRunDir } from './paths.js';

export interface CaptureOptions {
  /** URL http(s)://, file:// o ruta local a un HTML. */
  target: string;
  width?: number;
  height?: number;
  /** número de capturas (para analizar animación) */
  frames?: number;
  intervalMs?: number;
  /** espera inicial tras cargar, antes de la primera captura */
  waitMs?: number;
  outDir?: string;
  deviceScaleFactor?: number;
  fullPage?: boolean;
  timeoutMs?: number;
}

export interface AccessibilityAudit {
  checked: number;
  violations: number;
  averageContrast: number;
  worstContrast: number;
  samples: { text: string; contrast: number; fontSize: number; required: number }[];
  note: string;
}

export interface TypographyAudit {
  elements: number;
  headings: number;
  distinctSizes: number;
  averageFontSize: number;
  hierarchyRatio: number;
  note: string;
}

export interface CaptureResult {
  ok: boolean;
  url: string;
  outDir: string;
  frames: string[];
  errors: string[];
  consoleErrors: string[];
  profile?: VisualProfile;
  title: string;
  /** instante (ms) de cada captura, para medir fluidez y rendimiento reales */
  timings: number[];
  accessibility?: AccessibilityAudit;
  typography?: TypographyAudit;
}

function toUrl(target: string): string {
  if (/^https?:\/\//i.test(target) || /^file:\/\//i.test(target)) return target;
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) throw new Error(`No existe el destino: ${abs}`);
  return pathToFileURL(abs).href;
}

/**
 * Abre un proyecto real en Chromium, captura su estado visual y devuelve el perfil
 * medido. No simula nada: si la página falla, los errores salen en el resultado.
 */
export async function capture(opts: CaptureOptions): Promise<CaptureResult> {
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const frameCount = Math.max(1, opts.frames ?? 1);
  const intervalMs = opts.intervalMs ?? 400;
  const outDir = ensureDir(opts.outDir ?? newRunDir('captures'));
  const url = toUrl(opts.target);
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  const files: string[] = [];
  const timings: number[] = [];
  let title = '';
  let accessibility: AccessibilityAudit | undefined;
  let typography: TypographyAudit | undefined;
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--hide-scrollbars',
        '--force-color-profile=srgb',
        '--font-render-hinting=none',
        '--disable-dev-shm-usage',
      ],
    });
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: opts.deviceScaleFactor ?? 1,
      reducedMotion: 'no-preference',
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 500)}`));
    page.on('requestfailed', (req) => {
      const f = req.failure();
      errors.push(`recurso fallido: ${req.url().slice(0, 200)} (${f?.errorText ?? 'desconocido'})`);
    });

    const resp = await page.goto(url, { waitUntil: 'load', timeout: opts.timeoutMs ?? 45_000 });
    if (resp && resp.status() >= 400) errors.push(`HTTP ${resp.status()} en ${url}`);
    title = await page.title();

    // Señal opcional del proyecto para esperar a que termine su animación inicial.
    await page
      .waitForFunction(() => (window as any).__veReady === true, undefined, { timeout: 4000 })
      .catch(() => undefined);
    await page.waitForTimeout(opts.waitMs ?? 900);

    // Auditoría real en el DOM: contraste WCAG orientativo y jerarquía tipográfica.
    try {
      const audit: any = await page.evaluate(() => {
        const parse = (value: string): [number, number, number, number] => {
          const m = value.match(/rgba?\(([^)]+)\)/);
          if (!m) return [0, 0, 0, 0];
          const parts = m[1].split(',').map((x) => Number(x.trim()));
          return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
        };
        const lum = ([r, g, b]: [number, number, number, number]) => {
          const f = [r, g, b].map((v) => {
            const s = v / 255;
            return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
        };
        const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const background = (el: Element): [number, number, number, number] => {
          let node: Element | null = el;
          while (node) {
            const c = parse(getComputedStyle(node).backgroundColor);
            if (c[3] > 0.2) return c;
            node = node.parentElement;
          }
          return [5, 7, 13, 1];
        };
        const nodes = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,p,a,button,span,li,label,strong,em'));
        const samples: { text: string; contrast: number; fontSize: number; required: number }[] = [];
        let checked = 0, violations = 0, sum = 0, worst = 99;
        const sizes: number[] = [];
        let headings = 0;
        for (const el of nodes) {
          const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
          if (!text || text.length > 180) continue;
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.1) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) continue;
          const fg = parse(style.color);
          if (fg[3] < 0.1) continue;
          // Texto con recorte de fondo (degradados) no tiene un color sólido medible.
          if (style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') continue;
          const size = Number.parseFloat(style.fontSize) || 0;
          if (size < 8) continue;
          const bg = background(el);
          const ratio = contrast(lum(fg), lum(bg));
          const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
          const required = large ? 3 : 4.5;
          checked++;
          sum += ratio;
          if (ratio < worst) worst = ratio;
          if (ratio < required) violations++;
          sizes.push(size);
          if (/^H[1-6]$/.test(el.tagName)) headings++;
          if (samples.length < 12) samples.push({ text: text.slice(0, 80), contrast: Math.round(ratio * 100) / 100, fontSize: size, required });
        }
        const unique = [...new Set(sizes.map((s) => Math.round(s)))].sort((a, b) => a - b);
        return {
          checked,
          violations,
          averageContrast: checked ? Math.round((sum / checked) * 100) / 100 : 0,
          worstContrast: checked ? Math.round(worst * 100) / 100 : 0,
          samples,
          note: 'Contraste calculado en Chromium contra el primer ancestro con fondo opaco; aproximación orientativa, no certificación WCAG.',
          typography: {
            elements: checked,
            headings,
            distinctSizes: unique.length,
            averageFontSize: checked ? Math.round((sizes.reduce((a, b) => a + b, 0) / checked) * 10) / 10 : 0,
            hierarchyRatio: unique.length ? Math.round((unique[unique.length - 1] / unique[0]) * 10) / 10 : 0,
            note: 'Tamaños y pesos leídos del DOM; no evalúa calidad artística de la elección tipográfica.',
          },
        };
      });
      if (audit && audit.checked > 0) {
        accessibility = {
          checked: audit.checked,
          violations: audit.violations,
          averageContrast: audit.averageContrast,
          worstContrast: audit.worstContrast,
          samples: audit.samples,
          note: audit.note,
        };
        typography = audit.typography;
      }
    } catch (e) {
      errors.push(`auditoría DOM: ${(e as Error).message}`);
    }

    for (let i = 0; i < frameCount; i++) {
      const file = path.join(outDir, `capture-${String(i + 1).padStart(2, '0')}.png`);
      timings.push(Date.now());
      await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
      files.push(file);
      if (i < frameCount - 1) await page.waitForTimeout(intervalMs);
    }
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  const profile = await analyzeSequence(files, { width: 192, intervalMs });
  profile.source = `captura:${url}`;
  profile.fps = 0;
  profile.width = width;
  profile.height = height;
  profile.aspect = Math.round((width / height) * 1000) / 1000;

  return {
    ok: errors.length === 0 && consoleErrors.length === 0,
    url,
    outDir,
    frames: files,
    errors,
    consoleErrors,
    profile,
    title,
    timings,
    accessibility,
    typography,
  };
}
