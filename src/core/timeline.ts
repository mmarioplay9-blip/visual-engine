import fs from 'node:fs';
import path from 'node:path';
import { metricsFromRgb, type FrameMetrics } from './analysis.js';
import { detectCuts, extractFrameAt, probe, sampleFrames } from './media.js';
import { ensureDir } from './paths.js';
import { mean, percentile, round, std } from './util.js';

/**
 * Línea temporal de un vídeo: escenas reales (detector de escenas de FFmpeg),
 * fotogramas clave y métricas por muestra. Los fotogramas clave se eligen por
 * corte, por pico de movimiento y por inicio/fin; no se inventan escenas.
 */

export interface TimelineFrame extends FrameMetrics {
  /** movimiento respecto a la muestra anterior (diferencia de luminancia) */
  motion: number;
}

export interface TimelineScene {
  index: number;
  start: number;
  end: number;
  duration: number;
  avgLuma: number;
  avgContrast: number;
  motion: number;
  label: string;
}

export interface Keyframe {
  t: number;
  sampleIndex: number;
  reason: 'inicio' | 'corte' | 'movimiento' | 'mitad de escena' | 'fin';
}

export interface VideoTimeline {
  source: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  frames: TimelineFrame[];
  scenes: TimelineScene[];
  keyframes: Keyframe[];
  motionCurve: number[];
  cuts: number[];
  pace: number;
  warnings: string[];
}

export interface TimelineOptions {
  samples?: number;
  width?: number;
}

export async function analyzeTimeline(file: string, opts: TimelineOptions = {}): Promise<VideoTimeline> {
  const info = await probe(file);
  if (info.kind === 'image') {
    throw new Error('La línea temporal requiere un vídeo; para una imagen usa `ve inspect`.');
  }
  const width = opts.width ?? 128;
  const height = Math.max(16, Math.round((width * info.height) / Math.max(1, info.width)));
  const count = Math.max(6, Math.min(40, opts.samples ?? 20));
  const samples = await sampleFrames(file, { count, width, height });
  const warnings: string[] = [];

  const frames: TimelineFrame[] = samples.map((s, i) => {
    const { metrics } = metricsFromRgb(s.rgb, s.width, s.height, s.t);
    let motion = 0;
    if (i > 0) {
      let diff = 0;
      const a = samples[i - 1].rgb;
      const b = s.rgb;
      for (let p = 0; p < a.length; p += 6) diff += Math.abs(a[p] - b[p]);
      motion = diff / (a.length / 6) / 255;
    }
    return { ...metrics, motion: round(motion, 4) };
  });

  const motionCurve = frames.map((f) => f.motion);
  const cuts = (await detectCuts(file)) ?? [];
  if (!cuts.length && info.duration > 1) {
    warnings.push('El detector de escenas no encontró cortes; la línea temporal tiene una sola escena.');
  }

  const bounds = [0, ...cuts.filter((c) => c > 0.05 && c < info.duration - 0.05), info.duration].sort((a, b) => a - b);
  const scenes: TimelineScene[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i];
    const end = bounds[i + 1];
    const inside = frames.filter((f) => f.t >= start && f.t <= end);
    const motion = mean(inside.map((f) => f.motion));
    const duration = end - start;
    const label =
      duration < 0.35 ? 'plano muy corto' :
      motion < 0.02 ? 'plano estático' :
      motion > 0.12 ? 'plano de movimiento intenso' :
      'plano con movimiento';
    scenes.push({
      index: i,
      start: round(start, 3),
      end: round(end, 3),
      duration: round(duration, 3),
      avgLuma: round(mean(inside.map((f) => f.luma))),
      avgContrast: round(mean(inside.map((f) => f.contrast))),
      motion: round(motion, 4),
      label,
    });
  }

  const keyframes: Keyframe[] = [];
  const addKey = (t: number, reason: Keyframe['reason']) => {
    if (!Number.isFinite(t) || t < 0 || t > info.duration) return;
    if (keyframes.some((k) => Math.abs(k.t - t) < 0.06)) return;
    const sampleIndex = frames.reduce((best, f, i) => (Math.abs(f.t - t) < Math.abs(frames[best].t - t) ? i : best), 0);
    keyframes.push({ t: round(t, 3), sampleIndex, reason });
  };
  addKey(0, 'inicio');
  for (const c of cuts) addKey(c, 'corte');
  for (const s of scenes) {
    if (s.index > 0 || cuts.length) addKey((s.start + s.end) / 2, 'mitad de escena');
  }
  const ranked = frames
    .map((f, i) => ({ i, motion: f.motion }))
    .sort((a, b) => b.motion - a.motion)
    .slice(0, 2);
  for (const r of ranked) if (r.motion > 0.01) addKey(frames[r.i].t, 'movimiento');
  addKey(Math.max(0, info.duration - Math.max(0.06, 1 / Math.max(1, info.fps))), 'fin');
  keyframes.sort((a, b) => a.t - b.t);

  const pace = info.duration > 0 ? round((cuts.length / info.duration) * 60, 2) : 0;
  const p90 = percentile(motionCurve, 0.9);
  if (p90 > 0.2) warnings.push('Picos de movimiento muy altos: revisa si hay parpadeo o cambios de plano no detectados.');
  if (info.fps > 0 && frames.length < 10) warnings.push('Pocas muestras: la curva de movimiento es aproximada.');

  return {
    source: info.path,
    width: info.width,
    height: info.height,
    duration: round(info.duration, 3),
    fps: info.fps,
    frames,
    scenes,
    keyframes: keyframes.slice(0, 12),
    motionCurve,
    cuts,
    pace,
    warnings,
  };
}

