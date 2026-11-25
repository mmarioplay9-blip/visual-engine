import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const importDist = (p) => import(pathToFileURL(path.join(root, 'dist', 'core', p)).href);

const { metricsFromRgb, paletteFromHist, analyzeFile, composeProfile } = await importDist('analysis.js');
const { probe, rgbToPng, sampleFrames } = await importDist('media.js');
const { compareProfiles, compareImages } = await importDist('compare.js');
const { runNpm, npmCliPath } = await importDist('deps.js');

const reference = path.join(root, 'demo', 'reference', 'brand-intro.mp4');
if (!fs.existsSync(reference)) {
  execFileSync(process.execPath, [path.join(root, 'demo', 'make-reference.mjs')], { cwd: root, stdio: 'ignore' });
}

function solid(w, h, rgb) {
  const buf = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    buf[i * 3] = rgb[0];
    buf[i * 3 + 1] = rgb[1];
    buf[i * 3 + 2] = rgb[2];
  }
  return buf;
}

test('metricsFromRgb mide color sólido y contraste real', () => {
  const black = metricsFromRgb(solid(32, 32, [0, 0, 0]), 32, 32);
  assert.equal(black.metrics.luma, 0);
  assert.equal(black.metrics.contrast, 0);
  assert.equal(black.metrics.darkRatio, 1);

  const buf = Buffer.alloc(32 * 32 * 3);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const v = x < 16 ? 0 : 255;
      const o = (y * 32 + x) * 3;
      buf[o] = buf[o + 1] = buf[o + 2] = v;
    }
  }
  const half = metricsFromRgb(buf, 32, 32);
  assert.ok(Math.abs(half.metrics.luma - 0.5) < 0.02, `luma ${half.metrics.luma}`);
  assert.ok(half.metrics.contrast > 0.45, `contraste ${half.metrics.contrast}`);
  assert.ok(half.metrics.edgeDensity > 0.01, 'debe detectar el borde central');
});

test('paletteFromHist devuelve el dominante y suma 1', () => {
  const { hist } = metricsFromRgb(solid(16, 16, [18, 224, 200]), 16, 16);
  const palette = paletteFromHist(hist, 3);
  assert.equal(palette.length, 1);
  // La paleta cuantiza a bins de 4 bits: se tolera el centro del bin.
  assert.ok(Math.abs(palette[0].rgb[0] - 18) <= 8, `rojo ${palette[0].rgb[0]}`);
  assert.ok(Math.abs(palette[0].rgb[1] - 224) <= 8, `verde ${palette[0].rgb[1]}`);
  assert.ok(Math.abs(palette[0].rgb[2] - 200) <= 8, `azul ${palette[0].rgb[2]}`);
  const share = palette.reduce((a, c) => a + c.share, 0);
  assert.ok(Math.abs(share - 1) < 0.01);
});

test('probe lee metadatos reales de la referencia', async () => {
  const info = await probe(reference);
  assert.equal(info.kind, 'video');
  assert.equal(info.width, 540);
  assert.equal(info.height, 960);
  assert.equal(info.fps, 30);
  assert.ok(Math.abs(info.duration - 3) < 0.2, `duración ${info.duration}`);
  assert.equal(info.frames, 90);
});

test('analyzeFile mide paleta, movimiento y los dos cortes de la referencia', async () => {
  const p = await analyzeFile(reference, { samples: 12 });
  assert.equal(p.kind, 'video');
  assert.ok(p.palette.length >= 3);
  const teal = p.palette.some((c) => c.rgb[1] > c.rgb[0] * 1.2 && c.rgb[1] > 60);
  assert.ok(teal, `paleta sin turquesa: ${p.palette.map((c) => c.hex).join(',')}`);
  assert.ok(p.motion > 0.01, `movimiento ${p.motion}`);
  assert.equal(p.cuts.length, 2, `cortes detectados: ${p.cuts.join(',')}`);
  assert.ok(Math.abs(p.cuts[0] - 1) < 0.2);
  assert.ok(Math.abs(p.cuts[1] - 2) < 0.2);
  assert.ok(p.pace > 10);
});

test('compareProfiles es determinista y da 100 a perfiles idénticos', async () => {
  const p = await analyzeFile(reference, { samples: 8 });
  const same = compareProfiles(p, p);
  assert.equal(same.score, 100);
  assert.equal(same.grade, 'A');
  assert.equal(same.palette.meanDeltaE, 0);

  const other = composeProfile(
    [{ t: 0, width: 4, height: 4, rgb: solid(4, 4, [240, 240, 240]) }],
    { kind: 'image', width: 4, height: 4, source: 'blanco' },
  );
  const diff = compareProfiles(p, other);
  assert.ok(diff.score < 60, `puntuación inesperada ${diff.score}`);
  assert.ok(diff.recommendations.length >= 3);
  assert.ok(diff.summary.includes('Fidelidad'));
});

test('compareImages: idénticas = SSIM 1 y mapa de calor PNG real', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-img-'));
  const [sample] = await sampleFrames(reference, { count: 1, width: 96, height: 170 });
  const a = await rgbToPng(sample.rgb, sample.width, sample.height, path.join(out, 'a.png'));
  const b = await rgbToPng(sample.rgb, sample.width, sample.height, path.join(out, 'b.png'));

  const same = await compareImages(a, b, { width: 96, height: 170, outDir: out });
  assert.equal(same.ssim, 1);
  assert.equal(same.mae, 0);
  assert.equal(same.score, 100);

  // Imagen invertida: debe empeorar de forma medible.
  const inverted = Buffer.from(sample.rgb.map((v) => 255 - v));
  const c = await rgbToPng(inverted, sample.width, sample.height, path.join(out, 'c.png'));
  const diff = await compareImages(a, c, { width: 96, height: 170, outDir: path.join(out, 'diff') });
  assert.ok(diff.ssim < 0.2, `SSIM ${diff.ssim}`);
  assert.ok(diff.mae > 0.5, `MAE ${diff.mae}`);
  assert.ok(diff.score < 30);
  const head = fs.readFileSync(diff.heatmap).subarray(0, 8);
  assert.deepEqual([...head], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'el mapa de calor debe ser PNG');
});

test('runNpm lanza npm sin shell y responde', async () => {
  const r = await runNpm(['--version'], root, 60_000);
  assert.equal(r.ok, true, r.stderr);
  assert.match(r.stdout.toString().trim(), /^\d+\.\d+\.\d+/, `versión inesperada: ${r.stdout}`);
  if (process.platform === 'win32') assert.ok(npmCliPath(), 'debe encontrar npm-cli.js junto a Node');
});

test('analyzeFile rechaza archivos inexistentes con error claro', async () => {
  await assert.rejects(() => analyzeFile(path.join(root, 'no-existe.mp4')), /No existe el archivo/);
});
