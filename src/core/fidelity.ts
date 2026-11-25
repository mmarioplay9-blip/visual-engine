import type { VisualProfile } from './analysis.js';
import type { DomSnapshot } from './debugger.js';
import type { QualityEvaluation } from './quality.js';
import type { ArtDirection } from './styles.js';
import type { VisualSpec } from './spec.js';
import { compareProfiles } from './compare.js';
import { clamp, mean, round, std } from './util.js';

/**
 * Reference Fidelity Engine 0.5.
 *
 * Mide estructura, no "parecido" global. La similitud de píxeles se devuelve
 * aparte y nunca se usa como sustituto de calidad artística. Cada dimensión
 * declara si está medida con DOM/especificación o si es una estimación.
 */

export type FidelityStatus = 'verified' | 'estimated' | 'unavailable';

export interface FidelityDimension {
  id: string;
  label: string;
  score: number | null;
  weight: number;
  status: FidelityStatus;
  evidence: Record<string, number | string>;
  note: string;
}

export interface FidelityReport {
  version: '0.5';
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  dimensions: FidelityDimension[];
  pixelSimilarity: number;
  structuralVsPixel: string;
  warnings: string[];
  summary: string;
}

export interface FidelityInput {
  reference: VisualProfile;
  candidate: VisualProfile;
  spec?: VisualSpec;
  quality?: QualityEvaluation;
  dom?: DomSnapshot;
  art?: ArtDirection;
  usedEffects?: { id: string }[];
  expectedEffects?: { id: string; confidence?: number }[];
}

function qdim(q: QualityEvaluation | undefined, id: string): number | null {
  const d = q?.dimensions.find((x) => x.id === id);
  return d && d.available && d.score !== null ? d.score : null;
}

function similarity(a: number, b: number, tolerance: number): number {
  return clamp(1 - Math.abs(a - b) / Math.max(1e-6, tolerance));
}

function frameCoherence(p: VisualProfile): number | null {
  if (p.frames.length < 3) return null;
  const lumas = p.frames.map((f) => f.luma);
  const deltas = lumas.slice(1).map((v, i) => Math.abs(v - lumas[i]));
  const flicker = std(deltas);
  const motion = mean(p.frames.map((f) => f.edgeDensity));
  return round(clamp(1 - flicker * 18) * 100 * (0.8 + 0.2 * clamp(motion)), 1);
}

function layoutScore(reference: VisualProfile, candidate: VisualProfile): number | null {
  if (!reference.frames.length || !candidate.frames.length) return null;
  const balance = (p: VisualProfile) => {
    const f = p.frames[0];
    const [q0, q1, q2, q3] = f.quadrants;
    const l = q0 + q2, r = q1 + q3, t = q0 + q1, b = q2 + q3;
    return { h: 1 - Math.abs(l - r) / Math.max(1e-6, l + r), v: 1 - Math.abs(t - b) / Math.max(1e-6, t + b) };
  };
  const a = balance(reference), b = balance(candidate);
  return round((similarity(a.h, b.h, 0.45) * 0.6 + similarity(a.v, b.v, 0.45) * 0.4) * 100, 1);
}

function typographyScore(spec: VisualSpec | undefined, dom: DomSnapshot | undefined): { score: number | null; evidence: Record<string, number | string> } {
  if (!spec?.typography.lines.length || !dom) return { score: null, evidence: { nota: 'requiere especificación y DOM' } };
  const referenceTitle = spec.typography.lines.find((l) => /titular|título|display|hero/i.test(l.role)) ?? spec.typography.lines[0];
  const candidateTitle = dom.elements.find((e) => e.tag === 'h1') ?? dom.elements.find((e) => e.tag === 'h2');
  if (!candidateTitle || !referenceTitle) return { score: null, evidence: { nota: 'sin titular comparable' } };
  const refRatio = referenceTitle.heightPx / spec.canvas.height;
  const candRatio = candidateTitle.styles.fontSize / dom.viewport.height;
  const ratioScore = similarity(refRatio, candRatio, 0.08);
  const bodyRef = spec.typography.lines.find((l) => /cuerpo|body|texto/i.test(l.role));
  const candidateBody = dom.elements.find((e) => e.tag === 'p');
  const bodyScore = bodyRef && candidateBody
    ? similarity(bodyRef.heightPx / spec.canvas.height, candidateBody.styles.fontSize / dom.viewport.height, 0.03)
    : 0.7;
  return {
    score: round((ratioScore * 0.65 + bodyScore * 0.35) * 100, 1),
    evidence: {
      alturaRelativaReferencia: round(refRatio, 4),
      alturaRelativaResultado: round(candRatio, 4),
      familia: 'no identificada; comparación de escala, no de fuente',
      estado: 'measured DOM + reference line boxes',
    },
  };
}

