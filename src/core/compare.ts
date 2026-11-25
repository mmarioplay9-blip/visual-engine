import path from 'node:path';
import { sampleFrames, rgbToPng } from './media.js';
import type { VisualProfile } from './analysis.js';
import { clamp, deltaE, mean, round } from './util.js';

export interface MetricDelta {
  metric: string;
  reference: number;
  candidate: number;
  delta: number;
  similarity: number;
  weight: number;
}

export interface Comparison {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  metrics: MetricDelta[];
  palette: {
    reference: string[];
    candidate: string[];
    meanDeltaE: number;
    similarity: number;
    missing: { hex: string; share: number; nearest: string }[];
    extra: { hex: string; share: number }[];
  };
  recommendations: string[];
  summary: string;
}

const W = {
  palette: 0.3,
  luma: 0.14,
  contrast: 0.14,
  saturation: 0.1,
  colorfulness: 0.07,
  edges: 0.12,
  motion: 0.13,
};

function simFromDelta(delta: number, tolerate: number): number {
  return clamp(1 - delta / tolerate);
}

function nearestHex(target: [number, number, number], list: { hex: string; rgb: [number, number, number] }[]) {
  let best = list[0]?.hex ?? '#000000';
  let bestD = Infinity;
  for (const c of list) {
    const d = deltaE(target, c.rgb);
    if (d < bestD) {
      bestD = d;
      best = c.hex;
    }
  }
  return { hex: best, distance: bestD };
}

