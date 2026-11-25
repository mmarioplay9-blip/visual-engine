import type { FrameSample } from './media.js';
import {
  boxBlur,
  connectedComponents,
  correlateAt,
  grayFromRgb,
  laplacianVariance,
  mirrorCorrelation,
  sobel,
  type Box,
} from './pixels.js';
import { clamp, mean, median, round } from './util.js';

/**
 * Inspección de contenido de un fotograma sin modelos externos.
 *
 * Honestidad de cada señal:
 * - Formas (círculos y líneas): geométricas, verificadas si superan el umbral
 *   de votos. No se clasifican objetos.
 * - Texto: se detectan regiones con estructura de línea; sin Tesseract no hay
 *   lectura. Estado "estimated" y método declarado.
 * - Regiones salientes: contraste/saturación; no tienen etiqueta semántica.
 * - Profundidad: proxy de nitidez y gradiente vertical; estado "estimated".
 */

export interface CompositionAnalysis {
  thirds: number;
  balanceHorizontal: number;
  balanceVertical: number;
  symmetryHorizontal: number;
  symmetryVertical: number;
  negativeSpace: number;
  centerBias: number;
  horizonY: number | null;
  dominantAngleDeg: number;
  leadingLines: number;
  notes: string[];
}

export interface ShapeDetection {
  type: 'círculo' | 'línea horizontal' | 'línea vertical';
  cx?: number;
  cy?: number;
  r?: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence: number;
  verified: boolean;
  evidence: Record<string, number>;
}

export interface TextLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  heightRatio: number;
  components: number;
  confidence: number;
  status: 'estimated' | 'verified';
  text?: string;
}

export interface SalientRegion {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  share: number;
  salience: number;
  label: 'región saliente';
  status: 'estimated';
}

export interface DepthAnalysis {
  status: 'estimated';
  method: string;
  layers: { name: string; cellShare: number; sharpness: number }[];
  verticalGradient: number;
  horizonY: number | null;
  note: string;
}

export interface ContentAnalysis {
  width: number;
  height: number;
  framesAnalyzed: number;
  composition: CompositionAnalysis;
  shapes: ShapeDetection[];
  textLines: TextLine[];
  salient: SalientRegion[];
  depth: DepthAnalysis;
  ocr: { available: boolean; reason: string; lines?: { text: string; confidence: number; box: [number, number, number, number] }[] };
  warnings: string[];
}

interface FrameInspection {
  composition: CompositionAnalysis;
  shapes: ShapeDetection[];
  textLines: TextLine[];
  salient: SalientRegion[];
  depth: DepthAnalysis;
}

function satMap(rgb: Buffer, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const o = i * 3;
    const mx = Math.max(rgb[o], rgb[o + 1], rgb[o + 2]);
    const mn = Math.min(rgb[o], rgb[o + 1], rgb[o + 2]);
    out[i] = mx === 0 ? 0 : (mx - mn) / mx;
  }
  return out;
}

function flipHorizontal(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[y * width + x] = gray[y * width + (width - 1 - x)];
  }
  return out;
}

function rowEnergy(gy: Float32Array, width: number, height: number): number[] {
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let s = 0;
    for (let x = 0; x < width; x++) s += Math.abs(gy[y * width + x]);
    rows[y] = s / width;
  }
  return rows;
}

