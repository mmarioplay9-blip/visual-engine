import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { applyEffect, listEffects } from '../dist/core/library.js';
import { validateComposition, renderComposition } from '../dist/core/composition.js';
import { specToComposition, referenceEffects } from '../dist/core/refeffects.js';
import { startGallery } from '../dist/core/gallery.js';
import { visionStatus, ocrImage } from '../dist/core/vision.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('0.3 · biblioteca de 58 efectos en 12 categorías, todos aplicables y sintácticamente válidos', () => {
  const effects = listEffects();
  assert.ok(effects.length >= 58, `solo ${effects.length}`);
  const categories = new Set(effects.map((e) => e.category));
  assert.ok(categories.size >= 12, `categorías ${[...categories].join(', ')}`);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 've-lib03-'));
  for (const effect of effects) {
    const applied = applyEffect(effect.id, { outDir: work });
    assert.ok(applied.files.length >= 2, `${effect.id} sin archivos`);
    for (const file of applied.files.filter((f) => f.endsWith('.js'))) {
      const src = fs.readFileSync(file, 'utf8');
      assert.ok(!src.includes('{{'), `${effect.id}: placeholder en ${file}`);
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    }
  }
});

function fixtureSpec() {
  return {
    version: '0.2',
    source: 'prueba-real.mp4',
    createdAt: new Date().toISOString(),
    canvas: { width: 960, height: 540, aspect: 1.777, fps: 30, duration: 4 },
    palette: [
      { hex: '#05070d', share: 0.6, role: 'fondo/base' },
      { hex: '#12e0c8', share: 0.25, role: 'acento' },
      { hex: '#ffb454', share: 0.15, role: 'apoyo' },
    ],
    composition: null,
    typography: { lines: [{ heightRatio: 0.08, heightPx: 43, role: 'titular', confidence: 0.9, status: 'verified', text: 'VISUAL ENGINE' }], note: 'OCR', engine: 'tesseract' },
    text: { available: true, engine: 'tesseract', content: 'VISUAL ENGINE', lines: [{ text: 'VISUAL ENGINE', confidence: 96, box: [10, 10, 300, 50] }], note: 'OCR real' },
    scenes: [{ index: 0, start: 0, end: 4, duration: 4, luma: 0.1, motion: 0.02, label: 'plano' }],
    layers: [],
    camera: { direction: 'paneo derecha', shiftX: 0.02, shiftY: 0, speed: 0.08, zoom: 1, rotationDeg: 0, acceleration: 0, shake: 0, verifiedPairs: '3/4', transitions: [] },
    effects: [
      { id: 'glow', label: 'glow', status: 'verified', confidence: 0.82, params: { intensidad: 0.7, radioPx: 24 }, technology: 'CSS', hint: 'halo' },
      { id: 'particles', label: 'partículas', status: 'estimated', confidence: 0.55, params: { cantidad: 80 }, technology: 'Canvas', hint: 'motas' },
    ],
    implementation: { stack: ['CSS'], steps: [] },
    verification: { metrics: [], targets: {}, temporalScoreTarget: 75 },
    limitations: [],
  };
}

test('0.3 · composición JSON: valida, rechaza errores y renderiza assets reales', () => {
  const spec = fixtureSpec();
  const built = specToComposition(spec);
  assert.ok(built.composition.layers.length >= 2);
  assert.ok(built.mapping.some((m) => m.status === 'estimated'));
  assert.ok(built.mapping.every((m) => m.note.length > 10));
  const valid = validateComposition(built.composition);
  assert.equal(valid.ok, true, valid.errors.join('; '));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-comp03-'));
  const rendered = renderComposition(built.composition, { outDir: out });
  const html = fs.readFileSync(rendered.html, 'utf8');
  assert.match(html, /__veComposition/);
  assert.match(html, /assets\/effects/);
  assert.ok(fs.existsSync(rendered.config));
  assert.ok(rendered.assets.length >= 3);
  assert.ok(rendered.effects.includes('anamorphic-bloom'));

  const bad = validateComposition({ ...built.composition, layers: [{ id: 'x', effect: 'no-existe' }] });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /desconocido/.test(e)));
});

test('0.3 · Reference-to-Effects produce composición, timeline y código sin fingir identificación', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-ref03-'));
  const r = referenceEffects({ spec: fixtureSpec(), outDir: out });
  assert.ok(r.rendered);
  assert.ok(fs.existsSync(r.rendered.html));
  assert.ok(r.composition.provenance?.mapping?.length >= 2);
  assert.ok(r.composition.provenance.warnings.some((w) => /estimad|hipótesis|no se afirma/i.test(w)));
  assert.ok(r.composition.layers.some((l) => l.tracks.length > 0));
  assert.ok(r.composition.layers.some((l) => l.mask));
});

test('0.3 · galería local sirve 58 efectos, preview y composición', async () => {
  const gallery = await startGallery({ port: 0 });
  try {
    const effects = await (await fetch(gallery.url + 'api/effects')).json();
    assert.ok(effects.length >= 58);
    const preview = await fetch(gallery.url + 'preview/dust-motes/');
    assert.equal(preview.status, 200);
    assert.match(await preview.text(), /effect\.js/);
    const comp = { ...specToComposition(fixtureSpec()).composition, duration: 3 };
    const res = await fetch(gallery.url + 'api/compose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(comp) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.url, /^\/compositions\/.+\/index\.html$/);
    const html = await fetch(gallery.url + data.url.replace(/^\//, ''));
    assert.equal(html.status, 200);
  } finally {
    await gallery.close();
  }
});

test('0.3 · Tesseract OCR lee texto real y declara hardware/modelo', async () => {
  const status = await visionStatus();
  assert.ok(status.hardware.ramTotalGb > 1);
  assert.ok(status.hardware.source.length > 0);
  if (!status.tesseract.available) {
    console.log('OCR omitido: Tesseract no disponible');
    return;
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-ocr03-'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 400 } });
  await page.setContent('<body style="margin:0;background:#05070d;color:#fff;font:800 64px sans-serif;display:grid;place-items:center;height:100vh">VISUAL ENGINE</body>');
  const file = path.join(out, 'ocr.png');
  await page.screenshot({ path: file });
  await browser.close();
  const ocr = await ocrImage(file);
  assert.equal(ocr.available, true, ocr.reason);
  assert.match((ocr.text || '').toUpperCase(), /VISUAL\s+ENGINE/);
  assert.ok((ocr.lines?.[0]?.confidence ?? 0) > 50);
});

test('0.3 · benchmarks medidos existen y cubren los 58 efectos', () => {
  const file = path.join(root, 'library', 'benchmarks.json');
  assert.ok(fs.existsSync(file), 'falta library/benchmarks.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(data.effects.length >= 58);
  assert.ok(data.summary.ok >= 57, `solo ${data.summary.ok}`);
  assert.ok(data.summary.medianFps > 0);
  const circuit = data.effects.find((e) => e.id === 'circuit-lines');
  assert.ok(circuit && circuit.fps > 0);
});
