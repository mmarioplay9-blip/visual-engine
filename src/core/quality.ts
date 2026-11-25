import type { VisualProfile } from './analysis.js';
import { compareProfiles } from './compare.js';
import { clamp, mean, round, std } from './util.js';

/**
 * Evaluación de calidad más allá del color y del píxel:
 * fidelidad, composición, jerarquía, animación, fluidez y rendimiento.
 * Cada dimensión declara su evidencia y si está disponible. No se rellena una
 * dimensión con una suposición: si no hay datos, queda fuera y se renormaliza.
 */

export interface QualityDimension {
  id: string;
  label: string;
  score: number | null;
  weight: number;
  evidence: Record<string, number | string>;
  available: boolean;
}

export interface QualityEvaluation {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D';
  dimensions: QualityDimension[];
  summary: string;
  weightsUsed: Record<string, number>;
}

export interface QualityOptions {
  /** milisegundos reales entre capturas, para medir fluidez del render. */
  captureTimings?: number[];
  targetIntervalMs?: number;
  /** Auditoría real de contraste/tipografía hecha en el DOM por capture(). */
  accessibility?: {
    checked: number;
    violations: number;
    averageContrast: number;
    worstContrast: number;
  };
  typography?: {
    elements: number;
    headings: number;
    distinctSizes: number;
    averageFontSize: number;
    hierarchyRatio: number;
  };
  /** Número de capas/efectos activos, para detectar sobrecarga decorativa. */
  effectCount?: number;
  referenceEffectCount?: number;
}

function compositionIndex(p: VisualProfile): number {
  if (!p.frames.length) return 0.5;
  const values = p.frames.map((f) => {
    const [q0, q1, q2, q3] = f.quadrants;
    const left = q0 + q2;
    const right = q1 + q3;
    const top = q0 + q1;
    const bottom = q2 + q3;
    const balanceH = 1 - Math.abs(left - right) / Math.max(1e-6, left + right);
    const balanceV = 1 - Math.abs(top - bottom) / Math.max(1e-6, top + bottom);
    return 0.6 * balanceH + 0.4 * balanceV;
  });
  return clamp(mean(values));
}

function hierarchyIndex(p: VisualProfile): number {
  const contrast = clamp(p.aggregate.contrast / 0.3);
  const detail = clamp(p.aggregate.edgeDensity / 0.12);
  const focus = clamp(1 - Math.abs(p.aggregate.darkRatio - 0.4) / 0.6);
  return clamp(0.5 * contrast + 0.3 * detail + 0.2 * focus);
}

function similarityOfIndexes(a: number, b: number, tolerance: number): number {
  return clamp(1 - Math.abs(a - b) / tolerance);
}

function depthIndex(p: VisualProfile): number {
  if (!p.frames.length) return 0.5;
  // Proxy declarado: dispersión de masa entre cuadrantes + detalle. No es un mapa de profundidad.
  const spreads = p.frames.map((f) => std(f.quadrants));
  return clamp(0.65 * mean(spreads) * 3.2 + 0.35 * clamp(p.aggregate.edgeDensity / 0.12));
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? clamp(dot / Math.sqrt(na * nb)) : 0;
}

function lightingIndex(reference: VisualProfile, candidate: VisualProfile): number {
  const luma = similarityOfIndexes(reference.aggregate.luma, candidate.aggregate.luma, 0.35);
  const contrast = similarityOfIndexes(reference.aggregate.contrast, candidate.aggregate.contrast, 0.22);
  const dark = similarityOfIndexes(reference.aggregate.darkRatio, candidate.aggregate.darkRatio, 0.45);
  return clamp(0.45 * luma + 0.4 * contrast + 0.15 * dark);
}

function typographyIndex(input: QualityOptions['typography'], fallbackHierarchy: number): number {
  if (!input) return clamp(fallbackHierarchy);
  const sizes = clamp(input.distinctSizes / 4);
  const readable = clamp(input.averageFontSize / 18);
  const hierarchy = clamp(input.hierarchyRatio / 3);
  return clamp(0.35 * sizes + 0.35 * readable + 0.3 * hierarchy);
}

function accessibilityIndex(input: QualityOptions['accessibility']): number | null {
  if (!input || input.checked <= 0) return null;
  const contrast = clamp(input.averageContrast / 7);
  const pass = clamp(1 - input.violations / input.checked);
  return clamp(0.6 * contrast + 0.4 * pass);
}

