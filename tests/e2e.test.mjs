import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'cli', 'index.js');
const reference = path.join(root, 'demo', 'reference', 'brand-intro.mp4');
const site = path.join(root, 'demo', 'site');

function review(target, out) {
  const r = spawnSync(process.execPath, [
    cli, 'review',
    '--reference', reference,
    '--target-dir', site,
    '--target', target,
    '--width', '540',
    '--height', '960',
    '--frames', '6',
    '--interval', '380',
    '--out', out,
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  return JSON.parse(fs.readFileSync(path.join(out, 'review.json'), 'utf8'));
}

test('E2E: la mejora aplicada sube la fidelidad de forma medible', () => {
  const baseOut = fs.mkdtempSync(path.join(os.tmpdir(), 've-e2e-base-'));
  const finalOut = fs.mkdtempSync(path.join(os.tmpdir(), 've-e2e-final-'));

  const baseline = review('baseline.html', baseOut);
  const improved = review('index.html', finalOut);

  assert.ok(baseline.score > 30 && baseline.score < 95, `línea base ${baseline.score}`);
  assert.ok(improved.score >= 75, `versión final ${improved.score}`);
  assert.ok(improved.score > baseline.score + 5, `sin mejora: ${baseline.score} → ${improved.score}`);

  assert.equal(improved.target.consoleErrors.length, 0, 'la demo no debe tener errores JS');
  assert.ok(fs.existsSync(path.join(finalOut, 'report.md')));
  assert.ok(fs.existsSync(path.join(finalOut, 'diff', 'heatmap.png')));
  assert.ok(improved.image.ssim > 0.2);
  assert.ok(improved.comparison.recommendations.length > 0);

  console.log(`E2E · línea base ${baseline.score.toFixed(1)} → final ${improved.score.toFixed(1)} (${improved.grade})`);
});
