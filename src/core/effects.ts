import fs from 'node:fs';
import path from 'node:path';
import type { FrameSample } from './media.js';
import {
  bestShift,
  boxBlur,
  connectedComponents,
  grayFromRgb,
  laplacianVariance,
  mirrorCorrelation,
  rowShifts,
  sobel,
  type Box,
} from './pixels.js';
import { clamp, mean, median, round } from './util.js';

/**
 * Detección de efectos por señales medibles. Cada resultado declara:
 * - status "verified": la señal existe (halo, nitidez, desplazamiento...).
 * - status "estimated": la señal es un proxy y la etiqueta es una interpretación.
 *
 * No se afirma "hay un bloom de Unreal" mirando píxeles: se mide un halo y se
 * propone glow/bloom como explicación, con la evidencia numérica al lado.
 */

export interface EffectDetection {
  id: string;
  label: string;
  confidence: number;
  status: 'verified' | 'estimated';
  frameRatio: number;
  evidence: Record<string, number | string>;
  hint: string;
}

export interface EffectTimelinePoint {
  t: number;
  effects: string[];
}

export interface EffectReport {
  source: string;
  framesAnalyzed: number;
  effects: EffectDetection[];
  timeline: EffectTimelinePoint[];
  warnings: string[];
  /** señales medidas que no superaron el umbral, para auditoría */
  signals: Record<string, number>;
}

interface Feature {
  s: FrameSample;
  gray: Float32Array;
  mag: Float32Array;
  angle: Float32Array;
  luma: number;
  lapVar: number;
  vignette: number;
  centerLuma: number;
  cornerLuma: number;
  bright: Box[];
  small: Box[];
  brightArea: number;
  brightCx: number;
  brightCy: number;
  rGray: Float32Array;
  bGray: Float32Array;
  textLike: Box[];
  /** motas de alto contraste local (partículas, brillos pequeños) */
  specks: Box[];
}

interface Hit {
  hit: boolean;
  confidence: number;
  evidence: Record<string, number | string>;
}

const zero: Hit = { hit: false, confidence: 0, evidence: {} };

function features(s: FrameSample): Feature {
  const { rgb, width, height } = s;
  const gray = grayFromRgb(rgb, width, height);
  const { mag, angle } = sobel(gray, width, height);
  const n = width * height;
  let luma = 0;
  let centerSum = 0;
  let centerN = 0;
  let cornerSum = 0;
  let cornerN = 0;
  const brightMask = new Uint8Array(n);
  const brightRaw = new Uint8Array(n);
  const rPlane = new Float32Array(n);
  const bPlane = new Float32Array(n);
  let brightCount = 0;
  let bx = 0;
  let by = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 3;
      const l = gray[i];
      luma += l;
      rPlane[i] = rgb[o];
      bPlane[i] = rgb[o + 2];
      const cx = x / width;
      const cy = y / height;
      if (cx > 0.25 && cx < 0.75 && cy > 0.25 && cy < 0.75) {
        centerSum += l;
        centerN++;
      }
      if ((cx < 0.2 || cx > 0.8) && (cy < 0.2 || cy > 0.8)) {
        cornerSum += l;
        cornerN++;
      }
      if (l > 185) {
        brightRaw[i] = 1;
        brightMask[i] = 1;
        brightCount++;
        bx += x;
        by += y;
      }
    }
  }

  // Componentes: se separan los grandes (focos) de los pequeños (motas).
  const brightComps = connectedComponents(brightMask, width, height, { minArea: 4, maxArea: n * 0.2 });
  const smallComps = connectedComponents(brightRaw, width, height, { minArea: 2, maxArea: Math.max(12, n * 0.002) });
  const textLike = brightComps.filter((b) => {
    const w = b.x1 - b.x0 + 1;
    const h = b.y1 - b.y0 + 1;
    return h >= 3 && w / h > 0.2 && w / h < 6 && b.fill > 0.15;
  });

  // Contraste local: detecta puntos pequeños aunque el fondo no sea oscuro.
  const smooth = boxBlur(gray, width, height, 2);
  const speckMask = new Uint8Array(n);
  for (let i = 0; i < n; i++) speckMask[i] = gray[i] - smooth[i] > 26 ? 1 : 0;
  const specks = connectedComponents(speckMask, width, height, { minArea: 1, maxArea: Math.max(10, n * 0.0008) });

  const lumaMean = luma / n;
  return {
    s,
    gray,
    mag,
    angle,
    luma: lumaMean / 255,
    lapVar: laplacianVariance(gray, width, height),
    vignette: centerSum / Math.max(1, centerN) === 0 ? 1 : (cornerSum / Math.max(1, cornerN)) / Math.max(1, centerSum / Math.max(1, centerN)),
    centerLuma: centerSum / Math.max(1, centerN) / 255,
    cornerLuma: cornerSum / Math.max(1, cornerN) / 255,
    bright: brightComps,
    small: smallComps,
    brightArea: brightCount / n,
    brightCx: brightCount ? bx / brightCount / width : 0.5,
    brightCy: brightCount ? by / brightCount / height : 0.5,
    rGray: rPlane,
    bGray: bPlane,
    textLike,
    specks,
  };
}