function effectsScore(input: FidelityInput): { score: number | null; evidence: Record<string, number | string> } {
  const expected = input.expectedEffects?.length
    ? input.expectedEffects
    : (input.spec?.effects ?? []).map((e) => ({ id: e.id, confidence: e.confidence }));
  const used = input.usedEffects ?? [];
  if (!expected.length) return { score: null, evidence: { nota: 'referencia sin efectos declarados' } };
  const matched = expected.filter((e) => used.some((u) => u.id === e.id));
  const weighted = matched.reduce((n, e) => n + (e.confidence ?? 0.5), 0) / Math.max(1, expected.reduce((n, e) => n + (e.confidence ?? 0.5), 0));
  return {
    score: round(clamp(weighted) * 100, 1),
    evidence: {
      esperados: expected.map((e) => e.id).join(', '),
      usados: used.map((e) => e.id).join(', ') || 'ninguno',
      coincidencias: matched.length,
      estado: 'estimated por etiqueta, no por píxel',
    },
  };
}

function motionScore(spec: VisualSpec | undefined, dom: DomSnapshot | undefined): { score: number | null; evidence: Record<string, number | string> } {
  if (!spec?.camera || !dom?.animations.length) return { score: null, evidence: { nota: 'sin cámara de referencia y animaciones comparables' } };
  const expectedRotation = Math.abs(spec.camera.rotationDeg);
  const rotated = dom.elements.filter((e) => e.styles.transform && e.styles.transform !== 'none').length;
  const moving = dom.animations.filter((a) => a.duration > 0).length;
  const hasRotationIntent = expectedRotation > 0.2;
  const score = hasRotationIntent ? clamp(rotated / Math.max(1, moving) + 0.35) : clamp(0.7 + moving / 40);
  return {
    score: round(score * 100, 1),
    evidence: {
      rotacionReferenciaDeg: spec.camera.rotationDeg,
      direccion: spec.camera.direction,
      elementosTransformados: rotated,
      animaciones: moving,
      estado: 'estimated: no se reconstruye la trayectoria desde CSS',
    },
  };
}

function rhythmScore(spec: VisualSpec | undefined, dom: DomSnapshot | undefined): { score: number | null; evidence: Record<string, number | string> } {
  if (!spec?.scenes.length || !dom?.animations.length) return { score: null, evidence: { nota: 'sin escenas y animaciones comparables' } };
  const sceneAvg = mean(spec.scenes.map((s) => s.duration)) * 1000;
  const animAvg = mean(dom.animations.map((a) => a.duration).filter((n) => n > 0));
  if (!animAvg) return { score: null, evidence: { nota: 'animaciones sin duración' } };
  const score = similarity(sceneAvg, animAvg, Math.max(800, sceneAvg));
  return {
    score: round(score * 100, 1),
    evidence: {
      escenaMediaMs: Math.round(sceneAvg),
      animacionMediaMs: Math.round(animAvg),
      nota: 'ritmo de escenas frente a duración media de animación; no es una alineación temporal',
    },
  };
}

function materialsScore(art: ArtDirection | undefined, dom: DomSnapshot | undefined): { score: number | null; evidence: Record<string, number | string> } {
  if (!art || !dom) return { score: null, evidence: { nota: 'sin dirección artística o DOM' } };
  const expected = art.materials.surface;
  const signals = dom.counts.materials;
  const hasBlur = dom.elements.some((e) => /blur/.test(e.styles.backdropFilter) || /blur/.test(e.styles.filter));
  const hasShadow = dom.elements.some((e) => e.styles.boxShadow && e.styles.boxShadow !== 'none');
  let score = 0.55;
  if (expected === 'flat') score = signals < 8 ? 0.9 : 0.7;
  if (expected === 'glass') score = hasBlur ? 0.9 : 0.35;
  if (expected === 'soft') score = hasShadow ? 0.88 : 0.42;
  if (expected === 'metal') score = hasShadow || /gradient/.test(dom.elements.map((e) => e.styles.backgroundColor).join(' ')) ? 0.75 : 0.5;
  if (expected === 'paper') score = signals >= 2 ? 0.78 : 0.5;
  if (expected === 'plastic') score = hasShadow && signals >= 2 ? 0.8 : 0.5;
  return {
    score: round(score * 100, 1),
    evidence: { materialDeclarado: expected, señales: signals, blur: hasBlur ? 'sí' : 'no', sombra: hasShadow ? 'sí' : 'no', estado: 'estimated desde CSS computado' },
  };
}

