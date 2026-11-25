import type { VisualSpec } from './spec.js';
import { createComposition, renderComposition, validateComposition, type VEComposition, type CompositionLayer, type RenderedComposition } from './composition.js';
import { getEffect, listEffects, type EffectParam } from './library.js';

/**
 * Reference-to-Effects: traduce señales medidas a efectos de la biblioteca.
 * La relación efecto-detectado → efecto-de-biblioteca es una hipótesis
 * declarada. Nunca se presenta como una identificación exacta.
 */

export interface EffectMapping {
  detected: string;
  mappedTo: string;
  status: 'verified' | 'estimated';
  confidence: number;
  note: string;
}

export interface ReferenceEffectsResult {
  spec: VisualSpec;
  composition: VEComposition;
  mapping: EffectMapping[];
  rendered?: RenderedComposition;
  warnings: string[];
  coverage: { detected: number; mapped: number; selected: number };
}

interface MapEntry {
  effect: string;
  blend: CompositionLayer['blend'];
  note: string;
}

const MAP: Record<string, MapEntry> = {
  glow: { effect: 'anamorphic-bloom', blend: 'screen', note: 'El halo medido se aproxima con un bloom anamórfico; no se ha identificado un plugin concreto.' },
  bloom: { effect: 'anamorphic-bloom', blend: 'screen', note: 'Halo y radio se traducen a intensidad y escala del bloom.' },
  particles: { effect: 'dust-motes', blend: 'screen', note: 'Las motas detectadas se aproximan con partículas de polvo; tamaño y cantidad son estimaciones.' },
  blur: { effect: 'focus-pull', blend: 'normal', note: 'La falta de nitidez se interpreta como profundidad de campo, no como un filtro concreto.' },
  parallax: { effect: 'parallax-layers', blend: 'normal', note: 'La diferencia de desplazamiento entre capas se aproxima con un paisaje en profundidades.' },
  glitch: { effect: 'glitch-slices', blend: 'screen', note: 'Los saltos de canal y filas se aproximan con franjas; la referencia puede usar otro mecanismo.' },
  lighting: { effect: 'volumetric-rays', blend: 'screen', note: 'La caída de luz se aproxima con haces volumétricos; no prueba la existencia de god rays.' },
  reflections: { effect: 'glass-refraction', blend: 'normal', note: 'La simetría detectada se aproxima con refracción de cristal, no con un reflejo especular medido.' },
  distortion: { effect: 'ripple-glass', blend: 'normal', note: 'La ondulación de filas se aproxima con refracción; es una correspondencia estimada.' },
  grain: { effect: 'dissolve-grain', blend: 'overlay', note: 'El ruido temporal se aproxima con disolución de grano; no se replica la textura original.' },
};

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Un color dominante casi negro no sirve como acento visible. */
function pickAccent(spec: VisualSpec): string {
  const candidates = spec.palette.filter((p) => p.role === 'acento');
  for (const p of candidates) {
    const [r, g, b] = rgb(p.hex);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (luminance(p.hex) > 0.16 && chroma > 0.1) return p.hex;
  }
  const vibrant = spec.palette
    .filter((p) => luminance(p.hex) > 0.2)
    .sort((a, b) => {
      const ca = Math.max(...rgb(a.hex)) - Math.min(...rgb(a.hex));
      const cb = Math.max(...rgb(b.hex)) - Math.min(...rgb(b.hex));
      return cb - ca;
    })[0];
  return vibrant && Math.max(...rgb(vibrant.hex)) - Math.min(...rgb(vibrant.hex)) > 0.15 ? vibrant.hex : '#12e0c8';
}

function pickSecondary(spec: VisualSpec, accent: string, bg: string): string {
  const rest = spec.palette.filter((p) => p.hex !== accent && p.hex !== bg);
  const warm = rest.find((p) => {
    const [r, g, b] = rgb(p.hex);
    return r > b && luminance(p.hex) > 0.3;
  });
  return warm?.hex ?? rest.sort((a, b) => luminance(b.hex) - luminance(a.hex))[0]?.hex ?? '#ffb454';
}