function compositionOf(gray: Float32Array, mag: Float32Array, angle: Float32Array, width: number, height: number): CompositionAnalysis {
  const n = width * height;
  let totalMag = 0;
  let lumaSum = 0;
  const cells = new Array(9).fill(0);
  let cxSum = 0;
  let cySum = 0;
  const strong = { count: 0, nearDominant: 0 };
  const angleHist = new Array(18).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const m = mag[i];
      totalMag += m;
      lumaSum += gray[i];
      const cell = Math.min(2, Math.floor((y / height) * 3)) * 3 + Math.min(2, Math.floor((x / width) * 3));
      cells[cell] += m;
      cxSum += x * m;
      cySum += y * m;
      if (m > 80) {
        strong.count++;
        const a = ((angle[i] * 180) / Math.PI + 180) % 180;
        angleHist[Math.min(17, Math.floor(a / 10))] += m;
      }
    }
  }

  const cellTotal = cells.reduce((a, b) => a + b, 0) || 1;
  let negativeCells = 0;
  for (const c of cells) if (c / cellTotal < 0.02) negativeCells++;

  // Masa cerca de las cuatro intersecciones de tercios.
  let thirdsMass = 0;
  const radius = Math.max(4, Math.round(Math.min(width, height) * 0.1));
  for (const [tx, ty] of [[1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]]) {
    const px = tx * width;
    const py = ty * height;
    for (let y = Math.max(0, Math.floor(py - radius)); y < Math.min(height, Math.ceil(py + radius)); y++) {
      for (let x = Math.max(0, Math.floor(px - radius)); x < Math.min(width, Math.ceil(px + radius)); x++) {
        if (Math.hypot(x - px, y - py) <= radius) thirdsMass += mag[y * width + x];
      }
    }
  }

  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = gray[y * width + x];
      if (x < width / 2) left += l;
      else right += l;
      if (y < height / 2) top += l;
      else bottom += l;
    }
  }

  const flipped = flipHorizontal(gray, width, height);
  const symH = correlateAt(flipped, gray, width, height, 0, 0);
  const symV = mirrorCorrelation(gray, width, height, height / 2);

  // Horizonte: fila con más energía de borde horizontal (gy).
  const gy = new Float32Array(n);
  for (let i = 0; i < n; i++) gy[i] = mag[i] * Math.abs(Math.sin(angle[i]));
  const rows = rowEnergy(gy, width, height);
  let bestRow = 0;
  let rowMean = 0;
  rows.forEach((v, i) => {
    rowMean += v;
    if (v > rows[bestRow]) bestRow = i;
  });
  rowMean /= rows.length;
  const horizonY = rows[bestRow] > rowMean * 1.8 ? round(bestRow / height, 3) : null;

  let bestBin = 0;
  angleHist.forEach((v, i) => {
    if (v > angleHist[bestBin]) bestBin = i;
  });
  const dominantAngleDeg = bestBin * 10 + 5;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (mag[i] < 80) continue;
      const a = ((angle[i] * 180) / Math.PI + 180) % 180;
      const d = Math.min(Math.abs(a - dominantAngleDeg), 180 - Math.abs(a - dominantAngleDeg));
      if (d < 12) strong.nearDominant++;
    }
  }

  const massX = totalMag ? cxSum / totalMag / width : 0.5;
  const massY = totalMag ? cySum / totalMag / height : 0.5;
  const balanceHorizontal = clamp(1 - Math.abs(left - right) / Math.max(1, left + right));
  const balanceVertical = clamp(1 - Math.abs(top - bottom) / Math.max(1, top + bottom));
  const notes: string[] = [];
  if (balanceHorizontal < 0.55) notes.push('Composición cargada a un lado: revisa si es intencionado.');
  if (negativeCells >= 7) notes.push('Mucho espacio negativo: el foco debe estar claro.');
  if (horizonY !== null) notes.push(`Línea horizontal dominante en y=${(horizonY * 100).toFixed(0)}%.`);

  return {
    thirds: round(clamp(thirdsMass / Math.max(1, totalMag) * 2.2)),
    balanceHorizontal: round(balanceHorizontal),
    balanceVertical: round(balanceVertical),
    symmetryHorizontal: round(clamp((symH + 1) / 2)),
    symmetryVertical: round(clamp((symV + 1) / 2)),
    negativeSpace: round(negativeCells / 9),
    centerBias: round(clamp(1 - Math.hypot(massX - 0.5, massY - 0.5) * 2)),
    horizonY,
    dominantAngleDeg,
    leadingLines: round(strong.count ? strong.nearDominant / strong.count : 0),
    notes,
  };
}

