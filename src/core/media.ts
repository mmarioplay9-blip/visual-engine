import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { exec } from './run.js';
import { ensureDir } from './paths.js';

export interface MediaInfo {
  path: string;
  kind: 'image' | 'video';
  width: number;
  height: number;
  duration: number;
  fps: number;
  frames: number;
  codec: string;
  hasAudio: boolean;
}

export interface FrameSample {
  t: number;
  width: number;
  height: number;
  rgb: Buffer;
}

export class MediaError extends Error {}

function isVideoStream(stream: any): boolean {
  if (!stream || stream.codec_type !== 'video') return false;
  if (stream.disposition?.attached_pic === 1) return false;
  return true;
}

/** Metadatos reales vía ffprobe. No inventa valores: si ffprobe falla, lanza MediaError. */
export async function probe(file: string): Promise<MediaInfo> {
  if (!fs.existsSync(file)) throw new MediaError(`No existe el archivo: ${file}`);
  const r = await exec('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    file,
  ], { timeoutMs: 30_000 });
  if (!r.ok) {
    throw new MediaError(`ffprobe no pudo leer ${path.basename(file)}: ${r.stderr.trim().slice(0, 400)}`);
  }
  let json: any;
  try {
    json = JSON.parse(r.stdout.toString('utf8'));
  } catch {
    throw new MediaError(`ffprobe devolvió JSON inválido para ${file}`);
  }
  const streams: any[] = json.streams ?? [];
  const video = streams.find(isVideoStream);
  if (!video) throw new MediaError(`El archivo no tiene pista de vídeo/imagen: ${file}`);

  const format = json.format ?? {};
  const kind: 'image' | 'video' = video.codec_type === 'video' && !video.avg_frame_rate
    ? 'image'
    : (video.nb_frames === '1' ? 'image' : 'video');

  const [num, den] = String(video.avg_frame_rate ?? video.r_frame_rate ?? '0/1').split('/').map(Number);
  const fps = den ? num / den : 0;
  const duration = Number(format.duration ?? video.duration ?? 0);

  return {
    path: path.resolve(file),
    kind,
    width: Number(video.width) || 0,
    height: Number(video.height) || 0,
    duration: Number.isFinite(duration) ? duration : 0,
    fps: Number.isFinite(fps) ? Math.round(fps * 100) / 100 : 0,
    frames: Number(video.nb_frames) || 0,
    codec: String(video.codec_name ?? ''),
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
  };
}

interface SampleOptions {
  count?: number;
  width?: number;
  height?: number;
  /** inicio y fin normalizados (0..1) para centrar la muestra */
  from?: number;
  to?: number;
}

/**
 * Muestrea fotogramas RGB crudos a una resolución reducida. Es la base de todo
 * el análisis: funciona igual con imágenes, vídeo y secuencias de capturas.
 */
