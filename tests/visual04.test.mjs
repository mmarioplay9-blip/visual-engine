import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE_IDS, buildArtDirection, artDirectionCss, designMarkdown, renderDesignSystem } from '../dist/core/styles.js';
import { buildMotionDirector, validateCameraRotation, validateTransitionCurve } from '../dist/core/motion-director.js';
import { buildReferenceDesign, renderReferenceDesign } from '../dist/core/refdesign.js';
import { renderShowcase, SHOWCASE_SPECS } from '../dist/core/showcase.js';
import { listEffects } from '../dist/core/library.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STYLE_CASES = [
  ['minimal-premium', 'landing'], ['cinematic', 'landing'], ['futuristic', 'dashboard'],
  ['sci-fi', 'app'], ['cyberpunk', 'game'], ['glassmorphism', 'landing'], ['neumorphism', 'app'],
  ['editorial', 'editorial'], ['brutalism', 'landing'], ['game-ui', 'game'],
  ['professional-app', 'dashboard'], ['financial-dashboard', 'dashboard'], ['immersive-3d', 'motion'],
  ['motion-graphics', 'motion'], ['organic-natural', 'landing'],
];

test('0.4 · 15 estilos con identidad, tokens y auditoría estructural sin depender del color', () => {
  assert.equal(STYLE_IDS.length, 15);
  const accents = new Set();
  const signatures = new Set();
  for (const [style, projectType] of STYLE_CASES) {
    const ad = buildArtDirection({ brief: `Proyecto ${style} para validar el sistema`, style, projectType });
    assert.equal(ad.version, '0.4');
    assert.equal(ad.style.id, style);
    assert.ok(ad.audit.structuralScore >= 70, `${style}: auditoría ${ad.audit.structuralScore}`);
    assert.ok(ad.audit.contrastPairs.length >= 3, `${style}: sin pares de contraste`);
    assert.ok(ad.audit.contrastPairs.every((p) => p.pass), `${style}: contraste fallido ${JSON.stringify(ad.audit.contrastPairs.filter((p) => !p.pass))}`);
    assert.ok(ad.tokenSet['color.bg']?.$value, `${style}: sin token de fondo`);
    assert.ok(ad.tokenSet['font.size.hero']?.$value, `${style}: sin escala tipográfica`);
    assert.ok(ad.effects.length >= 1 && ad.effects.length <= 3, `${style}: efectos ${ad.effects.length}`);
    assert.ok(ad.components.length >= 4, `${style}: componentes insuficientes`);
    assert.ok(ad.materials.surface.length > 3);
    assert.ok(ad.typography.families.display.length > 3);
    accents.add(ad.palette.accent);
    signatures.add(`${ad.layout.columns}|${ad.typography.scaleRatio}|${ad.style.motion.level}|${ad.layout.radius}`);
    const css = artDirectionCss(ad, './fonts');
    assert.match(css, /@font-face/);
    assert.match(css, /--ve-display/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(designMarkdown(ad), /Auditoría estructural/);
  }
  assert.ok(accents.size >= 12, `acentos distintos: ${accents.size}`);
  assert.ok(signatures.size >= 10, `firmas distintas: ${signatures.size}`);
});

test('0.4 · sistema de diseño renderizado contiene HTML, tokens DTCG y CSS real', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-ad04-'));
  const ad = buildArtDirection({ brief: 'Landing editorial de un estudio de arquitectura', style: 'editorial', projectType: 'landing' });
  const r = renderDesignSystem(ad, out);
  for (const file of [r.html, r.css, r.tokens, r.design]) assert.ok(fs.existsSync(file), file);
  const tokens = JSON.parse(fs.readFileSync(r.tokens, 'utf8'));
  assert.ok(tokens['space.base'].$value);
  assert.equal(tokens['color.bg'].$type, 'color');
  assert.match(fs.readFileSync(r.html, 'utf8'), /data-style="editorial"/);
});

test('0.4 · Motion Director valida transición y rotación con error medido', () => {
  const transition = validateTransitionCurve();
  assert.equal(transition.status, 'verified');
  assert.equal(transition.monotonic, true);
  assert.ok(transition.maxJerk < 0.01);
  for (const expected of [1.5, 2, 3]) {
    const rotation = validateCameraRotation(expected);
    assert.equal(rotation.status, 'verified', JSON.stringify(rotation));
    assert.ok(rotation.errorDeg <= 1);
  }
  const ad = buildArtDirection({ brief: 'Motion reel', style: 'motion-graphics', projectType: 'motion' });
  const plan = buildMotionDirector(ad);
  assert.ok(plan.recipes.length >= 6);
  assert.ok(plan.camera.length >= 3);
  assert.match(plan.code.css, /prefers-reduced-motion/);
  assert.match(plan.reducedMotion, /reduce/);
  assert.ok(plan.code.gsap.includes('gsap.timeline'));
  assert.ok(plan.code.motionOne.includes('animate'));
});

