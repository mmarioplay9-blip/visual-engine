#!/usr/bin/env node
/**
 * Verificación real de las integraciones globales instaladas.
 *
 * Para cada agente: lee SU archivo de configuración, arranca el servidor MCP con
 * el comando y el entorno exactos que ese archivo declara, hace initialize,
 * tools/list y llama a visual_doctor. No reutiliza el comando de este proceso:
 * si la configuración está mal, falla.
 *
 * node docs/evidencia/1.0-rc2/integrations/verify.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const home = os.homedir();
const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(here, 'integrations.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function tomlEntry(file, section) {
  const raw = fs.readFileSync(file, 'utf8');
  const start = raw.indexOf(`[mcp_servers.${section}]`);
  if (start < 0) throw new Error(`falta [mcp_servers.${section}] en ${file}`);
  const block = raw.slice(start);
  const command = JSON.parse(block.match(/^command = (.+)$/m)[1]);
  const args = JSON.parse(block.match(/^args = (.+)$/m)[1]);
  const envMatch = block.match(/\[mcp_servers\.visual-engine\.env\]\r?\n([\s\S]*?)(?:\r?\n\[|$)/);
  const env = {};
  if (envMatch) {
    for (const line of envMatch[1].split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+) = "(.+)"$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return { command, args, env };
}

function jsonEntry(file, key, group) {
  const data = readJson(file);
  const entry = data?.[key]?.[group];
  if (!entry) throw new Error(`falta ${key}.${group} en ${file}`);
  const command = Array.isArray(entry.command) ? entry.command[0] : entry.command;
  const args = Array.isArray(entry.command) ? entry.command.slice(1) : entry.args;
  const env = entry.env ?? entry.environment ?? {};
  return { command, args, env };
}

function handshake({ command, args, env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '';
    let tools = 0;
    let doctor = null;
    let settled = false;
    child.stdin.on('error', () => {});
    const finish = (value) => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch {}
      resolve(value);
    };
    const send = (msg) => {
      if (settled || child.stdin.destroyed) return;
      try { child.stdin.write(JSON.stringify(msg) + '\n'); } catch {}
    };
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      for (const line of buf.split('\n')) {
        if (!line.trim()) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 1) {
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
        } else if (msg.id === 2) {
          tools = msg.result?.tools?.length ?? 0;
          send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'visual_doctor', arguments: {} } });
        } else if (msg.id === 3) {
          const text = msg.result?.content?.[0]?.text ?? msg.error?.message ?? '';
          doctor = { ok: !msg.error, sample: String(text).slice(0, 160) };
          finish({ ok: tools > 0 && Boolean(doctor?.ok), tools, doctor });
        }
      }
    });
    child.stderr.on('data', () => {});
    child.on('error', (e) => finish({ ok: false, error: e.message, tools: 0 }));
    child.on('exit', (code) => {
      if (!doctor) finish({ ok: false, error: `el servidor terminó con ${code}`, tools });
    });
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'verify', version: '1.0' } } });
    setTimeout(() => finish({ ok: false, error: 'tiempo agotado', tools }), 20000);
  });
}

const cases = [
  { id: 'codex', mcp: () => tomlEntry(path.join(home, '.codex', 'config.toml'), 'visual-engine'),
    skill: path.join(home, '.codex', 'skills', 'visual-engine', 'SKILL.md'),
    instructions: path.join(home, '.codex', 'AGENTS.md'), instructionsManaged: false },
  { id: 'claude', mcp: () => jsonEntry(path.join(home, '.claude.json'), 'mcpServers', 'visual-engine'),
    skill: path.join(home, '.claude', 'skills', 'visual-engine', 'SKILL.md'),
    instructions: path.join(home, '.claude', 'CLAUDE.md') },
  { id: 'cursor', mcp: () => jsonEntry(path.join(home, '.cursor', 'mcp.json'), 'mcpServers', 'visual-engine'),
    skill: null, instructions: path.join(home, '.cursor', 'rules', 'visual-engine.mdc') },
  { id: 'freebuff', mcp: null, skill: path.join(home, '.agents', 'skills', 'visual-engine', 'SKILL.md'),
    instructions: null, activates: 'skill por descripción' },
  { id: 'opencode', mcp: () => jsonEntry(path.join(home, '.config', 'opencode', 'opencode.json'), 'mcp', 'visual-engine'),
    skill: null, instructions: path.join(home, '.config', 'opencode', 'AGENTS.md') },
];

const report = { generatedAt: new Date().toISOString(), home: '<home>', agents: [] };

for (const c of cases) {
  const row = { agent: c.id, skill: null, instructions: null, mcp: null };
  if (c.skill) {
    const raw = fs.existsSync(c.skill) ? fs.readFileSync(c.skill, 'utf8') : '';
    row.skill = raw
      ? { path: c.skill.replace(home, '<home>'), frontmatter: /^---\nname: visual-engine/.test(raw), visualOnly: /s[oó]lo cuando la tarea produzca o eval[uú]e una salida visual/.test(raw), bytes: raw.length }
      : { path: c.skill.replace(home, '<home>'), missing: true };
  }
  if (c.instructions) {
    const raw = fs.existsSync(c.instructions) ? fs.readFileSync(c.instructions, 'utf8') : '';
    row.instructions = raw
      ? { path: c.instructions.replace(home, '<home>'), referenceFirst: /Reference First|Regla cero/.test(raw), professionalDefault: /professional/.test(raw), bytes: raw.length }
      : { path: c.instructions.replace(home, '<home>'), missing: true };
  }
  if (c.mcp) {
    try {
      const entry = c.mcp();
      const hs = await handshake(entry);
      row.mcp = { ...hs, env: entry.env, command: path.basename(entry.command) };
    } catch (e) {
      row.mcp = { ok: false, error: e.message };
    }
  }
  report.agents.push(row);
}

fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf8');
for (const a of report.agents) {
  const mcp = a.mcp ? (a.mcp.ok ? `MCP ok · ${a.mcp.tools} herramientas` : `MCP FALLA · ${a.mcp.error}`) : 'sin MCP (skill)';
  const skill = a.skill ? (a.skill.missing ? 'skill AUSENTE' : `skill ok${a.skill.visualOnly ? ' · sólo visual' : ''}`) : 'sin skill';
  const instr = a.instructions ? (a.instructions.missing ? 'instrucciones ausentes' : 'instrucciones ok') : '';
  console.log(`${a.agent.padEnd(9)} ${mcp.padEnd(28)} ${skill.padEnd(30)} ${instr}`);
}
console.log(`\nJSON: ${outFile}`);
