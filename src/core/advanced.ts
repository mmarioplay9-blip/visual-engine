import fs from 'node:fs';
import path from 'node:path';
import { analyzeFile, describeProfile } from './analysis.js';
import { extractFrameAt, probe, sampleFrames } from './media.js';
import { analyzeTimeline, describeTimeline, exportStoryboard, saveTimeline, type VideoTimeline } from './timeline.js';
import { analyzeCamera, describeCamera, type CameraAnalysis } from './motion.js';
import { describeContent, inspectFrames, type ContentAnalysis } from './inspect.js';
import { describeEffects, detectEffects, saveEffectReport, type EffectReport } from './effects.js';
import { buildVisualSpec, saveVisualSpec, type VisualSpec } from './spec.js';
import { recommendAndCheck, recommendEffect, recommendationCatalog, type EffectRecommendation } from './recommend.js';
import { describeVisionStatus, installVisionModel, ocrImage, ollamaAnalyzeImage, probeHardware, visionStatus, type OcrResult, type OllamaResult, type VisionStatus } from './vision.js';
import { describeTemporal, temporalCompare, type TemporalComparison } from './temporal.js';
import { describeIteration, listIterations, restoreIteration, runIteration, type IterationOptions, type IterationResult } from './iterate.js';
import { ensureDir, newRunDir } from './paths.js';
import { renderComposition, validateComposition, compositionSummary, type VEComposition, type RenderedComposition } from './composition.js';
import { referenceEffects, specToComposition, type ReferenceEffectsResult } from './refeffects.js';
import { benchmarkEffects, type BenchmarkReport } from './benchmark.js';
import { buildArtDirection, renderDesignSystem, designMarkdown, type ArtDirection } from './styles.js';
import { buildMotionDirector, renderMotionLab, type MotionDirectorPlan } from './motion-director.js';
import { buildReferenceDesign, renderReferenceDesign, type ReferenceDesign } from './refdesign.js';
import { renderShowcase, measureShowcase, type ShowcaseMeasurement, type RenderShowcaseResult } from './showcase.js';

/**
 * Operaciones de la capa avanzada. Cada una devuelve datos medidos y las rutas
 * de sus artefactos, listas para CLI, MCP o API.
 */

export interface TimelineOpResult {
  timeline: VideoTimeline;
  description: string[];
  json?: string;
  storyboard?: string[];
}

export async function opTimeline(input: {
  path: string;
  samples?: number;
  outDir?: string;
  storyboard?: boolean;
}): Promise<TimelineOpResult> {
  const timeline = await analyzeTimeline(input.path, { samples: input.samples });
  const outDir = input.outDir ? ensureDir(input.outDir) : undefined;
  const json = outDir ? saveTimeline(timeline, outDir) : undefined;
  const storyboard = outDir && input.storyboard ? await exportStoryboard(timeline, path.join(outDir, 'storyboard')) : undefined;
  return { timeline, description: describeTimeline(timeline), json, storyboard };
}

export async function opCamera(input: { path: string; samples?: number; width?: number }): Promise<{
  camera: CameraAnalysis;
  description: string[];
}> {
  const camera = await analyzeCamera(input.path, { samples: input.samples, width: input.width });
  return { camera, description: describeCamera(camera) };
}

export interface InspectOpResult {
  content: ContentAnalysis;
  description: string[];
  ocr?: OcrResult;
  frame?: string;
}

export async function opInspect(input: {
  path: string;
  frames?: number;
  width?: number;
  outDir?: string;
  ocr?: boolean;
}): Promise<InspectOpResult> {
  const info = await probe(input.path);
  const frames = Math.max(1, Math.min(6, input.frames ?? 3));
  const width = input.width ?? 192;
  const samples = await sampleFrames(input.path, {
    count: info.kind === 'image' ? 1 : frames,
    width,
  });
  const content = inspectFrames(samples);
  let ocr: OcrResult | undefined;
  let frame: string | undefined;
  if (input.ocr) {
    const outDir = ensureDir(input.outDir ?? newRunDir('inspect'));
    frame = info.kind === 'image'
      ? path.resolve(input.path)
      : await extractFrameAt(input.path, Math.min(0.1, Math.max(0, info.duration / 10)), path.join(outDir, 'ocr-frame.png'), 960);
    ocr = await ocrImage(frame);
    if (ocr.available && ocr.lines) {
      content.ocr = {
        available: true,
        reason: 'OCR ejecutado con Tesseract.',
        lines: ocr.lines.map((l) => ({ text: l.text, confidence: l.confidence, box: l.box })),
      };
      content.textLines = ocr.lines.map((l) => ({
        x0: l.box[0], y0: l.box[1], x1: l.box[0] + l.box[2], y1: l.box[1] + l.box[3],
        heightRatio: l.box[3] / Math.max(1, info.height),
        components: l.text.trim().split(/\s+/).length,
        confidence: Math.min(1, l.confidence / 100),
        status: 'verified',
        text: l.text,
      }));
    } else {
      content.ocr = { available: false, reason: ocr.reason ?? 'OCR no disponible.' };
    }
  }
  return { content, description: describeContent(content), ocr, frame };
}

