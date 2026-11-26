import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  AGENTS,
  agentIds,
  agentSpec,
  agentConfigPath,
  detectAgent,
  detectAgents,
  mcpCommand,
  type AgentId,
  type AgentSpec,
  type AgentStatus,
} from './agents.js';
import { auditSecurity, withinRoot } from './security.js';
import { getProfile, type ProfileId } from './profiles.js';
import { PACKAGE_ROOT } from './paths.js';

/**
 * Universal Installer 0.6.
 *
 * Nunca sobrescribe un archivo que no gestiona, respalda antes de tocar nada,
 * escribe un manifiesto para poder actualizar/desinstalar y exige confirmación
 * explícita para modificar configuraciones globales.
 */

export type InstallScope = 'project' | 'global';
export type InstallKind = 'instructions' | 'skill' | 'mcp' | 'snippet';
export type InstallActionKind = 'write' | 'merge-json' | 'append-toml' | 'skip' | 'conflict';

export interface InstallAction {
  agent: AgentId;
  kind: InstallKind;
  target: string;
  action: InstallActionKind;
  reason: string;
  backupRequired: boolean;
}

export interface ManagedFile {
  path: string;
  agent: AgentId;
  kind: InstallKind;
  sha256: string;
}

export interface BackupRecord {
  path: string;
  backup: string;
  at: string;
}

export interface InstallManifest {
  version: '1.0';
  installedAt: string;
  packageRoot: string;
  scope: InstallScope;
  profile: ProfileId;
  agents: { id: AgentId; title: string; status: 'designed' | 'installed' | 'verified' }[];
  files: ManagedFile[];
  backups: BackupRecord[];
  optionalTools: { id: string; available: boolean; detail?: string }[];
}

export interface InstallPlan {
  version: '1.0';
  projectDir: string;
  scope: InstallScope;
  profile: ProfileId;
  agents: (AgentStatus & { integration: 'designed' | 'installed' | 'verified' })[];
  actions: InstallAction[];
  conflicts: string[];
  optionalTools: { id: string; available: boolean; detail?: string }[];
  heavyModels: string[];
  requiresConfirmation: true;
  notes: string[];
}

export interface InstallResult {
  version: '1.0';
  ok: boolean;
  dryRun: boolean;
  projectDir: string;
  profile: ProfileId;
  actions: InstallAction[];
  applied: string[];
  skipped: string[];
  conflicts: string[];
  backups: BackupRecord[];
  manifestPath: string;
  verification: McpVerification | null;
  security: ReturnType<typeof auditSecurity>;
  notes: string[];
}

export interface McpVerification {
  ok: boolean;
  tools: number;
  serverVersion: string | null;
  durationMs: number;
  error?: string;
  method: string;
}

export interface InstallOptions {
  projectDir?: string;
  home?: string;
  agents?: string[];
  scope?: InstallScope;
  profile?: ProfileId;
  confirm?: boolean;
  force?: boolean;
  dryRun?: boolean;
  verify?: boolean;
  /** Autoriza explícitamente escribir configuración global. */
  allowGlobal?: boolean;
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function stateDir(projectDir: string): string {
  return path.join(projectDir, '.visual-engine');
}

function manifestPath(projectDir: string): string {
  return path.join(stateDir(projectDir), 'install.json');
}

export function readManifest(projectDir: string): InstallManifest | null {
  const file = manifestPath(projectDir);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as InstallManifest;
  } catch {
    return null;
  }
}

function envHome(opts: InstallOptions): string {
  return opts.home ?? os.homedir();
}

function resolveTargets(spec: AgentSpec, projectDir: string, scope: InstallScope, home: string): { kind: InstallKind; target: string; manual: boolean }[] {
  const out: { kind: InstallKind; target: string; manual: boolean }[] = [];
  const base = scope === 'global' ? home : projectDir;
  out.push({ kind: 'instructions', target: path.join(base, spec.instructions.projectPath), manual: false });
  if (spec.skill) out.push({ kind: 'skill', target: path.join(base, spec.skill.projectPath), manual: false });
  if (spec.mcp.supported) {
    // Agentes con configuración global (Codex): en ámbito de proyecto no se
    // toca ~/.codex; se entrega un bloque para copiar. Antes no se generaba.
    if (scope === 'project' && !spec.mcp.projectPath && spec.mcp.globalPath) {
      out.push({ kind: 'snippet', target: path.join(projectDir, '.visual-engine', `${spec.id}-mcp.toml`), manual: true });
    } else {
      const target = agentConfigPath(spec, scope, projectDir);
      if (target) out.push({ kind: 'mcp', target, manual: false });
    }
  }
  return out;
}

