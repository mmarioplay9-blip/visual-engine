import { detectCuts, sampleFrames, type FrameSample, type MediaInfo, probe } from './media.js';
import { clamp, hex, luminance, mean, percentile, round, std } from './util.js';

export interface PaletteEntry {
  hex: string;
  rgb: [number, number, number];
  share: number;
}

export interface FrameMetrics {
  t: number;
  /** luminancia media 0..1 */
  luma: number;
  /** contraste = desviación típica de la luminancia 0..1 */
  contrast: number;
  saturation: number;
  colorfulness: number;
  edgeDensity: number;
  darkRatio: number;
  brightRatio: number;
  /** masa visual por cuadrante: [sup-izq, sup-der, inf-izq, inf-der] 0..1 */
  quadrants: [number, number, number, number];
  palette: PaletteEntry[];
}

export interface VisualProfile {
  source: string;
  kind: 'image' | 'video' | 'sequence';
  width: number;
  height: number;
  aspect: number;
  duration: number;
  fps: number;
  frameCount: number;
  aggregate: {
    luma: number;
    contrast: number;
    saturation: number;
    colorfulness: number;
    edgeDensity: number;
    darkRatio: number;
  };
  palette: PaletteEntry[];
  /** movimiento medio entre fotogramas consecutivos 0..1 */
  motion: number;
  motionCurve: number[];
  /** instantes (s) donde se detecta un corte */
  cuts: number[];
  /** cortes por minuto; en imágenes = 0 */
  pace: number;
  hueHistogram: number[];
  frames: FrameMetrics[];
  createdAt: string;
  warnings: string[];
}

const HIST_BINS = 4096; // 4 bits por canal

function quantIndex(r: number, g: number, b: number): number {
  return ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
}

export function metricsFromRgb(rgb: Buffer, width: number, height: number, t = 0): { metrics: FrameMetrics; hist: Uint32Array; gray: Uint8Array } {
  const n = width * height;
  const gray = new Uint8Array(n);
  const hist = new Uint32Array(HIST_BINS);
  let sumL = 0;
  let sumL2 = 0;
  let sumSat = 0;
  let sumRG = 0;
  let sumRG2 = 0;
  let sumYB = 0;
  let sumYB2 = 0;
  let dark = 0;
  let bright = 0;
  const quads = [0, 0, 0, 0];

  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const r = rgb[o];
    const g = rgb[o + 1];
    const b = rgb[o + 2];
    const l = luminance(r, g, b);
    gray[i] = l;
    sumL += l;
    sumL2 += l * l;
    if (l < 26) dark++;
    if (l > 229) bright++;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    sumSat += mx === 0 ? 0 : (mx - mn) / mx;
    const rg = r - g;
    const yb = 0.5 * (r + g) - b;
    sumRG += rg;
    sumRG2 += rg * rg;
    sumYB += yb;
    sumYB2 += yb * yb;
    hist[quantIndex(r, g, b)]++;

    const x = i % width;
    const y = (i / width) | 0;
    const q = (y < height / 2 ? 0 : 2) + (x < width / 2 ? 0 : 1);
    quads[q] += l;
  }

  const lumaMean = sumL / n;
  const variance = Math.max(0, sumL2 / n - lumaMean * lumaMean);
  const sdRG = Math.sqrt(Math.max(0, sumRG2 / n - (sumRG / n) ** 2));
  const sdYB = Math.sqrt(Math.max(0, sumYB2 / n - (sumYB / n) ** 2));
  const colorfulness = (Math.hypot(sdRG, sdYB) + 0.3 * Math.hypot(sumRG / n, sumYB / n)) / 110;

  // Sobel sobre gris, submuestreando el borde exterior.
  let edges = 0;
  let edgeTotal = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1] +
        gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      if (Math.hypot(gx, gy) > 64) edges++;
      edgeTotal++;
    }
  }

  const quadTotal = quads.reduce((a, b) => a + b, 0) || 1;
  const metrics: FrameMetrics = {
    t: round(t, 3),
    luma: round(lumaMean / 255),
    contrast: round(Math.sqrt(variance) / 255),
    saturation: round(sumSat / n),
    colorfulness: round(clamp(colorfulness)),
    edgeDensity: round(edgeTotal ? edges / edgeTotal : 0),
    darkRatio: round(dark / n),
    brightRatio: round(bright / n),
    quadrants: [
      round(quads[0] / quadTotal),
      round(quads[1] / quadTotal),
      round(quads[2] / quadTotal),
      round(quads[3] / quadTotal),
    ],
    palette: [],
  };
  return { metrics, hist, gray };
}

