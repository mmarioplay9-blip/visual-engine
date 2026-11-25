import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, findProjectRoot, PACKAGE_ROOT } from './paths.js';

export type AgentName = 'codex' | 'claude' | 'cursor' | 'gemini' | 'freebuff' | 'opencode';
export type ClientName = AgentName;

export interface InitOptions {
  projectDir?: string;
  agents?: AgentName[];
  clients?: ClientName[];
  force?: boolean;
}

export interface InitResult {
  projectDir: string;
  files: { path: string; status: 'escrito' | 'omitido (ya existe)' }[];
  mcp: { client: string; path: string; status: 'escrito' | 'omitido (ya existe)' | 'manual' | 'error'; note?: string }[];
  next: string[];
}

const ALL_AGENTS: AgentName[] = ['codex', 'claude', 'cursor', 'gemini', 'freebuff', 'opencode'];

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

/** Configuración del servidor MCP para este paquete instalado. */
export function mcpEntry() {
  const cli = path.join(PACKAGE_ROOT, 'dist', 'cli', 'index.js');
  return { command: process.execPath, args: [cli, 'mcp'] };
}

function writeFile(file: string, content: string, force: boolean): 'escrito' | 'omitido (ya existe)' {
  ensureDir(path.dirname(file));
  if (fs.existsSync(file) && !force) return 'omitido (ya existe)';
  fs.writeFileSync(file, content, 'utf8');
  return 'escrito';
}

function mergeJson(file: string, patch: Record<string, unknown>, force: boolean): 'escrito' | 'omitido (ya existe)' {
  let base: any = {};
  if (fs.existsSync(file)) {
    try {
      base = JSON.parse(read(file));
    } catch {
      throw new Error(`No se pudo leer ${file}: JSON inválido. Corrígelo antes de continuar.`);
    }
    if (!force && JSON.stringify(base).includes('visual-engine')) return 'omitido (ya existe)';
  }
  const merged = deepMerge(base, patch);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return 'escrito';
}

function deepMerge(a: any, b: any): any {
  if (Array.isArray(a) || Array.isArray(b)) return b;
  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    const out: any = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = k in out ? deepMerge(out[k], v) : v;
    return out;
  }
  return b;
}

/** Instala instrucciones, skills y configuración MCP en un proyecto del usuario. */
export function initProject(opts: InitOptions = {}): InitResult {
  const projectDir = findProjectRoot(opts.projectDir ?? process.cwd());
  const agents = opts.agents?.length ? opts.agents : ALL_AGENTS;
  const clients = opts.clients ?? [];
  const force = opts.force === true;
  const files: InitResult['files'] = [];
  const entry = { command: process.execPath, args: [path.join(PACKAGE_ROOT, 'dist', 'cli', 'index.js'), 'mcp'] };
  const skill = read(path.join(PACKAGE_ROOT, 'skills', 'visual-engine', 'SKILL.md'));

  const add = (rel: string, content: string) => {
    files.push({ path: path.join(projectDir, rel), status: writeFile(path.join(projectDir, rel), content, force) });
  };
  const addSkill = (rel: string) => add(rel, skill);

  if (agents.includes('codex')) {
    add('AGENTS.md', read(path.join(PACKAGE_ROOT, 'agents', 'AGENTS.md')));
    addSkill('.codex/skills/visual-engine/SKILL.md');
  }
  if (agents.includes('claude')) {
    add('CLAUDE.md', read(path.join(PACKAGE_ROOT, 'agents', 'CLAUDE.md')));
    addSkill('.claude/skills/visual-engine/SKILL.md');
  }
  if (agents.includes('gemini')) {
    add('GEMINI.md', read(path.join(PACKAGE_ROOT, 'agents', 'GEMINI.md')));
  }
  if (agents.includes('cursor')) {
    add('.cursor/rules/visual-engine.mdc', read(path.join(PACKAGE_ROOT, 'agents', 'cursor-visual-engine.mdc')));
  }
  if (agents.includes('freebuff') || agents.includes('opencode')) {
    addSkill('.agents/skills/visual-engine/SKILL.md');
  }

  const config = {
    version: 1,
    referenceDir: '.visual-engine/references',
    capture: { width: 1280, height: 720, frames: 6, intervalMs: 400 },
    quality: { minScore: 80, forbidFlatDesign: true },
    library: path.join(PACKAGE_ROOT, 'library', 'effects'),
  };
  add('.visual-engine/config.json', JSON.stringify(config, null, 2) + '\n');

  const mcp: InitResult['mcp'] = [];
  const jsonServers = { mcpServers: { 'visual-engine': entry } };
  for (const client of clients) {
    try {
      if (client === 'claude') {
        mcp.push({ client, path: path.join(projectDir, '.mcp.json'), status: mergeJson(path.join(projectDir, '.mcp.json'), jsonServers, force) });
      } else if (client === 'cursor') {
        mcp.push({ client, path: path.join(projectDir, '.cursor', 'mcp.json'), status: mergeJson(path.join(projectDir, '.cursor', 'mcp.json'), jsonServers, force) });
      } else if (client === 'gemini') {
        mcp.push({ client, path: path.join(projectDir, '.gemini', 'settings.json'), status: mergeJson(path.join(projectDir, '.gemini', 'settings.json'), jsonServers, force) });
      } else if (client === 'opencode') {
        mcp.push({
          client,
          path: path.join(projectDir, 'opencode.json'),
          status: mergeJson(path.join(projectDir, 'opencode.json'), { mcp: { 'visual-engine': { type: 'local', command: [entry.command, ...entry.args], enabled: true } } }, force),
        });
      } else if (client === 'codex') {
        const snippet = `# Añade esto a ~/.codex/config.toml (Visual Engine)\n[mcp_servers.visual-engine]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n`;
        const target = path.join(projectDir, '.visual-engine', 'codex-mcp.toml');
        mcp.push({ client, path: target, status: writeFile(target, snippet, force), note: 'Codex guarda su configuración global: copia este bloque en ~/.codex/config.toml.' });
      } else {
        const target = path.join(projectDir, '.visual-engine', 'mcp.json');
        mcp.push({ client, path: target, status: writeFile(target, JSON.stringify(jsonServers, null, 2) + '\n', force), note: 'Formato genérico; revisa la documentación del cliente para su ruta exacta.' });
      }
    } catch (e) {
      mcp.push({ client, path: '', status: 'error', note: (e as Error).message });
    }
  }

  return {
    projectDir,
    files,
    mcp,
    next: [
      'Ejecuta `ve doctor` en el proyecto para confirmar las herramientas disponibles.',
      'Coloca una imagen o vídeo de referencia y ejecuta `ve analyze <archivo>`.',
      'Abre el agente y pídele que use las herramientas visual_* o la skill visual-engine.',
    ],
  };
}
