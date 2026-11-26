import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFile } from '../dist/core/analysis.js';
import { evaluateQuality } from '../dist/core/quality.js';
import { critique } from '../dist/core/critic.js';
import { assessFidelity } from '../dist/core/fidelity.js';
import { evaluateGates } from '../dist/core/gates.js';
import { selectSmartEffects } from '../dist/core/smart-effects.js';
import { selectContext, cachedAnalyze } from '../dist/core/context.js';
import { inspectDom } from '../dist/core/debugger.js';
import { runImprovementLoop, restoreLoop } from '../dist/core/loop.js';
import { capture } from '../dist/core/capture.js';
import { listEffects } from '../dist/core/library.js';
import { STYLE_IDS } from '../dist/core/styles.js';
import { SHOWCASE_SPECS } from '../dist/core/showcase.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referenceImage = path.join(root, 'docs/evidencia/0.4/referencia-dominio-publico.jpg');

function fakeQuality(score = 55) {
  const dims = ['fidelity', 'composition', 'hierarchy', 'typography', 'depth', 'lighting', 'coherence', 'transitions', 'performance'];
  return {
    overall: score,
    grade: score >= 85 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : 'D',
    summary: 'fixture',
    weightsUsed: {},
    dimensions: dims.map((id) => ({ id, label: id, score, weight: 0.1, evidence: { fixture: true }, available: true })),
  };
}

function syntheticDom(overrides = {}) {
  return {
    url: 'http://local/',
    title: 'Fixture',
    viewport: { width: 1280, height: 720 },
    reducedMotion: false,
    scroll: { width: 1280, height: 720, overflowX: 0, overflowY: 0 },
    elements: [
      { selector: 'h1', tag: 'h1', role: null, text: 'Título', box: { x: 10, y: 10, width: 500, height: 60 }, region: 'top-left', classes: [], id: null, effects: [], motion: null, contrast: 2.1, styles: { fontSize: 14, fontWeight: 400, boxShadow: 'none', backdropFilter: 'none', filter: 'none', transform: 'none', transition: 'none', animation: 'none', backgroundColor: 'rgb(120,120,120)', color: 'rgb(110,110,110)', fontFamily: 'sans' } },
      { selector: 'p', tag: 'p', role: null, text: 'Texto', box: { x: 10, y: 80, width: 400, height: 40 }, region: 'top-left', classes: [], id: null, effects: [], motion: null, contrast: 2.2, styles: { fontSize: 12, fontWeight: 400, boxShadow: 'none', backdropFilter: 'none', filter: 'none', transform: 'none', transition: 'none', animation: 'none', backgroundColor: 'rgb(120,120,120)', color: 'rgb(110,110,110)', fontFamily: 'sans' } },
      { selector: 'button', tag: 'button', role: null, text: '', box: { x: 10, y: 130, width: 24, height: 24 }, region: 'top-left', classes: [], id: null, effects: [], motion: null, contrast: null, styles: { fontSize: 12, fontWeight: 400, boxShadow: 'none', backdropFilter: 'none', filter: 'none', transform: 'none', transition: 'none', animation: 'none', backgroundColor: 'rgb(0,0,0)', color: 'rgb(0,0,0)', fontFamily: 'sans' } },
    ],
    animations: Array.from({ length: 4 }, (_, i) => ({ name: 'x', target: '.btn', duration: 100, delay: 0, easing: 'linear', iterations: 1, playState: 'running', source: null })),
    canvases: [],
    brokenImages: [],
    buttonsWithoutName: [{ selector: 'button', html: '<button></button>' }],
    imagesWithoutAlt: [{ selector: 'img', src: 'x.png' }],
    consoleErrors: ['pageerror: boom'],
    pageErrors: [],
    requestFailures: [],
    counts: { elements: 3, headings: 1, buttons: 1, links: 0, images: 1, canvases: 0, effects: 0, layers: 0, materials: 0, transitions: 4, animations: 4 },
    contrast: { checked: 10, violations: 4, worst: 2.1, average: 3.2 },
    sourceIndex: { files: 1, bytes: 100, truncated: false },
    warnings: [],
    ...overrides,
  };
}

