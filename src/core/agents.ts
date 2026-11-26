import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PACKAGE_ROOT } from './paths.js';
import { text } from './run.js';

/**
 * Registro de integraciones 0.6.
 *
 * Cada agente declara su formato real de configuración. El estado no se deduce
 * del registro: `detectAgent` ejecuta el binario y comprueba los archivos, y el
 * instalador sólo marca `verified` tras un handshake MCP real.
 */

export type AgentId =
  | 'codex'
  | 'claude'
  | 'cursor'
  | 'gemini'
  | 'freebuff'
  | 'opencode'
  | 'maex'
  | 'ollama'
  | 'generic-mcp';

export type ActivationMode = 'automatic' | 'conditional' | 'manual';
export type ConfigFormat = 'json-mcpServers' | 'json-opencode' | 'toml-codex' | 'none';

export interface AgentSpec {
  id: AgentId;
  title: string;
  vendor: string;
  kind: 'cli' | 'ide' | 'local-llm' | 'generic';
  bin?: string;
  versionArgs: string[];
  docs: string;
  mcp: {
    supported: boolean;
    format: ConfigFormat;
    projectPath?: string;
    globalPath?: string;
    note: string;
  };
  instructions: { projectPath: string; template: string };
  skill?: { projectPath: string; template: string };
  activation: ActivationMode;
  activationNote: string;
  /** Cómo se comprueba de verdad, no cómo se supone que funciona. */
  verification: string;
}

const cli = () => path.join(PACKAGE_ROOT, 'dist', 'cli', 'index.js');

function template(rel: string): string {
  return path.join(PACKAGE_ROOT, rel);
}