/** Deriva una paleta dominante a partir de un histograma cuantizado, fusionando tonos cercanos. */
export function paletteFromHist(hist: Uint32Array, top = 6): PaletteEntry[] {
  const total = hist.reduce((a, b) => a + b, 0) || 1;
  const bins: { rgb: [number, number, number]; count: number }[] = [];
  for (let i = 0; i < hist.length; i++) {
    const c = hist[i];
    if (!c) continue;
    bins.push({ rgb: [((i >> 8) << 4) + 8, (((i >> 4) & 15) << 4) + 8, ((i & 15) << 4) + 8], count: c });
  }
  bins.sort((a, b) => b.count - a.count);
  const merged: { rgb: [number, number, number]; count: number }[] = [];
  for (const bin of bins.slice(0, 96)) {
    const near = merged.find((m) => Math.hypot(m.rgb[0] - bin.rgb[0], m.rgb[1] - bin.rgb[1], m.rgb[2] - bin.rgb[2]) < 44);
    if (near) {
      const w = near.count + bin.count;
      near.rgb = [
        (near.rgb[0] * near.count + bin.rgb[0] * bin.count) / w,
        (near.rgb[1] * near.count + bin.rgb[1] * bin.count) / w,
        (near.rgb[2] * near.count + bin.rgb[2] * bin.count) / w,
      ].map((v) => Math.round(v)) as [number, number, number];
      near.count = w;
    } else {
      merged.push({ rgb: [...bin.rgb], count: bin.count });
    }
  }
  return merged.slice(0, top).map((m) => ({
    hex: hex(m.rgb[0], m.rgb[1], m.rgb[2]),
    rgb: m.rgb,
    share: round(m.count / total, 4),
  }));
}

function hueOf(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d === 0) return -1;
  let h = 0;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Perfil visual completo a partir de fotogramas ya muestreados. */
export function composeProfile(
  samples: FrameSample[],
  meta: Omit<Partial<MediaInfo>, 'kind'> & { kind?: VisualProfile['kind']; source?: string } = {},
): VisualProfile {
  const warnings: string[] = [];
  if (!samples.length) throw new Error('No hay fotogramas para analizar');
  const hist = new Uint32Array(HIST_BINS);
  const frames: FrameMetrics[] = [];
  const grays: Uint8Array[] = [];

  for (const s of samples) {
    const { metrics, hist: h, gray } = metricsFromRgb(s.rgb, s.width, s.height, s.t);
    for (let i = 0; i < h.length; i++) hist[i] += h[i];
    frames.push(metrics);
    grays.push(gray);
  }

  const palette = paletteFromHist(hist);
  for (const f of frames) {
    const sub = new Uint32Array(HIST_BINS);
    // reutilizamos la paleta global como representación por fotograma
    f.palette = palette.slice(0, 4);
    void sub;
  }

  const motionCurve: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = grays[i - 1];
    const b = grays[i];
    let diff = 0;
    let count = 0;
    for (let p = 0; p < a.length; p += 2) {
      diff += Math.abs(a[p] - b[p]);
      count++;
    }
    motionCurve.push(round(diff / count / 255, 4));
  }

  const diffs = motionCurve;
  const dMean = mean(diffs);
  const dStd = std(diffs);
  const cutThreshold = Math.max(0.06, dMean + 3 * dStd);
  const cuts: number[] = [];
  diffs.forEach((d, i) => {
    if (d > cutThreshold && d > 0.06) cuts.push(round(samples[i + 1].t, 3));
  });

  const duration = meta.duration ?? (samples.at(-1)!.t - samples[0].t);
  const pace = meta.kind === 'image' || duration <= 0 ? 0 : round((cuts.length / duration) * 60, 2);
  if (samples.length < 5 && meta.kind === 'video') {
    warnings.push('Pocos fotogramas muestreados: la curva de movimiento y los cortes son aproximados.');
  }
  if (meta.kind === 'image') {
    warnings.push('La referencia es una imagen: el análisis de movimiento y de cortes no aplica.');
  }

  const hueHistogram = new Array(12).fill(0);
  for (const c of palette) {
    const h = hueOf(c.rgb);
    if (h >= 0) hueHistogram[Math.min(11, Math.floor(h / 30))] += c.share;
  }

  const agg = (k: keyof FrameMetrics) => mean(frames.map((f) => Number(f[k]) || 0));

  return {
    source: meta.source ?? (meta.path as string) ?? 'desconocido',
    kind: meta.kind ?? 'video',
    width: meta.width ?? samples[0].width,
    height: meta.height ?? samples[0].height,
    aspect: round((meta.width ?? samples[0].width) / Math.max(1, meta.height ?? samples[0].height), 3),
    duration: round(duration, 3),
    fps: meta.fps ?? 0,
    frameCount: samples.length,
    aggregate: {
      luma: round(agg('luma')),
      contrast: round(agg('contrast')),
      saturation: round(agg('saturation')),
      colorfulness: round(agg('colorfulness')),
      edgeDensity: round(agg('edgeDensity')),
      darkRatio: round(agg('darkRatio')),
    },
    palette,
    motion: round(mean(diffs)),
    motionCurve,
    cuts,
    pace,
    hueHistogram: hueHistogram.map((v) => round(v, 3)),
    frames,
    createdAt: new Date().toISOString(),
    warnings,
  };
}