export interface EffectsOpResult {
  report: EffectReport;
  description: string[];
  json?: string;
}

export async function opDetectEffects(input: {
  path: string;
  samples?: number;
  outDir?: string;
}): Promise<EffectsOpResult> {
  const samples = await sampleFrames(input.path, { count: Math.max(4, Math.min(16, input.samples ?? 8)), width: 192 });
  const report = detectEffects(input.path, samples);
  const outDir = input.outDir ? ensureDir(input.outDir) : undefined;
  const json = outDir ? saveEffectReport(report, outDir) : undefined;
  return { report, description: describeEffects(report), json };
}

export interface SpecOpResult {
  spec: VisualSpec;
  paths: { json: string; md: string };
  timeline: VideoTimeline;
  camera: CameraAnalysis;
  content: ContentAnalysis;
  effects: EffectReport;
  description: string[];
}

export async function opSpec(input: {
  path: string;
  samples?: number;
  outDir?: string;
  vision?: boolean;
  model?: string;
}): Promise<SpecOpResult> {
  const info = await probe(input.path);
  if (info.kind === 'image') throw new Error('La especificación completa requiere vídeo; para una imagen usa `ve inspect`.');
  const samples = Math.max(8, Math.min(24, input.samples ?? 14));
  const outDir = ensureDir(input.outDir ?? newRunDir('spec'));
  const timeline = await analyzeTimeline(input.path, { samples });
  const camera = await analyzeCamera(input.path, { samples: Math.min(16, samples), width: 128 });
  const frames = await sampleFrames(input.path, { count: 4, width: 192 });
  const content = inspectFrames(frames);
  const effects = detectEffects(input.path, await sampleFrames(input.path, { count: samples, width: 192 }));
  const profile = await analyzeFile(input.path, { samples: Math.min(12, samples), width: 192 });
  let ocr: OcrResult | undefined;
  let semantic: OllamaResult | undefined;
  let frameSize: { width: number; height: number } | undefined;
  const visionPaths: string[] = [];
  if (input.vision) {
    const frame = await extractFrameAt(input.path, Math.min(0.6, Math.max(0.05, info.duration / 2)), path.join(outDir, 'vision-frame.png'), 960);
    const frameInfo = await probe(frame);
    frameSize = { width: frameInfo.width, height: frameInfo.height };
    [ocr, semantic] = await Promise.all([ocrImage(frame), ollamaAnalyzeImage(frame, { model: input.model })]);
    if (ocr) {
      const file = path.join(outDir, 'ocr.json');
      fs.writeFileSync(file, JSON.stringify(ocr, null, 2), 'utf8');
      visionPaths.push(file);
    }
    if (semantic) {
      const file = path.join(outDir, 'semantic.json');
      fs.writeFileSync(file, JSON.stringify(semantic, null, 2), 'utf8');
      visionPaths.push(file);
    }
  }
  const spec = buildVisualSpec({ profile, timeline, camera, content, effects, ocr, semantic, frameSize });
  const paths = saveVisualSpec(spec, outDir);
  return {
    spec,
    paths,
    timeline,
    camera,
    content,
    effects,
    description: [
      `Especificación guardada: ${paths.md}`,
      ...describeTimeline(timeline),
      ...describeCamera(camera),
      ...content.warnings.map((w) => `Límite: ${w}`),
      ...(ocr?.available ? [`OCR: ${ocr.lines?.length ?? 0} línea(s) leídas con Tesseract.`] : input.vision ? [`OCR no disponible: ${ocr?.reason ?? 'sin resultado'}`] : []),
      ...(semantic?.available ? [`Visión local (${semantic.model}): ${semantic.response?.slice(0, 240)}`] : input.vision ? [`Visión local no disponible: ${semantic?.reason ?? 'sin resultado'}`] : []),
      ...visionPaths.map((f) => `Artefacto de visión: ${f}`),
    ],
  };
}