function paramsFor(recipeParams: EffectParam[], detected: Record<string, string | number>, spec: VisualSpec): Record<string, string | number | boolean> {
  const available = new Map(recipeParams.map((p) => [p.name, p]));
  const out: Record<string, string | number | boolean> = {};
  const set = (name: string, value: string | number | boolean) => {
    if (available.has(name)) out[name] = value;
  };
  const accent = pickAccent(spec);
  const bg = spec.palette.find((p) => p.role === 'fondo/base')?.hex ?? spec.palette[0]?.hex ?? '#05070d';
  const warm = pickSecondary(spec, accent, bg);
  set('accent', accent);
  set('accent2', warm);
  set('bg', bg);
  set('speed', clamp(0.35 + num(spec.camera?.speed, 0) * 4, 0.25, 2.5));
  set('intensity', clamp(num(detected.intensidad, 0.65), 0.1, 1.3));
  set('count', clamp(Math.round(num(detected.cantidad, 100)), 20, 420));
  set('size', clamp(num(detected.tamanoMedioPx, 2.4), 0.5, 8));
  set('amount', clamp(num(detected.amplitudPx, 2) / 10, 0.05, 1));
  set('spread', clamp(num(detected.intensidad, 0.55), 0.1, 1.1));
  set('scale', 0.45);
  // Transformar valores específicos de efecto en parámetros razonables.
  if (out.intensity === undefined) set('intensity', 0.6);
  if (out.count === undefined) set('count', 120);
  return out;
}

function fadeTracks(layerStart: number, layerDuration: number, compDuration: number): CompositionLayer['tracks'] {
  const start = Math.max(0, layerStart);
  const inEnd = Math.min(compDuration, start + Math.min(0.7, layerDuration / 3));
  const outStart = Math.max(inEnd, Math.min(compDuration - 0.4, start + layerDuration - 0.7));
  return [
    {
      property: 'opacity',
      keys: [
        { t: start, value: 0, ease: 'easeOut' },
        { t: inEnd, value: 1, ease: 'easeInOut' },
        { t: outStart, value: 1, ease: 'easeIn' },
        { t: Math.min(compDuration, start + layerDuration), value: 0 },
      ],
    },
  ];
}

