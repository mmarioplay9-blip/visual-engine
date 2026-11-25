import fs from 'node:fs';
import path from 'node:path';
import { analyzeFile, describeProfile, type VisualProfile } from './analysis.js';
import { compareImages, compareProfiles, type Comparison, type ImageComparison } from './compare.js';
import { capture, type CaptureOptions, type CaptureResult } from './capture.js';
import { detectAll, installPackages, planFor, TOOLBOX, type InstallResult, type ToolStatus } from './deps.js';
import { ADAPTERS, scaffoldAdapter, type Scaffold } from './adapters.js';
import { applyEffect, getEffect, listEffects } from './library.js';
import { extractFrames, probe } from './media.js';
import { ensureDir, newRunDir, PACKAGE_ROOT } from './paths.js';
import { review, type ReviewOptions, type ReviewResult } from './review.js';
import { startStatic } from './static.js';
import { findProjectRoot } from './paths.js';

export interface DoctorResult {
  projectDir: string;
  tools: ToolStatus[];
  ready: number;
  total: number;
  missing: string[];
  install: string[];
}

export async function opDoctor(input: { project?: string; capabilities?: string[] } = {}): Promise<DoctorResult> {
  const projectDir = findProjectRoot(input.project ?? process.cwd());
  const tools = await detectAll(projectDir);
  const plan = await planFor(input.capabilities ?? [], projectDir, tools);
  const available = new Set(tools.filter((t) => t.available).map((t) => TOOLBOX.find((s) => s.id === t.id)?.pkg ?? t.id));
  const install = [...new Set(plan.flatMap((p) => p.install))].filter((pkg) => {
    const spec = TOOLBOX.find((t) => t.id === pkg);
    return !available.has(spec?.pkg ?? pkg);
  });
  return {
    projectDir,
    tools,
    ready: tools.filter((t) => t.available).length,
    total: tools.length,
    missing: tools.filter((t) => !t.available).map((t) => t.id),
    install,
  };
}

export interface AnalyzeResult {
  path: string;
  profile: VisualProfile;
  description: string[];
}

export async function opAnalyze(input: { paths: string[]; samples?: number; width?: number; outDir?: string }): Promise<AnalyzeResult[]> {
  const results: AnalyzeResult[] = [];
  for (const p of input.paths) {
    const profile = await analyzeFile(p, { samples: input.samples ?? 8, width: input.width ?? 192 });
    const description = describeProfile(profile);
    if (input.outDir) {
      ensureDir(input.outDir);
      const base = path.basename(p, path.extname(p));
      fs.writeFileSync(path.join(input.outDir, `${base}.profile.json`), JSON.stringify(profile, null, 2), 'utf8');
    }
    results.push({ path: path.resolve(p), profile, description });
  }
  return results;
}

export async function opExtractFrames(input: {
  path: string;
  outDir?: string;
  count?: number;
  fps?: number;
  width?: number;
  format?: 'png' | 'jpg';
}): Promise<{ outDir: string; files: string[]; info: Awaited<ReturnType<typeof probe>> }> {
  const outDir = ensureDir(input.outDir ?? path.join(newRunDir('frames'), 'frames'));
  const info = await probe(input.path);
  const files = await extractFrames(input.path, outDir, {
    count: input.count,
    fps: input.fps,
    width: input.width,
    format: input.format,
  });
  return { outDir, files, info };
}

export interface CaptureOpResult extends Omit<CaptureResult, 'profile'> {
  profile: VisualProfile;
  description: string[];
  screenshot: string;
}

