import { detectCuts, probe, sampleFrames, type FrameSample } from './media.js';
import { bestShift, correlateAt, grayFromRgb, rowShifts, warpGray } from './pixels.js';
import { clamp, mean, median, round, std } from './util.js';

/**
 * Movimiento de cámara medido entre fotogramas consecutivos mediante
 * correlación normalizada. El desplazamiento es una medición directa (estado
 * "verified" cuando la correlación es alta). La escala y la rotación se estiman
 * por búsqueda de hipótesis y se marcan como "estimated" salvo evidencia fuerte.
 *
 * Convención: dx>0 significa que el contenido se desplaza a la derecha; la
 * cámara, si no hay objetos móviles dominantes, se mueve al contrario.
 */

export interface CameraPair {
  t0: number;
  t1: number;
  dt: number;
  /** desplazamiento del contenido en píxeles del muestreo */
  dx: number;
  dy: number;
  /** fracción del ancho/alto */
  dxNorm: number;
  dyNorm: number;
  /** velocidad del contenido, fracción por segundo */
  speed: number;
  zoom: number;
  rotationDeg: number;
  score: number;
  margin: number;
  status: 'verified' | 'estimated';
}

export interface CameraTransition {
  t: number;
  type: 'corte' | 'fundido' | 'barrido' | 'disolvencia';
  confidence: number;
  status: 'verified' | 'estimated';
  evidence: Record<string, number>;
}

export interface CameraAnalysis {
  source: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  pairs: CameraPair[];
  summary: {
    shiftX: number;
    shiftY: number;
    speed: number;
    zoom: number;
    rotationDeg: number;
    acceleration: number;
    shake: number;
    direction: string;
    verifiedPairs: number;
    totalPairs: number;
  };
  transitions: CameraTransition[];
  cuts: number[];
  warnings: string[];
}

function lumaOf(g: Float32Array): number {
  return mean([...g.subarray(0, g.length)]) / 255;
}

interface StepEstimate {
  dx: number;
  dy: number;
  zoom: number;
  rotation: number;
  score: number;
  margin: number;
}

const SCALES = [0.9, 0.94, 0.97, 1, 1.03, 1.06, 1.1];
const ROTATIONS = [-3, -1.5, 0, 1.5, 3];

/** Estima desplazamiento + zoom + rotación de un par de fotogramas. */
export function estimateStep(aGray: Float32Array, bGray: Float32Array, width: number, height: number): StepEstimate {
  const shift = bestShift(aGray, bGray, width, height, 10, 1);
  let zoom = 1;
  let rotation = 0;
  let bestScore = shift.score;

  // Hipótesis de escala/rotación sobre el fotograma ya alineado en traslación.
  for (const s of SCALES) {
    for (const r of ROTATIONS) {
      if (s === 1 && r === 0) continue;
      const warped = warpGray(bGray, width, height, { scale: s, rotationDeg: r, tx: shift.dx, ty: shift.dy });
      const score = correlateAt(aGray, warped, width, height, 0, 0);
      // Se exige una mejora real para no atribuir ruido a zoom/rotación.
      if (score > bestScore + 0.004) {
        bestScore = score;
        // s<1 en la transformación de alineación significa que el contenido creció.
        zoom = 1 / s;
        rotation = r;
      }
    }
  }

  return {
    dx: shift.dx,
    dy: shift.dy,
    zoom,
    rotation,
    score: bestScore,
    margin: shift.margin,
  };
}

function sceneDiffHalves(a: Float32Array, b: Float32Array, width: number, height: number): { left: number; right: number } {
  let left = 0;
  let right = 0;
  let nl = 0;
  let nr = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.abs(a[y * width + x] - b[y * width + x]);
      if (x < width / 2) {
        left += d;
        nl++;
      } else {
        right += d;
        nr++;
      }
    }
  }
  return { left: left / Math.max(1, nl) / 255, right: right / Math.max(1, nr) / 255 };
}

function directions(shiftX: number, shiftY: number): string {
  const parts: string[] = [];
  if (Math.abs(shiftX) > 0.004) parts.push(shiftX > 0 ? 'derecha' : 'izquierda');
  if (Math.abs(shiftY) > 0.004) parts.push(shiftY > 0 ? 'abajo' : 'arriba');
  return parts.length ? `el contenido se desplaza hacia ${parts.join(' y ')}` : 'sin desplazamiento global medible';
}

