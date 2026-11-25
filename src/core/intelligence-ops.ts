import fs from 'node:fs';
import path from 'node:path';
import { buildArtDirection, type ArtDirection } from './styles.js';
import { critique, describeCritic, type CriticReport } from './critic.js';
import { assessFidelity, fidelityMarkdown, type FidelityReport } from './fidelity.js';
import { evaluateGates, gateMarkdown, type GateConfig, type GateInput, type GateResult } from './gates.js';
import { inspectDom, describeDom, type DebugElement, type DomSnapshot } from './debugger.js';
import { selectContext, describeContext, clearAnalysisCache, type ContextSelection } from './context.js';
import { selectSmartEffects, describeSmartEffects, type SmartEffectsInput, type SmartEffectsResult } from './smart-effects.js';
import { runImprovementLoop, listLoops, restoreLoop, describeLoop, type LoopOptions, type LoopResult } from './loop.js';
import { review, type ReviewResult } from './review.js';
import type { VisualSpec } from './spec.js';
import { ensureDir } from './paths.js';

/**
 * Operaciones de la capa Visual Intelligence. No añaden un proveedor de IA:
 * orquestan medidas locales y devuelven artefactos y acciones concretas.
 */

export interface IntelligenceInput {
  reference: string;
  target?: string;
  targetDir?: string;
  brief?: string;
  style?: string;
  projectType?: string;
  specFile?: string;
  width?: number;
  height?: number;
  frames?: number;
  intervalMs?: number;
  waitMs?: number;
  outDir?: string;
  performance?: { fps?: number; p95FrameMs?: number; loadMs?: number; longTasks?: number };
  humanApproval?: { approved?: boolean; reviewer?: string; note?: string };
  gates?: Partial<GateConfig>;
}

export interface IntelligenceResult {
  version: '0.5';
  review: ReviewResult;
  dom?: DomSnapshot;
  critic: CriticReport;
  fidelity: FidelityReport;
  gates: GateResult;
  art: ArtDirection;
  paths: {
    outDir: string;
    intelligence: string;
    critic: string;
    criticMd: string;
    fidelity: string;
    fidelityMd: string;
    gates: string;
    gatesMd: string;
    dom?: string;
    agentTask: string;
  };
  description: string[];
}

function usedEffects(dom?: DomSnapshot): { id: string }[] {
  if (!dom) return [];
  const ids = new Set<string>();
  for (const el of dom.elements) for (const id of el.effects) if (id && id !== 'true') ids.add(id);
  return [...ids].map((id) => ({ id }));
}