export async function opCapture(
  input: CaptureOptions & { serveDir?: string; outDir?: string },
): Promise<CaptureOpResult> {
  let server: Awaited<ReturnType<typeof startStatic>> | undefined;
  let target = input.target;
  if (input.serveDir) {
    server = await startStatic(input.serveDir);
    target = server.url + (input.target && !/^https?:\/\//.test(input.target) ? input.target.replace(/^\/+/, '') : '');
  }
  try {
    const r = await capture({ ...input, target });
    return {
      ...r,
      profile: r.profile!,
      description: describeProfile(r.profile!),
      screenshot: r.frames[0],
    };
  } finally {
    await server?.close();
  }
}

export interface CompareOpResult {
  reference: string;
  candidate: string;
  comparison: Comparison;
  image?: ImageComparison;
  heatmap?: string;
  warnings: string[];
}

/** Compara dos archivos reales (imagen o vídeo). Si ambos son imágenes, añade diferencia por píxel. */
export async function opCompare(input: {
  reference: string;
  candidate: string;
  outDir?: string;
  width?: number;
}): Promise<CompareOpResult> {
  const outDir = ensureDir(input.outDir ?? newRunDir('compare'));
  const [refInfo, candInfo] = await Promise.all([probe(input.reference), probe(input.candidate)]);
  const samples = 8;
  const [refProfile, candProfile] = await Promise.all([
    analyzeFile(input.reference, { samples, width: 192 }),
    analyzeFile(input.candidate, { samples, width: 192 }),
  ]);
  const comparison = compareProfiles(refProfile, candProfile);
  const warnings: string[] = [];
  let image: ImageComparison | undefined;
  let heatmap: string | undefined;
  if (refInfo.kind === 'image' && candInfo.kind === 'image') {
    image = await compareImages(input.reference, input.candidate, { width: input.width ?? 240, outDir });
    heatmap = image.heatmap;
  } else if (refInfo.width !== candInfo.width || refInfo.height !== candInfo.height) {
    warnings.push('Las resoluciones difieren: el mapa de calor no se genera y la comparación usa métricas normalizadas.');
  }
  fs.writeFileSync(path.join(outDir, 'compare.json'), JSON.stringify({ reference: refProfile, candidate: candProfile, comparison, image, warnings }, null, 2), 'utf8');
  return { reference: path.resolve(input.reference), candidate: path.resolve(input.candidate), comparison, image, heatmap, warnings };
}

export async function opReview(input: ReviewOptions): Promise<ReviewResult> {
  return review(input);
}

export function opListEffects(filter: { category?: string; query?: string } = {}) {
  const all = listEffects();
  const q = filter.query?.toLowerCase();
  return all
    .filter((e) => !filter.category || e.category === filter.category)
    .filter((e) => !q || `${e.id} ${e.name} ${e.summary} ${e.tags ?? ''} ${e.engines.join(' ')}`.toLowerCase().includes(q))
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      summary: e.summary,
      engines: e.engines,
      requires: e.requires,
      performance: e.performance,
      params: e.params.map((p) => p.name),
    }));
}

export function opGetEffect(id: string) {
  const e = getEffect(id);
  return {
    ...e,
    files: e.files.map((f) => ({ path: f.path, lines: f.content.split('\n').length })),
  };
}

export function opApplyEffect(input: { id: string; outDir: string; params?: Record<string, string | number | boolean> }) {
  const applied = applyEffect(input.id, { outDir: input.outDir, params: input.params });
  return applied;
}

export function opAdapters() {
  return ADAPTERS;
}

export async function opScaffold(input: { adapter: string; outDir: string; write?: boolean }): Promise<Scaffold> {
  return scaffoldAdapter(input.adapter, input);
}

export async function opDepsPlan(input: { capabilities?: string[]; project?: string }) {
  const projectDir = findProjectRoot(input.project ?? process.cwd());
  const tools = await detectAll(projectDir);
  const plan = await planFor(input.capabilities ?? [], projectDir, tools);
  return { projectDir, plan, tools };
}

export async function opInstallDeps(input: {
  packages: string[];
  project?: string;
  confirm: boolean;
  dryRun?: boolean;
}): Promise<InstallResult> {
  if (input.confirm !== true) {
    throw new Error('Instalación no confirmada: repite con confirm=true (o `--yes` en la CLI).');
  }
  return installPackages(input.packages, input.project ?? process.cwd(), { dryRun: input.dryRun ?? false });
}

export function opVersion() {
  let version = '0.0.0';
  try {
    version = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')).version;
  } catch {
    /* ignora */
  }
  return {
    name: 'visual-engine',
    version,
    root: PACKAGE_ROOT,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
  };
}

export { findProjectRoot };
