import fs from 'node:fs';
import os from 'node:os';
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
  binary?: string;
}

export interface HardwareStatus {
  gpu: string | null;
  vramTotalMb: number | null;
  vramFreeMb: number | null;
  ramTotalGb: number;
  source: string;
}

export interface VisionModelOption {
  name: string;
  sizeGB: number;
  minVramGB: number;
  quality: number;
  note: string;
}

export interface VisionSelection {
  installed: boolean;
  model: string | null;
  fitsVram: boolean;
  reason: string;
  recommended: VisionModelOption | null;
}

export interface VisionStatus {
  tesseract: TesseractStatus;
  ollama: OllamaStatus;
  hardware: HardwareStatus;
  selectedModel: VisionSelection;
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

/** Catálogo local; el tamaño es el del modelo, no el de la VRAM necesaria. */
export const VISION_MODELS: VisionModelOption[] = [
  { name: 'moondream:latest', sizeGB: 1.7, minVramGB: 2, quality: 1, note: 'Muy ligero; descripción breve y OCR visual limitado.' },
  { name: 'qwen2.5vl:3b', sizeGB: 3.2, minVramGB: 4, quality: 2, note: 'Compacto, pero en esta versión de Ollama produjo tokens repetidos con imágenes; no se selecciona si LLaVA está disponible.' },
  { name: 'llava:7b', sizeGB: 4.7, minVramGB: 6, quality: 3, note: 'Descripción general verificada en esta máquina; OCR visual inferior a un OCR dedicado.' },
  { name: 'qwen2.5vl:7b', sizeGB: 6.0, minVramGB: 8, quality: 4, note: 'Mayor detalle y lectura; recomendado si hay 10 GB o más de VRAM.' },
];

/** Busca Tesseract en PATH y en las rutas de instalación típicas de Windows. */
async function findTesseract(): Promise<{ command: string; result: Awaited<ReturnType<typeof text>> } | null> {
  const candidates = [
    process.env.TESSERACT_PATH,
    'tesseract',
    'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
    'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Tesseract-OCR', 'tesseract.exe') : undefined,
  ].filter((v): v is string => Boolean(v));
  for (const command of candidates) {
    const r = await text(command, ['--version'], { timeoutMs: 10_000 });
    if (r.ok) return { command, result: r };
  }
  return null;
}

export async function probeTesseract(): Promise<TesseractStatus> {
  const found = await findTesseract();
  if (!found) {
    return { available: false, reason: 'Tesseract no está instalado ni en PATH. Instálalo (UB Mannheim) o define TESSERACT_PATH.' };
  }
  const languages = (await text(found.command, ['--list-langs'], { timeoutMs: 10_000 })).stdout
    .split(/\r?\n/)
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean);
  return { available: true, version: found.result.stdout.split(/\r?\n/)[0]?.slice(0, 80), languages, binary: found.command };
}

