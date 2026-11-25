import fs from 'node:fs';
import path from 'node:path';
import { analyzeFile, metricsFromRgb, type VisualProfile } from './analysis.js';
import { compareProfiles } from './compare.js';
import { probe, sampleFrames } from './media.js';
import { evaluateQuality, type QualityEvaluation } from './quality.js';
import { clamp, mean, round } from './util.js';

/**
 * Comparación temporal: alinea la referencia y el resultado por tiempo
 * normalizado y mide la curva de luminancia, el movimiento, los cortes y la
 * deriva. No exige que las duraciones coincidan, pero lo declara.
 */

export interface TemporalPoint {
  index: number;
  tRef: number;
  tCand: number;
  lumaRef: number;
  lumaCand: number;
  deltaLuma: number;
  contrastRef: number;
  contrastCand: number;
  edgeRef: number;
  edgeCand: number;
}

export interface TemporalComparison {
  reference: string;
  candidate: string;
  durationRef: number;
  durationCand: number;
  samples: number;
  points: TemporalPoint[];
  curves: {
    luma: number;
    lumaCurve: number;
    motionCorrelation: number;
    cutF1: number;
    driftSeconds: number;
  };
  fidelity: {
    score: number;
    paletteDeltaE: number;
    summary: string;
  };
  quality: QualityEvaluation;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  warnings: string[];
  report?: { json: string; md: string };
}

function resample(values: number[], n: number): number[] {
  if (!values.length) return new Array(n).fill(0);
  if (values.length === 1) return new Array(n).fill(values[0]);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = (i / (n - 1)) * (values.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(values.length - 1, lo + 1);
    out.push(values[lo] + (values[hi] - values[lo]) * (pos - lo));
  }
  return out;
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    num += da * db;
    va += da * da;
    vb += db * db;
  }
  return va > 1e-9 && vb > 1e-9 ? num / Math.sqrt(va * vb) : 0;
}

function cutF1(refCuts: number[], candCuts: number[], tolerance: number): number {
  if (!refCuts.length && !candCuts.length) return 1;
  const used = new Set<number>();
  let matches = 0;
  for (const r of refCuts) {
    let best = -1;
    let bestD = Infinity;
    candCuts.forEach((c, i) => {
      if (used.has(i)) return;
      const d = Math.abs(r - c);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0 && bestD <= tolerance) {
      used.add(best);
      matches++;
    }
  }
  const precision = candCuts.length ? matches / candCuts.length : 0;
  const recall = refCuts.length ? matches / refCuts.length : 0;
  return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
}

export interface TemporalOptions {
  samples?: number;
  outDir?: string;
  captureTimings?: number[];
}

export async function temporalCompare(
  reference: string,
  candidate: string,
  opts: TemporalOptions = {},
): Promise<TemporalComparison> {
  const [refInfo, candInfo] = await Promise.all([probe(reference), probe(candidate)]);
  if (refInfo.kind === 'image' || candInfo.kind === 'image') {
    throw new Error('La comparación temporal requiere dos vídeos. Para imágenes usa `ve compare`.');
  }
  const samples = Math.max(6, Math.min(24, opts.samples ?? 12));
  const width = 128;
  const [refFrames, candFrames] = await Promise.all([
    sampleFrames(reference, { count: samples, width }),
    sampleFrames(candidate, { count: samples, width }),
  ]);

  const points: TemporalPoint[] = [];
  for (let i = 0; i < Math.min(refFrames.length, candFrames.length); i++) {
    const a = metricsFromRgb(refFrames[i].rgb, refFrames[i].width, refFrames[i].height, refFrames[i].t).metrics;
    const b = metricsFromRgb(candFrames[i].rgb, candFrames[i].width, candFrames[i].height, candFrames[i].t).metrics;
    points.push({
      index: i,
      tRef: round(refFrames[i].t, 3),
      tCand: round(candFrames[i].t, 3),
      lumaRef: a.luma,
      lumaCand: b.luma,
      deltaLuma: round(b.luma - a.luma, 4),
      contrastRef: a.contrast,
      contrastCand: b.contrast,
      edgeRef: a.edgeDensity,
      edgeCand: b.edgeDensity,
    });
  }

  const lumaDeltas = points.map((p) => Math.abs(p.deltaLuma));
  const lumaScore = clamp(1 - mean(lumaDeltas) / 0.3);
  const refLuma = resample(points.map((p) => p.lumaRef), samples);
  const candLuma = resample(points.map((p) => p.lumaCand), samples);
  const curveCorr = pearson(refLuma, candLuma);

  const [refProfile, candProfile] = await Promise.all([
    analyzeFile(reference, { samples: 10, width: 160 }),
    analyzeFile(candidate, { samples: 10, width: 160 }),
  ]);
  const comparison = compareProfiles(refProfile, candProfile);
  const motionCorr = pearson(
    resample(refProfile.motionCurve, samples),
    resample(candProfile.motionCurve, samples),
  );

  const tolerance = Math.max(0.15, Math.min(refInfo.duration, candInfo.duration) * 0.06);
  const f1 = cutF1(refProfile.cuts, candProfile.cuts, tolerance);

  // Deriva: mejor desplazamiento entre las curvas de luminancia (±20% del clip).
  const maxLag = Math.max(1, Math.round(samples * 0.2));
  let bestLag = 0;
  let bestDiff = Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let diff = 0;
    let count = 0;
    for (let i = 0; i < samples; i++) {
      const j = i + lag;
      if (j < 0 || j >= samples) continue;
      diff += Math.abs(refLuma[i] - candLuma[j]);
      count++;
    }
    if (count && diff / count < bestDiff) {
      bestDiff = diff / count;
      bestLag = lag;
    }
  }
  const driftSeconds = round((bestLag / samples) * ((refInfo.duration + candInfo.duration) / 2), 3);

  const quality = evaluateQuality(refProfile, candProfile, {
    captureTimings: opts.captureTimings,
  });

  const cutWeight = refProfile.cuts.length || candProfile.cuts.length ? 0.15 : 0;
  const baseWeight = 0.4 + 0.25 + 0.2 + cutWeight;
  const score = round(
    ((comparison.score * 0.4 + lumaScore * 100 * 0.25 + clamp((motionCorr + 1) / 2) * 100 * 0.2 + f1 * 100 * cutWeight) / baseWeight),
    1,
  );
  const grade: TemporalComparison['grade'] = score >= 85 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : 'D';

  const warnings: string[] = [];
  if (Math.abs(refInfo.duration - candInfo.duration) > Math.max(0.2, refInfo.duration * 0.05)) {
    warnings.push(`Duraciones distintas (${refInfo.duration.toFixed(2)} s frente a ${candInfo.duration.toFixed(2)} s): la comparación se normaliza por tiempo.`);
  }
  if (refInfo.width / refInfo.height - candInfo.width / candInfo.height > 0.05) {
    warnings.push('Relación de aspecto distinta: la composición no es directamente comparable.');
  }
  if (candInfo.fps < 24) warnings.push(`El resultado va a ${candInfo.fps} fps; por debajo de 24 la fluidez se resiente.`);
  if (quality.dimensions.find((d) => d.id === 'performance' && !d.available)) {
    warnings.push('Rendimiento no medido: no se aportaron tiempos de captura. La dimensión queda fuera del total.');
  }

  const report = opts.outDir ? writeReport(opts.outDir, {
    reference: path.resolve(reference),
    candidate: path.resolve(candidate),
    durationRef: refInfo.duration,
    durationCand: candInfo.duration,
    samples: points.length,
    points,
    curves: {
      luma: round(lumaScore, 3),
      lumaCurve: round(curveCorr, 3),
      motionCorrelation: round(motionCorr, 3),
      cutF1: round(f1, 3),
      driftSeconds,
    },
    fidelity: { score: comparison.score, paletteDeltaE: comparison.palette.meanDeltaE, summary: comparison.summary },
    quality,
    score,
    grade,
    warnings,
  }) : undefined;

  return {
    reference: path.resolve(reference),
    candidate: path.resolve(candidate),
    durationRef: round(refInfo.duration, 3),
    durationCand: round(candInfo.duration, 3),
    samples: points.length,
    points,
    curves: {
      luma: round(lumaScore, 3),
      lumaCurve: round(curveCorr, 3),
      motionCorrelation: round(motionCorr, 3),
      cutF1: round(f1, 3),
      driftSeconds,
    },
    fidelity: { score: comparison.score, paletteDeltaE: comparison.palette.meanDeltaE, summary: comparison.summary },
    quality,
    score,
    grade,
    warnings,
    report,
  };
}

