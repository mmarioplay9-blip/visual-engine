import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildArtDirection, type ArtDirection } from './styles.js';
import { critique, type CriticInput, type CriticReport } from './critic.js';
import { assessFidelity, fidelityMarkdown, type FidelityReport } from './fidelity.js';
import { evaluateGates, gateMarkdown, type GateConfig, type GateResult } from './gates.js';
import { inspectDom, describeDom, type DomSnapshot } from './debugger.js';
import { estimateTokens } from './context.js';
import { ensureDir } from './paths.js';
import { review, type ReviewResult } from './review.js';
import { exec } from './run.js';
import { round } from './util.js';

/**
 * Autonomous Improvement Loop 0.5.
 *
 * El agente aporta el cambio. Este módulo:
 * 1. analiza y captura,
 * 2. crea copia de seguridad de los archivos afectados,
 * 3. aplica el reemplazo o parche,
 * 4. vuelve a capturar y puntuar,
 * 5. conserva o revierte,
 * 6. respeta iteraciones, tiempo y presupuesto estimado de tokens.
 *
 * No llama a ningún proveedor de IA. Si no hay cambio, devuelve una tarea
 * compacta (`awaiting-agent`) para el agente conectado por MCP/CLI/API.
 */

export interface LoopLimits {
  maxIterations: number;
  maxMinutes: number;
  /** Presupuesto estimado por longitud del informe; no es el recuento del proveedor. */
  maxTokenBudget: number;
  minQualityDelta: number;
  minFidelityDelta: number;
}

export const DEFAULT_LOOP_LIMITS: LoopLimits = {
  maxIterations: 3,
  maxMinutes: 20,
  maxTokenBudget: 12_000,
  minQualityDelta: 0.5,
  minFidelityDelta: 0.5,
};

export interface LoopChange {
  replaceFile?: string;
  patchFile?: string;
}

export interface LoopOptions {
  projectDir?: string;
  targetDir?: string;
  target?: string;
  reference: string;
  brief: string;
  style?: string;
  projectType?: string;
  width?: number;
  height?: number;
  frames?: number;
  intervalMs?: number;
  waitMs?: number;
  outDir?: string;
  limits?: Partial<LoopLimits>;
  gates?: Partial<GateConfig>;
  changes?: LoopChange[];
  /** Azúcar para una sola iteración. */
  replaceFile?: string;
  patchFile?: string;
  /** Obligatorio cuando se aportan cambios: el loop escribe archivos. */
  confirm?: boolean;
  humanApproval?: { approved?: boolean; reviewer?: string; note?: string };
}

export interface LoopBackup {
  original: string;
  backup: string;
  existed: boolean;
  sha256: string | null;
}

export interface LoopSnapshot {
  label: 'before' | 'after';
  outDir: string;
  review: ReviewResult;
  dom?: DomSnapshot;
  critic: CriticReport;
  fidelity: FidelityReport;
  gates: GateResult;
  artifacts: { critic: string; fidelity: string; gates: string; dom?: string; report: string };
  tokenEstimate: number;
}

export interface LoopIteration {
  index: number;
  change: LoopChange;
  before: { quality: number; fidelity: number; gates: GateResult['decision'] };
  after: { quality: number; fidelity: number; gates: GateResult['decision'] };
  kept: boolean;
  status: 'kept' | 'reverted' | 'failed';
  message: string;
  outDir: string;
  snapshots: { before: string; after: string };
  backups: LoopBackup[];
}

export interface LoopResult {
  version: '0.5';
  id: string;
  status: 'awaiting-agent' | 'awaiting-human' | 'passed' | 'reverted' | 'budget-stopped' | 'time-stopped' | 'failed';
  projectDir: string;
  target: string;
  outDir: string;
  limits: LoopLimits;
  before: LoopSnapshot;
  after?: LoopSnapshot;
  iterations: LoopIteration[];
  tokensEstimated: number;
  humanApproval: { required: boolean; approved: boolean };
  message: string;
  artifacts: { loop: string; markdown: string; agentTask: string; backup?: string };
  limitations: string[];
}

