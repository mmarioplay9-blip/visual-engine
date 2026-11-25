import fs from 'node:fs';
import path from 'node:path';
import { text } from './run.js';

/**
 * Integraciones opcionales con visión local:
 * - Tesseract (OCR por CLI) si está instalado.
 * - Ollama (modelos locales con visión) si el servicio responde y hay un modelo.
 *
 * Ninguna se instala sola ni envía datos fuera de localhost. Si faltan, se
 * devuelve el motivo exacto en vez de fingir resultados.
 */

export interface ToolProbe {
  available: boolean;
  version?: string;
  reason?: string;
}

export interface OllamaStatus extends ToolProbe {
  url: string;
  models: string[];
  visionModels: string[];
}

export interface TesseractStatus extends ToolProbe {
  languages?: string[];
}

export interface VisionStatus {
  tesseract: TesseractStatus;
  ollama: OllamaStatus;
  opencv: ToolProbe;
  mediapipe: ToolProbe;
  notes: string[];
}

export interface OcrLine {
  text: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface OcrResult extends ToolProbe {
  text?: string;
  lines?: OcrLine[];
}

export interface OllamaResult extends ToolProbe {
  model?: string;
  response?: string;
  totalDurationMs?: number;
}

const OLLAMA_URL = process.env.OLLAMA_HOST?.startsWith('http') ? process.env.OLLAMA_HOST : 'http://127.0.0.1:11434';

const VISION_RE = /llava|vision|qwen.*vl|moondream|minicpm-v|gemma3|pixtral|granite.*vision|llama3\.2-vision/i;

export async function probeTesseract(): Promise<TesseractStatus> {
  const r = await text('tesseract', ['--version'], { timeoutMs: 10_000 });
  if (!r.ok) {
    return { available: false, reason: r.missing ? 'Tesseract no está instalado ni en PATH.' : r.stderr.slice(0, 200) };
  }
  const languages = (await text('tesseract', ['--list-langs'], { timeoutMs: 10_000 })).stdout
    .split(/\r?\n/)
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean);
  return { available: true, version: r.stdout.split(/\r?\n/)[0]?.slice(0, 80), languages };
}

export async function probeOllama(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      return { available: false, url: OLLAMA_URL, models: [], visionModels: [], reason: `Ollama respondió HTTP ${res.status}.` };
    }
    const data: any = await res.json();
    const models: string[] = (data.models ?? []).map((m: any) => String(m.name ?? m.model ?? '')).filter(Boolean);
    const visionModels = models.filter((m) => VISION_RE.test(m));
    return {
      available: true,
      url: OLLAMA_URL,
      models,
      visionModels,
      reason: visionModels.length ? undefined : 'Ollama responde, pero no hay un modelo de visión instalado (p. ej. llava, moondream, qwen2.5vl).',
    };
  } catch (e) {
    return {
      available: false,
      url: OLLAMA_URL,
      models: [],
      visionModels: [],
      reason: `No se pudo conectar con Ollama en ${OLLAMA_URL}: ${(e as Error).message}`,
    };
  }
}

async function probePythonModule(module: string, label: string): Promise<ToolProbe> {
  const r = await text('python', ['-c', `import ${module}; print(getattr(${module}, '__version__', 'ok'))`], { timeoutMs: 15_000 });
  return r.ok
    ? { available: true, version: r.stdout.split(/\r?\n/)[0] }
    : { available: false, reason: `${label} no disponible en Python: ${r.stderr.split(/\r?\n/)[0] || r.stdout}` };
}

export async function visionStatus(): Promise<VisionStatus> {
  const [tesseract, ollama, opencv, mediapipe] = await Promise.all([
    probeTesseract(),
    probeOllama(),
    probePythonModule('cv2', 'OpenCV (cv2)'),
    probePythonModule('mediapipe', 'MediaPipe'),
  ]);
  const notes = [
    'El análisis de formas y composición es propio y no depende de OpenCV.',
    'MediaPipe no se usa: no está instalado y añadirlo no aportaría al análisis de referencia sin modelos de pose/cara descargados.',
    'Ollama sólo se consulta en localhost; no hay APIs externas.',
  ];
  return { tesseract, ollama, opencv, mediapipe, notes };
}