export const AGENTS: AgentSpec[] = [
  {
    id: 'codex',
    title: 'OpenAI Codex CLI',
    vendor: 'OpenAI',
    kind: 'cli',
    bin: 'codex',
    versionArgs: ['--version'],
    docs: 'https://developers.openai.com/codex/mcp',
    mcp: {
      supported: true,
      format: 'toml-codex',
      globalPath: path.join(os.homedir(), '.codex', 'config.toml'),
      note: 'Codex lee [mcp_servers.<id>] en ~/.codex/config.toml; se añade el bloque sin sobrescribir el resto.',
    },
    instructions: { projectPath: 'AGENTS.md', template: template('agents/AGENTS.md') },
    skill: { projectPath: path.join('.codex', 'skills', 'visual-engine', 'SKILL.md'), template: template('skills/visual-engine/SKILL.md') },
    activation: 'conditional',
    activationNote: 'AGENTS.md se carga como contexto; la skill se invoca cuando la tarea coincide. No hay activación automática garantizada.',
    verification: 'binario + bloque TOML parseable + handshake MCP por stdio.',
  },
  {
    id: 'claude',
    title: 'Claude Code',
    vendor: 'Anthropic',
    kind: 'cli',
    bin: 'claude',
    versionArgs: ['--version'],
    docs: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
    mcp: {
      supported: true,
      format: 'json-mcpServers',
      projectPath: '.mcp.json',
      globalPath: path.join(os.homedir(), '.claude.json'),
      note: 'Claude Code usa mcpServers en .mcp.json del proyecto; el archivo global no se toca sin --global.',
    },
    instructions: { projectPath: 'CLAUDE.md', template: template('agents/CLAUDE.md') },
    skill: { projectPath: path.join('.claude', 'skills', 'visual-engine', 'SKILL.md'), template: template('skills/visual-engine/SKILL.md') },
    activation: 'automatic',
    activationNote: 'La skill declara cuándo usarse y Claude Code la invoca por coincidencia semántica; las reglas del proyecto mandan.',
    verification: 'binario + .mcp.json válido + handshake MCP por stdio.',
  },
  {
    id: 'cursor',
    title: 'Cursor',
    vendor: 'Anysphere',
    kind: 'ide',
    bin: 'cursor',
    versionArgs: ['--version'],
    docs: 'https://docs.cursor.com/context/model-context-protocol',
    mcp: {
      supported: true,
      format: 'json-mcpServers',
      projectPath: path.join('.cursor', 'mcp.json'),
      note: 'Cursor usa .cursor/mcp.json con mcpServers; las reglas .mdc se activan por descripción/globs.',
    },
    instructions: { projectPath: path.join('.cursor', 'rules', 'visual-engine.mdc'), template: template('agents/cursor-visual-engine.mdc') },
    activation: 'conditional',
    activationNote: 'La regla .mdc se adjunta cuando su descripción coincide; el agente decide si ejecuta las herramientas.',
    verification: 'binario + .cursor/mcp.json válido + handshake MCP por stdio.',
  },
  {
    id: 'gemini',
    title: 'Gemini CLI',
    vendor: 'Google',
    kind: 'cli',
    bin: 'gemini',
    versionArgs: ['--version'],
    docs: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md',
    mcp: {
      supported: true,
      format: 'json-mcpServers',
      projectPath: path.join('.gemini', 'settings.json'),
      globalPath: path.join(os.homedir(), '.gemini', 'settings.json'),
      note: 'Gemini CLI lee mcpServers en .gemini/settings.json; GEMINI.md aporta las instrucciones.',
    },
    instructions: { projectPath: 'GEMINI.md', template: template('agents/GEMINI.md') },
    activation: 'conditional',
    activationNote: 'GEMINI.md se carga como contexto y las herramientas MCP quedan disponibles; la activación depende del modelo.',
    verification: 'binario + settings.json válido + handshake MCP por stdio.',
  },
  {
    id: 'freebuff',
    title: 'Freebuff',
    vendor: 'Freebuff',
    kind: 'cli',
    bin: 'freebuff',
    versionArgs: ['--version'],
    docs: 'https://freebuff.com',
    mcp: {
      supported: false,
      format: 'none',
      note: 'Freebuff consume skills y AGENTS.md del proyecto; no se declara una ruta MCP que no esté documentada.',
    },
    instructions: { projectPath: 'AGENTS.md', template: template('agents/AGENTS.md') },
    skill: { projectPath: path.join('.agents', 'skills', 'visual-engine', 'SKILL.md'), template: template('skills/visual-engine/SKILL.md') },
    activation: 'automatic',
    activationNote: 'La skill .agents/skills se descubre por nombre/descripción; el agente la carga cuando la tarea es visual.',
    verification: 'binario + SKILL.md presente; la invocación real depende del agente (se registra aparte).',
  },
  {
    id: 'opencode',
    title: 'OpenCode',
    vendor: 'OpenCode',
    kind: 'cli',
    bin: 'opencode',
    versionArgs: ['--version'],
    docs: 'https://opencode.ai/docs/mcp-servers/',
    mcp: {
      supported: true,
      format: 'json-opencode',
      projectPath: 'opencode.json',
      globalPath: path.join(os.homedir(), '.config', 'opencode', 'opencode.json'),
      note: 'OpenCode usa mcp.<id> con type local y command en array dentro de opencode.json.',
    },
    instructions: { projectPath: 'AGENTS.md', template: template('agents/AGENTS.md') },
    activation: 'conditional',
    activationNote: 'AGENTS.md se carga siempre; las herramientas MCP están disponibles y el agente decide usarlas.',
    verification: 'binario + opencode.json válido + handshake MCP por stdio.',
  },
  {
    id: 'maex',
    title: 'MAEX (Codex local independiente)',
    vendor: 'Local',
    kind: 'cli',
    bin: 'maex',
    versionArgs: ['--version'],
    docs: 'Configuración local del usuario; no hay documentación pública verificada.',
    mcp: {
      supported: true,
      format: 'toml-codex',
      globalPath: path.join(os.homedir(), '.maex', 'config.toml'),
      note: 'Diseñado como compatible con el formato TOML de Codex; al no estar instalado aquí no se escribe ni se afirma verificado.',
    },
    instructions: { projectPath: 'AGENTS.md', template: template('agents/AGENTS.md') },
    activation: 'manual',
    activationNote: 'Invocación manual: no se ha comprobado activación automática en esta máquina.',
    verification: 'binario y configuración ausentes en esta máquina: estado designed, no verificado.',
  },
  {
    id: 'ollama',
    title: 'Agentes locales sobre Ollama',
    vendor: 'Ollama',
    kind: 'local-llm',
    bin: 'ollama',
    versionArgs: ['--version'],
    docs: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    mcp: {
      supported: false,
      format: 'none',
      note: 'Ollama no implementa MCP: se integra por CLI/API local (ve context + ve analyze) y un prompt de sistema acotado.',
    },
    instructions: { projectPath: path.join('.visual-engine', 'ollama-system.md'), template: template('agents/OLLAMA.md') },
    activation: 'manual',
    activationNote: 'Sin activación automática: el anfitrión debe inyectar el prompt y llamar a las herramientas.',
    verification: 'HTTP /api/tags real en 127.0.0.1:11434; modelos y capacidades declarados.',
  },
  {
    id: 'generic-mcp',
    title: 'Cualquier cliente MCP',
    vendor: 'Comunidad',
    kind: 'generic',
    versionArgs: [],
    docs: 'https://modelcontextprotocol.io',
    mcp: {
      supported: true,
      format: 'json-mcpServers',
      projectPath: path.join('.visual-engine', 'mcp.json'),
      note: 'Bloque mcpServers genérico; el cliente debe apuntar a este archivo o copiar la entrada.',
    },
    instructions: { projectPath: 'AGENTS.md', template: template('agents/AGENTS.md') },
    activation: 'manual',
    activationNote: 'Depende del cliente: se entrega el bloque y las instrucciones, sin afirmar activación.',
    verification: 'handshake MCP por stdio con el binario de este paquete.',
  },
];