interface LoopManifest {
  version: '0.5';
  id: string;
  createdAt: string;
  status: LoopResult['status'];
  projectDir: string;
  target: string;
  limits: LoopLimits;
  tokensEstimated: number;
  iterations: LoopIteration[];
  message: string;
  backupDir?: string;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 6)}`;
}

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function isInside(root: string, candidate: string): boolean {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  return c === r || c.startsWith(r + path.sep);
}

function loopRoot(projectDir: string): string {
  return path.join(path.resolve(projectDir), '.visual-engine', 'loops');
}

function writeJson(file: string, value: unknown) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function patchFiles(patchText: string, projectDir: string): string[] {
  const out = new Set<string>();
  for (const line of patchText.split(/\r?\n/)) {
    const m = line.match(/^(?:\+\+\+|---)\s+(?:[ab]\/)?(.+)$/);
    if (!m || m[1] === '/dev/null') continue;
    const rel = m[1].replace(/^[ab]\//, '').trim();
    if (!rel) continue;
    out.add(path.resolve(projectDir, rel));
  }
  return [...out];
}

function backupFiles(files: string[], projectDir: string, backupDir: string): LoopBackup[] {
  ensureDir(backupDir);
  const backups: LoopBackup[] = [];
  for (const original of [...new Set(files.map((f) => path.resolve(f)))]) {
    if (!isInside(projectDir, original)) throw new Error(`La copia de seguridad intenta salir del proyecto: ${original}`);
    const existed = fs.existsSync(original);
    if (!existed) {
      backups.push({ original, backup: '', existed, sha256: null });
      continue;
    }
    if (fs.statSync(original).isDirectory()) throw new Error(`No se hace copia de directorios: ${original}`);
    const rel = path.relative(projectDir, original);
    const dest = path.join(backupDir, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(original, dest);
    backups.push({ original, backup: dest, existed, sha256: sha256(original) });
  }
  writeJson(path.join(backupDir, 'backup.json'), backups);
  return backups;
}

function restoreBackups(backups: LoopBackup[]): string[] {
  const restored: string[] = [];
  for (const b of backups) {
    if (!b.existed) {
      if (fs.existsSync(b.original)) fs.rmSync(b.original);
      restored.push(b.original);
      continue;
    }
    if (!b.backup || !fs.existsSync(b.backup)) throw new Error(`Falta la copia de seguridad: ${b.backup}`);
    ensureDir(path.dirname(b.original));
    fs.copyFileSync(b.backup, b.original);
    restored.push(b.original);
  }
  return restored;
}

function effectIds(dom: DomSnapshot | undefined): { id: string }[] {
  if (!dom) return [];
  const ids = new Set<string>();
  for (const el of dom.elements) for (const e of el.effects) if (e && e !== 'true') ids.add(e);
  return [...ids].map((id) => ({ id }));
}

async function analyzeState(input: {
  label: 'before' | 'after';
  projectDir: string;
  targetDir: string;
  target: string;
  reference: string;
  brief: string;
  art: ArtDirection;
  width: number;
  height: number;
  frames: number;
  intervalMs: number;
  waitMs: number;
  outDir: string;
  gates: Partial<GateConfig>;
  humanApproval?: LoopOptions['humanApproval'];
}): Promise<LoopSnapshot> {
  const outDir = ensureDir(input.outDir);
  const report = await review({
    reference: input.reference,
    target: input.target,
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
      target: input.target,
      targetDir: input.targetDir,
      width: input.width,
      height: input.height,
      waitMs: input.waitMs,
      outDir: path.join(outDir, 'dom'),
      sourceRoot: input.projectDir,
    });
  } catch (e) {
    warnings.push(`Inspección DOM no disponible: ${(e as Error).message}`);
  }
  const used = effectIds(dom);
  const criticInput: CriticInput = {
    request: {
      brief: input.brief,
      style: input.art.style.id,
      projectType: input.art.projectType,
      allowDecorativeEffects: !['minimal-premium', 'professional-app', 'financial-dashboard'].includes(input.art.style.id),
    },
    reference: report.reference.profile,
    candidate: report.target.profile,
    quality: report.quality,
    art: input.art,
    dom,
    usedEffects: used,
    runtime: {
      consoleErrors: report.target.consoleErrors,
      requestFailures: report.target.errors,
      functionalFailures: report.warnings.filter((w) => /error|fallo|no se pudo/i.test(w)),
    },
  };
  const critic = critique(criticInput);
  if (warnings.length) critic.limitations.push(...warnings);
  const fidelity = assessFidelity({
    reference: report.reference.profile,
    candidate: report.target.profile,
    quality: report.quality,
    dom,
    art: input.art,
    usedEffects: used,
  });
  const gates = evaluateGates({
    quality: report.quality,
    fidelity,
    critic,
    dom,
    humanApproval: input.humanApproval,
    config: input.gates,
  });
  const criticPath = path.join(outDir, 'critic.json');
  const criticMd = path.join(outDir, 'critic.md');
  const fidelityPath = path.join(outDir, 'fidelity.json');
  const fidelityMd = path.join(outDir, 'fidelity.md');
  const gatePath = path.join(outDir, 'gates.json');
  const gateMd = path.join(outDir, 'gates.md');
  writeJson(criticPath, critic);
  fs.writeFileSync(criticMd, critic.agentTask, 'utf8');
  writeJson(fidelityPath, fidelity);
  fs.writeFileSync(fidelityMd, fidelityMarkdown(fidelity), 'utf8');
  writeJson(gatePath, gates);
  fs.writeFileSync(gateMd, gateMarkdown(gates), 'utf8');
  return {
    label: input.label,
    outDir,
    review: report,
    dom,
    critic,
    fidelity,
    gates,
    artifacts: {
      critic: criticPath,
      fidelity: fidelityPath,
      gates: gatePath,
      dom: dom ? path.join(outDir, 'dom', 'dom.json') : undefined,
      report: report.report.md,
    },
    tokenEstimate: estimateTokens({ agentTask: critic.agentTask, gates, fidelity: { score: fidelity.score, dimensions: fidelity.dimensions } }),
  };
}

function changesFromOptions(opts: LoopOptions): LoopChange[] {
  if (opts.changes?.length) return opts.changes;
  if (opts.replaceFile || opts.patchFile) return [{ replaceFile: opts.replaceFile, patchFile: opts.patchFile }];
  return [];
}

function applyChange(change: LoopChange, projectDir: string): { changedFiles: string[]; message: string } {
  if (change.replaceFile) {
    const target = path.resolve(projectDir, change.replaceFile);
    if (!fs.existsSync(target)) throw new Error(`No existe el reemplazo: ${target}`);
    // El reemplazo se copia encima del target; se valida fuera (targetPath).
    return { changedFiles: [], message: `Reemplazo preparado: ${target}` };
  }
  if (change.patchFile) {
    return { changedFiles: [], message: `Parche preparado: ${path.resolve(projectDir, change.patchFile)}` };
  }
  throw new Error('La iteración no contiene replaceFile ni patchFile.');
}

/**
 * Ejecuta el loop. Con `changes` exige `confirm:true`; sin cambios devuelve
 * `awaiting-agent` y deja el informe y la tarea del agente en disco.
 */
export async function runImprovementLoop(opts: LoopOptions): Promise<LoopResult> {
  const projectDir = path.resolve(opts.projectDir ?? process.cwd());
  const targetDir = path.resolve(opts.targetDir ?? projectDir);
  const target = opts.target ?? 'index.html';
  const targetPath = path.resolve(targetDir, target);
  if (!isInside(projectDir, targetPath) && !isInside(targetDir, targetPath)) throw new Error('El objetivo debe estar dentro del proyecto.');
  if (!fs.existsSync(targetPath)) throw new Error(`No existe el objetivo: ${targetPath}`);
  const refCandidate = path.isAbsolute(opts.reference) ? opts.reference : fs.existsSync(path.resolve(opts.reference)) ? path.resolve(opts.reference) : path.resolve(projectDir, opts.reference);
  if (!fs.existsSync(refCandidate)) throw new Error(`No existe la referencia: ${refCandidate}`);
  if (!opts.brief?.trim()) throw new Error('El loop necesita un brief para juzgar la intención.');

  const limits = { ...DEFAULT_LOOP_LIMITS, ...(opts.limits ?? {}) };
  const changes = changesFromOptions(opts);
  if (changes.length && opts.confirm !== true) throw new Error('El loop escribe archivos: repite con confirm=true (o --confirm).');
  const id = stamp();
  const outDir = ensureDir(opts.outDir ?? path.join(loopRoot(projectDir), id));
  const started = Date.now();
  const art = buildArtDirection({ brief: opts.brief, style: opts.style, projectType: opts.projectType });
  const common = {
    projectDir, targetDir, target, reference: refCandidate, brief: opts.brief, art,
    width: opts.width ?? 1280, height: opts.height ?? 720, frames: opts.frames ?? 6,
    intervalMs: opts.intervalMs ?? 400, waitMs: opts.waitMs ?? 900,
    gates: opts.gates ?? {}, humanApproval: opts.humanApproval,
  };

  const before = await analyzeState({ ...common, label: 'before', outDir: path.join(outDir, 'before') });
  const manifest: LoopManifest = {
    version: '0.5', id, createdAt: new Date().toISOString(), status: 'awaiting-agent',
    projectDir, target: targetPath, limits, tokensEstimated: before.tokenEstimate,
    iterations: [], message: 'Análisis inicial completado; esperando el cambio del agente.',
  };
  const writeManifest = () => writeJson(path.join(outDir, 'loop.json'), manifest);
  writeManifest();
  fs.writeFileSync(path.join(outDir, 'agent-task.md'), before.critic.agentTask, 'utf8');

  const resultBase = {
    version: '0.5' as const, id, projectDir, target: targetPath, outDir, limits,
    before, iterations: manifest.iterations, tokensEstimated: manifest.tokensEstimated,
    humanApproval: { required: before.gates.humanApproval.required, approved: before.gates.humanApproval.approved },
    limitations: [
      'El cambio lo aporta el agente; este loop no inventa diseño ni llama a un proveedor de IA.',
      'El presupuesto de tokens es una estimación por longitud (caracteres/4), no el recuento del proveedor.',
      'El rendimiento se valida con la cadencia de captura y el DOM; no se atribuye FPS si no se midieron.',
      'La aprobación artística final es humana.',
    ],
  };

  if (!changes.length) {
    manifest.status = 'awaiting-agent';
    manifest.message = 'No se aportó cambio. Lee agent-task.md, implementa el cambio y vuelve a ejecutar con --replace/--patch.';
    writeManifest();
    return { ...resultBase, status: 'awaiting-agent', message: manifest.message, artifacts: { loop: path.join(outDir, 'loop.json'), markdown: path.join(outDir, 'loop.md'), agentTask: path.join(outDir, 'agent-task.md') } };
  }
  if (before.tokenEstimate > limits.maxTokenBudget) {
    manifest.status = 'budget-stopped';
    manifest.message = `El informe inicial ya supera el presupuesto estimado (${before.tokenEstimate} > ${limits.maxTokenBudget}). No se aplicó nada.`;
    writeManifest();
    return { ...resultBase, status: 'budget-stopped', message: manifest.message, artifacts: { loop: path.join(outDir, 'loop.json'), markdown: path.join(outDir, 'loop.md'), agentTask: path.join(outDir, 'agent-task.md') } };
  }

  let current = before;
  let lastAfter: LoopSnapshot | undefined;
  let status: LoopResult['status'] = 'failed';
  let message = 'El loop no llegó a aplicar un cambio.';
  let iterationIndex = 0;
  for (const change of changes.slice(0, limits.maxIterations)) {
    iterationIndex++;
    const elapsed = (Date.now() - started) / 1000 / 60;
    if (elapsed > limits.maxMinutes) {
      status = 'time-stopped';
      message = `Tiempo agotado: ${elapsed.toFixed(1)} min > ${limits.maxMinutes}.`;
      break;
    }
    if (manifest.tokensEstimated > limits.maxTokenBudget) {
      status = 'budget-stopped';
      message = `Presupuesto agotado antes de la iteración ${iterationIndex}: ${manifest.tokensEstimated} > ${limits.maxTokenBudget} tokens estimados.`;
      break;
    }

    const iterDir = ensureDir(path.join(outDir, `iteration-${iterationIndex}`));
    const backupDir = ensureDir(path.join(iterDir, 'backup'));
    let backups: LoopBackup[] = [];
    let changedFiles: string[] = [];
    let applyMessage = '';
    try {
      if (change.replaceFile) {
        const replacement = path.resolve(projectDir, change.replaceFile);
        if (!fs.existsSync(replacement)) throw new Error(`No existe el reemplazo: ${replacement}`);
        backups = backupFiles([targetPath], projectDir, backupDir);
        fs.copyFileSync(replacement, targetPath);
        changedFiles = [targetPath];
        applyMessage = `Reemplazo aplicado: ${replacement}`;
      } else if (change.patchFile) {
        const patch = path.resolve(projectDir, change.patchFile);
        if (!fs.existsSync(patch)) throw new Error(`No existe el parche: ${patch}`);
        const text = fs.readFileSync(patch, 'utf8');
        const files = patchFiles(text, projectDir);
        backups = backupFiles(files, projectDir, backupDir);
        const check = await exec('git', ['apply', '--check', patch], { cwd: projectDir, timeoutMs: 60_000 });
        if (!check.ok) throw new Error(`git apply --check falló: ${check.stderr.trim().slice(0, 400)}`);
        const applied = await exec('git', ['apply', patch], { cwd: projectDir, timeoutMs: 60_000 });
        if (!applied.ok) throw new Error(`git apply falló: ${applied.stderr.trim().slice(0, 400)}`);
        changedFiles = files.filter((f) => fs.existsSync(f));
        applyMessage = `Parche aplicado; ${changedFiles.length} archivo(s) afectados.`;
      } else {
        throw new Error('Cambio sin archivo.');
      }
    } catch (e) {
      if (backups.length) restoreBackups(backups);
      status = 'failed';
      message = `Cambio no aplicado: ${(e as Error).message}`;
      manifest.iterations.push({
        index: iterationIndex, change,
        before: { quality: current.review.quality.overall, fidelity: current.fidelity.score, gates: current.gates.decision },
        after: { quality: current.review.quality.overall, fidelity: current.fidelity.score, gates: current.gates.decision },
        kept: false, status: 'failed', message, outDir: iterDir,
        snapshots: { before: current.outDir, after: current.outDir }, backups,
      });
      break;
    }

    let after: LoopSnapshot;
    try {
      after = await analyzeState({
        ...common, label: 'after',
        outDir: path.join(iterDir, 'after'),
        humanApproval: opts.humanApproval,
      });
    } catch (e) {
      restoreBackups(backups);
      status = 'failed';
      message = `La revisión posterior falló; archivos restaurados: ${(e as Error).message}`;
      manifest.iterations.push({
        index: iterationIndex, change,
        before: { quality: current.review.quality.overall, fidelity: current.fidelity.score, gates: current.gates.decision },
        after: { quality: current.review.quality.overall, fidelity: current.fidelity.score, gates: current.gates.decision },
        kept: false, status: 'failed', message, outDir: iterDir,
        snapshots: { before: current.outDir, after: current.outDir }, backups,
      });
      break;
    }
    lastAfter = after;
    const qualityDelta = round(after.review.quality.overall - current.review.quality.overall, 2);
    const fidelityDelta = round(after.fidelity.score - current.fidelity.score, 2);
    const regression = current.review.quality.overall - after.review.quality.overall > 2;
    const gatesImproved = current.gates.decision === 'reject' && after.gates.decision !== 'reject';
    const improved = qualityDelta >= limits.minQualityDelta || fidelityDelta >= limits.minFidelityDelta;
    const structuralAccept = after.gates.decision === 'accept' || after.gates.decision === 'pending-human';
    const keep = gatesImproved || (structuralAccept && !regression) || (improved && !regression);
    const tokens = after.tokenEstimate;
    manifest.tokensEstimated += tokens;
    const iterRecord: LoopIteration = {
      index: iterationIndex,
      change,
      before: { quality: current.review.quality.overall, fidelity: current.fidelity.score, gates: current.gates.decision },
      after: { quality: after.review.quality.overall, fidelity: after.fidelity.score, gates: after.gates.decision },
      kept: keep,
      status: keep ? 'kept' : 'reverted',
      message: keep
        ? `${applyMessage} Conservado: calidad ${current.review.quality.overall}→${after.review.quality.overall}, fidelidad ${current.fidelity.score}→${after.fidelity.score}.`
        : `${applyMessage} Revertido: calidad ${current.review.quality.overall}→${after.review.quality.overall}, fidelidad ${current.fidelity.score}→${after.fidelity.score}; no supera el mínimo sin regresión.`,
      outDir: iterDir,
      snapshots: { before: current.outDir, after: after.outDir },
      backups,
    };
    if (!keep) {
      restoreBackups(backups);
      manifest.iterations.push(iterRecord);
      writeManifest();
      status = 'reverted';
      message = iterRecord.message;
      break;
    }
    current = after;
    manifest.iterations.push(iterRecord);
    writeManifest();
    const record = manifest.iterations[manifest.iterations.length - 1];
    fs.writeFileSync(path.join(iterDir, 'iteration.json'), JSON.stringify(record, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(iterDir, 'iteration.md'), `${iterRecord.message}\n\nAntes: ${iterRecord.snapshots.before}\nDespués: ${iterRecord.snapshots.after}\n`, 'utf8');
    if (after.gates.decision === 'accept') {
      status = 'passed';
      message = `Aceptado por gates tras ${iterationIndex} iteración(es): ${after.gates.summary}`;
      break;
    }
    if (after.gates.decision === 'pending-human') {
      status = 'awaiting-human';
      message = `Estructura aceptada; falta aprobación artística humana. ${after.gates.summary}`;
      break;
    }
    status = 'failed';
    message = `Iteración ${iterationIndex} conservada, pero los gates siguen bloqueando: ${after.gates.summary}`;
  }

  if (!manifest.iterations.length && status === 'failed') message = 'No se ejecutó ninguna iteración válida.';
  manifest.status = status;
  manifest.message = message;
  writeManifest();
  const markdown = loopMarkdown({ ...resultBase, status, after: lastAfter, message, iterations: manifest.iterations, tokensEstimated: manifest.tokensEstimated });
  fs.writeFileSync(path.join(outDir, 'loop.md'), markdown, 'utf8');
  const latest = manifest.iterations[manifest.iterations.length - 1];
  return {
    ...resultBase,
    status,
    after: lastAfter,
    iterations: manifest.iterations,
    tokensEstimated: manifest.tokensEstimated,
    message,
    artifacts: {
      loop: path.join(outDir, 'loop.json'),
      markdown: path.join(outDir, 'loop.md'),
      agentTask: path.join(outDir, 'agent-task.md'),
      backup: latest ? path.join(latest.outDir, 'backup') : undefined,
    },
  };
}

function loopMarkdown(r: {
  status: LoopResult['status']; target: string; message: string; iterations: LoopIteration[];
  before: LoopSnapshot; after?: LoopSnapshot; tokensEstimated: number; limits: LoopLimits;
}): string {
  const lines = [
    '# Visual Intelligence Loop 0.5',
    '',
    `Estado: **${r.status}**`,
    '',
    r.message,
    '',
    `Objetivo: ${r.target}`,
    `Antes: calidad ${r.before.review.quality.overall.toFixed(1)}, fidelidad ${r.before.fidelity.score.toFixed(1)}, gates ${r.before.gates.decision}.`,
    r.after ? `Después: calidad ${r.after.review.quality.overall.toFixed(1)}, fidelidad ${r.after.fidelity.score.toFixed(1)}, gates ${r.after.gates.decision}.` : 'Después: no aplicado.',
    `Tokens estimados: ${r.tokensEstimated}; límites: ${r.limits.maxIterations} iteraciones / ${r.limits.maxMinutes} min / ${r.limits.maxTokenBudget} tokens.`,
    '',
    '## Iteraciones',
    '',
  ];
  if (!r.iterations.length) lines.push('Sin iteraciones aplicadas. La tarea para el agente está en `agent-task.md`.');
  for (const it of r.iterations) {
    lines.push(`### ${it.index}. ${it.status}`);
    lines.push(it.message);
    lines.push('');
    lines.push(`- Antes: ${it.snapshots.before}`);
    lines.push(`- Después: ${it.snapshots.after}`);
    lines.push(`- Copia: ${it.backups.map((b) => `${b.original}${b.existed ? '' : ' (nuevo)'}`).join(', ') || 'sin archivos'}`);
    lines.push('');
  }
  lines.push('## Evidencia');
  lines.push('');
  lines.push(`- Crítica inicial: ${r.before.artifacts.critic}`);
  lines.push(`- Gates iniciales: ${r.before.artifacts.gates}`);
  if (r.after) {
    lines.push(`- Crítica final: ${r.after.artifacts.critic}`);
    lines.push(`- Gates finales: ${r.after.artifacts.gates}`);
  }
  lines.push('');
  lines.push('## Límites');
  lines.push('');
  lines.push('- El loop no genera diseño por sí mismo ni elige un proveedor de IA.');
  lines.push('- La estimación de tokens es caracteres/4, no el recuento real del modelo.');
  lines.push('- La aprobación artística final es humana.');
  return lines.join('\n');
}