function readSpec(file?: string): VisualSpec | undefined {
  if (!file) return undefined;
  if (!fs.existsSync(file)) throw new Error(`No existe la especificación: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as VisualSpec;
}

export async function opIntelligence(input: IntelligenceInput): Promise<IntelligenceResult> {
  if (!input.reference) throw new Error('Indica --reference <imagen|vídeo>.');
  const outDir = ensureDir(input.outDir ?? 'inteligencia');
  const target = input.target ?? 'index.html';
  const brief = input.brief?.trim() || `Analizar y mejorar ${target}`;
  const art = buildArtDirection({ brief, style: input.style, projectType: input.projectType });
  const spec = readSpec(input.specFile);

  const report = await review({
    reference: input.reference,
    target,
    targetDir: input.targetDir,
    width: input.width,
    height: input.height,
    frames: input.frames,
    intervalMs: input.intervalMs,
    waitMs: input.waitMs,
    outDir: path.join(outDir, 'review'),
  });

  let dom: DomSnapshot | undefined;
  const warnings: string[] = [];
  try {
    dom = await inspectDom({
      target,
      targetDir: input.targetDir,
      width: input.width,
      height: input.height,
      waitMs: input.waitMs,
      outDir: path.join(outDir, 'dom'),
      sourceRoot: input.targetDir ?? process.cwd(),
    });
  } catch (e) {
    warnings.push(`DOM no disponible: ${(e as Error).message}`);
  }
  const used = usedEffects(dom);
  const critic = critique({
    request: {
      brief,
      style: art.style.id,
      projectType: art.projectType,
      allowDecorativeEffects: !['minimal-premium', 'professional-app', 'financial-dashboard'].includes(art.style.id),
    },
    reference: report.reference.profile,
    candidate: report.target.profile,
    quality: report.quality,
    art,
    spec,
    dom,
    usedEffects: used,
    performance: input.performance,
    runtime: {
      consoleErrors: report.target.consoleErrors,
      requestFailures: report.target.errors,
      functionalFailures: report.warnings.filter((w) => /error|fallo|no se pudo/i.test(w)),
    },
  });
  if (warnings.length) critic.limitations.push(...warnings);
  const fidelity = assessFidelity({
    reference: report.reference.profile,
    candidate: report.target.profile,
    spec,
    quality: report.quality,
    dom,
    art,
    usedEffects: used,
    expectedEffects: spec?.effects.map((e) => ({ id: e.id, confidence: e.confidence })),
  });
  const gates = evaluateGates({
    quality: report.quality,
    fidelity,
    critic,
    dom,
    performance: input.performance,
    humanApproval: input.humanApproval,
    config: input.gates,
  });

  const criticPath = path.join(outDir, 'critic.json');
  const criticMd = path.join(outDir, 'critic.md');
  const fidelityPath = path.join(outDir, 'fidelity.json');
  const fidelityMd = path.join(outDir, 'fidelity.md');
  const gatePath = path.join(outDir, 'gates.json');
  const gateMd = path.join(outDir, 'gates.md');
  const agentTask = path.join(outDir, 'agent-task.md');
  const intelligencePath = path.join(outDir, 'intelligence.json');
  fs.writeFileSync(criticPath, JSON.stringify(critic, null, 2) + '\n', 'utf8');
  fs.writeFileSync(criticMd, critic.agentTask, 'utf8');
  fs.writeFileSync(fidelityPath, JSON.stringify(fidelity, null, 2) + '\n', 'utf8');
  fs.writeFileSync(fidelityMd, fidelityMarkdown(fidelity), 'utf8');
  fs.writeFileSync(gatePath, JSON.stringify(gates, null, 2) + '\n', 'utf8');
  fs.writeFileSync(gateMd, gateMarkdown(gates), 'utf8');
  fs.writeFileSync(agentTask, critic.agentTask, 'utf8');
  const paths: IntelligenceResult['paths'] = {
    outDir, intelligence: intelligencePath, critic: criticPath, criticMd, fidelity: fidelityPath,
    fidelityMd, gates: gatePath, gatesMd: gateMd, dom: dom ? path.join(outDir, 'dom', 'dom.json') : undefined,
    agentTask,
  };
  const result: IntelligenceResult = {
    version: '0.5', review: report, dom, critic, fidelity, gates, art, paths,
    description: [
      `Calidad ${report.quality.overall}/100; fidelidad estructural ${fidelity.score}/100; crítica ${critic.score}/100.`,
      ...describeCritic(critic),
      ...describeGatesShort(gates),
      ...(dom ? describeDom(dom) : ['Sin DOM: no se localizan selectores.']),
      `Tarea del agente: ${agentTask}`,
      ...critic.limitations.map((l) => `Límite: ${l}`),
    ],
  };
  fs.writeFileSync(intelligencePath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  return result;
}

function describeGatesShort(g: GateResult): string[] {
  return [g.summary, ...g.blockers.map((b) => `Bloqueo: ${b.label} = ${b.actual} (${b.threshold})`)];
}

export function opDebug(input: {
  target?: string;
  targetDir?: string;
  width?: number;
  height?: number;
  waitMs?: number;
  outDir?: string;
  sourceRoot?: string;
}): Promise<DomSnapshot> {
  return inspectDom({
    target: input.target ?? 'index.html',
    targetDir: input.targetDir,
    width: input.width,
    height: input.height,
    waitMs: input.waitMs,
    outDir: input.outDir,
    sourceRoot: input.sourceRoot ?? input.targetDir,
  });
}

export async function opCritic(input: IntelligenceInput): Promise<{ critic: CriticReport; fidelity: FidelityReport; gates: GateResult; paths: IntelligenceResult['paths']; description: string[] }> {
  const r = await opIntelligence(input);
  return { critic: r.critic, fidelity: r.fidelity, gates: r.gates, paths: r.paths, description: [r.critic.summary, ...r.critic.limitations.map((l) => `Límite: ${l}`)] };
}

export async function opFidelity(input: IntelligenceInput): Promise<{ fidelity: FidelityReport; paths: { json: string; md: string }; description: string[] }> {
  const r = await opIntelligence(input);
  return {
    fidelity: r.fidelity,
    paths: { json: r.paths.fidelity, md: r.paths.fidelityMd },
    description: [r.fidelity.summary, ...r.fidelity.warnings.map((w) => `Límite: ${w}`)],
  };
}

export function opSmartEffects(input: SmartEffectsInput & { outDir?: string }): SmartEffectsResult & { json?: string; markdown?: string } {
  const result = selectSmartEffects(input);
  let json: string | undefined, markdown: string | undefined;
  if (input.outDir) {
    const dir = ensureDir(input.outDir);
    json = path.join(dir, 'smart-effects.json');
    markdown = path.join(dir, 'SMART-EFFECTS.md');
    fs.writeFileSync(json, JSON.stringify(result, null, 2) + '\n', 'utf8');
    fs.writeFileSync(markdown, [
      '# Smart Effects Selection 0.5',
      '',
      ...describeSmartEffects(result),
      '',
      ...result.limitations.map((l) => `- ${l}`),
      '',
    ].join('\n'), 'utf8');
  }
  return { ...result, json, markdown };
}

export function opContext(input: { task: string; maxTools?: number; maxRecipes?: number; style?: string; projectType?: string; clearCache?: boolean }): ContextSelection & { cleared?: number } {
  const cleared = input.clearCache ? clearAnalysisCache() : undefined;
  return { ...selectContext(input.task, input), cleared };
}

export function opGate(input: {
  from?: string;
  quality?: GateInput['quality'];
  fidelity?: FidelityReport;
  critic?: CriticReport;
  dom?: DomSnapshot;
  performance?: GateInput['performance'];
  previous?: GateInput['previous'];
  config?: Partial<GateConfig>;
  humanApproval?: GateInput['humanApproval'];
  outDir?: string;
}): GateResult & { paths?: { json: string; md: string } } {
  let source: any = input;
  if (input.from) {
    if (!fs.existsSync(input.from)) throw new Error(`No existe el informe: ${input.from}`);
    source = JSON.parse(fs.readFileSync(input.from, 'utf8'));
    // Acepta intelligence.json, review.json o un objeto de gates ya compuesto.
    if (source.review && source.critic) {
      source = {
        quality: source.review.quality,
        fidelity: source.fidelity,
        critic: source.critic,
        dom: source.dom,
        performance: source.performance,
        previous: source.previous,
        humanApproval: source.humanApproval,
      };
    } else if (source.quality && source.critic) {
      source = source;
    } else if (source.quality && !source.critic) {
      source = { ...source };
    }
  }
  const gate = evaluateGates({
    quality: input.quality ?? source.quality,
    fidelity: input.fidelity ?? source.fidelity,
    critic: input.critic ?? source.critic,
    dom: input.dom ?? source.dom,
    performance: input.performance ?? source.performance,
    previous: input.previous ?? source.previous,
    config: { ...(source.config ?? {}), ...(input.config ?? {}) },
    humanApproval: input.humanApproval ?? source.humanApproval,
  });
  let paths: { json: string; md: string } | undefined;
  if (input.outDir) {
    const dir = ensureDir(input.outDir);
    paths = { json: path.join(dir, 'gates.json'), md: path.join(dir, 'gates.md') };
    fs.writeFileSync(paths.json, JSON.stringify(gate, null, 2) + '\n', 'utf8');
    fs.writeFileSync(paths.md, gateMarkdown(gate), 'utf8');
  }
  return { ...gate, paths };
}

export async function opLoop(input: LoopOptions): Promise<LoopResult> {
  return runImprovementLoop(input);
}

export function opLoops(projectDir?: string) {
  return listLoops(projectDir ?? process.cwd());
}

export function opRestoreLoop(projectDir: string | undefined, id: string, outDir?: string) {
  return restoreLoop(projectDir ?? process.cwd(), id, outDir);
}

export { describeLoop, describeContext };