/** Círculos por votación de centros a lo largo del gradiente. */
export function detectCircles(
  mag: Float32Array,
  angle: Float32Array,
  width: number,
  height: number,
): ShapeDetection[] {
  const edges: { x: number; y: number; a: number; m: number }[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (mag[i] > 70) edges.push({ x, y, a: angle[i], m: mag[i] });
    }
  }
  if (edges.length < 20) return [];
  const maxR = Math.round(Math.min(width, height) * 0.45);
  const candidates: { cx: number; cy: number; r: number; score: number }[] = [];

  for (let r = 12; r <= maxR; r += 3) {
    const acc = new Float32Array(width * height);
    for (const e of edges) {
      const ca = Math.cos(e.a);
      const sa = Math.sin(e.a);
      for (const sign of [1, -1]) {
        const cx = Math.round(e.x + sign * r * ca);
        const cy = Math.round(e.y + sign * r * sa);
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
        acc[cy * width + cx] += 1;
      }
    }
    let bx = 0;
    let by = 0;
    let bv = 0;
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const v = acc[y * width + x];
        if (v > bv) {
          bv = v;
          bx = x;
          by = y;
        }
      }
    }
    const score = bv / Math.max(1, 2 * Math.PI * r);
    if (score > 0.1) candidates.push({ cx: bx, cy: by, r, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  const kept: typeof candidates = [];
  for (const c of candidates) {
    if (kept.some((k) => Math.hypot(k.cx - c.cx, k.cy - c.cy) < Math.max(6, c.r * 0.5) && Math.abs(k.r - c.r) < c.r * 0.4)) continue;
    kept.push(c);
    if (kept.length >= 3) break;
  }
  return kept.map((c) => ({
    type: 'círculo' as const,
    cx: c.cx,
    cy: c.cy,
    r: c.r,
    x0: Math.max(0, c.cx - c.r),
    y0: Math.max(0, c.cy - c.r),
    x1: Math.min(width - 1, c.cx + c.r),
    y1: Math.min(height - 1, c.cy + c.r),
    confidence: round(clamp(c.score / 0.35)),
    verified: c.score >= 0.12,
    evidence: { votes: round(c.score, 3), radius: c.r },
  }));
}

/** Líneas horizontales/verticales largas a partir de la proyección de bordes. */
export function detectLines(mag: Float32Array, width: number, height: number): ShapeDetection[] {
  const shapes: ShapeDetection[] = [];
  const rows = new Array(height).fill(0);
  const cols = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mag[y * width + x] > 70) {
        rows[y]++;
        cols[x]++;
      }
    }
  }
  const add = (type: ShapeDetection['type'], pos: number, length: number, horizontal: boolean) => {
    const confidence = clamp(length / (horizontal ? width : height));
    shapes.push({
      type,
      x0: horizontal ? 0 : Math.max(0, pos - 1),
      y0: horizontal ? Math.max(0, pos - 1) : 0,
      x1: horizontal ? width - 1 : Math.min(width - 1, pos + 1),
      y1: horizontal ? Math.min(height - 1, pos + 1) : height - 1,
      confidence: round(confidence),
      verified: confidence > 0.35,
      evidence: { edgePixels: length, length: horizontal ? width : height },
    });
  };
  rows.forEach((v, y) => {
    if (v > width * 0.35) add('línea horizontal', y, v, true);
  });
  cols.forEach((v, x) => {
    if (v > height * 0.35) add('línea vertical', x, v, false);
  });
  // Agrupa líneas adyacentes para no devolver 20 filas del mismo borde.
  const grouped: ShapeDetection[] = [];
  for (const s of shapes) {
    if (grouped.some((g) => g.type === s.type && Math.abs((s.type === 'línea horizontal' ? g.y0 : g.x0) - (s.type === 'línea horizontal' ? s.y0 : s.x0)) <= 3)) continue;
    grouped.push(s);
  }
  return grouped.slice(0, 6);
}

