import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'cli', 'index.js');
const refs = path.join(root, 'demo', 'reference', '0.2');
const ref = (name) => path.join(refs, name);

const requiredRefs = ['premium-ui.mp4', 'premium-ui-alt.mp4', 'motion-graphics.mp4', 'depth-3d.mp4', 'camera-pan.mp4', 'camera-zoom.mp4'];
if (!requiredRefs.every((f) => fs.existsSync(ref(f)))) {
  execFileSync(process.execPath, [path.join(root, 'demo', 'make-refs-0.2.mjs')], { cwd: root, stdio: 'ignore' });
}

const load = (p) => import(pathToFileURL(path.join(root, 'dist', 'core', p)).href);
const { opTimeline, opCamera, opInspect, opDetectEffects, opSpec, opTemporal, opVision, opIterate, opBackups, opRestoreBackup } = await load('advanced.js');
const { recommendAndCheck, recommendationCatalog } = await load('recommend.js');
const { restoreIteration } = await load('iterate.js');
const { startApi } = await import(pathToFileURL(path.join(root, 'dist', 'api', 'server.js')).href);

const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function runCli(args) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test('timeline: escenas, cortes, fotogramas clave y storyboard real', async () => {
  const out = tmp('ve-timeline-');
  const r = await opTimeline({ path: ref('motion-graphics.mp4'), samples: 24, outDir: out, storyboard: true });
  const tl = r.timeline;
  assert.equal(tl.cuts.length, 2, `cortes: ${tl.cuts.join(',')}`);
  assert.ok(Math.abs(tl.cuts[0] - 0.8) < 0.2, `primer corte ${tl.cuts[0]}`);
  assert.ok(Math.abs(tl.cuts[1] - 1.6) < 0.2, `segundo corte ${tl.cuts[1]}`);
  assert.equal(tl.scenes.length, 3, `escenas ${tl.scenes.length}`);
  assert.ok(tl.keyframes.some((k) => k.reason === 'corte'));
  assert.ok(r.json && fs.existsSync(r.json));
  assert.ok(r.storyboard.length >= 3);
  for (const f of r.storyboard) {
    const sig = fs.readFileSync(f).subarray(0, 8);
    assert.deepEqual([...sig], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${f} no es PNG`);
  }
  console.log(`timeline · cortes ${tl.cuts.map((c) => c.toFixed(2)).join(', ')} · ${tl.scenes.length} escenas · ${r.storyboard.length} claves`);
});

test('camera: mide paneo y zoom con confianza y estado', async () => {
  const pan = await opCamera({ path: ref('camera-pan.mp4') });
  assert.ok(pan.camera.summary.shiftX > 0.01, `paneo ${pan.camera.summary.shiftX}`);
  assert.equal(pan.camera.summary.shiftY, 0);
  assert.ok(pan.camera.summary.verifiedPairs >= 3, `verificados ${pan.camera.summary.verifiedPairs}`);

  const zoom = await opCamera({ path: ref('camera-zoom.mp4') });
  assert.ok(zoom.camera.summary.zoom > 1.02, `zoom ${zoom.camera.summary.zoom}`);
  assert.ok(zoom.camera.summary.zoom < 1.15, `zoom irreal ${zoom.camera.summary.zoom}`);
  for (const p of pan.camera.pairs) assert.ok(['verified', 'estimated'].includes(p.status));
  console.log(`camera · paneo ${(pan.camera.summary.shiftX * 100).toFixed(1)}%/paso · zoom ${zoom.camera.summary.zoom}`);
});

test('inspect: composición, círculo real, líneas de texto y profundidad declarada', async () => {
  const r = await opInspect({ path: ref('premium-ui.mp4') });
  const c = r.content;
  assert.ok(c.composition.balanceHorizontal > 0.5);
  assert.ok(c.composition.symmetryHorizontal > 0.5);
  assert.equal(c.depth.status, 'estimated');
  assert.equal(c.depth.layers.length, 3);
  const circle = c.shapes.find((s) => s.type === 'círculo' && s.r >= 15);
  assert.ok(circle, `círculos: ${c.shapes.map((s) => `${s.type}:${s.r}`).join(',')}`);
  assert.ok(circle.verified);
  assert.ok(c.textLines.length >= 1, 'debe localizar el titular LUMEN');
  const title = c.textLines[0];
  assert.ok(title.y0 / c.height > 0.6 && title.y0 / c.height < 0.8, `y del titular ${title.y0 / c.height}`);
  assert.equal(title.status, 'estimated');
  assert.equal(c.ocr.available, false);
  console.log(`inspect · texto ${title.x0}-${title.x1} y ${title.y0}-${title.y1} · círculo r=${circle.r}`);
});

test('effects: partículas medidas y glow/iluminación en la interfaz', async () => {
  const motion = await opDetectEffects({ path: ref('motion-graphics.mp4'), samples: 10 });
  const ids = motion.report.effects.map((e) => e.id);
  assert.ok(ids.includes('particles'), `efectos: ${ids.join(',')}`);
  const particles = motion.report.effects.find((e) => e.id === 'particles');
  assert.equal(particles.status, 'verified');
  assert.ok(Number(particles.evidence.movedFraction) > 0.3, JSON.stringify(particles.evidence));

  const ui = await opDetectEffects({ path: ref('premium-ui.mp4'), samples: 8 });
  const uiIds = ui.report.effects.map((e) => e.id);
  assert.ok(uiIds.includes('glow'), `efectos UI: ${uiIds.join(',')}`);
  assert.ok(uiIds.includes('lighting'), `efectos UI: ${uiIds.join(',')}`);
  assert.ok(!uiIds.includes('blur'), `falso desenfoque: ${JSON.stringify(ui.report.signals)}`);
  for (const e of [...motion.report.effects, ...ui.report.effects]) {
    assert.ok(e.confidence >= 0 && e.confidence <= 1);
    assert.ok(['verified', 'estimated'].includes(e.status));
    assert.ok(Object.keys(e.evidence).length > 0);
  }
  console.log(`effects · motion [${ids.join(', ')}] · UI [${uiIds.join(', ')}]`);
});

test('3D: parallax medido y capas de profundidad en el clip con bokeh', async () => {
  const r = await opDetectEffects({ path: ref('depth-3d.mp4'), samples: 8 });
  const ids = r.report.effects.map((e) => e.id);
  assert.ok(ids.includes('parallax'), `efectos 3D: ${ids.join(',')}`);
  const parallax = r.report.effects.find((e) => e.id === 'parallax');
  assert.equal(parallax.status, 'estimated');
  const inspect = await opInspect({ path: ref('depth-3d.mp4') });
  assert.equal(inspect.content.depth.layers.length, 3);
  assert.ok(inspect.content.depth.layers[0].sharpness < inspect.content.depth.layers[2].sharpness);
  console.log(`3D · efectos [${ids.join(', ')}] · capas ${inspect.content.depth.layers.map((l) => l.sharpness).join('/')}`);
});

test('spec: escenas, efectos, stack y verificación escritos a disco', async () => {
  const out = tmp('ve-spec-');
  const r = await opSpec({ path: ref('motion-graphics.mp4'), samples: 14, outDir: out });
  assert.ok(r.spec.scenes.length >= 3, `escenas ${r.spec.scenes.length}`);
  assert.ok(r.spec.effects.length >= 2);
  assert.ok(r.spec.implementation.stack.length >= 2);
  assert.ok(r.spec.palette.some((c) => c.role === 'acento'));
  assert.ok(r.spec.camera);
  assert.ok(fs.existsSync(r.paths.json));
  assert.ok(fs.existsSync(r.paths.md));
  const md = fs.readFileSync(r.paths.md, 'utf8');
  assert.match(md, /Especificación visual/);
  assert.match(md, /## Efectos detectados/);
  assert.match(md, /## Verificación/);
  const json = JSON.parse(fs.readFileSync(r.paths.json, 'utf8'));
  assert.equal(json.effects.length, r.spec.effects.length);
  console.log(`spec · ${r.spec.scenes.length} escenas · ${r.spec.effects.length} efectos · ${r.spec.implementation.stack.join(' + ')}`);
});

test('recommend: snippets JS válidos para todos los efectos', async () => {
  const catalog = recommendationCatalog();
  assert.equal(catalog.length, 10);
  for (const id of catalog) {
    const rec = recommendAndCheck(id);
    assert.ok(rec.tech.length > 3, `${id} sin tecnología`);
    assert.ok(rec.snippets.length >= 1, `${id} sin código`);
    assert.equal(rec.checked, true, `${id}: ${rec.checkOutput}`);
  }
  console.log(`recommend · ${catalog.length} efectos con snippets comprobados`);
});

test('temporal: compara dos clips y separa las seis dimensiones', async () => {
  const out = tmp('ve-temporal-');
  const r = await opTemporal({ reference: ref('premium-ui.mp4'), candidate: ref('premium-ui-alt.mp4'), samples: 10, outDir: out });
  assert.ok(r.score > 40 && r.score <= 100, `puntuación ${r.score}`);
  assert.ok(r.quality.dimensions.length >= 12, `dimensiones ${r.quality.dimensions.length}`);
  assert.equal(r.quality.dimensions.find((d) => d.id === 'performance').available, false);
  assert.ok(r.quality.dimensions.filter((d) => d.available).length >= 5);
  assert.ok(r.report && fs.existsSync(r.report.md));
  assert.ok(r.samples >= 6);
  console.log(`temporal · ${r.score.toFixed(1)} (${r.grade}) · calidad ${r.quality.overall.toFixed(1)}`);
});

test('iterate: revierte si empeora, conserva con --keep y restaura la copia', async () => {
  const project = tmp('ve-iterate-');
  const target = path.join(project, 'index.html');
  const baseline = `<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#05070d;color:#eaf3ff;font-family:system-ui">
<h1 style="font-size:56px;letter-spacing:.08em">LUMEN</h1></body></html>`;
  fs.writeFileSync(target, baseline);
  const hash = sha(target);
  const worse = `<!doctype html><html><body style="margin:0;height:100vh;background:#ffffff;color:#ff0000;font-family:serif">
<p style="font-size:12px">otra cosa</p></body></html>`;
  fs.writeFileSync(path.join(project, 'peor.html'), worse);

  const common = {
    projectDir: project,
    target: 'index.html',
    reference: ref('premium-ui.mp4'),
    width: 360,
    height: 640,
    frames: 3,
    intervalMs: 250,
  };
  const first = await opIterate({ ...common, replaceFile: 'peor.html' });
  assert.equal(first.status, 'reverted', first.message);
  assert.equal(sha(target), hash, 'el archivo debe quedar idéntico tras revertir');
  assert.ok(first.report.md && fs.existsSync(first.report.md));

  const second = await opIterate({ ...common, replaceFile: 'peor.html', keep: true });
  assert.equal(second.status, 'kept', second.message);
  assert.notEqual(sha(target), hash);

  const list = opBackups(project);
  assert.ok(list.length >= 2);
  const restored = restoreIteration(project, first.id);
  assert.ok(restored.restored.length >= 1);
  assert.equal(sha(target), hash, 'restore debe devolver el original');
  console.log(`iterate · revirtió ${first.before.score.toFixed(1)} → ${first.after.score.toFixed(1)} · backups ${list.length}`);
});

test('vision: informa herramientas locales sin fingir modelos', async () => {
  const r = await opVision({ action: 'status' });
  assert.equal(typeof r.status.tesseract.available, 'boolean');
  assert.equal(typeof r.status.ollama.available, 'boolean');
  assert.ok(Array.isArray(r.status.ollama.models));
  assert.ok(Array.isArray(r.status.ollama.visionModels));
  assert.ok(r.description.length >= 2);
  console.log(`vision · tesseract ${r.status.tesseract.available ? 'sí' : 'no'} · ollama ${r.status.ollama.available ? `sí (${r.status.ollama.models.length} modelos, ${r.status.ollama.visionModels.length} de visión)` : 'no'}`);
});

test('CLI: timeline, recommend y vision responden', () => {
  const out = tmp('ve-cli2-');
  const tl = runCli(['timeline', ref('motion-graphics.mp4'), '--samples', '14', '--json']);
  assert.equal(tl.code, 0, tl.stderr);
  const parsed = JSON.parse(tl.stdout);
  assert.equal(parsed.timeline.scenes.length, 3);

  const rec = runCli(['recommend', '--effect', 'particles', '--out', out]);
  assert.equal(rec.code, 0, rec.stderr);
  assert.ok(fs.existsSync(path.join(out, 'particles', 'particles.mjs')));

  const vision = runCli(['vision', 'status', '--json']);
  assert.equal(vision.code, 0, vision.stderr);
  assert.ok(JSON.parse(vision.stdout).status);
});

test('API: expone timeline, detección y visión', async (t) => {
  const api = await startApi({ port: 0 });
  t.after(() => api.close());
  const post = (route, body) => fetch(`${api.url}${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  const tl = await post('/v1/timeline', { path: ref('motion-graphics.mp4'), samples: 14 });
  const tlText = await tl.text();
  assert.equal(tl.status, 200, tlText);
  assert.equal(JSON.parse(tlText).timeline.scenes.length, 3);

  const fx = await post('/v1/effects/detect', { path: ref('premium-ui.mp4'), samples: 6 });
  const fxText = await fx.text();
  assert.equal(fx.status, 200, fxText);
  assert.ok(JSON.parse(fxText).report.effects.length >= 1);

  const vision = await fetch(`${api.url}/v1/vision/status`);
  assert.equal(vision.status, 200);

  const blocked = await post('/v1/iterate', { target: 'index.html', reference: ref('premium-ui.mp4') });
  assert.equal(blocked.status, 400);
  assert.match((await blocked.json()).error, /confirm=true/);
});

test('MCP: las nuevas herramientas están expuestas y responden', async (t) => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const transport = new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'], cwd: root, stderr: 'pipe' });
  const client = new Client({ name: 'visual-engine-advanced-test', version: '0.2.0' });
  await client.connect(transport);
  t.after(() => client.close());

  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name);
  for (const required of ['visual_timeline', 'visual_camera', 'visual_inspect', 'visual_effects_detect', 'visual_spec', 'visual_recommend', 'visual_temporal', 'visual_vision', 'visual_iterate', 'visual_backup']) {
    assert.ok(names.includes(required), `falta ${required}`);
  }
  const cam = await client.callTool({ name: 'visual_camera', arguments: { path: ref('camera-pan.mp4'), samples: 8 } });
  const parsed = JSON.parse(cam.content[0].text);
  assert.ok(parsed.camara.summary.shiftX > 0.01);
});