export async function analyzeCamera(
  file: string,
  opts: { samples?: number; width?: number } = {},
): Promise<CameraAnalysis> {
  const info = await probe(file);
  if (info.kind === 'image') {
    return {
      source: info.path,
      width: info.width,
      height: info.height,
      fps: info.fps,
      duration: 0,
      pairs: [],
      summary: {
        shiftX: 0, shiftY: 0, speed: 0, zoom: 1, rotationDeg: 0, acceleration: 0, shake: 0,
        direction: 'imagen fija: no hay movimiento', verifiedPairs: 0, totalPairs: 0,
      },
      transitions: [],
      cuts: [],
      warnings: ['La entrada es una imagen fija: no se puede medir movimiento de cámara.'],
    };
  }

  const width = opts.width ?? 128;
  const height = Math.max(16, Math.round((width * info.height) / Math.max(1, info.width)));
  const count = Math.max(6, Math.min(30, opts.samples ?? 12));
  const samples = await sampleFrames(file, { count, width, height });
  const grays = samples.map((s: FrameSample) => grayFromRgb(s.rgb, s.width, s.height));
  const pairs: CameraPair[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(0.001, samples[i].t - samples[i - 1].t);
    const e = estimateStep(grays[i - 1], grays[i], width, height);
    const status: CameraPair['status'] = e.score >= 0.55 ? 'verified' : 'estimated';
    pairs.push({
      t0: round(samples[i - 1].t, 3),
      t1: round(samples[i].t, 3),
      dt: round(dt, 3),
      dx: e.dx,
      dy: e.dy,
      dxNorm: round(e.dx / width, 5),
      dyNorm: round(e.dy / height, 5),
      speed: round(Math.hypot(e.dx / width, e.dy / height) / dt, 5),
      zoom: round(e.zoom, 3),
      rotationDeg: round(e.rotation, 2),
      score: round(e.score, 3),
      margin: round(e.margin, 3),
      status,
    });
    if (status === 'estimated') {
      warnings.push(`Par ${i - 1}→${i}: correlación baja (${e.score.toFixed(2)}); movimiento estimado, no verificado.`);
    }
  }

  const verified = pairs.filter((p) => p.status === 'verified');
  const usable = verified.length ? verified : pairs;
  const shiftX = mean(usable.map((p) => p.dxNorm));
  const shiftY = mean(usable.map((p) => p.dyNorm));
  const speeds = usable.map((p) => p.speed);
  const accel = usable.slice(1).map((p, i) => Math.abs((speeds[i + 1] - speeds[i]) / p.dt));
  const zoomValues = usable.map((p) => p.zoom);
  const rotations = usable.map((p) => p.rotationDeg);

  const cuts = (await detectCuts(file)) ?? [];
  const transitions: CameraTransition[] = cuts.map((t) => ({
    t,
    type: 'corte',
    confidence: 1,
    status: 'verified',
    evidence: { detector: 1, threshold: 0.1 },
  }));

  // Fundidos y barridos medidos sobre la curva de luminancia y la asimetría espacial.
  for (let i = 1; i < samples.length; i++) {
    const t = samples[i].t;
    if (cuts.some((c) => Math.abs(c - t) < 0.12)) continue;
    const l0 = lumaOf(grays[i - 1]);
    const l1 = lumaOf(grays[i]);
    const dl = l1 - l0;
    const diff = mean([
      ...Array.from({ length: Math.min(grays[i].length, 4000) }, (_, k) => Math.abs(grays[i - 1][k] - grays[i][k]) / 255),
    ]);
    const halves = sceneDiffHalves(grays[i - 1], grays[i], width, height);
    const asymmetry = Math.max(halves.left, halves.right) / Math.max(1e-6, Math.min(halves.left, halves.right));
    if (Math.abs(dl) > 0.1 && diff > 0.04) {
      transitions.push({
        t: round(t, 3),
        type: 'fundido',
        confidence: round(clamp(Math.abs(dl) * 2), 2),
        status: 'verified',
        evidence: { deltaLuma: round(dl, 4), diff: round(diff, 4) },
      });
    } else if (asymmetry > 2.2 && diff > 0.05) {
      transitions.push({
        t: round(t, 3),
        type: 'barrido',
        confidence: round(clamp(asymmetry / 5), 2),
        status: 'estimated',
        evidence: { asymmetry: round(asymmetry, 2), diff: round(diff, 4) },
      });
    } else if (diff > 0.05 && diff < 0.16) {
      transitions.push({
        t: round(t, 3),
        type: 'disolvencia',
        confidence: round(clamp(diff * 4), 2),
        status: 'estimated',
        evidence: { diff: round(diff, 4) },
      });
    }
  }

  if (!cuts.length) warnings.push('No se detectaron cortes con FFmpeg; las transiciones son sólo estimaciones.');
  if (!verified.length) warnings.push('Ningún par alcanzó correlación suficiente: el movimiento es una estimación.');

  const zoomOut = usable.length ? mean(zoomValues) : 1;
  return {
    source: info.path,
    width: info.width,
    height: info.height,
    fps: info.fps,
    duration: info.duration,
    pairs,
    summary: {
      shiftX: round(shiftX, 5),
      shiftY: round(shiftY, 5),
      speed: round(mean(speeds), 5),
      zoom: round(median(zoomValues), 3),
      rotationDeg: round(median(rotations), 2),
      acceleration: round(mean(accel), 4),
      shake: round(std(usable.map((p) => p.dxNorm)), 5),
      direction: directions(shiftX, shiftY),
      verifiedPairs: verified.length,
      totalPairs: pairs.length,
    },
    transitions,
    cuts,
    warnings,
  };
}

/** Resumen legible sin afirmar más de lo medido. */
export function describeCamera(c: CameraAnalysis): string[] {
  const s = c.summary;
  const lines = [
    `Movimiento: ${s.direction} (${(s.shiftX * 100).toFixed(2)}% del ancho por paso, ${(s.shiftY * 100).toFixed(2)}% del alto).`,
    `Velocidad media ${(s.speed * 100).toFixed(2)}%/s; aceleración ${(s.acceleration * 100).toFixed(2)}%/s²; temblor ${(s.shake * 100).toFixed(2)}%.`,
    `Zoom medio ${s.zoom.toFixed(3)} (>1 acerca, <1 aleja) · rotación media ${s.rotationDeg.toFixed(2)}°.`,
    `Pares verificados: ${s.verifiedPairs}/${s.totalPairs}.`,
    `Transiciones: ${c.transitions.length ? c.transitions.map((t) => `${t.type} en ${t.t.toFixed(2)}s (${t.status})`).join(', ') : 'ninguna medida'}.`,
  ];
  return lines;
}
