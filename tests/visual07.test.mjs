import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createReferenceBrief, buildPlan, writeBrief, briefToMarkdown } = await import('../dist/core/plan.js');
const { buildArtDirection, checkStyleAgainstReference, getStyle } = await import('../dist/core/styles.js');
const { evaluateQuality, hueDistribution, smoothCircular, CHROMATIC_COVERAGE_FLOOR } = await import('../dist/core/quality.js');

const reference = path.join(root, 'docs', 'evidencia', '0.3', 'referencia-remotion.png');

/** Perfil mínimo con la forma de VisualProfile, suficiente para la métrica de matiz. */
function profile(colors) {
  const palette = colors.map(([hex, share]) => ({
    hex,
    share,
    rgb: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  }));
  const frame = { t: 0, luma: 0.5, contrast: 0.2, saturation: 0.3, edgeDensity: 0.1, darkRatio: 0.2, quadrants: [0.25, 0.25, 0.25, 0.25] };
  return {
    source: 'sintetico', kind: 'image', width: 1280, height: 720, aspect: 1.778, duration: 0, fps: 0, frameCount: 1,
    aggregate: { luma: 0.5, contrast: 0.2, saturation: 0.3, colorfulness: 0.2, edgeDensity: 0.1, darkRatio: 0.2 },
    palette, motion: 0, motionCurve: [], cuts: [], pace: 0, hueHistogram: [], frames: [frame],
    createdAt: new Date().toISOString(), warnings: [],
  };
}

test('rc.2 · Reference First: el brief mide la referencia y no inventa tipografía', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 've-plan-'));
  const brief = await createReferenceBrief({ intent: 'landing editorial tranquila', reference, outDir: out });

  assert.equal(brief.version, '1.0');
  assert.equal(brief.intent, 'landing editorial tranquila');
  assert.equal(brief.preserve.length, 7, 'deben declararse las siete dimensiones a preservar');
  assert.ok(brief.measured, 'sin medición no hay Reference First');
  assert.ok(brief.measured.palette.length >= 1);
  assert.ok(brief.measured.palette.some((p) => p.role === 'fondo'), 'la paleta debe tener un rol de fondo');
  assert.ok(brief.reference.width > 0 && brief.reference.height > 0);
  assert.ok(Math.abs(brief.reference.aspect - brief.reference.width / brief.reference.height) < 0.01);
  assert.ok(brief.nonNegotiables.some((r) => /no añadas partículas, glow, glassmorphism/i.test(r)));
  assert.ok(brief.warnings.length === 0 || brief.warnings.every((w) => typeof w === 'string'));

  const files = writeBrief(brief, out);
  assert.ok(fs.existsSync(files.json) && fs.existsSync(files.markdown));
  const md = briefToMarkdown(brief);
  assert.match(md, /Reglas no negociables/);
  assert.match(md, /Sólo la intención y la referencia mandan|La intención del usuario y la referencia mandan/);
});

test('rc.2 · Reference First: sin referencia no se inventan color, composición ni tipografía', async () => {
  const brief = await createReferenceBrief({ intent: 'póster abstracto' });
  assert.equal(brief.measured, null);
  assert.equal(brief.typography.status, 'unavailable');
  assert.ok(brief.warnings.some((w) => /Sin archivo de referencia/i.test(w)));
  assert.ok(brief.nonNegotiables.some((r) => /pídela antes de fijar estética/i.test(r)));
});

test('rc.2 · Reference First: el estilo no invierte la luz de la referencia', () => {
  const light = { luma: 0.72, contrast: 0.18, darkRatio: 0.04, saturation: 0.22, aspect: 1.778 };
  const darkStyle = getStyle('cyberpunk');
  const conflicts = checkStyleAgainstReference(darkStyle, light);
  assert.ok(conflicts.some((c) => c.id === 'dark-inversion' && c.severity === 'blocker'));

  const ad = buildArtDirection({ brief: 'landing de cerámica artesanal', style: 'cyberpunk', projectType: 'landing', reference: light });
  assert.equal(ad.reference.adoptedMode, 'light', 'la referencia clara debe imponer el modo');
  assert.ok(ad.warnings.some((w) => /referencia manda/i.test(w)));
  assert.ok(ad.reference.conflicts.some((c) => c.id === 'dark-inversion'));

  // Explícito gana, pero se declara el conflicto: no hay silencio.
  const forced = buildArtDirection({ brief: 'landing de cerámica artesanal', style: 'cyberpunk', projectType: 'landing', reference: light, preferences: { mode: 'dark' } });
  assert.equal(forced.reference.adoptedMode, null);
  assert.ok(forced.warnings.some((w) => /Conflicto \(dark-inversion\)/.test(w)));

  // Caso negativo: referencia oscura y estilo claro.
  const dark = { luma: 0.08, contrast: 0.3, darkRatio: 0.9, saturation: 0.3, aspect: 1.778 };
  assert.ok(checkStyleAgainstReference(getStyle('editorial'), dark).some((c) => c.id === 'light-inversion'));
  // Caso neutro: referencia casi gris no sostiene un acento saturado.
  const gray = { luma: 0.5, contrast: 0.1, darkRatio: 0.1, saturation: 0.05, aspect: 1.778 };
  assert.ok(checkStyleAgainstReference(getStyle('brutalism'), gray).some((c) => c.id === 'accent-unsupported'));
  // Sin contradicción no se inventan conflictos.
  assert.deepEqual(checkStyleAgainstReference(getStyle('editorial'), { ...light, luma: 0.55 }), []);
});