test('0.5 · Visual Critic produce evidencia, ubicación, gravedad, confianza y corrección', () => {
  const report = critique({
    request: { brief: 'HUD cyberpunk para videojuego', style: 'cyberpunk', projectType: 'game-hud' },
    quality: fakeQuality(52),
    dom: syntheticDom(),
    usedEffects: [],
    expectedEffects: [{ id: 'glitch-slices', confidence: 0.8 }, { id: 'neon-rim', confidence: 0.7 }],
    performance: { fps: 32, p95FrameMs: 44, loadMs: 5200 },
    runtime: { consoleErrors: ['pageerror: boom'] },
  });
  assert.equal(report.version, '0.5');
  assert.ok(report.findings.length >= 8, `hallazgos: ${report.findings.length}`);
  assert.ok(report.counts.critical >= 1);
  assert.ok(report.findings.some((f) => f.category === 'functionality' && f.severity === 'critical'));
  assert.ok(report.findings.some((f) => f.category === 'accessibility'));
  assert.ok(report.findings.some((f) => f.category === 'motion'));
  assert.ok(report.findings.some((f) => f.category === 'effects'));
  assert.ok(report.findings.some((f) => f.category === 'performance'));
  for (const f of report.findings) {
    assert.ok(f.id && f.title, 'sin id/título');
    assert.ok(f.evidence.length > 0, `${f.id}: sin evidencia`);
    assert.ok(f.location && typeof f.location === 'object', `${f.id}: sin ubicación`);
    assert.ok(f.fix && f.fix.summary, `${f.id}: sin corrección`);
    assert.ok(f.confidence > 0 && f.confidence <= 1, `${f.id}: confianza ${f.confidence}`);
    assert.ok(['critical', 'high', 'medium', 'low'].includes(f.severity));
  }
  assert.match(report.agentTask, /Tarea visual priorizada/);
  assert.match(report.agentTask, /Evidencia/);
  assert.ok(report.artisticJudgment === false);
  assert.ok(report.limitations.some((l) => /humana/i.test(l)));
});

test('0.5 · el crítico no confunde un estilo minimalista con falta de efectos', () => {
  const minimal = critique({
    request: { brief: 'landing minimalista de arquitectura', style: 'minimal-premium', projectType: 'landing' },
    quality: fakeQuality(82),
    dom: syntheticDom({ consoleErrors: [], contrast: { checked: 10, violations: 0, worst: 6, average: 7 }, buttonsWithoutName: [], imagesWithoutAlt: [] }),
    usedEffects: [{ id: 'mesh-gradient' }],
    expectedEffects: [],
  });
  assert.ok(!minimal.findings.some((f) => f.category === 'effects'));
  const decorated = critique({
    request: { brief: 'landing minimalista de arquitectura', style: 'minimal-premium', projectType: 'landing' },
    quality: fakeQuality(82),
    dom: syntheticDom({ consoleErrors: [], contrast: { checked: 10, violations: 0, worst: 6, average: 7 }, buttonsWithoutName: [], imagesWithoutAlt: [] }),
    usedEffects: [{ id: 'starfield-warp' }],
  });
  assert.ok(decorated.findings.some((f) => f.category === 'intent' && /decorativo/i.test(f.title)));
});

test('0.5 · Quality Gates bloquean por defecto un defecto crítico aunque la media sea alta', () => {
  const q = fakeQuality(99);
  const critic = { counts: { critical: 0, high: 0, medium: 0, low: 0 } };
  const goodDom = syntheticDom({ consoleErrors: [], contrast: { checked: 10, violations: 0, worst: 7, average: 8 }, buttonsWithoutName: [], imagesWithoutAlt: [], brokenImages: [] });
  const base = { quality: q, fidelity: { score: 92 }, critic, dom: goodDom, performance: { fps: 60 } };
  const accepted = evaluateGates(base);
  assert.equal(accepted.decision, 'accept');
  assert.equal(accepted.pass, true);
  const critical = evaluateGates({ ...base, critic: { counts: { critical: 1, high: 0, medium: 0, low: 0 } } });
  assert.equal(critical.decision, 'reject');
  assert.equal(critical.pass, false);
  assert.ok(critical.blockers.some((b) => b.id === 'critical-findings'));
  const pending = evaluateGates({ ...base, config: { requireHumanArtApproval: true } });
  assert.equal(pending.decision, 'pending-human');
  assert.equal(pending.pass, false);
  const approved = evaluateGates({ ...base, config: { requireHumanArtApproval: true }, humanApproval: { approved: true, reviewer: 'revisión humana' } });
  assert.equal(approved.decision, 'accept');
  assert.equal(approved.humanApproval.approved, true);
});

test('0.5 · Smart Effects respeta contención, presupuesto y no devuelve los 58', () => {
  const minimal = selectSmartEffects({ brief: 'landing minimalista premium de arquitectura', style: 'minimal-premium' });
  assert.equal(minimal.selected.length <= 1, true, JSON.stringify(minimal.selected.map((e) => e.id)));
  assert.ok(!minimal.selected.some((e) => /starfield|glitch|neon|bokeh|particle/i.test(e.id)));
  assert.ok(minimal.tokenEstimate < 800);
  const cyber = selectSmartEffects({ brief: 'menú cyberpunk de videojuego con glitch', style: 'cyberpunk', maxEffects: 3 });
  assert.ok(cyber.selected.length <= 3);
  assert.ok(cyber.selected.length >= 1);
  assert.ok(cyber.selected.some((e) => e.id === 'glitch-slices' || e.id === 'neon-rim'));
  assert.ok(cyber.antiPatterns.some((a) => /No añadas más de un efecto/i.test(a)));
});