function readTemplate(spec: AgentSpec, kind: InstallKind): string {
  if (kind === 'instructions') return fs.readFileSync(spec.instructions.template, 'utf8');
  if (kind === 'skill' && spec.skill) return fs.readFileSync(spec.skill.template, 'utf8');
  return '';
}

function tomlBlock(): string {
  const { command, args } = mcpCommand();
  return `\n# Visual Engine 1.0 — servidor MCP local\n[mcp_servers.visual-engine]\ncommand = ${JSON.stringify(command)}\nargs = ${JSON.stringify(args)}\n`;
}

function jsonPatch(spec: AgentSpec): { key: string; value: unknown } {
  const { command, args } = mcpCommand();
  if (spec.mcp.format === 'json-opencode') {
    return { key: 'mcp', value: { 'visual-engine': { type: 'local', command: [command, ...args], enabled: true } } };
  }
  return { key: 'mcpServers', value: { 'visual-engine': { command, args } } };
}

function readJson(file: string): any {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON inválido en ${file}: ${(e as Error).message}. Usa \`ve repair\` o corrige el archivo.`);
  }
}

function mergeEntry(base: any, key: string, value: unknown): any {
  if (Array.isArray(base)) return base;
  const out = { ...(base ?? {}) };
  out[key] = { ...(typeof out[key] === 'object' && out[key] ? out[key] : {}), ...(value as object) };
  return out;
}

function planAction(spec: AgentSpec, kind: InstallKind, target: string, manual: boolean, force: boolean, managed: Set<string>): InstallAction {
  if (!fs.existsSync(target)) {
    return { agent: spec.id, kind, target, action: 'write', reason: 'No existe; se crea.', backupRequired: false };
  }
  if (kind === 'mcp' && manual) {
    return { agent: spec.id, kind, target, action: 'write', reason: 'Se genera un bloque manual; no se toca la configuración global del agente.', backupRequired: false };
  }
  if (kind === 'mcp') {
    const raw = fs.readFileSync(target, 'utf8');
    if (spec.mcp.format === 'toml-codex') {
      const has = raw.includes('[mcp_servers.visual-engine]');
      return { agent: spec.id, kind, target, action: has ? 'skip' : 'append-toml', reason: has ? 'El bloque ya existe; no se duplica.' : 'Se añade el bloque al final; el resto se conserva.', backupRequired: !has };
    }
    readJson(target); // valida antes de prometer nada
    return { agent: spec.id, kind, target, action: 'merge-json', reason: 'Se fusiona la entrada visual-engine conservando el resto.', backupRequired: true };
  }
  if (managed.has(target) || force) {
    return { agent: spec.id, kind, target, action: 'write', reason: force ? 'Se reescribe por --force con respaldo.' : 'Archivo gestionado por Visual Engine; se actualiza con respaldo.', backupRequired: true };
  }
  return { agent: spec.id, kind, target, action: 'conflict', reason: 'Existe y no lo gestiona Visual Engine; no se sobrescribe (usa --force con respaldo).', backupRequired: false };
}