/** Regiones con estructura de línea de texto. Sin OCR: estado estimado. */
export function detectTextLines(mag: Float32Array, gray: Float32Array, width: number, height: number): TextLine[] {
  const mask = new Uint8Array(width * height);
  let bright = 0;
  for (let i = 0; i < mask.length; i++) if (gray[i] > 170) bright++;
  const useBright = bright / mask.length < 0.25;
  for (let i = 0; i < mask.length; i++) mask[i] = (useBright ? gray[i] > 170 : gray[i] < 70) ? 1 : 0;
  const comps = connectedComponents(mask, width, height, { minArea: 4, maxArea: Math.max(400, width * height * 0.03) });
  const letters = comps.filter((b) => {
    const w = b.x1 - b.x0 + 1;
    const h = b.y1 - b.y0 + 1;
    return h >= 3 && h <= height * 0.25 && w >= 2 && w <= width * 0.4 && w / h >= 0.12 && w / h <= 8 && b.fill > 0.15;
  });
  letters.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const lines: { boxes: Box[]; y0: number; y1: number }[] = [];
  for (const b of letters) {
    const h = b.y1 - b.y0 + 1;
    let line = lines.find((l) => {
      const overlap = Math.min(l.y1, b.y1) - Math.max(l.y0, b.y0);
      return overlap > Math.min(h, l.y1 - l.y0 + 1) * 0.4;
    });
    if (!line) {
      line = { boxes: [], y0: b.y0, y1: b.y1 };
      lines.push(line);
    }
    line.boxes.push(b);
    line.y0 = Math.min(line.y0, b.y0);
    line.y1 = Math.max(line.y1, b.y1);
  }
  const out: TextLine[] = [];
  for (const line of lines) {
    line.boxes.sort((a, b) => a.cx - b.cx);
    // Divide en palabras cuando hay un hueco grande.
    const words: Box[][] = [];
    let current: Box[] = [];
    for (const b of line.boxes) {
      const prev = current.at(-1);
      if (prev && b.x0 - prev.x1 > Math.max(4, (line.y1 - line.y0) * 0.8)) {
        words.push(current);
        current = [];
      }
      current.push(b);
    }
    if (current.length) words.push(current);
    for (const word of words) {
      const x0 = Math.min(...word.map((b) => b.x0));
      const x1 = Math.max(...word.map((b) => b.x1));
      const h = line.y1 - line.y0 + 1;
      const wideSingle = word.length === 1 && x1 - x0 > h * 3 && x1 - x0 > width * 0.08;
      if (word.length < 2 && !wideSingle) continue;
      if (x1 - x0 < h * 0.9) continue;
      const alignment = 1 - clamp((line.y1 - line.y0) / Math.max(1, h));
      out.push({
        x0,
        y0: line.y0,
        x1,
        y1: line.y1,
        heightRatio: round(h / height),
        components: word.length,
        confidence: round(clamp(0.3 + word.length * 0.08 + alignment * 0.15 + (wideSingle ? 0.1 : 0))),
        status: 'estimated',
      });
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

function salientOf(
  gray: Float32Array,
  mag: Float32Array,
  sat: Float32Array,
  width: number,
  height: number,
): SalientRegion[] {
  const score = new Float32Array(width * height);
  for (let i = 0; i < score.length; i++) score[i] = 0.65 * (mag[i] / 255) + 0.35 * sat[i];
  const blurred = boxBlur(score, width, height, 5);
  let sum = 0;
  let sum2 = 0;
  for (const v of blurred) {
    sum += v;
    sum2 += v * v;
  }
  const m = sum / blurred.length;
  const sd = Math.sqrt(Math.max(0, sum2 / blurred.length - m * m));
  const threshold = Math.max(0.02, m + sd * 0.5);
  const mask = new Uint8Array(blurred.length);
  for (let i = 0; i < mask.length; i++) mask[i] = blurred[i] > threshold ? 1 : 0;
  const comps = connectedComponents(mask, width, height, { minArea: width * height * 0.004, maxArea: width * height * 0.5 });
  const total = comps.reduce((a, b) => a + b.area, 0) || 1;
  return comps
    .sort((a, b) => b.area - a.area)
    .slice(0, 5)
    .map((b) => ({
      x0: b.x0,
      y0: b.y0,
      x1: b.x1,
      y1: b.y1,
      share: round(b.area / (width * height)),
      salience: round(clamp(blurred[Math.round(b.cy) * width + Math.round(b.cx)] / 0.5)),
      label: 'región saliente' as const,
      status: 'estimated' as const,
    }));
}

function depthOf(gray: Float32Array, width: number, height: number, horizonY: number | null): DepthAnalysis {
  const cols = 4;
  const rows = 4;
  const cells: { sharpness: number; area: number }[] = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x0 = Math.floor((gx * width) / cols);
      const x1 = Math.floor(((gx + 1) * width) / cols);
      const y0 = Math.floor((gy * height) / rows);
      const y1 = Math.floor(((gy + 1) * height) / rows);
      cells.push({ sharpness: laplacianVariance(gray, width, height, { x0, y0, x1, y1 }), area: 1 / (rows * cols) });
    }
  }
  const sorted = [...cells].sort((a, b) => a.sharpness - b.sharpness);
  const p35 = sorted[Math.floor(sorted.length * 0.35)].sharpness;
  const p75 = sorted[Math.floor(sorted.length * 0.75)].sharpness;
  const layers = [
    { name: 'fondo (más blando)', cells: cells.filter((c) => c.sharpness <= p35) },
    { name: 'plano medio', cells: cells.filter((c) => c.sharpness > p35 && c.sharpness < p75) },
    { name: 'primer plano (más nítido)', cells: cells.filter((c) => c.sharpness >= p75) },
  ].map((l) => ({
    name: l.name,
    cellShare: round(l.cells.reduce((a, c) => a + c.area, 0)),
    sharpness: round(mean(l.cells.map((c) => c.sharpness))),
  }));

  // Regresión lineal de luminancia frente a y: perspectiva aérea.
  let sy = 0;
  let sl = 0;
  let syy = 0;
  let syl = 0;
  const n = width * height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = gray[y * width + x];
      const yn = y / height;
      sy += yn;
      sl += l;
      syy += yn * yn;
      syl += yn * l;
    }
  }
  const den = n * syy - sy * sy;
  const slope = den ? (n * syl - sy * sl) / den / 255 : 0;
  return {
    status: 'estimated',
    method: 'nitidez local (varianza del laplaciano) + gradiente vertical de luminancia',
    layers,
    verticalGradient: round(slope, 3),
    horizonY,
    note: 'La profundidad es un proxy, no un mapa de profundidad métrico. No se usa para afirmar distancias.',
  };
}

