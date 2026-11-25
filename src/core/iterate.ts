import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './paths.js';
import { review, type ReviewResult } from './review.js';
import { exec } from './run.js';
import { round } from './util.js';

/**
 * Iteración verificada:
 * 1. copia de seguridad del archivo objetivo (hash incluido),
 * 2. revisión "antes",
 * 3. aplicación de un reemplazo o de un parche del agente,
 * 4. revisión "después",
 * 5. se conserva sólo si mejora; si no, se revierte automáticamente.
 *
 * El agente escribe el cambio; la herramienta comprueba y revierte. Nunca se
 * aplica un parche sin copia previa ni sin medir el resultado.
 */

export interface IterationOptions {
  projectDir?: string;
  target: string;
  reference: string;
  targetDir?: string;
  patchFile?: string;
  replaceFile?: string;
  width?: number;
  height?: number;
  frames?: number;
  intervalMs?: number;
  waitMs?: number;
  outDir?: string;
  minDelta?: number;
  /** conserva el cambio aunque no mejore (para inspección manual) */
  keep?: boolean;
}

export interface IterationBackup {
  file: string;
  original: string;
  sha256: string;
}

export interface IterationResult {
  id: string;
  status: 'kept' | 'reverted' | 'failed';
  projectDir: string;
  target: string;
  before: { score: number; quality?: number; grade?: string };
  after?: { score: number; quality?: number; grade?: string };
  improved: boolean;
  backups: IterationBackup[];
  outDir: string;
  report: { json: string; md: string };
  message: string;
}

interface Manifest {
  id: string;
  createdAt: string;
  projectDir: string;
  target: string;
  status: IterationResult['status'];
  before?: { score: number; quality?: number };
  after?: { score: number; quality?: number };
  backups: IterationBackup[];
  message: string;
}

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function isInside(root: string, candidate: string): boolean {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  return c === r || c.startsWith(r + path.sep);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 6)}`;
}

function iterationRoot(projectDir: string): string {
  return path.join(path.resolve(projectDir), '.visual-engine', 'iterations');
}

function summaryOf(r: ReviewResult): { score: number; quality?: number; grade?: string } {
  return { score: r.score, quality: r.quality?.overall, grade: r.grade };
}

export async function runIteration(opts: IterationOptions): Promise<IterationResult> {
  const projectDir = path.resolve(opts.projectDir ?? process.cwd());
  const targetPath = path.resolve(projectDir, opts.target);
  if (!isInside(projectDir, targetPath)) throw new Error('El objetivo debe estar dentro del proyecto.');
  if (!fs.existsSync(targetPath)) throw new Error(`No existe el objetivo: ${targetPath}`);
  if (!opts.patchFile && !opts.replaceFile) {
    throw new Error('Indica un cambio: --patch <archivo.diff> o --replace <archivo.nuevo>.');
  }

  const id = stamp();
  const outDir = ensureDir(opts.outDir ?? path.join(iterationRoot(projectDir), id));
  const backupDir = ensureDir(path.join(outDir, 'backup'));
  const original = fs.readFileSync(targetPath);
  const backupFile = path.join(backupDir, path.basename(targetPath));
  fs.writeFileSync(backupFile, original);
  const backups: IterationBackup[] = [{ file: path.basename(targetPath), original: targetPath, sha256: sha256(targetPath) }];
  const manifest: Manifest = {
    id,
    createdAt: new Date().toISOString(),
    projectDir,
    target: targetPath,
    status: 'failed',
    backups,
    message: 'Iteración iniciada.',
  };

  const writeJson = () => fs.writeFileSync(path.join(outDir, 'iteration.json'), JSON.stringify(manifest, null, 2), 'utf8');
  writeJson();

  const reviewOpts = {
    reference: opts.reference,
    target: opts.target,
    targetDir: opts.targetDir ?? projectDir,
    width: opts.width ?? 1280,
    height: opts.height ?? 720,
    frames: opts.frames ?? 6,
    intervalMs: opts.intervalMs ?? 400,
    waitMs: opts.waitMs ?? 900,
  };

  const beforeReview = await review({ ...reviewOpts, outDir: path.join(outDir, 'before') });
  manifest.before = { score: beforeReview.score, quality: beforeReview.quality?.overall };
  writeJson();

  let afterReview: ReviewResult | undefined;
  let message = '';
  let status: IterationResult['status'] = 'failed';

  try {
    if (opts.replaceFile) {
      const replacement = path.resolve(projectDir, opts.replaceFile);
      if (!fs.existsSync(replacement)) throw new Error(`No existe el reemplazo: ${replacement}`);
      fs.copyFileSync(replacement, targetPath);
      message = 'Reemplazo aplicado.';
    } else if (opts.patchFile) {
      const patch = path.resolve(projectDir, opts.patchFile);
      if (!fs.existsSync(patch)) throw new Error(`No existe el parche: ${patch}`);
      const check = await exec('git', ['apply', '--check', patch], { cwd: projectDir, timeoutMs: 60_000 });
      if (!check.ok) throw new Error(`git apply --check falló: ${check.stderr.trim().slice(0, 400)}`);
      const applied = await exec('git', ['apply', patch], { cwd: projectDir, timeoutMs: 60_000 });
      if (!applied.ok) throw new Error(`git apply falló: ${applied.stderr.trim().slice(0, 400)}`);
      message = 'Parche aplicado con git apply.';
    }

    afterReview = await review({ ...reviewOpts, outDir: path.join(outDir, 'after') });
  } catch (e) {
    fs.copyFileSync(backupFile, targetPath);
    manifest.status = 'failed';
    manifest.message = `Cambio revertido por error: ${(e as Error).message}`;
    writeJson();
    const report = writeReport(outDir, { ...manifest, after: undefined, improved: false });
    return {
      id, status: 'failed', projectDir, target: targetPath,
      before: { score: beforeReview.score, quality: beforeReview.quality?.overall, grade: beforeReview.grade },
      improved: false, backups, outDir, report, message: manifest.message,
    };
  }

  const minDelta = opts.minDelta ?? 0.5;
  const improved = afterReview.score >= beforeReview.score + minDelta;
  const before = summaryOf(beforeReview);
  const after = summaryOf(afterReview);
  manifest.after = { score: after.score, quality: after.quality };

  if (improved || opts.keep) {
    status = 'kept';
    message = improved
      ? `Cambio conservado: ${before.score.toFixed(1)} → ${after.score.toFixed(1)} (+${(after.score - before.score).toFixed(1)}).`
      : `Cambio conservado por --keep aunque no mejoró: ${before.score.toFixed(1)} → ${after.score.toFixed(1)}.`;
  } else {
    fs.copyFileSync(backupFile, targetPath);
    status = 'reverted';
    message = `Cambio revertido: ${before.score.toFixed(1)} → ${after.score.toFixed(1)} (mínimo +${minDelta}).`;
  }
  manifest.status = status;
  manifest.message = message;
  writeJson();
  const report = writeReport(outDir, { ...manifest, improved });

  return {
    id,
    status,
    projectDir,
    target: targetPath,
    before,
    after,
    improved,
    backups,
    outDir,
    report,
    message,
  };
}

function writeReport(outDir: string, m: Manifest & { improved: boolean }): { json: string; md: string } {
  const json = path.join(outDir, 'iteration.json');
  const md = path.join(outDir, 'iteration.md');
  fs.writeFileSync(json, JSON.stringify(m, null, 2), 'utf8');
  const lines = [
    `# Iteración ${m.id} — ${m.status}`,
    '',
    m.message,
    '',
    `Objetivo: ${m.target}`,
    m.before ? `Antes: ${m.before.score.toFixed(1)}/100${m.before.quality !== undefined ? ` (calidad ${m.before.quality.toFixed(1)})` : ''}` : 'Antes: no disponible',
    m.after ? `Después: ${m.after.score.toFixed(1)}/100${m.after.quality !== undefined ? ` (calidad ${m.after.quality.toFixed(1)})` : ''}` : 'Después: no disponible',
    '',
    `¿Mejoró? ${m.improved ? 'sí' : 'no'}`,
    '',
    '## Copias de seguridad',
    '',
    ...m.backups.map((b) => `- ${b.original} (sha256 ${b.sha256.slice(0, 12)}…)`),
    '',
    statusNote(m.status),
    '',
  ];
  fs.writeFileSync(md, lines.join('\n'), 'utf8');
  return { json, md };
}