function ringMean(gray: Float32Array, width: number, height: number, cx: number, cy: number, r0: number, r1: number): number {
  let sum = 0;
  let count = 0;
  const x0 = Math.max(0, Math.floor(cx - r1));
  const x1 = Math.min(width - 1, Math.ceil(cx + r1));
  const y0 = Math.max(0, Math.floor(cy - r1));
  const y1 = Math.min(height - 1, Math.ceil(cy + r1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= r0 && d <= r1) {
        sum += gray[y * width + x];
        count++;
      }
    }
  }
  return count ? sum / count / 255 : 0;
}

function darkMean(gray: Float32Array): number {
  const sorted = [...gray].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.4);
  return sorted[idx] / 255;
}

function detectGlow(f: Feature): Hit {
  if (!f.bright.length || f.brightArea > 0.3) return zero;
  const w = f.s.width;
  const h = f.s.height;
  let best = 0;
  let bestRatio = 0;
  for (const b of f.bright) {
    const bw = b.x1 - b.x0 + 1;
    const bh = b.y1 - b.y0 + 1;
    const r = Math.max(3, Math.hypot(bw, bh) / 2);
    if (r > Math.min(w, h) * 0.45) continue;
    const bg = Math.max(0.01, darkMean(f.gray));
    const near = ringMean(f.gray, w, h, b.cx, b.cy, r * 0.85, r * 1.25);
    const halo = ringMean(f.gray, w, h, b.cx, b.cy, r * 1.3, r * 2.4);
    const contrast = halo / bg;
    const falloff = halo / Math.max(0.01, near);
    if (contrast > bestRatio) {
      bestRatio = contrast;
      best = falloff;
    }
  }
  const hit = bestRatio > 1.25 && bestRatio < 8;
  return {
    hit,
    confidence: hit ? clamp((bestRatio - 1.15) / 1.4) : 0,
    evidence: {
      haloRatio: round(bestRatio, 3),
      haloFalloff: round(best, 3),
      brightArea: round(f.brightArea, 4),
    },
  };
}

function detectParticles(f: Feature): Hit {
  const count = f.specks.length;
  const areaMedian = count ? median(f.specks.map((b) => b.area)) : 0;
  const hit = count >= 15 && count <= 600;
  return {
    hit,
    confidence: hit ? clamp(0.3 + count / 250) : 0,
    evidence: { specks: count, medianArea: round(areaMedian), brightArea: round(f.brightArea, 4) },
  };
}

/** Movimiento de motas: distingue partículas de texto/ruido estático. */
function detectParticleMotion(feats: Feature[]): Hit {
  const counts = feats.map((f) => f.specks.length);
  const medianCount = median(counts);
  let moved = 0;
  let total = 0;
  for (let i = 1; i < feats.length; i++) {
    const prev = feats[i - 1].specks;
    const next = feats[i].specks;
    for (const a of prev.slice(0, 200)) {
      let best = Infinity;
      for (const b of next.slice(0, 200)) best = Math.min(best, Math.hypot(a.cx - b.cx, a.cy - b.cy));
      if (Number.isFinite(best)) {
        total++;
        if (best > 0.8) moved++;
      }
    }
  }
  const movedFraction = total ? moved / total : 0;
  const hit = medianCount >= 15 && movedFraction > 0.3;
  return {
    hit,
    confidence: hit ? clamp(0.3 + movedFraction * 0.5) : 0,
    evidence: { specksMedian: medianCount, movedFraction: round(movedFraction, 3) },
  };
}

