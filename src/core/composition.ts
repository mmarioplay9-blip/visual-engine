import fs from 'node:fs';
import path from 'node:path';
import { applyEffect, getEffect, listEffects, type EffectParam } from './library.js';
import { ensureDir, newRunDir, PACKAGE_ROOT } from './paths.js';

/**
 * Formato universal de composición visual (0.3).
 * Un JSON describe capas de efectos, parámetros compartidos, máscaras, mezclas
 * y curvas de animación. El renderizador genera HTML autónomo con los efectos
 * copiados a assets/, sin depender de la ruta de instalación.
 */

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'color-dodge'
  | 'lighter'
  | 'difference'
  | 'exclusion';

export type Ease = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';
export type Animatable = 'opacity' | 'x' | 'y' | 'scale' | 'rotate';

export interface TrackKey {
  t: number;
  value: number;
  ease?: Ease;
}

export interface LayerTrack {
  property: Animatable;
  keys: TrackKey[];
}

export interface LayerMask {
  type: 'radial' | 'linear';
  center?: [number, number];
  radius?: number;
  feather?: number;
  angle?: number;
}

export interface CompositionLayer {
  id: string;
  effect: string;
  params: Record<string, string | number | boolean>;
  opacity: number;
  blend: BlendMode;
  start: number;
  duration: number;
  mask?: LayerMask;
  transform: { x: number; y: number; scale: number; rotate: number };
  tracks: LayerTrack[];
}