function inspectOne(sample: FrameSample): FrameInspection {
  const { rgb, width, height } = sample;
  const gray = grayFromRgb(rgb, width, height);
  const { mag, angle } = sobel(gray, width, height);
  const sat = satMap(rgb, width, height);
  const composition = compositionOf(gray, mag, angle, width, height);
  const shapes = [...detectCircles(mag, angle, width, height), ...detectLines(mag, width, height)];
  const textLines = detectTextLines(mag, gray, width, height);
  return {
    composition,
    shapes,
    textLines,
    salient: salientOf(gray, mag, sat, width, height),
    depth: depthOf(gray, width, height, composition.horizonY),
  };
}

function mergeText(lines: TextLine[]): TextLine[] {
  const out: TextLine[] = [];
  for (const l of lines) {
    const near = out.find((o) => {
      const ix = Math.min(o.x1, l.x1) - Math.max(o.x0, l.x0);
      const iy = Math.min(o.y1, l.y1) - Math.max(o.y0, l.y0);
      return ix > 0 && iy > 0 && ix * iy > Math.min((o.x1 - o.x0) * (o.y1 - o.y0), (l.x1 - l.x0) * (l.y1 - l.y0)) * 0.5;
    });
    if (!near) out.push({ ...l });
    else if (l.confidence > near.confidence) Object.assign(near, l);
  }
  return out;
}