export interface RecommendOpResult {
  recommendations: EffectRecommendation[];
  catalog: string[];
}

export async function opRecommend(input: {
  effect?: string;
  specFile?: string;
  params?: Record<string, number | string>;
}): Promise<RecommendOpResult> {
  if (input.effect) {
    const rec = recommendAndCheck(input.effect, input.params ?? {});
    return { recommendations: [rec], catalog: recommendationCatalog() };
  }
  if (input.specFile) {
    const spec = JSON.parse(fs.readFileSync(input.specFile, 'utf8')) as VisualSpec;
    const recs = (spec.effects ?? []).map((e) => recommendAndCheck(e.id, e.params));
    return { recommendations: recs, catalog: recommendationCatalog() };
  }
  return { recommendations: [], catalog: recommendationCatalog() };
}

export async function opVision(input: {
  action: 'status' | 'describe' | 'ocr' | 'setup';
  path?: string;
  model?: string;
  prompt?: string;
  outDir?: string;
  install?: boolean;
}): Promise<{ status: VisionStatus; description: string[]; result?: OllamaResult | OcrResult | { installed: boolean; model: string; output: string }; hardware?: Awaited<ReturnType<typeof probeHardware>> }> {
  if (input.action === 'setup') {
    const hardware = await probeHardware();
    const install = input.install ? await installVisionModel(input.model) : null;
    const status = await visionStatus();
    return {
      status,
      hardware,
      result: install ?? undefined,
      description: [
        `Hardware: ${hardware.gpu ?? 'GPU no detectada'} · VRAM ${hardware.vramTotalMb ?? '?'} MB · RAM ${hardware.ramTotalGb} GB.`,
        install ? `${install.installed ? 'Modelo instalado' : 'No se pudo instalar'}: ${install.model}` : `Instalación no solicitada. Recomendado: ${status.selectedModel.recommended?.name ?? 'ninguno'}. Usa --install.`,
        ...describeVisionStatus(status),
      ],
    };
  }
  const status = await visionStatus();
  const description = describeVisionStatus(status);
  if (input.action === 'status') return { status, description };
  if (!input.path) throw new Error('Indica una imagen o fotograma para la acción de visión.');
  if (input.action === 'ocr') {
    const result = await ocrImage(input.path);
    return { status, description: [...description, ...(result.available ? (result.text ?? '').split('\n') : [result.reason ?? 'OCR no disponible'])] , result };
  }
  const result = await ollamaAnalyzeImage(input.path, { model: input.model, prompt: input.prompt });
  return { status, description: [...description, ...(result.available ? [result.response ?? ''] : [result.reason ?? 'Ollama no disponible'])], result };
}

export interface ComposeOpResult {
  valid: boolean;
  errors: string[];
  composition: VEComposition;
  description: string[];
  rendered?: RenderedComposition;
}

export async function opCompose(input: {
  composition?: unknown;
  file?: string;
  outDir?: string;
  validateOnly?: boolean;
}): Promise<ComposeOpResult> {
  const raw = input.composition ?? (input.file ? JSON.parse(fs.readFileSync(input.file, 'utf8')) : undefined);
  if (!raw) throw new Error('Indica una composición JSON o un archivo con --file.');
  const valid = validateComposition(raw);
  if (!valid.ok || !valid.value) return { valid: false, errors: valid.errors, composition: raw as VEComposition, description: valid.errors };
  const rendered = input.validateOnly ? undefined : renderComposition(valid.value, { outDir: input.outDir });
  return {
    valid: true,
    errors: [],
    composition: valid.value,
    description: [...compositionSummary(valid.value), ...(rendered ? [`HTML: ${rendered.html}`, `Config: ${rendered.config}`] : ['Sólo validación: no se escribieron archivos.'])],
    rendered,
  };
}