export async function planInstall(opts: InstallOptions = {}): Promise<InstallPlan> {
  const projectDir = path.resolve(opts.projectDir ?? process.cwd());
  const home = envHome(opts);
  const scope: InstallScope = opts.scope ?? 'project';
  const profile = opts.profile ?? 'professional';
  getProfile(profile);
  const requested = opts.agents?.length ? opts.agents : (await detectAgents({ projectDir, home })).filter((a) => a.available).map((a) => a.id);
  const manifest = readManifest(projectDir);
  const managed = new Set((manifest?.files ?? []).map((f) => f.path));
  const statuses = await detectAgents({ projectDir, home });
  const actions: InstallAction[] = [];
  const agentsOut: InstallPlan['agents'] = [];
  for (const id of requested) {
    const spec = agentSpec(id);
    const status = statuses.find((s) => s.id === id)!;
    const installed = (manifest?.agents ?? []).some((a) => a.id === id && a.status !== 'designed');
    agentsOut.push({ ...status, integration: installed ? 'installed' : 'designed' });
    for (const t of resolveTargets(spec, projectDir, scope, home)) {
      actions.push(planAction(spec, t.kind, t.target, t.manual, opts.force === true, managed));
    }
  }
  const tools = await detectOptionalHeavy();
  const conflicts = actions.filter((a) => a.action === 'conflict').map((a) => a.target);
  if (scope === 'global' && !opts.allowGlobal) {
    conflicts.push('Ámbito global: requiere --global y --allow-global (no se modifica configuración externa sin autorización).');
  }
  return {
    version: '1.0', projectDir, scope, profile, agents: agentsOut, actions, conflicts,
    optionalTools: tools.tools, heavyModels: tools.models,
    requiresConfirmation: true,
    notes: [
      'Sin confirmación (`confirm:true` / `--yes`) no se escribe nada.',
      'Cada archivo existente se respalda en .visual-engine/backups/<fecha>/ antes de modificarse.',
      'No se descargan modelos pesados: los modelos de Ollama se listan y se dejan como están.',
      'La configuración global sólo se toca con --global --allow-global.',
      'La verificación MCP se ejecuta después de instalar y se marca sólo si el servidor responde.',
    ],
  };
}

async function detectOptionalHeavy(): Promise<{ tools: { id: string; available: boolean; detail?: string }[]; models: string[] }> {
  const { detectAll } = await import('./deps.js');
  const all = await detectAll(process.cwd());
  const models: string[] = [];
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = (await res.json()) as { models?: { name?: string; size?: number }[] };
      for (const m of data.models ?? []) if (m.name) models.push(`${m.name} (${Math.round((m.size ?? 0) / 1e6)} MB)`);
    }
  } catch {
    /* Ollama opcional */
  }
  return {
    tools: all.map((t) => ({ id: t.id, available: t.available, detail: t.detail })),
    models,
  };
}

function backupFile(projectDir: string, target: string, stamp: string): BackupRecord {
  const dir = path.join(stateDir(projectDir), 'backups', stamp);
  fs.mkdirSync(dir, { recursive: true });
  const safe = target.replace(/^[A-Za-z]:/, '').replace(/[\\/:]+/g, '_');
  const backup = path.join(dir, safe);
  fs.copyFileSync(target, backup);
  return { path: target, backup, at: new Date().toISOString() };
}

