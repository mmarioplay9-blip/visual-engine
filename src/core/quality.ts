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

  const dims: QualityDimension[] = [
    { id: 'fidelity', label: 'Fidelidad a la referencia', score: fidelity, weight: 0.35, evidence: { puntuacion: fidelity }, available: true },
    {
      id: 'composition', label: 'Composición', score: composition, weight: 0.2,
      evidence: { referencia: round(refComposition, 3), resultado: round(candComposition, 3), equilibrio: 'masa por cuadrantes' },
      available: true,
    },
    {
      id: 'hierarchy', label: 'Jerarquía visual', score: hierarchy, weight: 0.15,
      evidence: { referencia: round(refHierarchy, 3), resultado: round(candHierarchy, 3), base: 'contraste, detalle y foco' },
      available: true,
    },
    { id: 'animation', label: 'Animación', score: animation, weight: 0.15, evidence: animationEvidence, available: animation !== null },
    { id: 'fluidity', label: 'Fluidez', score: fluidity, weight: 0.1, evidence: fluidityEvidence, available: fluidity !== null },
    { id: 'performance', label: 'Rendimiento', score: performance, weight: 0.05, evidence: performanceEvidence, available: performance !== null },
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