export async function opReferenceEffects(input: {
  path?: string;
  specFile?: string;
  outDir?: string;
  vision?: boolean;
  model?: string;
  render?: boolean;
}): Promise<ReferenceEffectsResult & { specFile?: string; specPaths?: { json: string; md: string } }> {
  const outDir = ensureDir(input.outDir ?? newRunDir('reference-effects'));
  let spec: VisualSpec;
  let specPaths: { json: string; md: string } | undefined;
  if (input.specFile) {
    spec = JSON.parse(fs.readFileSync(input.specFile, 'utf8')) as VisualSpec;
  } else if (input.path) {
    const specRun = await opSpec({ path: input.path, outDir, vision: input.vision, model: input.model });
    spec = specRun.spec;
    specPaths = specRun.paths;
  } else {
    throw new Error('Indica un vídeo (--path) o una especificación (--spec).');
  }
  const built = referenceEffects({ spec, outDir, render: input.render !== false });
  return { ...built, specFile: specPaths?.json, specPaths };
}

export async function opBenchmark(input: {
  effects?: string[];
  ms?: number;
  width?: number;
  height?: number;
  outFile?: string;
  docsFile?: string;
} = {}): Promise<BenchmarkReport> {
  return benchmarkEffects({
    ids: input.effects,
    ms: input.ms,
    width: input.width,
    height: input.height,
    outFile: input.outFile,
    docsFile: input.docsFile ?? newRunDir('benchmarks') + '/RENDIMIENTO.md',
  });
}

export async function opTemporal(input: {
  reference: string;
  candidate: string;
  samples?: number;
  outDir?: string;
}): Promise<TemporalComparison> {
  return temporalCompare(input.reference, input.candidate, { samples: input.samples, outDir: input.outDir });
}

export async function opIterate(input: IterationOptions): Promise<IterationResult> {
  return runIteration(input);
}

export function opBackups(projectDir?: string) {
  return listIterations(projectDir ?? process.cwd());
}

export function opRestoreBackup(projectDir: string | undefined, id: string) {
  return restoreIteration(projectDir ?? process.cwd(), id);
}

export interface ArtDirectionOpResult {
  artDirection: ArtDirection;
  design: ReturnType<typeof renderDesignSystem>;
  description: string[];
}

export function opArtDirection(input: { brief: string; style?: string; projectType?: string; outDir?: string }): ArtDirectionOpResult {
  if (!input.brief?.trim()) throw new Error('Indica un brief para la dirección artística.');
  const ad = buildArtDirection({ brief: input.brief, style: input.style, projectType: input.projectType });
  const outDir = ensureDir(input.outDir ?? newRunDir('art-direction'));
  const design = renderDesignSystem(ad, outDir);
  fs.writeFileSync(path.join(outDir, 'art-direction.json'), JSON.stringify(ad, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outDir, 'ART-DIRECTION.md'), designMarkdown(ad), 'utf8');
  return {
    artDirection: ad, design,
    description: [
      `Estilo: ${ad.style.name} (${ad.style.id}).`,
      `Auditoría estructural: ${ad.audit.structuralScore}/100; peor contraste ${Math.min(...ad.audit.contrastPairs.map((p) => p.ratio))}:1.`,
      `Efectos propuestos: ${ad.effects.map((e) => e.id).join(', ') || 'ninguno'}.`,
      `Sistema de diseño: ${design.html}`,
      `Tokens: ${design.tokens}`,
      'La auditoría es estructural; la calidad artística requiere revisión humana.',
    ],
  };
}