function fixtureSpec() {
  return {
    version: '0.2',
    source: path.join(root, 'docs/evidencia/0.3/referencia-remotion.png'),
    createdAt: new Date().toISOString(),
    canvas: { width: 1440, height: 900, aspect: 1.6, fps: 0, duration: 0 },
    palette: [
      { hex: '#070b12', share: 0.58, role: 'fondo/base' },
      { hex: '#f5f7fb', share: 0.2, role: 'texto/luz' },
      { hex: '#12e0c8', share: 0.12, role: 'acento' },
      { hex: '#ffb454', share: 0.1, role: 'apoyo' },
    ],
    composition: { balanceHorizontal: 0.54, symmetryVertical: 0.71, negativeSpace: 0.48, horizonY: 0.62, focalPoints: [], regions: [] },
    typography: { lines: [
      { heightRatio: 0.085, heightPx: 76, role: 'titular', confidence: 0.91, status: 'verified', text: 'VISUAL ENGINE' },
      { heightRatio: 0.02, heightPx: 18, role: 'cuerpo', confidence: 0.64, status: 'estimated' },
    ], note: 'alturas medidas; familia no identificada', engine: 'tesseract' },
    text: { available: true, engine: 'tesseract', content: 'VISUAL ENGINE', lines: [{ text: 'VISUAL ENGINE', confidence: 94, box: [20, 40, 420, 100] }], note: 'OCR local' },
    scenes: [],
    layers: [{ name: 'fondo', cellShare: 0.62, sharpness: 0.18, status: 'estimated' }, { name: 'tipografía', cellShare: 0.18, sharpness: 0.82, status: 'estimated' }],
    camera: null,
    effects: [{ id: 'glow', label: 'glow', status: 'estimated', confidence: 0.55, params: {}, technology: 'CSS', hint: 'halo suave' }],
    implementation: { stack: ['CSS'], steps: [] },
    verification: { metrics: [], targets: {}, temporalScoreTarget: 75 },
    limitations: [],
  };
}

test('0.4 · Reference-to-Design separa confirmado de estimado y genera sistema', () => {
  const spec = fixtureSpec();
  const design = buildReferenceDesign(spec, { style: 'cinematic', brief: 'Sistema derivado de una referencia medida' });
  assert.equal(design.version, '0.4');
  assert.equal(design.palette.find((p) => p.role.includes('fondo'))?.hex, '#070b12');
  assert.ok(design.confirmed.length >= 3);
  assert.ok(design.estimated.length >= 4);
  assert.ok(design.confirmed.every((c) => c.status === 'verified'));
  assert.ok(design.estimated.every((c) => c.status === 'estimated'));
  assert.ok(design.estimated.some((e) => /familia tipográfica/i.test(e.value)));
  assert.ok(design.limitations.some((l) => /no se identifica/i.test(l)));
  assert.ok(design.effects.length >= 1);
  assert.ok(design.components.length >= 4);
  assert.ok(design.motion.validation.rotation.status === 'verified');

  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-refdesign04-'));
  const rendered = renderReferenceDesign(design, out);
  assert.ok(fs.existsSync(rendered.json));
  assert.ok(fs.existsSync(rendered.markdown));
  const md = fs.readFileSync(rendered.markdown, 'utf8');
  assert.match(md, /Confirmado por medición/);
  assert.match(md, /Estimado \/ hipótesis/);
  assert.match(md, /no se identifica la fuente real/);
  assert.ok(fs.existsSync(path.join(out, 'motion', 'motion-lab.html')));
});

test('0.4 · 20 composiciones generadas, 15 estilos y 58 efectos preservados', () => {
  assert.equal(SHOWCASE_SPECS.length, 20);
  assert.ok(listEffects().length >= 58, 'la biblioteca de efectos se redujo');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-showcase04-'));
  const r = renderShowcase({ outDir: out });
  assert.equal(r.compositions.length, 20);
  assert.equal(new Set(r.compositions.map((c) => c.style)).size, 15);
  assert.equal(new Set(r.compositions.map((c) => c.archetype)).size, 10);
  assert.ok(fs.existsSync(r.catalog));
  for (const comp of r.compositions) {
    assert.ok(fs.existsSync(comp.html), comp.html);
    const dir = path.dirname(comp.html);
    for (const f of ['design-system.css', 'page.css', 'tokens.json', 'README.md', 'DESIGN.md', 'MOTION.md']) {
      assert.ok(fs.existsSync(path.join(dir, f)), `${comp.id}: falta ${f}`);
    }
    const html = fs.readFileSync(comp.html, 'utf8');
    for (const effect of comp.effects) assert.match(html, new RegExp(`assets/effects/${effect}/effect\\.js`));
    assert.match(html, /prefers-reduced-motion|fonts\.ready/);
  }
  assert.ok(fs.existsSync(path.join(out, 'assets', 'fonts', 'Inter_opsz,wght_.ttf')));
});

test('0.4 · mediciones reales de las 20 composiciones sin errores ni contraste insuficiente', () => {
  const file = path.join(root, 'library', 'showcase', 'measurements.json');
  assert.ok(fs.existsSync(file), 'falta library/showcase/measurements.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(data.compositions, 20, `mediciones: ${data.compositions}`);
  assert.equal(data.ok, 20, `ok: ${data.ok}; errores: ${data.errors.join(' | ')}`);
  assert.equal(data.totalContrastViolations, 0);
  assert.equal(data.reducedMotionRespected, true);
  assert.ok(data.medianFps >= 55, `FPS mediana ${data.medianFps}`);
  for (const r of data.results) {
    assert.equal(r.overflowX, 0, `${r.id}: overflow`);
    assert.ok(r.fps >= 35, `${r.id}: ${r.fps} FPS`);
    assert.ok(r.loadMs < 5000, `${r.id}: carga ${r.loadMs}`);
    assert.equal(r.tabWorks, true, `${r.id}: tab`);
    assert.equal(r.fontReady, true, `${r.id}: fuentes`);
    assert.ok(fs.existsSync(path.join(root, 'library', 'showcase', r.screenshot)), `${r.id}: captura`);
  }
});