export interface AnalyzeOptions {
  samples?: number;
  width?: number;
  height?: number;
}

/** Analiza un archivo de imagen o vídeo real y devuelve su perfil visual. */
export async function analyzeFile(file: string, opts: AnalyzeOptions = {}): Promise<VisualProfile> {
  const info = await probe(file);
  const width = opts.width ?? 192;
  const height = Math.max(16, Math.round((width * info.height) / Math.max(1, info.width)));
  const samples = await sampleFrames(file, {
    count: info.kind === 'image' ? 1 : (opts.samples ?? 8),
    width,
    height,
  });
  const profile = composeProfile(samples, {
    ...info,
    kind: info.kind,
    source: info.path,
  });
  profile.kind = info.kind;

  // Los cortes se detectan con FFmpeg a resolución completa; el muestreo sólo
  // sirve de respaldo si el detector falla.
  if (info.kind === 'video' && info.duration > 0) {
    const cuts = await detectCuts(file);
    if (cuts) {
      profile.cuts = cuts;
      profile.pace = round((cuts.length / info.duration) * 60, 2);
      if (!cuts.length) {
        profile.warnings.push('El detector de escenas de FFmpeg no encontró cortes por encima de 0.2.');
      }
    } else {
      profile.warnings.push('No se pudo ejecutar el detector de escenas; los cortes provienen del muestreo.');
    }
  }
  return profile;
}

/** Analiza una lista de imágenes (por ejemplo capturas de pantalla) como una secuencia. */
export async function analyzeSequence(files: string[], opts: AnalyzeOptions & { intervalMs?: number } = {}): Promise<VisualProfile> {
  if (!files.length) throw new Error('No hay imágenes para analizar');
  const width = opts.width ?? 192;
  const samples: FrameSample[] = [];
  let firstInfo: MediaInfo | null = null;
  for (let i = 0; i < files.length; i++) {
    if (!firstInfo) firstInfo = await probe(files[i]);
    const info: MediaInfo = firstInfo;
    const height = Math.max(16, Math.round((width * info.height) / Math.max(1, info.width)));
    const [s] = await sampleFrames(files[i], { count: 1, width, height });
    samples.push({ ...s, t: (i * (opts.intervalMs ?? 400)) / 1000 });
  }
  const profile = composeProfile(samples, {
    ...firstInfo!,
    kind: 'sequence',
    source: `secuencia:${files.length} imágenes`,
  });
  if (files.length < 3) {
    profile.warnings.push('Secuencia corta: el movimiento medido es indicativo, no una curva completa.');
  }
  profile.pace = 0;
  profile.cuts = [];
  return profile;
}

/** Resumen legible en español, sin adornos ni afirmaciones no medidas. */
export function describeProfile(p: VisualProfile): string[] {
  const a = p.aggregate;
  const lines = [
    `Fuente: ${p.source}`,
    `Formato: ${p.width}x${p.height} (${p.aspect.toFixed(2)}:1), ${p.kind}${p.duration ? `, ${p.duration.toFixed(2)} s` : ''}${p.fps ? `, ${p.fps} fps` : ''}`,
    `Luminancia media ${(a.luma * 100).toFixed(1)}%, contraste ${(a.contrast * 100).toFixed(1)}%, saturación ${(a.saturation * 100).toFixed(1)}%`,
    `Colorido ${(a.colorfulness * 100).toFixed(1)}%, densidad de bordes ${(a.edgeDensity * 100).toFixed(1)}%, zona oscura ${(a.darkRatio * 100).toFixed(1)}%`,
    `Paleta: ${p.palette.map((c) => `${c.hex} ${(c.share * 100).toFixed(0)}%`).join(' · ')}`,
  ];
  if (p.kind !== 'image') {
    lines.push(`Movimiento medio ${(p.motion * 100).toFixed(2)} · cortes ${p.cuts.length}${p.cuts.length ? ` en ${p.cuts.map((c) => c.toFixed(2)).join(', ')} s` : ''} · ritmo ${p.pace} cortes/min`);
    if (p.motionCurve.length) {
      const p90 = percentile(p.motionCurve, 0.9);
      lines.push(`Pico de movimiento (p90) ${(p90 * 100).toFixed(2)}`);
    }
  }
  for (const w of p.warnings) lines.push(`Aviso: ${w}`);
  return lines;
}
