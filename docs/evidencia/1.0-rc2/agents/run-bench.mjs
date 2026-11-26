#!/usr/bin/env node
/**
 * A/B real con Codex CLI 1.0.0-rc.2.
 *
 * Cada pareja usa el MISMO modelo, la MISMA referencia adjunta (-i), el MISMO
 * prompt y el MISMO sandbox. La única diferencia es Visual Engine:
 *   A: directorio limpio, sin instrucciones ni MCP.
 *   B: mismo directorio limpio + `ve install --agents codex` + servidor MCP por -c.
 *
 * Uso: node docs/evidencia/1.0-rc2/agents/run-bench.mjs [caso...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const prompt = fs.readFileSync(path.join(here, 'PROMPT.md'), 'utf8');
const cli = path.join(root, 'dist/cli/index.js').split(path.sep).join('/');
const work = path.join(here, 'work');

const CASES = {
  'game-hud': { projectType: 'game-hud', brief: 'HUD de videojuego sobre un cañón desértico al atardecer, 1280×720, CSS/SVG local.' },
  'motion-title': { projectType: 'motion', brief: 'Tarjeta de título de motion graphics con la palabra ORBIT, 1280×720, CSS local.' },
  'premium-landing': { projectType: 'landing', brief: 'Landing editorial de un estudio de cerámica de autor, 1280×720, CSS local.' },
  'professional-app': { projectType: 'app', brief: 'Panel de aplicación profesional con navegación, métricas, gráfico y tabla, 1280×720.' },
  'scene-3d': { projectType: 'scene3d', brief: 'Página inmersiva 3D con un objeto cromado flotante sobre fondo violeta, 1280×720.' },
};

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: [opts.stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1' } });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    // `codex exec` lee el prompt de stdin cuando no se pasa como argumento.
    // Hace falta porque `-i` es multi-valor y se tragaría el prompt posicional.
    if (opts.stdin !== undefined) { p.stdin.write(opts.stdin); p.stdin.end(); }
    p.on('close', (code) => resolve({ code, stdout: out, stderr: err }));
  });
}

function fresh(dir) {
  // Directorios únicos por ejecución: Windows retiene descriptores al cerrar codex
  // y borrar un directorio en uso produce EPERM. Nunca se pisa una rama anterior.
  if (fs.existsSync(dir)) throw new Error(`La rama ya existe, no se sobrescribe: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules\n');
  return dir;
}

function parseArm(res, name) {
  const events = res.stdout.split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
  const items = events.filter((e) => e.type === 'item.completed').map((e) => e.item).filter(Boolean);
  const commands = items.filter((i) => i.type === 'command_execution');
  const mcp = items.filter((i) => i.type === 'mcp_tool_call');
  const usage = events.filter((e) => e.type === 'turn.completed').map((e) => e.usage).filter(Boolean).pop() ?? null;
  const veCommands = commands.filter((i) => /dist[\\/]cli[\\/]index\.js|(^|\s)ve\s/.test(String(i.command ?? '')));
  return {
    arm: name,
    exit: res.code,
    usage,
    commands: commands.map((i) => ({ command: String(i.command ?? '').replace(/\s+/g, ' ').slice(0, 240), exit: i.exit_code })),
    mcpCalls: mcp.map((i) => ({ server: i.server, tool: i.tool, status: i.status, error: i.error?.message ?? null })),
    veCommands: veCommands.map((i) => String(i.command ?? '').replace(/\s+/g, ' ').slice(0, 300)),
  };
}

async function arm(name, dir, reference, withVe) {
  const ref = path.join(dir, 'reference.jpg');
  fs.copyFileSync(reference, ref);
  if (withVe) {
    const install = await run(process.execPath, [cli, 'install', '--yes', '--agents', 'codex', '--profile', 'professional'], { cwd: dir });
    fs.writeFileSync(path.join(dir, '..', `${name}-install.log`), install.stdout + install.stderr);
  }
  const outFile = path.join(dir, '..', `${name}-last.txt`);
  const args = [
    'exec', '-C', dir, '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check',
    '--ignore-user-config', '--ignore-rules', '--json', '-o', outFile, '-i', ref,
  ];
  if (withVe) {
    args.push('-c', 'mcp_servers.visual-engine.command="node"');
    args.push('-c', `mcp_servers.visual-engine.args=["${cli}","mcp"]`);
    args.push('-c', 'mcp_servers.visual-engine.default_tools_approval_mode="approve"');
  }
  const started = Date.now();
  const res = await run('codex', args, { cwd: dir, stdin: prompt });
  const ms = Date.now() - started;
  fs.writeFileSync(path.join(dir, '..', `${name}.jsonl`), res.stdout);
  fs.writeFileSync(path.join(dir, '..', `${name}.stderr.log`), res.stderr);
  const html = path.join(dir, 'index.html');
  const markup = fs.existsSync(html) ? fs.readFileSync(html, 'utf8') : '';
  return {
    ...parseArm(res, name),
    ms,
    bytes: markup.length,
    hasHtml: !!markup,
    // Puerta antiatrampa: un volcado base64 grande significa incrustar la referencia.
    embeddedReference: /[A-Za-z0-9+/]{20000,}/.test(markup),
    installed: withVe
      ? { agents: fs.existsSync(path.join(dir, 'AGENTS.md')), skill: fs.existsSync(path.join(dir, '.codex/skills/visual-engine/SKILL.md')) }
      : null,
    last: fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8').slice(0, 1200) : '',
  };
}

const only = process.argv.slice(2);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runsFile = path.join(here, 'runs.json');
const previous = fs.existsSync(runsFile) ? JSON.parse(fs.readFileSync(runsFile, 'utf8')) : { cases: {} };
const result = { generatedAt: new Date().toISOString(), agent: 'codex-cli 0.172.0', model: 'por defecto de la cuenta (el mismo en las dos ramas)', cases: { ...previous.cases } };

for (const [id, meta] of Object.entries(CASES)) {
  if (only.length && !only.includes(id)) continue;
  const reference = path.join(here, '..', 'references', `${id}.jpg`);
  if (!fs.existsSync(reference)) throw new Error(`Falta la referencia ${reference}`);
  const runDir = path.join(work, id, stamp);
  const aDir = fresh(path.join(runDir, 'a'));
  const bDir = fresh(path.join(runDir, 'b'));
  console.log(`\n== ${id} · A (sin VE) ==`);
  const a = await arm('a', aDir, reference, false);
  console.log(`   exit ${a.exit} · ${Math.round(a.ms / 1000)}s · ${a.bytes} B · ve ${a.veCommands.length}`);
  console.log(`== ${id} · B (con VE) ==`);
  const b = await arm('b', bDir, reference, true);
  console.log(`   exit ${b.exit} · ${Math.round(b.ms / 1000)}s · ${b.bytes} B · ve ${b.veCommands.length} · mcp ${b.mcpCalls.length}`);
  result.cases[id] = { ...meta, reference: path.relative(root, reference), dirA: path.relative(here, aDir), dirB: path.relative(here, bDir), a, b };
  fs.writeFileSync(runsFile, JSON.stringify(result, null, 2) + '\n');
}
console.log('\nListo:', path.join(here, 'runs.json'));
