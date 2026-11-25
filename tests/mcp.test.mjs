import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

const reference = path.join(root, 'demo', 'reference', 'brand-intro.mp4');
const cli = path.join(root, 'dist', 'cli', 'index.js');

function parse(result) {
  const text = result.content?.[0]?.text ?? '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

test('MCP: listar herramientas y ejecutar doctor, biblioteca y análisis', async (t) => {
  const transport = new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'], cwd: root, stderr: 'pipe' });
  const client = new Client({ name: 'visual-engine-test', version: '0.1.0' });
  await client.connect(transport);
  t.after(() => client.close());

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  for (const required of [
    'visual_doctor', 'visual_analyze', 'visual_extract_frames', 'visual_capture',
    'visual_compare', 'visual_review', 'visual_effects_list', 'visual_effect_apply',
    'visual_adapters', 'visual_scaffold', 'visual_deps_plan', 'visual_install_deps',
  ]) {
    assert.ok(names.includes(required), `falta la herramienta ${required}`);
  }
  for (const tool of tools) assert.ok(tool.description && tool.description.length > 20, `${tool.name} sin descripción útil`);

  const doctor = parse(await client.callTool({ name: 'visual_doctor', arguments: { project: root } }));
  assert.equal(typeof doctor.ready, 'string');
  assert.ok(doctor.tools.find((t) => t.id === 'ffmpeg').disponible);

  const effects = parse(await client.callTool({ name: 'visual_effects_list', arguments: {} }));
  assert.ok(effects.length >= 58, `sólo ${effects.length} efectos`);

  const analysis = parse(await client.callTool({ name: 'visual_analyze', arguments: { paths: [reference], samples: 8 } }));
  assert.equal(analysis[0].perfil.kind, 'video');
  assert.equal(analysis[0].perfil.cuts.length, 2);

  const deps = parse(await client.callTool({ name: 'visual_deps_plan', arguments: { capabilities: ['webgl-3d'] } }));
  assert.ok(deps.plan[0].installed.includes('three'));
});

test('MCP: review completo devuelve puntuación y escribe artefactos', async (t) => {
  const transport = new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'], cwd: root, stderr: 'pipe' });
  const client = new Client({ name: 'visual-engine-test', version: '0.1.0' });
  await client.connect(transport);
  t.after(() => client.close());

  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-mcp-review-'));
  const result = await client.callTool({
    name: 'visual_review',
    arguments: {
      reference,
      targetDir: path.join(root, 'demo', 'site'),
      target: 'index.html',
      width: 400,
      height: 711,
      frames: 3,
      outDir: out,
    },
  });
  assert.ok(!result.isError, result.content?.[0]?.text);
  const review = parse(result);
  assert.ok(review.puntuacion > 40, `puntuación ${review.puntuacion}`);
  assert.ok(fs.existsSync(review.informe.md));
  assert.ok(fs.existsSync(review.mapaDeCalor));
  assert.ok(review.correcciones.length >= 1);

  // Recurso de la biblioteca por URI.
  const resource = await client.readResource({ uri: 'visual://effects' });
  const parsed = JSON.parse(resource.contents[0].text);
  assert.ok(parsed.length >= 58, `solo ${parsed.length} efectos`);
});