function writeReport(outDir: string, r: TemporalComparison): { json: string; md: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'temporal.json');
  const md = path.join(outDir, 'temporal.md');
  fs.writeFileSync(json, JSON.stringify(r, null, 2), 'utf8');
  const lines: string[] = [
    `# Comparación temporal — ${r.score.toFixed(1)}/100 (${r.grade})`,
    '',
    `Referencia: ${r.reference} (${r.durationRef.toFixed(2)} s)`,
    `Resultado: ${r.candidate} (${r.durationCand.toFixed(2)} s)`,
    '',
    `Puntos comparados: ${r.samples}`,
    '',
    '## Curvas',
    '',
    `- Luminancia: ${(r.curves.luma * 100).toFixed(1)}% de similitud; correlación de forma ${r.curves.lumaCurve.toFixed(3)}.`,
    `- Movimiento: correlación ${r.curves.motionCorrelation.toFixed(3)}.`,
    `- Cortes: F1 ${r.curves.cutF1.toFixed(3)}.`,
    `- Deriva temporal: ${r.curves.driftSeconds.toFixed(2)} s.`,
    '',
    '## Calidad multidimensional',
    '',
    `Total ${r.quality.overall.toFixed(1)}/100 (${r.quality.grade}).`,
    '',
    '| Dimensión | Puntuación | Disponible | Evidencia |',
    '| --- | --- | --- | --- |',
    ...r.quality.dimensions.map((d) => `| ${d.label} | ${d.score ?? '—'} | ${d.available ? 'sí' : 'no'} | ${Object.entries(d.evidence).map(([k, v]) => `${k}=${v}`).join(', ')} |`),
    '',
    '## Límites',
    '',
    ...(r.warnings.length ? r.warnings.map((w) => `- ${w}`) : ['- Sin avisos.']),
    '',
  ];
  fs.writeFileSync(md, lines.join('\n'), 'utf8');
  return { json, md };
}

export function describeTemporal(r: TemporalComparison): string[] {
  return [
    `Temporal ${r.score.toFixed(1)}/100 (${r.grade}) · ${r.samples} puntos · deriva ${r.curves.driftSeconds.toFixed(2)} s.`,
    `Luminancia ${(r.curves.luma * 100).toFixed(0)}%, correlación de curva ${r.curves.lumaCurve.toFixed(2)}, movimiento ${r.curves.motionCorrelation.toFixed(2)}, cortes F1 ${r.curves.cutF1.toFixed(2)}.`,
    r.quality.summary,
    ...r.warnings.map((w) => `Aviso: ${w}`),
  ];
}