export interface VEComposition {
  version: '0.3';
  id: string;
  title: string;
  description: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  background: string;
  shared: Record<string, string | number | boolean>;
  layers: CompositionLayer[];
  provenance?: {
    source?: string;
    mapping?: { detected: string; mappedTo: string; status: 'verified' | 'estimated'; confidence: number; note: string }[];
    warnings?: string[];
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  value?: VEComposition;
}

export interface RenderedComposition {
  composition: VEComposition;
  dir: string;
  html: string;
  config: string;
  readme: string;
  assets: string[];
  effects: string[];
  warnings: string[];
}

const BLENDS: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-dodge', 'lighter', 'difference', 'exclusion'];
const EASES: Ease[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'spring'];
const PROPS: Animatable[] = ['opacity', 'x', 'y', 'scale', 'rotate'];
const MAX_LAYERS = 12;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finite(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function createComposition(partial: Partial<VEComposition> = {}): VEComposition {
  const effect = partial.layers?.[0]?.effect ?? 'mesh-gradient';
  return {
    version: '0.3',
    id: partial.id ?? 'composicion',
    title: partial.title ?? 'Composición Visual Engine',
    description: partial.description ?? 'Composición generada con capas de efectos y timeline.',
    width: Math.round(finite(partial.width, 1280)),
    height: Math.round(finite(partial.height, 720)),
    duration: Math.max(0.1, finite(partial.duration, 6)),
    fps: Math.max(1, Math.min(120, Math.round(finite(partial.fps, 30)))),
    background: partial.background ?? '#05070d',
    shared: partial.shared ?? { accent: '#12e0c8', accent2: '#ffb454', speed: 1 },
    provenance: partial.provenance,
    layers:
      partial.layers?.length
        ? partial.layers
        : [
            {
              id: 'capa-1',
              effect,
              params: {},
              opacity: 1,
              blend: 'normal',
              start: 0,
              duration: Math.max(0.1, finite(partial.duration, 6)),
              transform: { x: 0, y: 0, scale: 1, rotate: 0 },
              tracks: [],
            },
          ],
  };
}

/** Valida estructura, tipos, efectos existentes, mezclas y curvas. */
export function validateComposition(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['La composición debe ser un objeto JSON.'] };

  const width = finite(input.width, 0);
  const height = finite(input.height, 0);
  const duration = finite(input.duration, 0);
  const fps = finite(input.fps, 0);
  if (width < 64 || width > 7680) errors.push('width debe estar entre 64 y 7680.');
  if (height < 64 || height > 7680) errors.push('height debe estar entre 64 y 7680.');
  if (duration <= 0 || duration > 120) errors.push('duration debe estar entre 0 y 120 s.');
  if (fps < 1 || fps > 120) errors.push('fps debe estar entre 1 y 120.');
  if (!Array.isArray(input.layers) || input.layers.length === 0) errors.push('layers debe ser un array no vacío.');
  if (Array.isArray(input.layers) && input.layers.length > MAX_LAYERS) errors.push(`Máximo ${MAX_LAYERS} capas por composición.`);

  const available = new Set(listEffects().map((e) => e.id));
  const ids = new Set<string>();
  const layers = Array.isArray(input.layers) ? input.layers : [];
  layers.forEach((raw, index) => {
    const where = `layers[${index}]`;
    if (!isRecord(raw)) {
      errors.push(`${where} debe ser un objeto.`);
      return;
    }
    const id = String(raw.id ?? '');
    if (!id) errors.push(`${where}.id es obligatorio.`);
    else if (ids.has(id)) errors.push(`id de capa duplicado: ${id}`);
    else ids.add(id);
    const effect = String(raw.effect ?? '');
    if (!effect) errors.push(`${where}.effect es obligatorio.`);
    else if (!available.has(effect)) errors.push(`${where}.effect desconocido: ${effect}`);
    if (raw.blend !== undefined && !BLENDS.includes(raw.blend as BlendMode)) errors.push(`${where}.blend no válido: ${String(raw.blend)}`);
    if (raw.opacity !== undefined && (typeof raw.opacity !== 'number' || raw.opacity < 0 || raw.opacity > 1)) errors.push(`${where}.opacity debe estar en 0..1.`);
    if (raw.start !== undefined && (typeof raw.start !== 'number' || raw.start < 0)) errors.push(`${where}.start debe ser >= 0.`);
    if (raw.duration !== undefined && (typeof raw.duration !== 'number' || raw.duration <= 0)) errors.push(`${where}.duration debe ser > 0.`);
    if (raw.params !== undefined && !isRecord(raw.params)) errors.push(`${where}.params debe ser un objeto.`);
    if (raw.transform !== undefined) {
      if (!isRecord(raw.transform)) errors.push(`${where}.transform debe ser un objeto.`);
      else for (const k of ['x', 'y', 'scale', 'rotate']) if (raw.transform[k] !== undefined && typeof raw.transform[k] !== 'number') errors.push(`${where}.transform.${k} debe ser numérico.`);
    }
    if (raw.tracks !== undefined) {
      if (!Array.isArray(raw.tracks)) errors.push(`${where}.tracks debe ser un array.`);
      else
        raw.tracks.forEach((track, ti) => {
          if (!isRecord(track) || !PROPS.includes(track.property as Animatable)) errors.push(`${where}.tracks[${ti}].property no válida.`);
          if (!isRecord(track) || !Array.isArray(track.keys) || track.keys.length < 2) errors.push(`${where}.tracks[${ti}].keys necesita al menos 2 claves.`);
          else
            track.keys.forEach((key, ki) => {
              if (!isRecord(key) || typeof key.t !== 'number' || typeof key.value !== 'number') errors.push(`${where}.tracks[${ti}].keys[${ki}] necesita t y value numéricos.`);
              if (isRecord(key) && key.ease !== undefined && !EASES.includes(key.ease as Ease)) errors.push(`${where}.tracks[${ti}].keys[${ki}].ease no válido.`);
            });
        });
    }
    if (raw.mask !== undefined) {
      if (!isRecord(raw.mask) || !['radial', 'linear'].includes(String(raw.mask.type))) errors.push(`${where}.mask.type debe ser radial o linear.`);
    }
  });

  if (errors.length) return { ok: false, errors };
  const value: VEComposition = {
    version: '0.3',
    id: String(input.id ?? 'composicion'),
    title: String(input.title ?? 'Composición'),
    description: String(input.description ?? ''),
    width: Math.round(width),
    height: Math.round(height),
    duration,
    fps: Math.round(fps),
    background: String(input.background ?? '#05070d'),
    shared: isRecord(input.shared) ? (input.shared as VEComposition['shared']) : {},
    layers: layers.map((raw: any, index) => ({
      id: String(raw.id ?? `capa-${index + 1}`),
      effect: String(raw.effect),
      params: isRecord(raw.params) ? (raw.params as CompositionLayer['params']) : {},
      opacity: clamp01(finite(raw.opacity, 1)),
      blend: (raw.blend as BlendMode) ?? 'normal',
      start: Math.max(0, finite(raw.start, 0)),
      duration: Math.max(0.01, finite(raw.duration, duration)),
      transform: {
        x: finite(raw.transform?.x, 0),
        y: finite(raw.transform?.y, 0),
        scale: finite(raw.transform?.scale, 1),
        rotate: finite(raw.transform?.rotate, 0),
      },
      tracks: (raw.tracks ?? []) as LayerTrack[],
      mask: raw.mask as LayerMask | undefined,
    })),
    provenance: input.provenance as VEComposition['provenance'],
  };
  return { ok: true, errors: [], value };
}

function paramMap(params: EffectParam[]): Map<string, EffectParam> {
  return new Map(params.map((p) => [p.name, p]));
}

function mergeParams(recipeParams: EffectParam[], shared: Record<string, unknown>, own: Record<string, unknown>): Record<string, string | number | boolean> {
  const map = paramMap(recipeParams);
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries({ ...shared, ...own })) {
    if (!map.has(k)) continue;
    const def = map.get(k)!;
    if (def.type === 'number') {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    } else if (def.type === 'boolean') out[k] = v === true || v === 'true' || v === 1;
    else out[k] = String(v);
  }
  return out;
}

