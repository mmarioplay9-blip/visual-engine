import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'cli', 'index.js');
const reference = path.join(root, 'demo', 'reference', 'brand-intro.mp4');

function run(args, opts = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: opts.cwd ?? root, env: { ...process.env, ...opts.env } });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test('version y help responden', () => {
  const v = run(['version']);
  assert.equal(v.code, 0);
  assert.match(v.stdout, /visual-engine \d+\.\d+\.\d+/);

  const h = run(['help']);
  assert.equal(h.code, 0);
  assert.match(h.stdout, /review/);
});

test('doctor detecta ffmpeg y Playwright de verdad', () => {
  const r = run(['doctor', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const d = JSON.parse(r.stdout);
  const byId = Object.fromEntries(d.tools.map((t) => [t.id, t]));
  assert.equal(byId.ffmpeg.available, true);
  assert.match(byId.ffmpeg.version, /ffmpeg version/);
  assert.equal(byId.ffprobe.available, true);
  assert.equal(byId.playwright.available, true);
  assert.match(byId.playwright.version, /^\d+\.\d+\.\d+/);
  assert.ok(d.ready >= 7, `sólo ${d.ready} herramientas`);
});

test('library lista 6 efectos y aplica uno sin placeholders', () => {
  const list = run(['effects', 'list', '--json']);
  assert.equal(list.code, 0, list.stderr);
  const effects = JSON.parse(list.stdout);
  assert.equal(effects.length, 6);
  assert.deepEqual(effects.map((e) => e.id).sort(), [
    'aurora-hero', 'glass-hud', 'kinetic-title', 'noise-warp', 'particle-nebula', 'sweep-banner',
  ]);

  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-cli-'));
  const applied = run(['effects', 'apply', 'aurora-hero', '--out', out, '--set', 'accent=#123456']);
  assert.equal(applied.code, 0, applied.stderr);
  const html = fs.readFileSync(path.join(out, 'aurora-hero', 'index.html'), 'utf8');
  assert.ok(html.includes('#123456'), 'debe inyectar el parámetro');
  assert.ok(!html.includes('{{'), 'no deben quedar placeholders');
  assert.ok(fs.existsSync(path.join(out, 'aurora-hero', 'effect.js')));
});

test('scaffold de Three.js genera archivos y node --check los valida', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-scaffold-'));
  const r = run(['adapters', 'scaffold', 'three', '--out', out]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /node --check OK/);
  const files = fs.readdirSync(out).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 1);
  execFileSync(process.execPath, ['--check', path.join(out, files[0])]);
});

test('frames extrae PNG reales de la referencia', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-frames-'));
  const r = run(['frames', reference, '--count', '4', '--width', '270', '--out', out, '--json']);
  assert.equal(r.code, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  assert.equal(data.files.length, 4);
  for (const f of data.files) {
    const sig = fs.readFileSync(f).subarray(0, 8);
    assert.deepEqual([...sig], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
});

test('init instala instrucciones, skill y configuración MCP válida', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 've-init-'));
  fs.writeFileSync(path.join(project, 'package.json'), '{"name":"proyecto-prueba","private":true}\n');
  const r = run(['init', '--project', project, '--agents', 'codex,claude,cursor,gemini,freebuff', '--clients', 'claude,cursor,gemini,opencode,codex']);
  assert.equal(r.code, 0, r.stderr);

  for (const f of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursor/rules/visual-engine.mdc', '.agents/skills/visual-engine/SKILL.md', '.visual-engine/config.json', '.mcp.json']) {
    assert.ok(fs.existsSync(path.join(project, f)), `falta ${f}`);
  }
  const mcp = JSON.parse(fs.readFileSync(path.join(project, '.mcp.json'), 'utf8'));
  assert.ok(mcp.mcpServers['visual-engine'].command);
  assert.ok(mcp.mcpServers['visual-engine'].args.at(-1) === 'mcp');
  for (const f of ['.cursor/mcp.json', '.gemini/settings.json', 'opencode.json']) {
    JSON.parse(fs.readFileSync(path.join(project, f), 'utf8'));
  }
  assert.match(fs.readFileSync(path.join(project, '.visual-engine', 'codex-mcp.toml'), 'utf8'), /mcp_servers\.visual-engine/);

  // Segunda ejecución: no sobrescribe.
  const again = run(['init', '--project', project, '--agents', 'codex']);
  assert.equal(again.code, 0);
  assert.match(again.stdout, /omitido \(ya existe\)/);
});

test('deps install exige confirmación explícita', () => {
  const r = run(['deps', 'install', 'gsap']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /confirm=true|no confirmada/i);
});