/** OCR real con Tesseract. Devuelve líneas agrupadas y confianza media. */
export async function ocrImage(file: string, opts: { lang?: string } = {}): Promise<OcrResult> {
  const probe = await probeTesseract();
  if (!probe.available) return { available: false, reason: probe.reason };
  if (!fs.existsSync(file)) return { available: false, reason: `No existe la imagen: ${file}` };
  const r = await text('tesseract', [file, 'stdout', '--psm', '6', '-l', opts.lang ?? 'eng', 'tsv'], { timeoutMs: 60_000 });
  if (!r.ok) return { available: true, reason: `Tesseract falló: ${r.stderr.slice(0, 300)}` };
  const rows = r.stdout.split(/\r?\n/).slice(1);
  const byLine = new Map<string, { words: string[]; conf: number[]; box: [number, number, number, number] }>();
  for (const row of rows) {
    const cols = row.split('\t');
    if (cols.length < 12) continue;
    const [level, page, block, par, line, , leftRaw, topRaw, widthRaw, heightRaw, confRaw, word] = cols;
    if (Number(level) !== 5 || !word?.trim()) continue;
    const left = Number(leftRaw);
    const top = Number(topRaw);
    const width = Number(widthRaw);
    const height = Number(heightRaw);
    const conf = Number(confRaw);
    const key = `${page}-${block}-${par}-${line}`;
    const box: [number, number, number, number] = [left, top, width, height];
    const prev = byLine.get(key);
    if (prev) {
      prev.words.push(word);
      prev.conf.push(conf);
      prev.box = [Math.min(prev.box[0], box[0]), Math.min(prev.box[1], box[1]), Math.max(prev.box[0] + prev.box[2], box[2] + width) - Math.min(prev.box[0], box[0]), Math.max(prev.box[1] + prev.box[3], box[1] + height) - Math.min(prev.box[1], box[1])];
    } else {
      byLine.set(key, { words: [word], conf: [Number(conf)], box });
    }
  }
  const lines: OcrLine[] = [...byLine.values()].map((l) => ({
    text: l.words.join(' '),
    confidence: Math.round((l.conf.reduce((a, b) => a + b, 0) / Math.max(1, l.conf.length)) * 10) / 10,
    box: l.box,
  }));
  return {
    available: true,
    text: lines.map((l) => l.text).join('\n'),
    lines,
  };
}

/** Análisis de una imagen con un modelo de visión local servido por Ollama. */
export async function ollamaAnalyzeImage(
  file: string,
  opts: { model?: string; prompt?: string; timeoutMs?: number } = {},
): Promise<OllamaResult> {
  if (!fs.existsSync(file)) return { available: false, reason: `No existe la imagen: ${file}` };
  const status = await probeOllama();
  if (!status.available) return { available: false, reason: status.reason };
  const model = opts.model ?? status.visionModels[0];
  if (!model) {
    return { available: false, reason: status.reason ?? 'No hay modelo de visión instalado en Ollama.' };
  }
  const image = fs.readFileSync(file).toString('base64');
  const started = Date.now();
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: opts.prompt ?? 'Describe en español la composición, los elementos visibles y los efectos de iluminación de esta imagen. Distingue lo que ves de lo que supones.',
        images: [image],
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
    if (!res.ok) return { available: false, reason: `Ollama respondió HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    const data: any = await res.json();
    return {
      available: true,
      model,
      response: String(data.response ?? '').trim(),
      totalDurationMs: Math.round((data.total_duration ?? Date.now() * 1e6 - started * 1e6) / 1e6),
    };
  } catch (e) {
    return { available: false, reason: `Fallo al consultar Ollama: ${(e as Error).message}` };
  }
}

export function describeVisionStatus(s: VisionStatus): string[] {
  const lines = [
    `Tesseract: ${s.tesseract.available ? `disponible (${s.tesseract.version ?? 'versión desconocida'})` : `no disponible — ${s.tesseract.reason}`}.`,
    `Ollama: ${s.ollama.available ? `servicio activo en ${s.ollama.url} con ${s.ollama.models.length} modelo(s)` : `no disponible — ${s.ollama.reason}`}.`,
  ];
  if (s.ollama.available) {
    lines.push(`  Modelos: ${s.ollama.models.join(', ') || 'ninguno'}.`);
    lines.push(`  Visión: ${s.ollama.visionModels.join(', ') || 'ninguno detectado'}.`);
  }
  lines.push(`OpenCV: ${s.opencv.available ? s.opencv.version : s.opencv.reason}.`);
  lines.push(`MediaPipe: ${s.mediapipe.available ? s.mediapipe.version : s.mediapipe.reason}.`);
  return lines;
}

export function visionPathsHint(): string {
  return `Modelos de visión sugeridos (locales, gratuitos): llava, moondream, qwen2.5vl. Instala con \`ollama pull <modelo>\`; no se descarga nada automáticamente. Imágenes: ${path.extname('x.png')}`;
}