export function listLoops(projectDir = process.cwd()): LoopManifest[] {
  const root = loopRoot(projectDir);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).flatMap((id) => {
    try {
      return [JSON.parse(fs.readFileSync(path.join(root, id, 'loop.json'), 'utf8')) as LoopManifest];
    } catch {
      return [];
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function restoreLoop(projectDir: string, id: string, outDir?: string): { restored: string[]; message: string } {
  const dir = outDir ? path.resolve(outDir) : path.join(loopRoot(projectDir), id);
  const manifestFile = path.join(dir, 'loop.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`No existe el loop ${id}.`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as LoopManifest;
  const kept = [...manifest.iterations].reverse().find((i) => i.kept);
  if (!kept) throw new Error(`El loop ${id} no tiene cambios conservados que restaurar.`);
  const backupDir = path.join(kept.outDir, 'backup');
  const backupFile = path.join(backupDir, 'backup.json');
  if (!fs.existsSync(backupFile)) throw new Error(`Falta la copia ${backupFile}`);
  const backups = JSON.parse(fs.readFileSync(backupFile, 'utf8')) as LoopBackup[];
  const restored = restoreBackups(backups);
  return { restored, message: `Restaurados ${restored.length} archivo(s) del loop ${id}.` };
}

export function describeLoop(r: LoopResult): string[] {
  return [
    `Loop ${r.id}: ${r.status}. ${r.message}`,
    `Antes: calidad ${r.before.review.quality.overall.toFixed(1)}, fidelidad ${r.before.fidelity.score.toFixed(1)}, gates ${r.before.gates.decision}.`,
    r.after ? `Después: calidad ${r.after.review.quality.overall.toFixed(1)}, fidelidad ${r.after.fidelity.score.toFixed(1)}, gates ${r.after.gates.decision}.` : 'Después: no aplicado.',
    `Tokens estimados: ${r.tokensEstimated}/${r.limits.maxTokenBudget}; iteraciones: ${r.iterations.length}/${r.limits.maxIterations}.`,
    `Tarea del agente: ${r.artifacts.agentTask}`,
    `Informe: ${r.artifacts.markdown}`,
    ...r.limitations.map((l) => `Límite: ${l}`),
  ];
}

/** Utilidad para pruebas y diagnóstico: muestra el DOM en texto. */
export { describeDom };
