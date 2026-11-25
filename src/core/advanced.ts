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
import { describeVisionStatus, ocrImage, ollamaAnalyzeImage, visionStatus, type OcrResult, type OllamaResult, type VisionStatus } from './vision.js';
import { describeTemporal, temporalCompare, type TemporalComparison } from './temporal.js';
import { describeIteration, listIterations, restoreIteration, runIteration, type IterationOptions, type IterationResult } from './iterate.js';
import { ensureDir, newRunDir } from './paths.js';

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
  const spec = buildVisualSpec({ profile, timeline, camera, content, effects });
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
  action: 'status' | 'describe' | 'ocr';
  path?: string;
  model?: string;
  prompt?: string;
  outDir?: string;
}): Promise<{ status: VisionStatus; description: string[]; result?: OllamaResult | OcrResult }> {
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

export { describeTemporal, describeIteration, describeProfile };