/** Instala o actualiza. Sin `confirm` devuelve el plan y no escribe. */
export async function applyInstall(opts: InstallOptions = {}): Promise<InstallResult> {
  const plan = await planInstall(opts);
  const confirm = opts.confirm === true && opts.dryRun !== true;
  const stamp = nowStamp();
  const previous = readManifest(plan.projectDir);
  const files: ManagedFile[] = [];
  const backups: BackupRecord[] = [];
  const applied: string[] = [];
  const skipped: string[] = [];
  const notes: string[] = [];
  if (plan.scope === 'global' && !opts.allowGlobal) {
    return result(false, plan, applied, skipped, backups, null, notes);
  }
  if (!confirm) {
    notes.push('Plan calculado sin escribir: falta confirmación explícita.');
    return result(false, plan, applied, skipped, backups, null, notes);
  }
  const managed = new Set((previous?.files ?? []).map((f) => f.path));
  for (const action of plan.actions) {
    if (action.action === 'skip') {
      skipped.push(action.target);
      continue;
    }
    const spec = agentSpec(action.agent);
    if (action.action === 'merge-json' || action.action === 'append-toml') {
      if (fs.existsSync(action.target)) backups.push(backupFile(plan.projectDir, action.target, stamp));
      const content = fs.existsSync(action.target) ? fs.readFileSync(action.target, 'utf8') : '';
      let next: string;
      if (action.action === 'append-toml') {
        next = content + tomlBlock();
      } else {
        const patch = jsonPatch(spec);
        next = JSON.stringify(mergeEntry(readJson(action.target), patch.key, patch.value), null, 2) + '\n';
      }
      fs.mkdirSync(path.dirname(action.target), { recursive: true });
      fs.writeFileSync(action.target, next, 'utf8');
      applied.push(action.target);
      files.push({ path: action.target, agent: action.agent, kind: action.kind, sha256: sha256(next) });
      continue;
    }
    const content = action.kind === 'snippet' ? tomlBlock() : readTemplate(spec, action.kind);
    if (!content) {
      skipped.push(action.target);
      notes.push(`Sin plantilla para ${action.agent}/${action.kind}.`);
      continue;
    }
    if (fs.existsSync(action.target)) backups.push(backupFile(plan.projectDir, action.target, stamp));
    if (fs.existsSync(action.target) && !managed.has(action.target) && opts.force !== true) {
      skipped.push(action.target);
      notes.push(`Se omite por no sobrescribir: ${action.target}`);
      continue;
    }
    fs.mkdirSync(path.dirname(action.target), { recursive: true });
    fs.writeFileSync(action.target, content, 'utf8');
    applied.push(action.target);
    files.push({ path: action.target, agent: action.agent, kind: action.kind, sha256: sha256(content) });
  }

  // El estado se deriva de lo que se acaba de escribir, no del manifiesto
  // anterior: en una instalación nueva todo quedaba como "designed" pese a
  // haber escrito los archivos.
  const touched = new Set(plan.actions.filter((a) => applied.includes(a.target)).map((a) => a.agent));
  const manifest: InstallManifest = {
    version: '1.0',
    installedAt: new Date().toISOString(),
    packageRoot: PACKAGE_ROOT,
    scope: plan.scope,
    profile: plan.profile,
    agents: plan.agents.map((a) => ({ id: a.id, title: a.title, status: touched.has(a.id) ? 'installed' : a.integration })),
    files: [
      ...files,
      ...((previous?.files ?? []).filter((f) => !plan.actions.some((a) => a.target === f.path) && fs.existsSync(f.path))),
    ],
    backups: [...(previous?.backups ?? []), ...backups],
    optionalTools: plan.optionalTools,
  };
  fs.mkdirSync(stateDir(plan.projectDir), { recursive: true });
  fs.writeFileSync(manifestPath(plan.projectDir), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(stateDir(plan.projectDir), 'profile.json'), JSON.stringify({ profile: plan.profile, tokensEstimated: true }, null, 2) + '\n', 'utf8');

  let verification: McpVerification | null = null;
  if (opts.verify !== false && files.some((f) => f.kind === 'mcp')) {
    verification = await verifyMcpServer();
    if (verification.ok) {
      manifest.agents = manifest.agents.map((a) => ({
        ...a,
        status: plan.agents.find((p) => p.id === a.id)?.mcpSupported ? 'verified' : a.status,
      }));
      fs.writeFileSync(manifestPath(plan.projectDir), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    }
  }
  return result(true, plan, applied, skipped, backups, verification, notes);
}

function result(ok: boolean, plan: InstallPlan, applied: string[], skipped: string[], backups: BackupRecord[], verification: McpVerification | null, notes: string[]): InstallResult {
  const security = auditSecurity({ projectDir: plan.projectDir });
  return {
    version: '1.0', ok, dryRun: applied.length === 0, projectDir: plan.projectDir, profile: plan.profile,
    actions: plan.actions, applied, skipped, conflicts: plan.conflicts, backups,
    manifestPath: manifestPath(plan.projectDir), verification, security, notes,
  };
}

/** Handshake MCP real por stdio: inicializa y lista herramientas. */
export async function verifyMcpServer(timeoutMs = 20_000): Promise<McpVerification> {
  const started = Date.now();
  const { command, args } = mcpCommand();
  const transport = new StdioClientTransport({ command, args, stderr: 'pipe' });
  const client = new Client({ name: 'visual-engine-verify', version: '1.0.0-rc.1' }, { capabilities: {} });
  try {
    await client.connect(transport);
    const list = await client.listTools();
    const info = client.getServerVersion();
    return {
      ok: true,
      tools: list.tools.length,
      serverVersion: info?.version ?? null,
      durationMs: Date.now() - started,
      method: 'initialize + tools/list por stdio contra dist/cli/index.js mcp.',
    };
  } catch (e) {
    return { ok: false, tools: 0, serverVersion: null, durationMs: Date.now() - started, error: (e as Error).message, method: 'initialize + tools/list por stdio.' };
  } finally {
    await client.close().catch(() => undefined);
    await new Promise((r) => setTimeout(r, Math.min(50, timeoutMs)));
  }
}

export interface UninstallResult {
  removed: string[];
  kept: string[];
  restored: string[];
  manifestRemoved: boolean;
  notes: string[];
}

export function uninstall(opts: { projectDir?: string; confirm?: boolean; restoreBackups?: boolean } = {}): UninstallResult {
  const projectDir = path.resolve(opts.projectDir ?? process.cwd());
  const manifest = readManifest(projectDir);
  if (!manifest) return { removed: [], kept: [], restored: [], manifestRemoved: false, notes: ['No hay install.json: nada que desinstalar.'] };
  if (opts.confirm !== true) return { removed: [], kept: manifest.files.map((f) => f.path), restored: [], manifestRemoved: false, notes: ['Sin confirmación: no se borró nada.'] };
  const removed: string[] = [];
  const kept: string[] = [];
  const home = os.homedir();
  for (const f of manifest.files) {
    const allowed = withinRoot(projectDir, f.path) || withinRoot(home, f.path);
    if (!allowed) {
      kept.push(`${f.path} (fuera de ámbitos permitidos)`);
      continue;
    }
    if (!fs.existsSync(f.path)) continue;
    if (f.kind === 'mcp') {
      // No se borra la configuración entera: se deja intacta y se avisa.
      kept.push(`${f.path} (configuración compartida; elimina la entrada visual-engine a mano)`);
      continue;
    }
    fs.rmSync(f.path);
    removed.push(f.path);
  }
  const restored: string[] = [];
  if (opts.restoreBackups) {
    for (const b of [...manifest.backups].reverse()) {
      if (!fs.existsSync(b.backup)) continue;
      fs.copyFileSync(b.backup, b.path);
      restored.push(b.path);
    }
  }
  fs.rmSync(manifestPath(projectDir), { force: true });
  return { removed, kept, restored, manifestRemoved: true, notes: ['Las copias se conservan en .visual-engine/backups.'] };
}

export interface RepairIssue {
  target: string;
  problem: string;
  fix: string;
}

export function repair(opts: { projectDir?: string; confirm?: boolean } = {}): { issues: RepairIssue[]; fixed: string[]; notes: string[] } {
  const projectDir = path.resolve(opts.projectDir ?? process.cwd());
  const manifest = readManifest(projectDir);
  const issues: RepairIssue[] = [];
  const fixed: string[] = [];
  if (!manifest) return { issues: [], fixed: [], notes: ['No hay install.json: ejecuta `ve install --yes` para crear la integración.'] };
  for (const f of manifest.files) {
    if (!fs.existsSync(f.path)) {
      issues.push({ target: f.path, problem: 'Archivo gestionado ausente.', fix: 'Reinstalar con `ve install --yes --force`.' });
      continue;
    }
    if (f.path.endsWith('.json')) {
      try {
        JSON.parse(fs.readFileSync(f.path, 'utf8'));
      } catch {
        const backup = [...manifest.backups].reverse().find((b) => b.path === f.path);
        issues.push({ target: f.path, problem: 'JSON inválido.', fix: backup ? 'Restaurar la copia previa.' : 'Corregir a mano; no hay copia.' });
        if (backup && opts.confirm === true) {
          fs.copyFileSync(backup.backup, f.path);
          fixed.push(f.path);
        }
      }
    }
  }
  return { issues, fixed, notes: ['No se inventan configuraciones: las ausencias se reportan y se reinstalan con --force.'] };
}

export interface AgentInventory extends AgentStatus {
  integration: 'designed' | 'installed' | 'verified';
}

export async function inventory(projectDir = process.cwd()): Promise<AgentInventory[]> {
  const statuses = await detectAgents({ projectDir });
  const manifest = readManifest(projectDir);
  return statuses.map((s) => {
    const entry = manifest?.agents.find((a) => a.id === s.id);
    return { ...s, integration: entry?.status ?? 'designed' };
  });
}

export { AGENTS, agentIds };