function maskCss(mask: LayerMask | undefined): string {
  if (!mask) return 'none';
  if (mask.type === 'radial') {
    const [cx, cy] = mask.center ?? [0.5, 0.5];
    const radius = mask.radius ?? 0.65;
    const feather = mask.feather ?? 0.2;
    const inner = Math.max(0, radius - feather);
    return `radial-gradient(circle at ${(cx * 100).toFixed(1)}% ${(cy * 100).toFixed(1)}%, #000 ${(inner * 100).toFixed(1)}%, transparent ${(Math.min(1, radius) * 100).toFixed(1)}%)`;
  }
  const angle = mask.angle ?? 90;
  const feather = mask.feather ?? 0.3;
  const start = Math.max(0, 0.5 - feather / 2);
  const end = Math.min(1, 0.5 + feather / 2);
  return `linear-gradient(${angle}deg, #000 0%, #000 ${(start * 100).toFixed(1)}%, transparent ${(end * 100).toFixed(1)}%, transparent 100%)`;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** Genera HTML autónomo, config y README; copia los efectos usados a assets/. */
export function renderComposition(input: unknown, opts: { outDir?: string } = {}): RenderedComposition {
  const result = validateComposition(input);
  if (!result.ok || !result.value) throw new Error(`Composición inválida:\n- ${result.errors.join('\n- ')}`);
  const comp = result.value;
  const dir = ensureDir(path.resolve(opts.outDir ?? newRunDir('compositions')));
  const assetsRoot = ensureDir(path.join(dir, 'assets', 'effects'));
  const warnings: string[] = [];
  const copies: string[] = [];
  const effectIds = [...new Set(comp.layers.map((l) => l.effect))];
  let needsThree = false;
  for (const id of effectIds) {
    const recipe = getEffect(id);
    needsThree ||= recipe.requires.includes('three');
    const layer = comp.layers.find((l) => l.effect === id)!;
    const params = mergeParams(recipe.params, comp.shared, layer.params);
    const applied = applyEffect(id, { outDir: assetsRoot, params });
    copies.push(...applied.files);
    if (recipe.requires.length) warnings.push(`${id} requiere ${recipe.requires.join(', ')}; el renderizador no incluye dependencias externas.`);
  }

  if (needsThree) {
    const threeSource = path.join(PACKAGE_ROOT, 'node_modules', 'three', 'build', 'three.module.js');
    if (!fs.existsSync(threeSource)) {
      warnings.push('Un efecto requiere Three.js, pero node_modules/three no está instalado; la capa fallará.');
    } else {
      const vendor = ensureDir(path.join(dir, 'assets', 'vendor'));
      const target = path.join(vendor, 'three.module.js');
      fs.copyFileSync(threeSource, target);
      copies.push(target);
    }
  }
  const importMap = needsThree ? `<script type="importmap">{ "imports": { "three": "./assets/vendor/three.module.js" } }</script>` : '';
  const moduleImports = effectIds.map((id, i) => `import * as ve${i} from './assets/effects/${id}/effect.js';`).join('\n');
  const moduleMap = `{ ${effectIds.map((id, i) => `${JSON.stringify(id)}: ve${i}`).join(', ')} }`;
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
${importMap}
<title>${comp.title.replace(/[<>&]/g, '')} · Visual Engine</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: #030509; }
  body { display: grid; place-items: center; min-height: 100vh; overflow: hidden; }
  #stage { position: relative; width: min(100vw, calc(100vh * ${(comp.width / comp.height).toFixed(5)})); aspect-ratio: ${comp.width} / ${comp.height}; background: ${comp.background}; overflow: hidden; isolation: isolate; }
  .ve-layer { position: absolute; inset: 0; transform-origin: 50% 50%; will-change: transform, opacity; }
  .ve-layer canvas { display: block; width: 100%; height: 100%; }
  #ve-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #ffd7dd; background: #13070a; font: 14px ui-monospace, monospace; padding: 24px; text-align: center; }
  body[data-ready] #ve-fallback { display: none; }
</style>
</head>
<body>
  <div id="stage" role="img" aria-label="${comp.title.replace(/["<>&]/g, '')}">
    <div id="ve-fallback">Composición no disponible: revisa la consola.</div>
  </div>
  <script type="application/json" id="ve-composition">${safeJson(comp)}</script>
  <script type="module">