export async function sampleFrames(file: string, opts: SampleOptions = {}): Promise<FrameSample[]> {
  const info = await probe(file);
  const width = Math.max(16, Math.round(opts.width ?? 192));
  const height = Math.max(16, Math.round(opts.height ?? Math.round((width * info.height) / Math.max(1, info.width))));
  const count = opts.count ?? (info.kind === 'image' ? 1 : 8);
  const from = opts.from ?? 0.03;
  const to = opts.to ?? 0.97;
  const out: FrameSample[] = [];

  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : from + ((to - from) * i) / (count - 1);
    const t = info.kind === 'image' ? 0 : Math.max(0, info.duration * frac);
    const args = ['-v', 'error'];
    if (t > 0) args.push('-ss', t.toFixed(3));
    args.push(
      '-i', file,
      '-frames:v', '1',
      '-vf', `scale=${width}:${height}:flags=area`,
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      '-',
    );
    let r = await exec('ffmpeg', args, { timeoutMs: 60_000 });
    if (!r.ok || r.stdout.length !== width * height * 3) {
      // Reintento sin -ss (algunos contenedores no permiten seek tan fino).
      const fallback = ['-v', 'error', '-i', file, '-frames:v', '1', '-vf', `scale=${width}:${height}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'];
      r = await exec('ffmpeg', fallback, { timeoutMs: 60_000 });
    }
    if (!r.ok || r.stdout.length !== width * height * 3) {
      if (out.length) break;
      throw new MediaError(`ffmpeg no devolvió un fotograma válido de ${path.basename(file)}: ${r.stderr.trim().slice(0, 300)}`);
    }
    out.push({ t, width, height, rgb: r.stdout });
  }
  return out;
}

/** Decodifica el vídeo completo a baja resolución y fps reducidos para medir cambios de color. */
export async function scanFrames(
  file: string,
  opts: { fps?: number; width?: number } = {},
): Promise<FrameSample[]> {
  const info = await probe(file);
  if (info.kind === 'image') return [];
  const fps = opts.fps ?? 15;
  const width = opts.width ?? 80;
  const height = Math.max(16, Math.round((width * info.height) / Math.max(1, info.width)));
  const r = await exec('ffmpeg', [
    '-v', 'error', '-i', file,
    '-vf', `fps=${fps},scale=${width}:${height}:flags=area`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { timeoutMs: 240_000 });
  if (!r.ok) return [];
  const frameSize = width * height * 3;
  const out: FrameSample[] = [];
  for (let offset = 0; offset + frameSize <= r.stdout.length; offset += frameSize) {
    out.push({ t: roundTo(out.length / fps, 3), width, height, rgb: r.stdout.subarray(offset, offset + frameSize) });
  }
  return out;
}

function roundTo(v: number, d: number): number {
  return Math.round(v * 10 ** d) / 10 ** d;
}

/**
 * Detecta cortes combinando el detector de escenas de FFmpeg (luminancia) con
 * un barrido RGB propio. El detector de FFmpeg no ve cortes sólo de color;
 * el barrido sí. Se exige un pico claro sobre el movimiento de fondo.
 */
export async function detectCuts(file: string, threshold = 0.1): Promise<number[] | null> {
  const r = await exec('ffmpeg', [
    '-v', 'info', '-i', file,
    '-vf', `select='gt(scene,${threshold})',showinfo`,
    '-an', '-f', 'null', '-',
  ], { timeoutMs: 180_000 });
  if (!r.ok && !/pts_time/.test(r.stderr)) return null;
  const times = [...r.stderr.matchAll(/pts_time:([0-9]+(?:\.[0-9]+)?)/g)].map((m) => Number(m[1]));
  const sceneCuts = [...new Set(times.map((t) => Math.round(t * 1000) / 1000))].filter((t) => t > 0.02);

  const scanned = await scanFrames(file, { fps: 15, width: 80 });
  const diffs: number[] = [];
  for (let i = 1; i < scanned.length; i++) {
    const a = scanned[i - 1].rgb;
    const b = scanned[i].rgb;
    let sum = 0;
    let count = 0;
    for (let p = 0; p < a.length; p += 3) {
      sum += Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);
      count += 3;
    }
    diffs.push(sum / count / 255);
  }
  const rgbCuts: number[] = [];
  if (diffs.length >= 4) {
    const sorted = [...diffs].sort((x, y) => x - y);
    const med = sorted[Math.floor(sorted.length / 2)];
    const mean = diffs.reduce((x, y) => x + y, 0) / diffs.length;
    const variance = diffs.reduce((x, y) => x + (y - mean) ** 2, 0) / diffs.length;
    const limit = Math.max(0.045, med * 1.8, mean + 1.5 * Math.sqrt(variance));
    for (let i = 1; i < diffs.length - 1; i++) {
      const d = diffs[i];
      if (d >= limit && d >= diffs[i - 1] && d >= diffs[i + 1]) rgbCuts.push(scanned[i + 1].t);
    }
  }

  const merged: number[] = [];
  for (const t of [...sceneCuts, ...rgbCuts].sort((a, b) => a - b)) {
    if (!merged.some((m) => Math.abs(m - t) < 0.12)) merged.push(t);
  }
  const infoForDuration = await probe(file);
  const result = merged.filter((t) => t > 0.02 && t < infoForDuration.duration - 0.02);
  if (!result.length && !sceneCuts.length && !rgbCuts.length) return [];
  return result;
}

/** Extrae fotogramas a disco como PNG/JPG usando ffmpeg. */
export async function extractFrames(
  file: string,
  outDir: string,
  opts: { count?: number; fps?: number; width?: number; format?: 'png' | 'jpg' } = {},
): Promise<string[]> {
  const info = await probe(file);
  ensureDir(outDir);
  const fmt = opts.format ?? 'png';
  const width = opts.width ?? 0;
  const filters: string[] = [];
  if (info.kind === 'video') {
    const rate = opts.fps ?? (opts.count && info.duration ? opts.count / info.duration : 2);
    filters.push(`fps=${Math.max(0.05, rate).toFixed(4)}`);
  }
  if (width > 0) filters.push(`scale=${width}:-2:flags=lanczos`);
  const pattern = path.join(outDir, `frame-%03d.${fmt}`);
  const args = ['-v', 'error', '-y', '-i', file];
  if (filters.length) args.push('-vf', filters.join(','));
  args.push('-frames:v', String(opts.count ?? (info.kind === 'video' ? 24 : 1)), pattern);
  const r = await exec('ffmpeg', args, { timeoutMs: 120_000 });
  if (!r.ok) throw new MediaError(`No se pudieron extraer fotogramas: ${r.stderr.trim().slice(0, 300)}`);
  return fs.readdirSync(outDir).filter((f) => f.startsWith('frame-')).sort().map((f) => path.join(outDir, f));
}

/** Extrae un único fotograma en un instante exacto (PNG) con FFmpeg. */
export async function extractFrameAt(file: string, t: number, out: string, width = 0): Promise<string> {
  ensureDir(path.dirname(out));
  const args = ['-v', 'error', '-y', '-ss', Math.max(0, t).toFixed(3), '-i', file, '-frames:v', '1'];
  if (width > 0) args.push('-vf', `scale=${width}:-2:flags=lanczos`);
  args.push(out);
  const r = await exec('ffmpeg', args, { timeoutMs: 60_000 });
  if (!r.ok || !fs.existsSync(out)) {
    throw new MediaError(`No se pudo extraer el fotograma ${t.toFixed(2)}s: ${r.stderr.trim().slice(0, 200)}`);
  }
  return out;
}

/** Escribe un búfer RGB24 como PNG real (usa ffmpeg como codificador). */
export async function rgbToPng(rgb: Buffer, width: number, height: number, out: string): Promise<string> {
  ensureDir(path.dirname(out));
  const r = await exec('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`,
    '-i', '-',
    '-frames:v', '1',
    out,
  ], { input: rgb, timeoutMs: 30_000 });
  if (!r.ok) throw new MediaError(`No se pudo escribir PNG: ${r.stderr.trim().slice(0, 200)}`);
  return out;
}

/** Codificador de vídeo en streaming para generar material de prueba sintético. */
export class RawVideoWriter {
  private child: ReturnType<typeof spawn>;
  private err: Buffer[] = [];
  private closed: Promise<void>;

  constructor(out: string, opts: { width: number; height: number; fps: number; crf?: number }) {
    ensureDir(path.dirname(out));
    this.child = spawn('ffmpeg', [
      '-v', 'error', '-y',
      '-f', 'rawvideo', '-pix_fmt', 'rgb24',
      '-s', `${opts.width}x${opts.height}`,
      '-r', String(opts.fps),
      '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(opts.crf ?? 20),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      out,
    ], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    this.child.stderr?.on('data', (c: Buffer) => this.err.push(c));
    this.closed = new Promise<void>((resolve, reject) => {
      this.child.on('error', (e) => reject(e));
      this.child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new MediaError(`ffmpeg falló al codificar: ${Buffer.concat(this.err).toString('utf8').slice(0, 400)}`));
      });
    });
  }

  async push(frame: Buffer): Promise<void> {
    if (!this.child.stdin!.write(frame)) {
      await once(this.child.stdin!, 'drain');
    }
  }

  async finish(): Promise<void> {
    this.child.stdin!.end();
    await this.closed;
  }
}