function detectBlur(f: Feature): Hit {
  const soft = f.lapVar < 45;
  const center = laplacianVariance(f.gray, f.s.width, f.s.height, {
    x0: Math.floor(f.s.width * 0.3), x1: Math.floor(f.s.width * 0.7),
    y0: Math.floor(f.s.height * 0.3), y1: Math.floor(f.s.height * 0.7),
  });
  const border = laplacianVariance(f.gray, f.s.width, f.s.height, {
    x0: 0, x1: Math.floor(f.s.width * 0.15),
    y0: 0, y1: f.s.height,
  });
  const bokeh = f.lapVar < 120 && center > 30 && border < 22 && center > border * 2.5;
  return {
    hit: soft || bokeh,
    confidence: soft ? clamp(1 - f.lapVar / 45) : clamp((center / Math.max(1, border) - 2.2) / 4),
    evidence: { laplacianVariance: round(f.lapVar, 2), centerSharpness: round(center, 2), borderSharpness: round(border, 2), bokeh: bokeh ? 1 : 0 },
  };
}

function detectReflections(f: Feature): Hit {
  let best = 0;
  let axis = 0;
  for (const a of [0.55, 0.65, 0.75, 0.85]) {
    const y = a * f.s.height;
    const corr = mirrorCorrelation(f.gray, f.s.width, f.s.height, y);
    if (corr > best) {
      best = corr;
      axis = a;
    }
  }
  const hit = best > 0.55 && f.luma > 0.04;
  return {
    hit,
    confidence: hit ? clamp((best - 0.45) / 0.4) : 0,
    evidence: { mirrorCorrelation: round(best, 3), axis: axis },
  };
}

function detectVignette(f: Feature): Hit {
  const hit = f.vignette < 0.82 && f.centerLuma > 0.02;
  return {
    hit,
    confidence: hit ? clamp((0.9 - f.vignette) / 0.4) : 0,
    evidence: { cornerCenterRatio: round(f.vignette, 3), centerLuma: round(f.centerLuma, 3) },
  };
}

function detectChannelSplit(f: Feature): Hit {
  const shift = bestShift(f.rGray, f.bGray, f.s.width, f.s.height, 4, 1);
  const split = Math.abs(shift.dx) + Math.abs(shift.dy);
  const hit = split >= 3 && shift.score > 0.4;
  return {
    hit,
    confidence: hit ? clamp(0.4 + split * 0.1) : 0,
    evidence: { channelShiftPx: split, channelCorrelation: round(shift.score, 3) },
  };
}

/** Diferencia por filas: detecta saltos de línea propios de glitch. */
function rowJump(a: Float32Array, b: Float32Array, width: number, height: number): { rows: number; max: number } {
  const diffs: number[] = [];
  for (let y = 0; y < height; y++) {
    let s = 0;
    for (let x = 0; x < width; x++) s += Math.abs(a[y * width + x] - b[y * width + x]);
    diffs.push(s / width);
  }
  const med = median(diffs);
  const spikes = diffs.filter((d) => d > med * 3 + 12);
  return { rows: spikes.length, max: Math.max(...diffs) };
}

function detectGrain(a: Feature, b: Feature): Hit {
  const w = a.s.width;
  const h = a.s.height;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.gray.length; i++) {
    if (a.mag[i] < 18 && b.mag[i] < 18) {
      sum += Math.abs(a.gray[i] - b.gray[i]);
      count++;
    }
  }
  const noise = count ? sum / count : 0;
  const hit = noise > 2.2;
  return { hit, confidence: hit ? clamp(noise / 8) : 0, evidence: { temporalNoise: round(noise, 2), flatPixels: count } };
}

function detectParallax(a: Feature, b: Feature): Hit {
  const shifts = rowShifts(a.gray, b.gray, a.s.width, a.s.height, 6, 6);
  const spread = Math.max(...shifts) - Math.min(...shifts);
  const globalMotion = Math.abs(mean(shifts));
  const hit = spread >= 2 && globalMotion >= 1;
  return {
    hit,
    confidence: hit ? clamp(spread / 8) : 0,
    evidence: { rowShiftSpread: spread, meanRowShift: round(globalMotion, 2), bands: shifts.join(',') },
  };
}