${moduleImports}
const comp = JSON.parse(document.getElementById('ve-composition').textContent);
const modules = ${moduleMap};
const stage = document.getElementById('stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const seekTo = params.has('t') ? Number(params.get('t')) : 0;
let time = Math.max(0, Math.min(comp.duration, Number.isFinite(seekTo) ? seekTo : 0));
let playing = !params.has('t') || params.get('paused') !== '1';
let last = performance.now();
let disposers = [];
let layers = [];

function ease(kind, p) {
  if (kind === 'easeIn') return p * p;
  if (kind === 'easeOut') return 1 - Math.pow(1 - p, 3);
  if (kind === 'easeInOut') return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  if (kind === 'spring') {
    const c = 2 * Math.PI;
    return 1 - Math.pow(2, -10 * p) * Math.cos(c * p * 1.2);
  }
  return p;
}
function trackValue(layer, property, local, fallback) {
  const track = layer.tracks.find((t) => t.property === property);
  if (!track || track.keys.length < 2) return fallback;
  const keys = [...track.keys].sort((a, b) => a.t - b.t);
  if (local <= keys[0].t) return keys[0].value;
  if (local >= keys[keys.length - 1].t) return keys[keys.length - 1].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (local >= a.t && local <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      const p = (local - a.t) / span;
      return a.value + (b.value - a.value) * ease(b.ease || a.ease || 'easeInOut', p);
    }
  }
  return fallback;
}
function maskFor(layer) {
  const m = layer.mask;
  if (!m) return 'none';
  if (m.type === 'radial') {
    const [cx, cy] = m.center || [0.5, 0.5];
    const radius = m.radius ?? 0.65;
    const feather = m.feather ?? 0.2;
    const inner = Math.max(0, radius - feather);
    return 'radial-gradient(circle at ' + (cx * 100).toFixed(1) + '% ' + (cy * 100).toFixed(1) + '%, #000 ' + (inner * 100).toFixed(1) + '%, transparent ' + (Math.min(1, radius) * 100).toFixed(1) + '%)';
  }
  const angle = m.angle ?? 90;
  const feather = m.feather ?? 0.3;
  const start = Math.max(0, 0.5 - feather / 2), end = Math.min(1, 0.5 + feather / 2);
  return 'linear-gradient(' + angle + 'deg, #000 0%, #000 ' + (start * 100).toFixed(1) + '%, transparent ' + (end * 100).toFixed(1) + '%, transparent 100%)';
}
function build() {
  for (const [index, layer] of comp.layers.entries()) {
    const wrap = document.createElement('div');
    wrap.className = 've-layer';
    wrap.dataset.layer = layer.id;
    wrap.style.mixBlendMode = layer.blend;
    wrap.style.maskImage = maskFor(layer);
    wrap.style.webkitMaskImage = maskFor(layer);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    wrap.appendChild(canvas);
    stage.appendChild(wrap);
    const module = modules[layer.effect];
    if (!module || typeof module.mount !== 'function') throw new Error('Falta el efecto ' + layer.effect);
    // Las capas superiores se montan sin fondo para que la mezcla sea real.
    // El efecto sigue usando su propio color si se abre de forma individual.
    const mountParams = { ...comp.shared, ...layer.params };
    if (index > 0 && !('bg' in layer.params)) mountParams.bg = 'transparent';
    const dispose = module.mount(canvas, mountParams);
    disposers.push(dispose);
    layers.push({ layer, wrap, base: { ...layer.transform } });
  }
}
function applyFrame() {
  for (const { layer, wrap, base } of layers) {
    const local = time - layer.start;
    const active = local >= 0 && local <= layer.duration;
    const alpha = active ? layer.opacity * trackValue(layer, 'opacity', local, 1) : 0;
    const x = trackValue(layer, 'x', local, base.x);
    const y = trackValue(layer, 'y', local, base.y);
    const scale = trackValue(layer, 'scale', local, base.scale);
    const rotate = trackValue(layer, 'rotate', local, base.rotate);
    wrap.style.opacity = String(Math.max(0, Math.min(1, alpha)));
    wrap.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ') rotate(' + rotate + 'deg)';
  }
}
function frame(now) {
  const dt = Math.min(80, now - last) / 1000;
  last = now;
  if (playing && !reduce) time = (time + dt) % Math.max(0.1, comp.duration);
  applyFrame();
  requestAnimationFrame(frame);
}
try {
  build();
  applyFrame();
  document.body.dataset.ready = 'true';
  window.__veReady = true;
  window.__veComposition = {
    duration: comp.duration,
    fps: comp.fps,
    layers: comp.layers.length,
    get time() { return time; },
    seek(value) { time = Math.max(0, Math.min(comp.duration, Number(value) || 0)); applyFrame(); },
    play() { playing = true; },
    pause() { playing = false; },
    stop() { disposers.forEach((d) => d()); disposers = []; },
  };
  if (params.has('t')) applyFrame();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  const box = document.getElementById('ve-fallback');
  if (box) box.textContent = 'Error de composición: ' + (error && error.message ? error.message : error);
}
window.addEventListener('pagehide', () => { disposers.forEach((d) => d()); }, { once: true });
  </script>