export function opMotionDirector(input: { style?: string; brief?: string; projectType?: string; outDir?: string }): { plan: MotionDirectorPlan; html: string; description: string[] } {
  const ad = buildArtDirection({ brief: input.brief ?? 'Sistema de movimiento', style: input.style, projectType: input.projectType });
  const outDir = ensureDir(input.outDir ?? newRunDir('motion-director'));
  const lab = renderMotionLab(ad, outDir);
  const plan = buildMotionDirector(ad);
  fs.writeFileSync(path.join(outDir, 'motion-plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8');
  return {
    plan, html: lab.html,
    description: [
      `Estilo: ${ad.style.name}; movimiento ${plan.level}.`,
      `Duraciones ${plan.durations.micro}/${plan.durations.base}/${plan.durations.slow} ms; stagger ${plan.staggerMs} ms.`,
      `Transición: ${plan.validation.transition.status} (${plan.validation.transition.samples} muestras, monotónica ${plan.validation.transition.monotonic ? 'sí' : 'no'}).`,
      `Rotación: ${plan.validation.rotation.status}; esperada ${plan.validation.rotation.expectedDeg}°, medida ${plan.validation.rotation.measuredDeg}°, error ${plan.validation.rotation.errorDeg}°.`,
      `Laboratorio: ${lab.html}`,
      ...plan.limitations.map((l) => `Límite: ${l}`),
    ],
  };
}

export interface ReferenceDesignOpResult {
  design: ReferenceDesign;
  rendered: ReturnType<typeof renderReferenceDesign>;
  description: string[];
}

export async function opReferenceDesign(input: {
  path?: string;
  specFile?: string;
  style?: string;
  brief?: string;
  outDir?: string;
  vision?: boolean;
  model?: string;
}): Promise<ReferenceDesignOpResult> {
  if (!input.path && !input.specFile) throw new Error('Indica una imagen/vídeo (--path) o una especificación (--spec).');
  const outDir = ensureDir(input.outDir ?? newRunDir('reference-design'));
  let spec: VisualSpec;
  if (input.specFile) {
    spec = JSON.parse(fs.readFileSync(input.specFile, 'utf8')) as VisualSpec;
  } else {
    const info = await probe(input.path!);
    if (info.kind === 'video') {
      spec = (await opSpec({ path: input.path!, outDir: path.join(outDir, 'spec'), vision: input.vision, model: input.model })).spec;
    } else {
      const profile = await analyzeFile(input.path!, { samples: 1, width: 256 });
      const content = inspectFrames(await sampleFrames(input.path!, { count: 1, width: 256 }));
      let ocr: OcrResult | undefined;
      if (input.vision) ocr = await ocrImage(input.path!);
      if (ocr?.available && ocr.lines) {
        content.ocr = { available: true, reason: 'OCR ejecutado con Tesseract.', lines: ocr.lines.map((l) => ({ text: l.text, confidence: l.confidence, box: l.box })) };
        content.textLines = ocr.lines.map((l) => ({ x0: l.box[0], y0: l.box[1], x1: l.box[0] + l.box[2], y1: l.box[1] + l.box[3], heightRatio: l.box[3] / Math.max(1, info.height), components: l.text.trim().split(/\s+/).length, confidence: Math.min(1, l.confidence / 100), status: 'verified', text: l.text }));
      }
      spec = buildVisualSpec({ profile, content, ocr, frameSize: { width: info.width, height: info.height } });
    }
  }
  const design = buildReferenceDesign(spec, { style: input.style, brief: input.brief });
  const rendered = renderReferenceDesign(design, outDir);
  return {
    design, rendered,
    description: [
      `Referencia: ${design.source}`,
      `Estilo propuesto: ${design.styleId} (confianza ${(design.styleConfidence * 100).toFixed(0)} %).`,
      `Confirmado: ${design.confirmed.length} datos medidos; estimado: ${design.estimated.length} hipótesis.`,
      `Tipografía aproximada: ${design.typography.approximation.display} / ${design.typography.approximation.body} (no identifica la fuente original).`,
      `Efectos: ${design.effects.map((e) => `${e.detected}→${e.mappedTo}`).join(', ') || 'ninguno'}.`,
      `Sistema: ${rendered.html}`,
      `Diseño: ${rendered.markdown}`,
      ...design.warnings.map((w) => `Aviso: ${w}`),
      ...design.limitations.map((l) => `Límite: ${l}`),
    ],
  };
}

export interface ShowcaseOpResult {
  rendered: RenderShowcaseResult;
  measurements?: ShowcaseMeasurement[];
  description: string[];
}

export async function opShowcase(input: { outDir?: string; ids?: string[]; measure?: boolean } = {}): Promise<ShowcaseOpResult> {
  const rendered = renderShowcase({ outDir: input.outDir, ids: input.ids });
  const measurements = input.measure ? await measureShowcase({ outDir: input.outDir, ids: input.ids }) : undefined;
  const ok = measurements?.filter((m) => m.ok).length;
  return {
    rendered, measurements,
    description: [
      `${rendered.compositions.length} composiciones en ${rendered.outDir}.`,
      'Estilos: ' + [...new Set(rendered.compositions.map((c) => c.style))].join(', '),
      ...(measurements ? [
        `Medición: ${ok}/${measurements.length} sin errores; FPS mediana ${medianOf(measurements.map((m) => m.fps))}; mínimo ${Math.min(...measurements.map((m) => m.fps))}.`,
        `Violaciones de contraste: ${measurements.reduce((n, m) => n + m.contrastViolations, 0)}.`,
      ] : ['Medición no solicitada; usa --measure.']),
      `Catálogo: ${rendered.catalog}`,
    ],
  };
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export { describeTemporal, describeIteration, describeProfile };