test('rc.2 · Coherencia de matiz: circular, con cobertura y con casos negativos', () => {
  const smooth = smoothCircular([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(smooth.length, 12);
  assert.ok(Math.abs(smooth.reduce((a, b) => a + b, 0) - 1) < 1e-9, 'el suavizado conserva la masa');
  assert.ok(smooth[0] > smooth[1] && smooth[1] > smooth[6], 'el núcleo decae con la distancia circular');
  assert.ok(smooth[11] > smooth[6], 'el sector 11 es vecino del 0: no es ortogonal');

  const base = profile([['#d03020', 0.5], ['#e8e8e8', 0.5]]);
  const shifted = profile([['#d06020', 0.5], ['#e8e8e8', 0.5]]); // ~+12° de matiz
  const opposite = profile([['#20a0d0', 0.5], ['#e8e8e8', 0.5]]); // ~+180°
  const neutral = profile([['#9a9a9a', 1]]);

  const near = evaluateQuality(base, shifted).dimensions.find((d) => d.id === 'coherence');
  const far = evaluateQuality(base, opposite).dimensions.find((d) => d.id === 'coherence');
  assert.ok(near.available && near.score > 80, `matiz vecino debería puntuar alto: ${near.score}`);
  assert.ok(far.available && far.score < 30, `matiz opuesto debería puntuar bajo: ${far.score}`);
  assert.ok(near.score > far.score, 'la similitud debe decrecer con la distancia de matiz');

  // Referencia casi gris: el matiz no es interpretable. No es un 0 (suspenso) ni un 100 (aprobado).
  const grayRef = evaluateQuality(neutral, base).dimensions.find((d) => d.id === 'coherence');
  assert.equal(grayRef.available, false);
  assert.equal(grayRef.score, null);
  assert.match(grayRef.evidence.motivo, new RegExp(String(CHROMATIC_COVERAGE_FLOOR)));
  const hue = hueDistribution(neutral);
  assert.equal(hue.chromaticCoverage, 0);
  assert.equal(hue.circularMeanDeg, null);

  // Caso negativo del arreglo: gris contra gris tampoco se puntúa.
  assert.equal(evaluateQuality(neutral, neutral).dimensions.find((d) => d.id === 'coherence').available, false);

  // La dimensión ausente no se rellena: se renormaliza el resto.
  const q = evaluateQuality(neutral, base);
  assert.ok(!('coherence' in q.weightsUsed), 'una dimensión no disponible no debe entrar en los pesos');
  assert.ok(Math.abs(Object.values(q.weightsUsed).reduce((a, b) => a + b, 0) - 1) < 0.01);
});

test('rc.2 · Workflow: plan de 8 pasos con presupuesto y criterio de terminado', () => {
  const plan = buildPlan({ task: 'landing editorial', phase: 'inspeccionar' });
  assert.equal(plan.steps.length, 8);
  assert.deepEqual(plan.steps.map((s) => s.id), ['analizar', 'comprender', 'disenar', 'implementar', 'renderizar', 'inspeccionar', 'corregir', 'verificar']);
  assert.equal(plan.phase, 'inspeccionar');
  assert.equal(plan.steps.filter((s) => s.status === 'done').length, 5);
  assert.equal(plan.budget.corrections, 2);
  assert.ok(plan.rules.some((r) => /no termina porque el código funcione/i.test(r)));
  assert.match(plan.doneDefinition, /captura real/i);
  const total = plan.groups.reduce((n, g) => n + g.tools.length, 0);
  assert.equal(total, 45, 'la agrupación debe cubrir las 45 herramientas');
});

test('rc.2 · MCP: descubrimiento selectivo por grupo y visual_plan como entrada', async (t) => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const cli = path.join(root, 'dist', 'cli', 'index.js');

  const partial = new Client({ name: 've-groups', version: '0.1.0' });
  await partial.connect(new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'], cwd: root, stderr: 'pipe', env: { ...process.env, VE_MCP_GROUPS: 'analysis,verify' } }));
  t.after(() => partial.close());
  const subset = (await partial.listTools()).tools.map((tool) => tool.name);
  assert.equal(subset.length, 19, `el grupo analysis+verify debe exponer 19 herramientas: ${subset.length}`);
  assert.ok(subset.includes('visual_review') && subset.includes('visual_gate'));
  assert.ok(!subset.includes('visual_effects_list'), 'los grupos no pedidos no se cargan');
  assert.ok(!subset.includes('visual_plan'));

  const full = new Client({ name: 've-all', version: '0.1.0' });
  await full.connect(new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'], cwd: root, stderr: 'pipe' }));
  t.after(() => full.close());
  assert.equal((await full.listTools()).tools.length, 45);

  const result = await full.callTool({ name: 'visual_plan', arguments: { task: 'landing editorial tranquila', reference } });
  assert.ok(!result.isError, result.content?.[0]?.text);
  const data = JSON.parse(result.content[0].text);
  assert.equal(data.plan.steps.length, 8);
  assert.ok(data.brief.measured.luma >= 0);
  assert.ok(data.brief.reference.width > 0);
  assert.equal(data.next.id, 'analizar');
});