/** Construye la composición a partir de la especificación, sin renderizar. */
export function specToComposition(spec: VisualSpec): { composition: VEComposition; mapping: EffectMapping[]; warnings: string[]; coverage: ReferenceEffectsResult['coverage'] } {
  const available = new Set(listEffects().map((e) => e.id));
  const warnings: string[] = [];
  const mapping: EffectMapping[] = [];
  const detected = spec.effects ?? [];
  warnings.push('Las correspondencias efecto detectado → efecto de biblioteca son hipótesis declaradas, no identificaciones exactas. Revisa el estado y la confianza de cada capa.');
  const duration = Math.max(1, Math.min(30, spec.canvas.duration || 6));
  const accent = pickAccent(spec);
  const bg = spec.palette.find((p) => p.role === 'fondo/base')?.hex ?? spec.palette[0]?.hex ?? '#05070d';
  const shared = {
    accent,
    accent2: pickSecondary(spec, accent, bg),
    bg,
    speed: clamp(0.5 + num(spec.camera?.speed, 0) * 5, 0.4, 2),
  };
  const layers: CompositionLayer[] = [];
  const seen = new Set<string>();
  let index = 0;

  for (const effect of detected) {
    const entry = MAP[effect.id];
    if (!entry) {
      warnings.push(`La señal "${effect.id}" no tiene un efecto de biblioteca equivalente; no se inventa una asignación.`);
      continue;
    }
    if (!available.has(entry.effect)) {
      warnings.push(`El efecto ${entry.effect} no está en la biblioteca instalada.`);
      continue;
    }
    if (seen.has(entry.effect)) {
      // Una segunda señal del mismo tipo se incorpora como capa con otro blend sólo si aporta.
      warnings.push(`Se omite la señal repetida "${effect.id}": ya hay una capa ${entry.effect}.`);
      continue;
    }
    seen.add(entry.effect);
    const recipe = getEffect(entry.effect);
    const layerDuration = Math.min(duration, Math.max(1, num(effect.params.duracion, duration)));
    const params = paramsFor(recipe.params, effect.params, spec);
    const layer: CompositionLayer = {
      id: `ref-${index + 1}-${entry.effect}`,
      effect: entry.effect,
      params,
      opacity: clamp(0.35 + effect.confidence * 0.6, 0.25, 1),
      blend: entry.blend,
      start: 0,
      duration: layerDuration,
      transform: {
        x: clamp(num(spec.camera?.shiftX, 0) * spec.canvas.width * 0.4, -60, 60),
        y: clamp(num(spec.camera?.shiftY, 0) * spec.canvas.height * 0.4, -60, 60),
        scale: 1,
        rotate: clamp(num(spec.camera?.rotationDeg, 0) * 0.25, -3, 3),
      },
      tracks: fadeTracks(0, layerDuration, duration),
    };
    if (effect.id === 'lighting' || effect.id === 'glow' || effect.id === 'bloom') {
      layer.mask = { type: 'radial', center: [0.55, 0.45], radius: 0.78, feather: 0.4 };
    }
    layers.push(layer);
    mapping.push({
      detected: effect.id,
      mappedTo: entry.effect,
      status: effect.status,
      confidence: effect.confidence,
      note: entry.note,
    });
    index++;
  }

  if (!layers.length) {
    const recipe = getEffect('mesh-gradient');
    layers.push({
      id: 'base-mesh',
      effect: 'mesh-gradient',
      params: paramsFor(recipe.params, {}, spec),
      opacity: 0.75,
      blend: 'normal',
      start: 0,
      duration,
      transform: { x: 0, y: 0, scale: 1, rotate: 0 },
      tracks: fadeTracks(0, duration, duration),
    });
    mapping.push({
      detected: 'sin señales de efecto',
      mappedTo: 'mesh-gradient',
      status: 'estimated',
      confidence: 0,
      note: 'La referencia no superó los umbrales de efectos. Se usa una base de gradiente derivada de la paleta; no se afirma que la referencia contenga este efecto.',
    });
    warnings.push('No se detectaron efectos por encima del umbral. La composición usa una base de color y no inventa efectos.');
  }

  // La tipografía sólo se añade si el OCR ha leído texto literal; nunca se inventa el copy.
  const ocrText = spec.text?.available ? spec.text.content.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length >= 4) : undefined;
  if (ocrText && available.has('split-reveal')) {
    layers.push({
      id: 'ref-text',
      effect: 'split-reveal',
      params: { title: ocrText.slice(0, 42), kicker: 'texto leído por OCR', bg: shared.bg, accent: shared.accent, accent2: shared.accent2, speed: 0.8 },
      opacity: 0.95,
      blend: 'normal',
      start: Math.min(duration * 0.2, 1.2),
      duration: Math.max(1, duration - 1.2),
      transform: { x: 0, y: 0, scale: 1, rotate: 0 },
      tracks: [],
    });
    warnings.push('La capa tipográfica usa texto leído por OCR; puede contener errores de reconocimiento.');
  }

  const composition = createComposition({
    id: 'reference-to-effects',
    title: `Referencia → efectos: ${spec.source.split(/[\\/]/).pop() ?? 'referencia'}`,
    description: 'Composición derivada de señales medidas. Las asignaciones son hipótesis declaradas, no identificaciones exactas.',
    width: spec.canvas.width,
    height: spec.canvas.height,
    duration,
    fps: spec.canvas.fps || 30,
    background: shared.bg,
    shared,
    layers,
    provenance: {
      source: spec.source,
      mapping,
      warnings,
    },
  });
  return {
    composition,
    mapping,
    warnings,
    coverage: { detected: detected.length, mapped: mapping.filter((m) => m.detected !== 'sin señales de efecto').length, selected: layers.length },
  };
}

export function referenceEffects(input: { spec: VisualSpec; outDir?: string; render?: boolean }): ReferenceEffectsResult {
  const built = specToComposition(input.spec);
  const valid = validateComposition(built.composition);
  if (!valid.ok) throw new Error(`Composición derivada inválida: ${valid.errors.join('; ')}`);
  const rendered = input.render === false ? undefined : renderComposition(built.composition, { outDir: input.outDir });
  return { spec: input.spec, ...built, rendered };
}