test('0.5 · Reference Fidelity separa estructura de similitud de píxeles', async () => {
  const ref = await analyzeFile(path.join(root, 'library/showcase/lumen/preview.png'), { samples: 1, width: 192 });
  const cand = await analyzeFile(path.join(root, 'library/showcase/orbital/preview.png'), { samples: 1, width: 192 });
  const quality = evaluateQuality(ref, cand);
  const fidelity = assessFidelity({ reference: ref, candidate: cand, quality });
  assert.equal(fidelity.version, '0.5');
  assert.ok(Number.isFinite(fidelity.pixelSimilarity));
  assert.ok(fidelity.pixelSimilarity >= 0 && fidelity.pixelSimilarity <= 100);
  assert.ok(fidelity.dimensions.some((d) => d.id === 'composition' && d.score !== null));
  assert.ok(fidelity.dimensions.some((d) => d.id === 'layout' && d.status === 'verified'));
  assert.equal(fidelity.dimensions.some((d) => d.id === 'pixels'), false);
  assert.match(fidelity.structuralVsPixel, /No son intercambiables/);
  assert.ok(fidelity.warnings.some((w) => /píxeles/i.test(w)));
});

test('0.5 · contexto selectivo limita herramientas y caché reutiliza el análisis', async () => {
  const ctx = selectContext('depurar overflow y contraste en una landing', { maxTools: 4, maxRecipes: 2 });
  assert.equal(ctx.kind, 'debug');
  assert.ok(ctx.tools.length <= 4);
  assert.ok(ctx.recipes.length <= 2);
  assert.ok(ctx.estimatedTokens < 800);
  assert.ok(ctx.tools.some((t) => t.name === 'visual_debug'));
  assert.ok(ctx.limits.some((l) => /caracteres\/4/.test(l)));
  assert.ok(fs.existsSync(referenceImage), 'falta la referencia de prueba');
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 've-cache05-'));
  const first = await cachedAnalyze(referenceImage, { samples: 1, width: 128 }, cacheDir);
  const second = await cachedAnalyze(referenceImage, { samples: 1, width: 128 }, cacheDir);
  assert.equal(first.cache, 'miss');
  assert.equal(second.cache, 'hit');
  assert.equal(first.key, second.key);
  assert.equal(first.profile.width, second.profile.width);
});

function debugFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-debug05-'));
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#888;color:#777;font-family:sans-serif}
    .hero{padding:40px;background:linear-gradient(#111,#333);color:#eee;border-radius:12px;box-shadow:0 20px 50px #0008}
    .hero h1{font-size:48px;margin:0}.hero p{font-size:16px}
    .icon{width:24px;height:24px;border:0;animation:pulse 120ms linear infinite;background:#111}
    @keyframes pulse{to{opacity:.5}}
  </style></head><body><main class="hero" data-effect="mesh-gradient" data-motion="rise"><h1>Título verificable</h1><p>Texto de prueba con contraste suficiente.</p><button class="icon"></button><canvas width="320" height="180"></canvas></main><script>console.error('debug-fixture')</script></body></html>`, 'utf8');
  return dir;
}

test('0.5 · Visual Debugger inspecciona DOM, CSS, capas, frames y fuente verificada', async () => {
  const dir = debugFixture();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-debug-out-'));
  const snapshot = await inspectDom({ target: 'index.html', targetDir: dir, outDir: out, sourceRoot: dir, width: 800, height: 600, waitMs: 100 });
  assert.ok(snapshot.elements.length >= 3);
  const hero = snapshot.elements.find((e) => e.classes.includes('hero'));
  assert.ok(hero, 'no se encontró .hero');
  assert.equal(hero.source?.file, 'index.html');
  assert.ok((hero.source?.line ?? 0) > 0);
  assert.equal(hero.source?.status, 'verified');
  assert.ok(hero.effects.includes('mesh-gradient'));
  assert.equal(snapshot.counts.canvases, 1);
  assert.equal(snapshot.consoleErrors.length, 1);
  assert.ok(snapshot.animations.length >= 1);
  assert.ok(snapshot.contrast.violations >= 1);
  assert.ok(snapshot.buttonsWithoutName.length >= 1);
  assert.ok(fs.existsSync(path.join(out, 'dom.json')));
  assert.ok(fs.existsSync(path.join(out, 'dom.png')));
});

function loopFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-loop05-'));
  const good = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Landing premium</title><style>
    :root{--bg:#f6f2ea;--ink:#171512;--muted:#5f5a52;--accent:#9b3d2e;--line:#d6cdbf;--surface:#fffdf8}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif}
    main{min-height:100vh;display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:48px;padding:72px 8vw}
    .eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700}
    h1{font-size:clamp(48px,7vw,96px);line-height:.94;letter-spacing:-.06em;max-width:10ch;margin:18px 0}
    p{font-size:18px;line-height:1.6;color:var(--muted);max-width:52ch}
    .card{background:var(--surface);border:1px solid var(--line);padding:28px;box-shadow:0 26px 60px -42px #17151266;border-radius:4px}
    .card strong{font-size:44px;display:block;letter-spacing:-.04em}.bar{height:10px;background:var(--accent);width:62%;margin-top:22px}
    button{background:var(--ink);color:#fff;border:0;padding:14px 20px;font:inherit;margin-top:24px;cursor:pointer;transition:transform 220ms cubic-bezier(.16,1,.3,1)}
    button:hover{transform:translateY(-2px)}button:focus-visible{outline:3px solid #1d4ed8;outline-offset:3px}
    @media(max-width:760px){main{grid-template-columns:1fr;padding:40px 6vw}h1{font-size:54px}}
    @media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
  </style></head><body><main><section><p class="eyebrow">Estudio de arquitectura</p><h1>Espacio que respira.</h1><p>Una landing editorial con jerarquía, contraste y una única acción. El contenido manda y el sistema tipográfico lo sostiene.</p><button>Ver proyecto</button></section><aside class="card"><strong>24</strong><p>proyectos construidos con luz natural y materiales honestos.</p><div class="bar"></div></aside></main></body></html>`;
  const bad = `<!doctype html><html><head><meta charset="utf-8"><title>Landing</title><style>body{margin:0;background:#888;color:#777;font-family:sans-serif}main{padding:24px}h1{font-size:18px}p{font-size:10px}button{background:#999;color:#aaa;border:0}</style></head><body><main><h1>Espacio que respira.</h1><p>Una landing editorial con jerarquía, contraste y una única acción.</p><button>Ver</button></main></body></html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), bad, 'utf8');
  fs.writeFileSync(path.join(dir, 'good.html'), good, 'utf8');
  return dir;
}

test('0.5 · el loop hace copia, mide, aplica, conserva y permite restaurar', async () => {
  const dir = loopFixture();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-loop-out-'));
  const refDir = fs.mkdtempSync(path.join(os.tmpdir(), 've-loop-ref-'));
  const refCapture = await capture({ target: path.join(dir, 'good.html'), width: 1280, height: 720, frames: 1, waitMs: 150, outDir: refDir });
  assert.ok(fs.existsSync(refCapture.frames[0]));
  const plan = await runImprovementLoop({
    projectDir: dir, targetDir: dir, target: 'index.html', reference: refCapture.frames[0],
    brief: 'landing premium minimalista de arquitectura', style: 'minimal-premium',
    width: 1280, height: 720, frames: 3, intervalMs: 100, waitMs: 150, outDir: path.join(out, 'plan'),
    limits: { maxIterations: 1, maxMinutes: 5, maxTokenBudget: 50000 },
  });
  assert.equal(plan.status, 'awaiting-agent');
  assert.ok(fs.existsSync(plan.artifacts.agentTask));
  assert.match(fs.readFileSync(plan.artifacts.agentTask, 'utf8'), /Tarea visual priorizada/);
  assert.ok(plan.before.critic.findings.some((f) => f.category === 'accessibility'));

  const result = await runImprovementLoop({
    projectDir: dir, targetDir: dir, target: 'index.html', reference: refCapture.frames[0],
    brief: 'landing premium minimalista de arquitectura', style: 'minimal-premium',
    width: 1280, height: 720, frames: 3, intervalMs: 100, waitMs: 150, outDir: path.join(out, 'apply'),
    replaceFile: 'good.html', confirm: true,
    gates: { minQuality: 50, minFidelity: 40, minComposition: 40, minTypography: 40, maxHighFindings: 10 },
    limits: { maxIterations: 1, maxMinutes: 5, maxTokenBudget: 50000 },
  });
  assert.ok(result.after, JSON.stringify(result.message));
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].kept, true, result.message);
  assert.ok(result.after.review.quality.overall >= result.before.review.quality.overall);
  assert.match(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), /Espacio que respira/);
  assert.ok(result.artifacts.backup && fs.existsSync(result.artifacts.backup));
  const restored = restoreLoop(dir, result.id, result.outDir);
  assert.ok(restored.restored.length >= 1);
  assert.match(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), /font-size:18px/);
});

test('0.5 · se conservan 58 efectos, 15 estilos, 20 composiciones y el contrato de versión', () => {
  assert.ok(listEffects().length >= 58);
  assert.equal(STYLE_IDS.length, 15);
  assert.equal(SHOWCASE_SPECS.length, 20);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '1.0.0-rc.1');
});