/** Compara dos perfiles visuales producidos por el analizador. Determinista y explicable. */
export function compareProfiles(reference: VisualProfile, candidate: VisualProfile): Comparison {
  const metrics: MetricDelta[] = [];
  const add = (metric: string, ref: number, cand: number, weight: number, tolerate: number) => {
    const delta = Math.abs(ref - cand);
    metrics.push({
      metric,
      reference: round(ref, 4),
      candidate: round(cand, 4),
      delta: round(delta, 4),
      similarity: round(simFromDelta(delta, tolerate), 4),
      weight,
    });
  };

  add('luminancia', reference.aggregate.luma, candidate.aggregate.luma, W.luma, 0.3);
  add('contraste', reference.aggregate.contrast, candidate.aggregate.contrast, W.contrast, 0.2);
  add('saturación', reference.aggregate.saturation, candidate.aggregate.saturation, W.saturation, 0.35);
  add('colorido', reference.aggregate.colorfulness, candidate.aggregate.colorfulness, W.colorfulness, 0.5);
  add('densidad de bordes', reference.aggregate.edgeDensity, candidate.aggregate.edgeDensity, W.edges, 0.25);

  const bothMoving = reference.kind !== 'image' && candidate.kind !== 'image';
  if (bothMoving) {
    add('movimiento', reference.motion, candidate.motion, W.motion, 0.22);
  }

  // Paleta: cada color de referencia se empareja con el más cercano del candidato.
  const paletteRef = reference.palette;
  const paletteCand = candidate.palette;
  const missing: { hex: string; share: number; nearest: string }[] = [];
  let weightedDE = 0;
  let weightSum = 0;
  for (const refColor of paletteRef) {
    const near = nearestHex(refColor.rgb, paletteCand);
    weightedDE += near.distance * refColor.share;
    weightSum += refColor.share;
    if (near.distance > 22) missing.push({ hex: refColor.hex, share: refColor.share, nearest: near.hex });
  }
  const paletteDeltaE = weightSum ? weightedDE / weightSum : 0;
  const paletteSimilarity = clamp(1 - paletteDeltaE / 55);

  const extra = paletteCand
    .filter((c) => {
      const near = nearestHex(c.rgb, paletteRef);
      return near.distance > 40 && c.share >= 0.05;
    })
    .map((c) => ({ hex: c.hex, share: c.share }));

  const totalWeight =
    W.luma + W.contrast + W.saturation + W.colorfulness + W.edges + (bothMoving ? W.motion : 0) + W.palette;
  const weighted =
    metrics.reduce((acc, m) => acc + m.similarity * m.weight, 0) + paletteSimilarity * W.palette;
  const score = Math.round((weighted / totalWeight) * 1000) / 10;
  const grade: Comparison['grade'] = score >= 88 ? 'A' : score >= 74 ? 'B' : score >= 58 ? 'C' : 'D';

  const recommendations: string[] = [];
  const refA = reference.aggregate;
  const candA = candidate.aggregate;
  const dLuma = candA.luma - refA.luma;

  if (paletteDeltaE > 12) {
    recommendations.push(
      `Paleta: la referencia usa ${paletteRef.slice(0, 3).map((c) => c.hex).join(', ')}; el resultado ${paletteCand.slice(0, 3).map((c) => c.hex).join(', ')}. ` +
      `Cambia los colores base (fondo, acento, texto) a los hex de referencia; no añadas tonos nuevos.`,
    );
  }
  if (missing.length) {
    recommendations.push(
      `Faltan acentos de la referencia: ${missing.map((m) => `${m.hex} (${(m.share * 100).toFixed(0)}%)`).join(', ')}. ` +
      `Úsalos en elementos pequeños (bordes, indicadores, brillos), no como fondo completo.`,
    );
  }
  if (extra.length) {
    recommendations.push(
      `Sobran colores ajenos a la referencia: ${extra.map((e) => e.hex).join(', ')}. Reduce su área o elimínalos.`,
    );
  }
  if (Math.abs(dLuma) > 0.08) {
    recommendations.push(
      dLuma > 0
        ? `El resultado es ${(dLuma * 100).toFixed(1)} puntos más claro. Oscurece el fondo/base y baja la exposición de las capas grandes.`
        : `El resultado es ${(Math.abs(dLuma) * 100).toFixed(1)} puntos más oscuro. Aclara la base o sube el brillo de las capas grandes.`,
    );
  }
  if (candA.contrast < refA.contrast - 0.04) {
    recommendations.push(
      `Contraste bajo (${(candA.contrast * 100).toFixed(1)}% frente a ${(refA.contrast * 100).toFixed(1)}%). ` +
      `Añade profundidad real: degradados, sombras suaves y un foco de luz; evita fondos planos.`,
    );
  }
  if (candA.edgeDensity < refA.edgeDensity - 0.03) {
    recommendations.push(
      `Poca densidad de detalle (${(candA.edgeDensity * 100).toFixed(1)}% frente a ${(refA.edgeDensity * 100).toFixed(1)}%). ` +
      `Introduce micro-detalle: grano, retícula, líneas guía o partículas pequeñas.`,
    );
  }
  if (candA.saturation < refA.saturation - 0.1 && refA.saturation > 0.2) {
    recommendations.push('El resultado está desaturado respecto a la referencia: sube la saturación solo de los acentos, no del fondo.');
  }
  if (bothMoving && candidate.motion < reference.motion - 0.02) {
    recommendations.push(
      `Movimiento insuficiente (${(candidate.motion * 100).toFixed(2)} frente a ${(reference.motion * 100).toFixed(2)}). ` +
      `Amplía el recorrido o añade una capa con desplazamiento continuo; no aceleres lo que ya existe.`,
    );
  }
  if (bothMoving && reference.pace > 0 && candidate.pace === 0 && reference.pace >= 8) {
    recommendations.push(`La referencia corta cada ${(60 / reference.pace).toFixed(1)} s. Introduce transiciones o cambios de plano con ese ritmo.`);
  }
  if (!recommendations.length) {
    recommendations.push('Sin diferencias medibles por encima del umbral. Revisa a ojo detalles de composición y legibilidad del texto.');
  }

  const summary =
    `Fidelidad ${score.toFixed(1)}/100 (${grade}). ` +
    `ΔE paleta ${paletteDeltaE.toFixed(1)}, Δ luminancia ${(dLuma * 100).toFixed(1)}%, ` +
    `Δ contraste ${((candA.contrast - refA.contrast) * 100).toFixed(1)}%` +
    (bothMoving ? `, Δ movimiento ${((candidate.motion - reference.motion) * 100).toFixed(2)}.` : '.');

  return {
    score,
    grade,
    metrics,
    palette: {
      reference: paletteRef.map((c) => c.hex),
      candidate: paletteCand.map((c) => c.hex),
      meanDeltaE: round(paletteDeltaE, 2),
      similarity: round(paletteSimilarity, 4),
      missing,
      extra,
    },
    recommendations,
    summary,
  };
}