function detectDistortion(a: Feature, b: Feature): Hit {
  const shifts = rowShifts(a.gray, b.gray, a.s.width, a.s.height, 8, 6);
  const med = median(shifts);
  const residual = shifts.reduce((acc, v) => acc + Math.abs(v - med), 0) / shifts.length;
  let signChanges = 0;
  for (let i = 1; i < shifts.length; i++) if (Math.sign(shifts[i] - med) !== Math.sign(shifts[i - 1] - med)) signChanges++;
  const hit = residual > 1.2 && signChanges >= 3;
  return {
    hit,
    confidence: hit ? clamp((residual - 1) / 3) : 0,
    evidence: { rowResidual: round(residual, 2), signChanges, shifts: shifts.join(',') },
  };
}

function detectGlitch(a: Feature, b: Feature): Hit {
  const split = detectChannelSplit(b);
  const jumps = rowJump(a.gray, b.gray, a.s.width, a.s.height);
  const hit = (split.hit && split.confidence > 0.35) || jumps.rows >= 4;
  return {
    hit,
    confidence: clamp(Math.max(split.confidence, jumps.rows / 12)),
    evidence: { ...split.evidence, jumpRows: jumps.rows, maxRowDiff: round(jumps.max, 2) },
  };
}

const HINTS: Record<string, string> = {
  glow: 'Halo alrededor de zonas claras. Reproducir con capa duplicada desenfocada o text-shadow amplio; no subir el brillo global.',
  bloom: 'Área clara extensa con halo. Reproducir con postproceso bloom (Three.js EffectComposer) o duplicado blur + screen.',
  particles: 'Muchas motas pequeñas. Reproducir con canvas/Three.js Points y movimiento propio, no con ruido estático.',
  blur: 'Pérdida de alta frecuencia. Si es selectiva (fondo blando, centro nítido), usar backdrop-filter o profundidad de campo.',
  parallax: 'Capas con desplazamiento distinto. Reproducir separando fondo/medio/primer plano y moviéndolos a velocidades distintas.',
  glitch: 'Desplazamiento de canales o saltos de fila. Reproducir con clip-path + RGB split en picos cortos, no continuo.',
  lighting: 'Viñeta o foco radial. Reproducir con degradado radial y una luz animada; comprobar que no aplana el contraste.',
  reflections: 'Simetría vertical bajo un eje. Reproducir con copia invertida, máscara degradada y desenfoque leve.',
  distortion: 'Desplazamiento por franjas. Reproducir con shader de onda/ripple o SVG feTurbulence, con amplitud baja.',
  grain: 'Ruido temporal en zonas planas. Reproducir con capa de ruido animada a baja opacidad; evita banding.',
};