export function agentIds(): AgentId[] {
  return AGENTS.map((a) => a.id);
}

export function agentSpec(id: string): AgentSpec {
  const spec = AGENTS.find((a) => a.id === id);
  if (!spec) throw new Error(`Agente desconocido: ${id}. Disponibles: ${agentIds().join(', ')}`);
  return spec;
}

export interface AgentStatus {
  id: AgentId;
  title: string;
  available: boolean;
  version: string | null;
  detail?: string;
  configFound: boolean;
  instructionsFound: boolean;
  skillFound: boolean | null;
  activation: ActivationMode;
  activationNote: string;
  docs: string;
  mcpFormat: ConfigFormat;
  mcpSupported: boolean;
  models?: string[];
}

/** Resuelve la ruta de configuración según el ámbito. */
export function agentConfigPath(spec: AgentSpec, scope: 'project' | 'global', projectDir: string): string | null {
  if (scope === 'global') return spec.mcp.globalPath ?? null;
  return spec.mcp.projectPath ? path.join(projectDir, spec.mcp.projectPath) : null;
}

export interface DetectOptions {
  projectDir?: string;
  home?: string;
  /** Evita ejecutar binarios; sólo comprueba archivos. */
  offline?: boolean;
}

function exists(p?: string | null): boolean {
  return !!p && fs.existsSync(p);
}

/** Caché de PATH: una sonda por binario y proceso, no una por instalación. */
const pathCache = new Map<string, boolean>();

/**
 * Localiza el binario en PATH sin ejecutarlo. En Windows es la única forma
 * barata de saber que un `.cmd` existe: lanzar el shim ausente por cmd.exe
 * costaba ~5 s por agente en cada inventario.
 */
async function onPath(bin: string): Promise<boolean> {
  const key = `${process.platform}:${bin}`;
  const cached = pathCache.get(key);
  if (cached !== undefined) return cached;
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = await text(finder, [bin], { timeoutMs: 4000 });
  const found = r.ok;
  pathCache.set(key, found);
  return found;
}

/**
 * Ejecuta el binario y, en Windows, reintenta mediante cmd.exe para los
 * lanzadores .cmd (cursor, opencode, freebuff). El binario y los argumentos
 * vienen del registro, nunca de entrada del usuario; no se usa shell libre.
 */
/**
 * Lanzadores que abren una interfaz o sesión interactiva: se localizan en PATH
 * pero no se ejecutan con `--version`. Ejecutar `maex` abría una sesión de
 * Codex que no terminaba y costaba 6,5 s por inventario.
 */
const LOCATE_ONLY: Partial<Record<AgentId, string>> = {
  cursor: 'Ruta detectada; no se ejecuta --version para no abrir la interfaz.',
  freebuff: 'Ruta detectada; no se ejecuta --version para no abrir la interfaz.',
  maex: 'Lanzador interactivo detectado; no se ejecuta --version para no abrir la sesión.',
};