export interface ImageComparison {
  width: number;
  height: number;
  mae: number;
  rmse: number;
  deltaE: number;
  ssim: number;
  paletteDeltaE: number;
  heatmap: string;
  score: number;
}

function toGray(rgb: Buffer, width: number, height: number): Float32Array {
  const g = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 3;
    g[i] = 0.2126 * rgb[o] + 0.7152 * rgb[o + 1] + 0.0722 * rgb[o + 2];
  }
  return g;
}

/** SSIM por bloques de 8x8 (ventana uniforme). Aproximación local, estable para revisión visual. */
function ssim(grayA: Float32Array, grayB: Float32Array, width: number, height: number, block = 8): number {
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  let total = 0;
  let blocks = 0;
  for (let by = 0; by + block <= height; by += block) {
    for (let bx = 0; bx + block <= width; bx += block) {
      let ma = 0;
      let mb = 0;
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          const i = (by + y) * width + bx + x;
          ma += grayA[i];
          mb += grayB[i];
        }
      }
      const n = block * block;
      ma /= n;
      mb /= n;
      let va = 0;
      let vb = 0;
      let cov = 0;
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          const i = (by + y) * width + bx + x;
          const da = grayA[i] - ma;
          const db = grayB[i] - mb;
          va += da * da;
          vb += db * db;
          cov += da * db;
        }
      }
      va /= n;
      vb /= n;
      cov /= n;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      blocks++;
    }
  }
  return blocks ? total / blocks : 0;
}

/** Comparación píxel a píxel de dos imágenes, con mapa de calor PNG real. */
export async function compareImages(
  refPath: string,
  candPath: string,
  opts: { width?: number; height?: number; outDir?: string } = {},
): Promise<ImageComparison> {
  const width = opts.width ?? 160;
  const [a] = await sampleFrames(refPath, { count: 1, width, height: opts.height });
  const [b] = await sampleFrames(candPath, { count: 1, width, height: opts.height });
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error('Las imágenes no comparten resolución de muestreo');
  }
  const w = a.width;
  const h = a.height;
  let sumAbs = 0;
  let sumSq = 0;
  let sumDE = 0;
  const heat = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const o = i * 3;
    const ar = a.rgb[o];
    const ag = a.rgb[o + 1];
    const ab = a.rgb[o + 2];
    const br = b.rgb[o];
    const bg = b.rgb[o + 1];
    const bb = b.rgb[o + 2];
    const dr = ar - br;
    const dg = ag - bg;
    const db = ab - bb;
    sumAbs += Math.abs(dr) + Math.abs(dg) + Math.abs(db);
    sumSq += dr * dr + dg * dg + db * db;
    sumDE += deltaE([ar, ag, ab], [br, bg, bb]);
    const mag = clamp(Math.hypot(dr, dg, db) / 90);
    heat[o] = Math.round(255 * mag);
    heat[o + 1] = Math.round(60 * (1 - mag));
    heat[o + 2] = Math.round(160 * (1 - mag) + 95 * mag);
  }
  const mae = sumAbs / (w * h * 3) / 255;
  const rmse = Math.sqrt(sumSq / (w * h * 3)) / 255;
  const meanDE = sumDE / (w * h);
  const s = ssim(toGray(a.rgb, w, h), toGray(b.rgb, w, h), w, h);
  const heatmap = await rgbToPng(heat, w, h, path.join(opts.outDir ?? '.', 'heatmap.png'));
  const score = Math.round(clamp(0.55 * s + 0.25 * (1 - mae * 2) + 0.2 * (1 - Math.min(1, meanDE / 45))) * 1000) / 10;

  return {
    width: w,
    height: h,
    mae: round(mae, 4),
    rmse: round(rmse, 4),
    deltaE: round(meanDE, 2),
    ssim: round(s, 4),
    paletteDeltaE: round(meanDE, 2),
    heatmap,
    score,
  };
}