function statusNote(status: IterationResult['status']): string {
  if (status === 'kept') return 'El cambio se conservó. Para volver atrás: `ve backup restore <id> --project <dir>`.';
  if (status === 'reverted') return 'El cambio se revirtió automáticamente; el archivo está en su estado anterior.';
  return 'La iteración falló; el archivo se restauró si se había modificado.';
}

export function listIterations(projectDir = process.cwd()): Manifest[] {
  const root = iterationRoot(projectDir);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .map((id) => {
      const file = path.join(root, id, 'iteration.json');
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest;
      } catch {
        return null;
      }
    })
    .filter((m): m is Manifest => m !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function restoreIteration(projectDir: string, id: string): { restored: string[]; message: string } {
  const dir = path.join(iterationRoot(projectDir), id);
  const manifestFile = path.join(dir, 'iteration.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`No existe la iteración ${id} en ${iterationRoot(projectDir)}`);
  const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Manifest;
  const restored: string[] = [];
  for (const b of m.backups) {
    const backup = path.join(dir, 'backup', b.file);
    if (!fs.existsSync(backup)) throw new Error(`Falta la copia ${backup}`);
    if (!isInside(projectDir, b.original)) throw new Error(`La ruta original sale del proyecto: ${b.original}`);
    ensureDir(path.dirname(b.original));
    fs.copyFileSync(backup, b.original);
    restored.push(b.original);
  }
  return { restored, message: `Restaurados ${restored.length} archivo(s) de la iteración ${id}.` };
}

export function describeIteration(r: IterationResult): string[] {
  return [
    `Iteración ${r.id}: ${r.status}. ${r.message}`,
    `Antes ${r.before.score.toFixed(1)}${r.after ? ` → después ${r.after.score.toFixed(1)}` : ''}.`,
    `Informe: ${r.report.md}`,
    ...(r.status === 'kept' ? [`Revertir: ve backup restore ${r.id} --project ${r.projectDir}`] : []),
  ];
}

export function roundScore(v: number): number {
  return round(v, 1);
}