async function versionOf(spec: AgentSpec): Promise<Awaited<ReturnType<typeof text>>> {
  if (LOCATE_ONLY[spec.id]) {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    return text(finder, [spec.bin!], { timeoutMs: 4000 });
  }
  // Ausente de PATH: se declara sin lanzar cmd.exe (ahorra el timeout entero).
  if (process.platform === 'win32' && !(await onPath(spec.bin!))) {
    return { ok: false, code: 127, stdout: '', stderr: 'ENOENT: no está en PATH.', missing: true };
  }
  const first = await text(spec.bin!, spec.versionArgs, { timeoutMs: 5000 });
  if (first.ok || process.platform !== 'win32') return first;
  const comspec = process.env.ComSpec ?? 'cmd.exe';
  return text(comspec, ['/d', '/s', '/c', `${spec.bin} ${spec.versionArgs.join(' ')}`], { timeoutMs: 5000 });
}

async function ollamaModels(): Promise<string[]> {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: { name?: string }[] };
    return (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

/** Detecta cada agente con una ejecución real del binario y comprobación de archivos. */
export async function detectAgent(spec: AgentSpec, opts: DetectOptions = {}): Promise<AgentStatus> {
  const projectDir = path.resolve(opts.projectDir ?? process.cwd());
  const home = opts.home ?? os.homedir();
  const projectConfig = spec.mcp.projectPath ? path.join(projectDir, spec.mcp.projectPath) : null;
  const globalConfig = spec.mcp.globalPath ?? null;
  const configFound = exists(projectConfig) || exists(globalConfig);
  const instructionsFound = exists(path.join(projectDir, spec.instructions.projectPath)) || exists(path.join(home, spec.instructions.projectPath));
  const skillFound = spec.skill ? exists(path.join(projectDir, spec.skill.projectPath)) || exists(path.join(home, spec.skill.projectPath)) : null;
  let available = false;
  let version: string | null = null;
  let detail: string | undefined;
  if (spec.bin && !opts.offline) {
    const r = await versionOf(spec);
    available = r.ok;
    version = r.ok ? (r.stdout.split(/\r?\n/)[0] ?? '').slice(0, 120) : null;
    detail = r.ok
      ? LOCATE_ONLY[spec.id]
      : r.missing ? 'No está en PATH.' : r.stderr.slice(0, 200);
  } else if (spec.bin) {
    available = false;
    detail = 'Detección offline: no se ejecutó el binario.';
  } else {
    available = true;
    detail = 'Cliente genérico: no requiere binario propio.';
  }
  const models = spec.id === 'ollama' ? await ollamaModels() : undefined;
  return {
    id: spec.id,
    title: spec.title,
    available: spec.id === 'ollama' ? available && (models?.length ?? 0) > 0 : available,
    version,
    detail: spec.id === 'ollama' && available && !(models?.length ?? 0) ? 'Ollama responde pero no hay modelos instalados.' : detail,
    configFound,
    instructionsFound,
    skillFound,
    activation: spec.activation,
    activationNote: spec.activationNote,
    docs: spec.docs,
    mcpFormat: spec.mcp.format,
    mcpSupported: spec.mcp.supported,
    models,
  };
}

let inventoryCache: { key: string; at: number; value: AgentStatus[] } | null = null;

/** Detecta todos los agentes, con caché corta para no repetir sondas en una instalación. */
export async function detectAgents(opts: DetectOptions = {}): Promise<AgentStatus[]> {
  const key = `${path.resolve(opts.projectDir ?? process.cwd())}|${opts.home ?? os.homedir()}|${opts.offline === true}`;
  if (inventoryCache && inventoryCache.key === key && Date.now() - inventoryCache.at < 30_000) {
    return inventoryCache.value;
  }
  const value = await Promise.all(AGENTS.map((a) => detectAgent(a, opts)));
  inventoryCache = { key, at: Date.now(), value };
  return value;
}

/** Comando y argumentos del servidor MCP de este paquete. */
export function mcpCommand(): { command: string; args: string[] } {
  return { command: process.execPath, args: [cli(), 'mcp'] };
}

export { template as agentTemplate };