export function detectEffects(
  file: string,
  samples: FrameSample[],
): EffectReport {
  if (!samples.length) throw new Error('No hay fotogramas para detectar efectos');
  const feats = samples.map(features);
  const per: Record<string, { hits: Hit[]; total: number }> = {
    glow: { hits: [], total: 0 },
    bloom: { hits: [], total: 0 },
    particles: { hits: [], total: 0 },
    blur: { hits: [], total: 0 },
    parallax: { hits: [], total: 0 },
    glitch: { hits: [], total: 0 },
    lighting: { hits: [], total: 0 },
    reflections: { hits: [], total: 0 },
    distortion: { hits: [], total: 0 },
    grain: { hits: [], total: 0 },
  };
  const timeline: EffectTimelinePoint[] = feats.map((f) => ({ t: round(f.s.t, 3), effects: [] }));
  const particleMotion = detectParticleMotion(feats);
  const particleFrames = feats.map((f) => f.specks.length >= 15);

  for (let i = 0; i < feats.length; i++) {
    const f = feats[i];
    const glow = detectGlow(f);
    per.glow.hits.push(glow);
    per.bloom.hits.push(glow.hit && f.brightArea > 0.03 ? { ...glow, hit: true } : zero);
    per.particles.hits.push(detectParticles(f) && particleMotion.hit ? { ...particleMotion, hit: true } : { ...detectParticles(f), hit: false });
    per.blur.hits.push(detectBlur(f));
    per.lighting.hits.push(detectVignette(f));
    per.reflections.hits.push(detectReflections(f));
    per.glitch.hits.push(detectChannelSplit(f));
    if (i > 0) {
      const a = feats[i - 1];
      const grain = detectGrain(a, f);
      const parallax = detectParallax(a, f);
      const distortion = detectDistortion(a, f);
      const glitch = detectGlitch(a, f);
      per.grain.hits.push(grain);
      per.parallax.hits.push(parallax);
      per.distortion.hits.push(distortion);
      per.glitch.hits.push(glitch);
      // Un par puede aportar varias señales; se anotan en el instante final.
      for (const [id, hit] of [['grain', grain], ['parallax', parallax], ['distortion', distortion], ['glitch', glitch]] as const) {
        if (hit.hit && !timeline[i].effects.includes(id)) timeline[i].effects.push(id);
      }
    }
    if (particleMotion.hit && particleFrames[i] && !timeline[i].effects.includes('particles')) timeline[i].effects.push('particles');
    for (const [id, hit] of [['glow', glow], ['blur', detectBlur(f)], ['lighting', detectVignette(f)], ['reflections', detectReflections(f)]] as const) {
      if (hit.hit && !timeline[i].effects.includes(id)) timeline[i].effects.push(id);
    }
    if (glow.hit && f.brightArea > 0.03 && !timeline[i].effects.includes('bloom')) timeline[i].effects.push('bloom');
  }

  const effects: EffectDetection[] = [];
  for (const [id, group] of Object.entries(per)) {
    if (!group.hits.length) continue;
    const hits = group.hits.filter((h) => h.hit);
    if (!hits.length) continue;
    const ratio = hits.length / group.hits.length;
    const minRatio = id === 'glitch' || id === 'grain' || id === 'distortion' || id === 'parallax' ? 0.25 : 0.4;
    if (ratio < minRatio) continue;
    const confidence = mean(hits.map((h) => h.confidence));
    // La señal directa es verificable; la etiqueta concreta del efecto es una interpretación.
    const direct: Record<string, boolean> = { blur: true, particles: true, lighting: true, glow: true, bloom: true, grain: true };
    const status: EffectDetection['status'] = direct[id] ? 'verified' : 'estimated';
    const evidence: Record<string, number | string> = {};
    for (const h of hits.slice(0, 3)) {
      for (const [k, v] of Object.entries(h.evidence)) if (evidence[k] === undefined) evidence[k] = v;
    }
    effects.push({
      id,
      label: id === 'glow' ? 'glow' : id === 'bloom' ? 'bloom' : id === 'blur' ? 'desenfoque' : id === 'lighting' ? 'iluminación' : id === 'reflections' ? 'reflejos' : id === 'parallax' ? 'parallax' : id === 'distortion' ? 'distorsión' : id === 'grain' ? 'grano' : id === 'particles' ? 'partículas' : 'glitch',
      confidence: round(clamp(confidence), 3),
      status,
      frameRatio: round(ratio, 3),
      evidence,
      hint: HINTS[id] ?? '',
    });
  }

  const warnings = [
    'La señal de imagen es verificable; la etiqueta del efecto es una interpretación.',
    'Sin OCR ni modelo de objetos: no se distingue texto de formas pequeñas en la detección de partículas.',
  ];
  if (!effects.length) warnings.push('No se superó ningún umbral: el clip no muestra efectos detectables con estas señales.');

  const signals: Record<string, number> = {
    laplacianVariance: round(median(feats.map((f) => f.lapVar)), 2),
    vignette: round(median(feats.map((f) => f.vignette)), 3),
    brightArea: round(median(feats.map((f) => f.brightArea)), 4),
    smallComponents: median(feats.map((f) => f.small.length)),
    luma: round(median(feats.map((f) => f.luma)), 3),
  };

  return { source: path.resolve(file), framesAnalyzed: samples.length, effects, timeline, warnings, signals };
}

export function saveEffectReport(report: EffectReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'effects.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  return file;
}

export function describeEffects(report: EffectReport): string[] {
  const lines = report.effects.map(
    (e) => `${e.label} (${e.id}): confianza ${(e.confidence * 100).toFixed(0)}%, presente en ${(e.frameRatio * 100).toFixed(0)}% de los fotogramas, estado ${e.status}. ${e.hint}`,
  );
  if (!lines.length) lines.push('Sin efectos por encima del umbral.');
  for (const w of report.warnings) lines.push(`Límite: ${w}`);
  return lines;
}