/** Inspecciona varios fotogramas del mismo plano y agrega la evidencia. */
export function inspectFrames(samples: FrameSample[]): ContentAnalysis {
  if (!samples.length) throw new Error('No hay fotogramas para inspeccionar');
  const inspections = samples.map(inspectOne);
  const first = inspections[0];
  const composition: CompositionAnalysis = {
    ...first.composition,
    thirds: round(mean(inspections.map((i) => i.composition.thirds))),
    balanceHorizontal: round(mean(inspections.map((i) => i.composition.balanceHorizontal))),
    balanceVertical: round(mean(inspections.map((i) => i.composition.balanceVertical))),
    symmetryHorizontal: round(mean(inspections.map((i) => i.composition.symmetryHorizontal))),
    symmetryVertical: round(mean(inspections.map((i) => i.composition.symmetryVertical))),
    negativeSpace: round(mean(inspections.map((i) => i.composition.negativeSpace))),
    centerBias: round(mean(inspections.map((i) => i.composition.centerBias))),
  };
  const shapes: ShapeDetection[] = [];
  for (const i of inspections) {
    for (const s of i.shapes) {
      if (!shapes.some((o) => o.type === s.type && Math.hypot((o.cx ?? o.x0) - (s.cx ?? s.x0), (o.cy ?? o.y0) - (s.cy ?? s.y0)) < 8)) shapes.push(s);
    }
  }
  const textLines = mergeText(inspections.flatMap((i) => i.textLines));
  const salient = inspections[0].salient;
  const warnings: string[] = [
    'El texto se detecta por estructura de líneas, sin OCR: hay regiones, no lectura.',
    'Las regiones salientes no están clasificadas como objetos (no hay modelo de objetos).',
    'La profundidad es un proxy de nitidez, no una medición métrica.',
  ];
  if (samples.length < 2) warnings.push('Un solo fotograma: la composición puede no representar el movimiento.');

  return {
    width: samples[0].width,
    height: samples[0].height,
    framesAnalyzed: samples.length,
    composition,
    shapes: shapes.slice(0, 10),
    textLines,
    salient,
    depth: first.depth,
    ocr: { available: false, reason: 'OCR no ejecutado: Tesseract no está disponible en esta máquina.' },
    warnings,
  };
}

export function describeContent(c: ContentAnalysis): string[] {
  const lines = [
    `Composición: tercios ${(c.composition.thirds * 100).toFixed(0)}%, equilibrio H/V ${(c.composition.balanceHorizontal * 100).toFixed(0)}%/${(c.composition.balanceVertical * 100).toFixed(0)}%, simetría ${(c.composition.symmetryHorizontal * 100).toFixed(0)}%, espacio negativo ${(c.composition.negativeSpace * 100).toFixed(0)}%.`,
    `Formas verificadas: ${c.shapes.length ? c.shapes.map((s) => `${s.type}${s.r ? ` r=${s.r}` : ''} (${(s.confidence * 100).toFixed(0)}%)`).join(', ') : 'ninguna por encima del umbral'}.`,
    `Texto: ${c.textLines.length ? `${c.textLines.length} línea(s) estimada(s), altura ${(Math.max(...c.textLines.map((t) => t.heightRatio)) * 100).toFixed(1)}% del alto` : 'sin regiones de texto claras'}.`,
    `Regiones salientes: ${c.salient.map((s) => `${(s.share * 100).toFixed(1)}%`).join(', ') || 'ninguna'}.`,
    `Profundidad (estimada): ${c.depth.layers.map((l) => `${l.name} ${(l.cellShare * 100).toFixed(0)}%`).join(' · ')}.`,
    ...c.warnings.map((w) => `Límite: ${w}`),
  ];
  return lines;
}
