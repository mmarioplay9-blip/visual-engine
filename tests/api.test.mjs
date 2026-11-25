import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { startApi } = await import(pathToFileURL(path.join(root, 'dist', 'api', 'server.js')).href);
const reference = path.join(root, 'demo', 'reference', 'brand-intro.mp4');

test('API local responde health, efectos, análisis y captura', async (t) => {
  const api = await startApi({ port: 0 });
  t.after(() => api.close());

  const health = await (await fetch(`${api.url}/v1/health`)).json();
  assert.equal(health.ok, true);
  assert.equal(health.name, 'visual-engine');
  assert.equal(health.install, 'bloqueado');

  const caps = await (await fetch(`${api.url}/v1/capabilities`)).json();
  assert.ok(caps.implementado.length >= 8);
  assert.ok(caps.pendiente.length >= 3);

  const effects = await (await fetch(`${api.url}/v1/effects`)).json();
  assert.ok(effects.length >= 58, `sólo ${effects.length} efectos`);

  const single = await fetch(`${api.url}/v1/effects/glass-hud`);
  assert.equal(single.status, 200);
  const detail = await single.json();
  assert.equal(detail.category, 'interfaz');

  const missing = await fetch(`${api.url}/v1/effects/no-existe`);
  assert.equal(missing.status, 404);

  const analyze = await fetch(`${api.url}/v1/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paths: [reference], samples: 6 }),
  });
  const analyzeText = await analyze.text();
  assert.equal(analyze.status, 200, analyzeText);
  const analyzed = JSON.parse(analyzeText);
  assert.equal(analyzed[0].profile.cuts.length, 2);

  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-api-'));
  const capture = await fetch(`${api.url}/v1/capture`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'index.html', serveDir: path.join(root, 'demo', 'site'), width: 400, height: 711, frames: 2, outDir: path.join(out, 'cap') }),
  });
  const captureText = await capture.text();
  assert.equal(capture.status, 200, captureText);
  const cap = JSON.parse(captureText);
  assert.equal(cap.ok, true, JSON.stringify(cap.consoleErrors));
  assert.equal(cap.frames.length, 2);
  assert.ok(fs.existsSync(cap.frames[0]));

  const blocked = await fetch(`${api.url}/v1/deps/install`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packages: ['gsap'], confirm: true }),
  });
  assert.equal(blocked.status, 400);
  const blockedBody = await blocked.json();
  assert.match(blockedBody.error, /allow-install/);

  const invalid = await fetch(`${api.url}/v1/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{no es json',
  });
  assert.equal(invalid.status, 400);
});

test('API review ejecuta el ciclo completo y escribe informe', async (t) => {
  const api = await startApi({ port: 0 });
  t.after(() => api.close());
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-api-review-'));

  const res = await fetch(`${api.url}/v1/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      reference,
      targetDir: path.join(root, 'demo', 'site'),
      target: 'index.html',
      width: 400,
      height: 711,
      frames: 3,
      outDir: out,
    }),
  });
  const resText = await res.text();
  assert.equal(res.status, 200, resText);
  const review = JSON.parse(resText);
  assert.ok(review.score > 40, `puntuación ${review.score}`);
  assert.ok(review.report.md.endsWith('report.md'));
  assert.ok(fs.existsSync(review.report.md));
  assert.ok(fs.existsSync(review.report.json));
  assert.ok(review.heatmap && fs.existsSync(review.heatmap));
  assert.ok(review.comparison.recommendations.length >= 1);
  const json = JSON.parse(fs.readFileSync(review.report.json, 'utf8'));
  assert.equal(json.score, review.score);
});