</body>
</html>
`;

  const readme = `# ${comp.title}

Composición Visual Engine 0.3 generada con ${comp.layers.length} capa(s), ${effectIds.length} efecto(s), ${comp.duration}s a ${comp.fps} fps.

## Archivos

- \`index.html\`: previsualización autónoma (abre con un servidor local; los módulos usan rutas relativas).
- \`composition.json\`: formato universal, editable por cualquier agente.
- \`assets/effects/\`: copias aplicadas e independientes de los efectos.

## Uso

\`\`\`bash
npx serve .
# abre index.html
\`\`\`

Para integrarlo en un proyecto, copia \`assets/\` y adapta el HTML. El JSON se puede volver a renderizar con:

\`\`\`bash
ve compose composition.json --out ./mi-composicion
\`\`\`

## Capas

${comp.layers.map((l) => `- \`${l.id}\`: ${l.effect}, mezcla ${l.blend}, ${l.start}s + ${l.duration}s, opacidad ${l.opacity}.`).join('\n')}

## Límites

- El efecto conserva su reloj interno; \`seek()\` mueve el timeline de capas, no el tiempo interno de cada shader.
- Las máscaras usan \`mask-image\`; en navegadores antiguos puede requerir prefijo.
- No incluye dependencias externas: todos los efectos de esta composición son Canvas/WebGL propios.
${warnings.length ? `\n## Avisos\n\n${warnings.map((w) => `- ${w}`).join('\n')}` : ''}
`;

  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(dir, 'composition.json'), JSON.stringify(comp, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'README.md'), readme, 'utf8');
  return {
    composition: comp,
    dir,
    html: path.join(dir, 'index.html'),
    config: path.join(dir, 'composition.json'),
    readme: path.join(dir, 'README.md'),
    assets: copies,
    effects: effectIds,
    warnings,
  };
}

export function compositionSummary(comp: VEComposition): string[] {
  return [
    `${comp.title}: ${comp.width}×${comp.height}, ${comp.duration}s a ${comp.fps} fps, ${comp.layers.length} capa(s).`,
    `Efectos: ${[...new Set(comp.layers.map((l) => l.effect))].join(', ')}.`,
    `Mezclas: ${[...new Set(comp.layers.map((l) => l.blend))].join(', ')}.`,
    comp.provenance?.source ? `Origen: ${comp.provenance.source}.` : 'Origen: composición manual.',
  ];
}