export function assessFidelity(input: FidelityInput): FidelityReport {
  const pixel = compareProfiles(input.reference, input.candidate).score;
  const dims: FidelityDimension[] = [];
  const add = (id: string, label: string, score: number | null, weight: number, evidence: Record<string, number | string>, note: string, status: FidelityStatus) => {
    dims.push({ id, label, score, weight, status, evidence, note });
  };

  add('composition', 'Posición y proporción de la composición', qdim(input.quality, 'composition'), 0.14,
    { medicion: 'masa por cuadrantes', nota: 'proxy, no cajas de objetos' }, 'La composición se mide por distribución de masa.', qdim(input.quality, 'composition') === null ? 'unavailable' : 'verified');
  add('layout', 'Layout y equilibrio', layoutScore(input.reference, input.candidate), 0.1,
    { metodo: 'balance horizontal/vertical del primer fotograma' }, 'No se comparan posiciones de elementos individuales sin un mapa de referencia.', 'verified');
  const type = typographyScore(input.spec, input.dom);
  add('typography', 'Tipografía y proporción', type.score, 0.12, type.evidence, 'Se compara escala relativa; la familia no se identifica.', type.score === null ? 'unavailable' : 'verified');
  add('palette', 'Paleta y coherencia cromática', qdim(input.quality, 'coherence'), 0.1,
    { metodo: 'histograma de matiz', nota: 'no evalúa si el color es apropiado' }, 'La similitud cromática no implica calidad artística.', qdim(input.quality, 'coherence') === null ? 'unavailable' : 'verified');
  add('lighting', 'Iluminación', qdim(input.quality, 'lighting'), 0.09,
    { metodo: 'luma, contraste y proporción oscura' }, 'Medida global, no dirección de luz por objeto.', qdim(input.quality, 'lighting') === null ? 'unavailable' : 'verified');
  add('depth', 'Profundidad', qdim(input.quality, 'depth'), 0.08,
    { metodo: 'dispersión de cuadrantes y detalle' }, 'Proxy declarado; no es un mapa de profundidad.', qdim(input.quality, 'depth') === null ? 'unavailable' : 'verified');
  const materials = materialsScore(input.art, input.dom);
  add('materials', 'Texturas y materiales', materials.score, 0.07, materials.evidence, 'Se infiere del CSS computado; no hay mapa de textura de referencia.', materials.score === null ? 'unavailable' : 'estimated');
  const effects = effectsScore(input);
  add('effects', 'Efectos', effects.score, 0.08, effects.evidence, 'La correspondencia es por etiqueta, no por píxel.', effects.score === null ? 'unavailable' : 'estimated');
  const motion = motionScore(input.spec, input.dom);
  add('motion', 'Trayectorias de movimiento', motion.score, 0.06, motion.evidence, 'No se reconstruye la trayectoria exacta desde CSS.', motion.score === null ? 'unavailable' : 'estimated');
  const rhythm = rhythmScore(input.spec, input.dom);
  add('rhythm', 'Duración y ritmo', rhythm.score, 0.04, rhythm.evidence, 'Ritmo global; no alineación escena a escena.', rhythm.score === null ? 'unavailable' : 'estimated');
  add('transitions', 'Transiciones', qdim(input.quality, 'transitions'), 0.04,
    { nota: 'sólo disponible con referencia temporal' }, 'Sin vídeo de referencia no se afirma la transición.', qdim(input.quality, 'transitions') === null ? 'unavailable' : 'verified');
  const coherence = frameCoherence(input.candidate);
  add('frameCoherence', 'Coherencia entre fotogramas', coherence, 0.08,
    { metodo: 'estabilidad de luminancia', nota: 'detecta parpadeo, no intención artística' }, 'La estabilidad no equivale a buena dirección.', coherence === null ? 'unavailable' : 'verified');

  const used = dims.filter((d) => d.score !== null && d.status !== 'unavailable');
  const total = used.reduce((n, d) => n + d.weight, 0);
  const score = total ? round(used.reduce((n, d) => n + d.score! * d.weight, 0) / total, 1) : 0;
  const grade: FidelityReport['grade'] = score >= 85 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : 'D';
  const warnings: string[] = [
    'La similitud de píxeles se informa aparte y no se usa para aprobar calidad artística.',
    'Layout, tipografía, materiales y movimiento se estiman con los datos disponibles; las dimensiones sin datos quedan fuera.',
  ];
  if (!input.spec) warnings.push('Sin especificación de referencia no se afirma fidelidad de posición, textura o trayectoria.');
  if (!input.dom) warnings.push('Sin DOM no se afirma la tipografía ni los materiales renderizados.');
  return {
    version: '0.5', score, grade, dimensions: dims, pixelSimilarity: pixel,
    structuralVsPixel: `Estructura ${score.toFixed(1)}/100 · píxel ${pixel.toFixed(1)}/100. No son intercambiables: una imagen puede parecerse y seguir siendo un mal diseño.`,
    warnings,
    summary: `Fidelidad estructural ${score.toFixed(1)}/100 (${grade}) · ${used.length}/${dims.length} dimensiones disponibles · similitud de píxeles ${pixel.toFixed(1)} (informativa).`,
  };
}

export function fidelityMarkdown(r: FidelityReport): string {
  const lines = [
    '# Reference Fidelity Engine 0.5',
    '',
    r.summary,
    '',
    r.structuralVsPixel,
    '',
    '| Dimensión | Puntuación | Estado | Evidencia |',
    '| --- | ---: | --- | --- |',
    ...r.dimensions.map((d) => `| ${d.label} | ${d.score === null ? '—' : d.score.toFixed(1)} | ${d.status} | ${Object.entries(d.evidence).map(([k, v]) => `${k}=${v}`).join('; ')} |`),
    '',
    '## Límites',
    '',
    ...r.warnings.map((w) => `- ${w}`),
    '',
  ];
  return lines.join('\n');
}