export function evaluateQuality(
  reference: VisualProfile,
  candidate: VisualProfile,
  opts: QualityOptions = {},
): QualityEvaluation {
  const fidelity = compareProfiles(reference, candidate).score;

  const refComposition = compositionIndex(reference);
  const candComposition = compositionIndex(candidate);
  const composition = round(similarityOfIndexes(refComposition, candComposition, 0.5) * 100, 1);

  const refHierarchy = hierarchyIndex(reference);
  const candHierarchy = hierarchyIndex(candidate);
  const hierarchy = round(similarityOfIndexes(refHierarchy, candHierarchy, 0.5) * 100, 1);

  const bothMoving = reference.kind !== 'image' && candidate.kind !== 'image';
  let animation: number | null = null;
  let animationEvidence: Record<string, number | string> = {};
  if (bothMoving) {
    const motionSim = similarityOfIndexes(reference.motion, candidate.motion, 0.25);
    const paceSim = reference.pace > 0 ? similarityOfIndexes(reference.pace, candidate.pace, Math.max(8, reference.pace)) : 1;
    const cutSim = reference.cuts.length
      ? similarityOfIndexes(reference.cuts.length, candidate.cuts.length, Math.max(1, reference.cuts.length))
      : 1;
    animation = round((0.5 * motionSim + 0.3 * paceSim + 0.2 * cutSim) * 100, 1);
    animationEvidence = {
      movimientoReferencia: reference.motion,
      movimientoResultado: candidate.motion,
      cortesReferencia: reference.cuts.length,
      cortesResultado: candidate.cuts.length,
      ritmoReferencia: reference.pace,
      ritmoResultado: candidate.pace,
    };
  }

  // Fluidez del resultado: suavidad de la curva de movimiento + estabilidad de la luz.
  let fluidity: number | null = null;
  let fluidityEvidence: Record<string, number | string> = {};
  if (candidate.motionCurve.length >= 3) {
    const second = candidate.motionCurve.slice(2).map((v, i) => Math.abs(v - 2 * candidate.motionCurve[i + 1] + candidate.motionCurve[i]));
    const jerk = mean(second);
    const lumaDeltas = candidate.frames.slice(1).map((f, i) => Math.abs(f.luma - candidate.frames[i].luma));
    const flicker = std(lumaDeltas);
    fluidity = round((clamp(1 - jerk * 10) * 0.6 + clamp(1 - flicker * 15) * 0.4) * 100, 1);
    fluidityEvidence = { jerk: round(jerk, 4), parpadeo: round(flicker, 4), muestras: candidate.motionCurve.length };
  }

  let performance: number | null = null;
  let performanceEvidence: Record<string, number | string> = {};
  const captureTimings = opts.captureTimings;
  if (captureTimings && captureTimings.length >= 3) {
    const intervals = captureTimings.slice(1).map((t, i) => t - captureTimings[i]);
    const m = mean(intervals);
    const jitter = m > 0 ? std(intervals) / m : 0;
    const expected = opts.targetIntervalMs;
    const drift = expected ? Math.abs(m - expected) / expected : 0;
    performance = round(clamp(1 - jitter * 1.5 - drift * 0.5) * 100, 1);
    performanceEvidence = {
      intervaloMedioMs: round(m, 1),
      intervaloTargetMs: expected ?? 'no indicado',
      jitterRelativo: round(jitter, 3),
      capturas: captureTimings.length,
    };
  }

  const depth = round(similarityOfIndexes(depthIndex(reference), depthIndex(candidate), 0.5) * 100, 1);
  const lighting = round(lightingIndex(reference, candidate) * 100, 1);
  const typography = round(typographyIndex(opts.typography, candHierarchy) * 100, 1);
  const coherence = round(cosine(reference.hueHistogram, candidate.hueHistogram) * 100, 1);
  const accessibility = accessibilityIndex(opts.accessibility);
  let transitions: number | null = null;
  let transitionEvidence: Record<string, number | string> = {};
  if (bothMoving) {
    const cuts = similarityOfIndexes(reference.cuts.length, candidate.cuts.length, Math.max(1, reference.cuts.length + 1));
    const pace = reference.pace > 0 ? similarityOfIndexes(reference.pace, candidate.pace, Math.max(6, reference.pace)) : 1;
    transitions = round((0.6 * cuts + 0.4 * pace) * 100, 1);
    transitionEvidence = { cortesReferencia: reference.cuts.length, cortesResultado: candidate.cuts.length, ritmoReferencia: reference.pace, ritmoResultado: candidate.pace };
  }
  let restraint: number | null = null;
  if (typeof opts.effectCount === 'number') {
    const expected = Math.max(1, opts.referenceEffectCount ?? 3);
    restraint = round(clamp(1 - Math.max(0, opts.effectCount - expected) / (expected + 6)) * 100, 1);
  }

  const dims: QualityDimension[] = [
    { id: 'fidelity', label: 'Fidelidad a la referencia', score: fidelity, weight: 0.3, evidence: { puntuacion: fidelity }, available: true },
    {
      id: 'composition', label: 'Composición', score: composition, weight: 0.12,
      evidence: { referencia: round(refComposition, 3), resultado: round(candComposition, 3), equilibrio: 'masa por cuadrantes' },
      available: true,
    },
    {
      id: 'hierarchy', label: 'Jerarquía visual', score: hierarchy, weight: 0.08,
      evidence: { referencia: round(refHierarchy, 3), resultado: round(candHierarchy, 3), base: 'contraste, detalle y foco' },
      available: true,
    },
    {
      id: 'typography', label: 'Tipografía y legibilidad', score: typography, weight: 0.06,
      evidence: opts.typography
        ? { ...opts.typography, fuente: 'DOM real (capture)' }
        : { nota: 'proxy estructural: sin auditoría DOM, no se afirma tipografía real' },
      available: true,
    },
    {
      id: 'depth', label: 'Profundidad', score: depth, weight: 0.05,
      evidence: { referencia: round(depthIndex(reference), 3), resultado: round(depthIndex(candidate), 3), nota: 'proxy de cuadrantes y detalle; no mapa métrico' },
      available: true,
    },
    {
      id: 'lighting', label: 'Iluminación', score: lighting, weight: 0.07,
      evidence: { lumaReferencia: reference.aggregate.luma, lumaResultado: candidate.aggregate.luma, contrasteReferencia: reference.aggregate.contrast, contrasteResultado: candidate.aggregate.contrast },
      available: true,
    },
    { id: 'animation', label: 'Animación', score: animation, weight: 0.1, evidence: animationEvidence, available: animation !== null },
    { id: 'transitions', label: 'Transiciones y ritmo', score: transitions, weight: 0.04, evidence: transitionEvidence, available: transitions !== null },
    {
      id: 'coherence', label: 'Coherencia estética', score: coherence, weight: 0.05,
      evidence: { histogramaDeMatiz: 'coseno entre referencias y resultado', valor: round(coherence / 100, 3) },
      available: true,
    },
    {
      id: 'accessibility', label: 'Accesibilidad de contraste', score: accessibility === null ? null : round(accessibility * 100, 1), weight: 0.07,
      evidence: opts.accessibility ? { ...opts.accessibility, norma: 'WCAG AA orientativo (4.5:1; 3:1 texto grande)' } : { nota: 'sin auditoría DOM; no se inventa una puntuación' },
      available: accessibility !== null,
    },
    { id: 'fluidity', label: 'Fluidez', score: fluidity, weight: 0.03, evidence: fluidityEvidence, available: fluidity !== null },
    { id: 'performance', label: 'Rendimiento', score: performance, weight: 0.03, evidence: performanceEvidence, available: performance !== null },
    { id: 'restraint', label: 'Contención decorativa', score: restraint, weight: 0.02, evidence: restraint === null ? { nota: 'sin recuento de efectos' } : { efectos: opts.effectCount ?? 0, referencia: opts.referenceEffectCount ?? 3 }, available: restraint !== null },
  ];

  const used = dims.filter((d) => d.available && d.score !== null);
  const totalWeight = used.reduce((a, d) => a + d.weight, 0);
  const overall = totalWeight ? round(used.reduce((a, d) => a + d.score! * d.weight, 0) / totalWeight, 1) : 0;
  const grade: QualityEvaluation['grade'] = overall >= 85 ? 'A' : overall >= 72 ? 'B' : overall >= 58 ? 'C' : 'D';
  const weightsUsed = Object.fromEntries(used.map((d) => [d.id, round(d.weight / totalWeight, 3)]));

  return {
    overall,
    grade,
    dimensions: dims,
    summary:
      `Calidad ${overall.toFixed(1)}/100 (${grade}) · fidelidad ${fidelity.toFixed(1)} · composición ${composition.toFixed(1)} · jerarquía ${hierarchy.toFixed(1)}` +
      (animation !== null ? ` · animación ${animation.toFixed(1)}` : '') +
      ` · tipografía ${typography.toFixed(1)} · profundidad ${depth.toFixed(1)} · iluminación ${lighting.toFixed(1)}` +
      (transitions !== null ? ` · transiciones ${transitions.toFixed(1)}` : '') +
      ` · coherencia ${coherence.toFixed(1)}` +
      (accessibility !== null ? ` · accesibilidad ${(accessibility * 100).toFixed(1)}` : '') +
      (fluidity !== null ? ` · fluidez ${fluidity.toFixed(1)}` : '') +
      (performance !== null ? ` · rendimiento ${performance.toFixed(1)}` : '') +
      '.',
    weightsUsed,
  };
}

/** Perfil mínimo para comparar sin volver a ejecutar FFmpeg. */
export function qualityToJson(q: QualityEvaluation) {
  return {
    overall: q.overall,
    grade: q.grade,
    summary: q.summary,
    weightsUsed: q.weightsUsed,
    dimensions: q.dimensions,
  };
}
