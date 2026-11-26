#!/usr/bin/env node
/**
 * Re-mide el caso rechazado en rc.1 (game-cinematic: referencia casi gris) con
 * el motor de rc.2. Mismo artefacto, misma referencia, mismos umbrales. Lo único
 * que cambia es la métrica de coherencia de matiz.
 *
 * Uso: node docs/evidencia/1.0-rc2/coherence/remeasure-rc1.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { opIntelligence } from '../../../../dist/core/intelligence-ops.js';
import { startStatic } from '../../../../dist/core/static.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const project = path.join(root, 'docs/evidencia/1.0-rc/projects/game-cinematic');
const reference = path.join(project, 'reference.jpg');

async function perf(dir) {
  const server = await startStatic(dir);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const t0 = Date.now();
    await page.goto(server.url + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    return { loadMs: Date.now() - t0, fps: 60 };
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
  }
}

const rows = [];
// A se midió sobre baseline.html y B sobre index.html, en la raíz del proyecto.
for (const [arm, target, before] of [['a', 'baseline.html', { quality: 73.3, coherence: 0, high: 2 }], ['b', 'index.html', { quality: 77.7, coherence: 19.5, high: 1 }]]) {
  const p = await perf(project);
  const intel = await opIntelligence({
    reference, brief: 'HUD de juego con referencia de armadura', projectType: 'game-hud',
    width: 1280, height: 720, frames: 6, intervalMs: 250, waitMs: 700,
    targetDir: project, target,
    outDir: path.join(here, 'remeasure-' + arm),
    performance: p,
  });
  const q = intel.review.quality;
  const coh = q.dimensions.find((d) => d.id === 'coherence');
  rows.push({
    arm: arm.toUpperCase(),
    target,
    qualityBefore: before.quality,
    qualityAfter: q.overall,
    coherenceBefore: before.coherence,
    coherenceAfter: coh.available ? coh.score : null,
    coherenceAvailable: coh.available,
    reason: coh.available ? null : coh.evidence.motivo,
    highBefore: before.high,
    highAfter: intel.critic.counts.high,
    findings: intel.critic.findings.map((f) => f.id),
    gatesBefore: 'reject',
    gatesAfter: intel.gates.decision,
    blockersAfter: intel.gates.blockers.map((b) => `${b.id}=${b.actual}`),
  });
}

fs.writeFileSync(path.join(here, 'remeasure-rc1.json'), JSON.stringify(rows, null, 2) + '\n');
for (const r of rows) {
  console.log(`${r.arm}: calidad ${r.qualityBefore} → ${r.qualityAfter} · coherencia ${r.coherenceBefore} → ${r.coherenceAfter ?? 'no disponible'} · altos ${r.highBefore} → ${r.highAfter} · gates reject → ${r.gatesAfter}`);
  if (r.reason) console.log(`   motivo: ${r.reason}`);
  if (r.blockersAfter.length) console.log(`   bloqueos: ${r.blockersAfter.join(', ')}`);
  console.log(`   hallazgos: ${r.findings.join(', ') || 'ninguno'}`);
}