/** Lee VRAM/RAM reales. Si no hay NVIDIA, devuelve null y lo declara. */
export async function probeHardware(): Promise<HardwareStatus> {
  const ramTotalGb = Math.round((os.totalmem() / 1024 ** 3) * 10) / 10;
  const smi = await text('nvidia-smi', ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits'], { timeoutMs: 10_000 });
  if (smi.ok) {
    const line = smi.stdout.split(/\r?\n/)[0] ?? '';
    const [gpu, total, free] = line.split(',').map((s) => s.trim());
    return {
      gpu: gpu || null,
      vramTotalMb: Number(total) || null,
      vramFreeMb: Number(free) || null,
      ramTotalGb,
      source: 'nvidia-smi',
    };
  }
  return { gpu: null, vramTotalMb: null, vramFreeMb: null, ramTotalGb, source: 'os.totalmem (sin GPU NVIDIA visible)' };
}

function sameModel(installed: string, candidate: string): boolean {
  const a = installed.toLowerCase();
  const b = candidate.toLowerCase();
  if (a === b) return true;
  // Un tag concreto no equivale a otro tag distinto: qwen2.5vl:3b ≠ qwen2.5vl:7b.
  if (!b.includes(':') && a.startsWith(b + ':')) return true;
  if (!a.includes(':') && b.startsWith(a + ':')) return true;
  return false;
}

/** Elige el mejor modelo instalado que quepa; si no hay, recomienda uno. */
export function selectVisionModel(status: OllamaStatus, hardware: HardwareStatus): VisionSelection {
  const vram = hardware.vramTotalMb ? hardware.vramTotalMb / 1024 : null;
  const available = VISION_MODELS.filter((m) => status.models.some((name) => sameModel(name, m.name)) || status.visionModels.some((name) => sameModel(name, m.name)));
  const fitting = available.filter((m) => vram === null || vram >= m.minVramGB);
  const best = [...fitting].sort((a, b) => b.quality - a.quality)[0] ?? null;
  const recommendation = [...VISION_MODELS]
    .filter((m) => vram === null || vram >= m.minVramGB)
    .sort((a, b) => b.quality - a.quality)[0] ?? null;
  if (best) {
    return {
      installed: true,
      model: best.name,
      fitsVram: true,
      reason: `${best.name} instalado; ${best.sizeGB} GB de pesos y ${vram ? `${vram.toFixed(1)} GB` : 'VRAM desconocida'} disponibles.`,
      recommended: recommendation,
    };
  }
  return {
    installed: false,
    model: null,
    fitsVram: recommendation !== null,
    reason: recommendation
      ? `No hay modelo de visión instalado. Recomendado: ${recommendation.name} (${recommendation.sizeGB} GB; mínimo ${recommendation.minVramGB} GB de VRAM).`
      : 'No hay modelo de visión que quepa en la VRAM detectada.',
    recommended: recommendation,
  };
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

/** Descarga un modelo de visión con Ollama. Requiere acción explícita del usuario. */
export async function installVisionModel(model?: string): Promise<{ installed: boolean; model: string; output: string }> {
  const hardware = await probeHardware();
  const status = await probeOllama();
  const selection = selectVisionModel(status, hardware);
  const target = model ?? selection.recommended?.name ?? 'qwen2.5vl:3b';
  const r = await text('ollama', ['pull', target], { timeoutMs: 900_000 });
  return { installed: r.ok, model: target, output: (r.stdout || r.stderr).slice(-1500) };
}

async function probePythonModule(module: string, label: string): Promise<ToolProbe> {
  const r = await text('python', ['-c', `import ${module}; print(getattr(${module}, '__version__', 'ok'))`], { timeoutMs: 15_000 });
  return r.ok
    ? { available: true, version: r.stdout.split(/\r?\n/)[0] }
    : { available: false, reason: `${label} no disponible en Python: ${r.stderr.split(/\r?\n/)[0] || r.stdout}` };
}

export async function visionStatus(): Promise<VisionStatus> {
  const [tesseract, ollama, hardware, opencv, mediapipe] = await Promise.all([
    probeTesseract(),
    probeOllama(),
    probeHardware(),
    probePythonModule('cv2', 'OpenCV (cv2)'),
    probePythonModule('mediapipe', 'MediaPipe'),
  ]);
  const selectedModel = selectVisionModel(ollama, hardware);
  const notes = [
    'El análisis de formas y composición es propio y no depende de OpenCV.',
    'MediaPipe no se usa: no está instalado y añadirlo no aportaría al análisis de referencia sin modelos de pose/cara descargados.',
    'Ollama sólo se consulta en localhost; no hay APIs externas.',
    hardware.source === 'nvidia-smi' ? `VRAM detectada: ${hardware.vramTotalMb} MB totales, ${hardware.vramFreeMb} MB libres.` : 'VRAM no disponible por nvidia-smi; la selección usa el catálogo y la RAM.',
  ];
  return { tesseract, ollama, hardware, selectedModel, opencv, mediapipe, notes };
}

/** OCR real con Tesseract. Devuelve líneas agrupadas y confianza media. */
export async function ocrImage(file: string, opts: { lang?: string } = {}): Promise<OcrResult> {
  const probe = await probeTesseract();
  if (!probe.available || !probe.binary) return { available: false, reason: probe.reason };
  if (!fs.existsSync(file)) return { available: false, reason: `No existe la imagen: ${file}` };
  const r = await text(probe.binary, [file, 'stdout', '--psm', '6', '-l', opts.lang ?? 'eng', 'tsv'], { timeoutMs: 60_000 });
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
  const hardware = await probeHardware();
  const selection = selectVisionModel(status, hardware);
  const model = opts.model ?? selection.model;
  if (!model) {
    return { available: false, reason: selection.reason };
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
  if (s.tesseract.available && s.tesseract.binary) lines.push(`  Binario: ${s.tesseract.binary}`);
  if (s.ollama.available) {
    lines.push(`  Modelos: ${s.ollama.models.join(', ') || 'ninguno'}.`);
    lines.push(`  Visión: ${s.ollama.visionModels.join(', ') || 'ninguno detectado'}.`);
  }
  lines.push(`Hardware: ${s.hardware.gpu ?? 'GPU no detectada'} · VRAM ${s.hardware.vramTotalMb ? `${s.hardware.vramTotalMb} MB` : 'desconocida'} · RAM ${s.hardware.ramTotalGb} GB.`);
  lines.push(`Modelo de visión: ${s.selectedModel.model ?? 'ninguno'}${s.selectedModel.installed ? '' : ' (no instalado)'} — ${s.selectedModel.reason}`);
  lines.push(`OpenCV: ${s.opencv.available ? s.opencv.version : s.opencv.reason}.`);
  lines.push(`MediaPipe: ${s.mediapipe.available ? s.mediapipe.version : s.mediapipe.reason}.`);
  return lines;
}

export function visionPathsHint(): string {
  return `Modelos de visión (locales, gratuitos): ${VISION_MODELS.map((m) => `${m.name} (${m.sizeGB} GB)`).join(', ')}. Instala con \`ve vision setup --install\`; no se descarga nada sin esa orden.`;
}