/** Exporta un PNG por fotograma clave y devuelve las rutas reales. */
export async function exportStoryboard(timeline: VideoTimeline, outDir: string): Promise<string[]> {
  ensureDir(outDir);
  const files: string[] = [];
  for (let i = 0; i < timeline.keyframes.length; i++) {
    const k = timeline.keyframes[i];
    const out = path.join(outDir, `keyframe-${String(i + 1).padStart(2, '0')}-${k.t.toFixed(2)}s.png`);
    const safeT = Math.max(0, Math.min(k.t, Math.max(0, timeline.duration - 0.06)));
    await extractFrameAt(timeline.source, safeT, out, 480);
    files.push(out);
  }
  return files;
}

export function describeTimeline(tl: VideoTimeline): string[] {
  return [
    `Vídeo ${tl.width}x${tl.height}, ${tl.duration.toFixed(2)} s, ${tl.fps} fps, ${tl.frames.length} muestras.`,
    `Escenas: ${tl.scenes.length} · cortes en ${tl.cuts.length ? tl.cuts.map((c) => `${c.toFixed(2)}s`).join(', ') : 'ninguno'} · ritmo ${tl.pace} cortes/min.`,
    ...tl.scenes.map((s) => `  Escena ${s.index + 1}: ${s.start.toFixed(2)}–${s.end.toFixed(2)} s (${s.label}), luma ${(s.avgLuma * 100).toFixed(0)}%, movimiento ${(s.motion * 100).toFixed(1)}%.`),
    `Fotogramas clave: ${tl.keyframes.map((k) => `${k.t.toFixed(2)}s (${k.reason})`).join(', ')}.`,
    `Movimiento medio ${(mean(tl.motionCurve) * 100).toFixed(2)}%, desviación ${(std(tl.motionCurve) * 100).toFixed(2)}%.`,
    ...tl.warnings.map((w) => `Aviso: ${w}`),
  ];
}

export function saveTimeline(tl: VideoTimeline, outDir: string): string {
  ensureDir(outDir);
  const file = path.join(outDir, 'timeline.json');
  fs.writeFileSync(file, JSON.stringify(tl, null, 2), 'utf8');
  return file;
}
