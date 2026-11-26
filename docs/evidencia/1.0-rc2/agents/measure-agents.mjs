#!/usr/bin/env node
/**
 * Mide el A/B de rc.2 con el mismo motor, los mismos umbrales y la misma captura.
 * Entradas: runs.json (producido por run-bench.mjs) y los index.html de cada rama.
 * Salidas: evidence/<caso>/<rama>/, results.json y README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { opIntelligence } from '../../../../dist/core/intelligence-ops.js';
import { startStatic } from '../../../../dist/core/static.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const work = path.join(here, 'work');
const runs = JSON.parse(fs.readFileSync(path.join(here, 'runs.json'), 'utf8'));

const SANITIZE = [
  [/<repo>/g, '<repo>'],
  [/<repo>/g, '<repo>'],
  [/<home>/g, '<home>'],
  [/<home>/g, '<home>'],
];
const sanitize = (text) => SANITIZE.reduce((out, [re, to]) => out.replace(re, to), text);

async function perf(dir) {
  const server = await startStatic(dir);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(server.url + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(700);
    const loadMs = Date.now() - t0;
    const fps = await page.evaluate(() => new Promise((resolve) => {
      let frames = 0; const start = performance.now();
      const tick = (t) => { frames++; if (t - start < 1100) requestAnimationFrame(tick); else resolve(Math.round((frames / ((performance.now() - start) / 1000)) * 10) / 10); };
      requestAnimationFrame(tick);
    }));
    return { fps, loadMs };
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
  }
}

const dim = (q, id) => { const d = q?.dimensions?.find((x) => x.id === id); return d?.available && d.score !== null ? d.score : null; };

const results = { generatedAt: new Date().toISOString(), agent: runs.agent, model: runs.model, cases: {} };
for (const [id, data] of Object.entries(runs.cases)) {
  const aDir = path.join(here, data.dirA ?? path.join('work', id, 'a'));
  const bDir = path.join(here, data.dirB ?? path.join('work', id, 'b'));
  if (!fs.existsSync(path.join(aDir, 'index.html')) || !fs.existsSync(path.join(bDir, 'index.html'))) {
    console.log(`! ${id}: falta una rama, se omite`);
    continue;
  }
  const reference = path.join(root, data.reference);
  const out = {};
  for (const [arm, dir] of [['a', aDir], ['b', bDir]]) {
    const p = await perf(dir);
    const intel = await opIntelligence({
      reference, brief: data.brief, projectType: data.projectType,
      width: 1280, height: 720, frames: 6, intervalMs: 250, waitMs: 700,
      targetDir: dir, target: 'index.html',
      outDir: path.join(here, 'evidence', id, arm),
      performance: p,
    });
    fs.copyFileSync(path.join(dir, 'index.html'), path.join(here, 'evidence', id, arm, 'index.html'));
    const q = intel.review.quality;
    out[arm] = {
      quality: q.overall, grade: q.grade, fidelity: intel.fidelity.score,
      composition: dim(q, 'composition'), typography: dim(q, 'typography'),
      accessibility: dim(q, 'accessibility'), lighting: dim(q, 'lighting'),
      coherence: dim(q, 'coherence'), depth: dim(q, 'depth'),
      performance: dim(q, 'performance'), fps: p.fps, loadMs: p.loadMs,
      critic: intel.critic.score, critical: intel.critic.counts.critical, high: intel.critic.counts.high,
      medium: intel.critic.counts.medium, findings: intel.critic.findings.map((f) => `${f.severity}:${f.category}:${f.title}`),
      gates: intel.gates.decision, blockers: intel.gates.blockers.map((b) => `${b.id}=${b.actual}`),
      tricky: {
        compositionEvidence: q.dimensions.find((d) => d.id === 'composition')?.evidence ?? null,
        coherenceEvidence: q.dimensions.find((d) => d.id === 'coherence')?.evidence ?? null,
      },
    };
    fs.writeFileSync(path.join(here, 'evidence', id, `${arm}-agent.json`), sanitize(JSON.stringify({ run: data[arm] }, null, 2)) + '\n');
    console.log(`${id} · ${arm}: calidad ${out[arm].quality} · fidelidad ${out[arm].fidelity} · gates ${out[arm].gates}`);
  }
  out.a.calls = { ve: 0, mcp: 0, tokens: data.a.usage, ms: data.a.ms, bytes: data.a.bytes, embeddedReference: data.a.embeddedReference };
  out.b.calls = { ve: data.b.veCommands.length, commands: data.b.commands.length, mcp: data.b.mcpCalls.length, tokens: data.b.usage, ms: data.b.ms, bytes: data.b.bytes, embeddedReference: data.b.embeddedReference, installed: data.b.installed };
  results.cases[id] = out;
  fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify(results, null, 2) + '\n');
}

const f = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(1));
const pad = (s, n) => String(s).padEnd(n);
const rows = Object.entries(results.cases).map(([id, c]) => `| ${id} | ${f(c.a.quality)} → **${f(c.b.quality)}** | ${f(c.a.fidelity)} → **${f(c.b.fidelity)}** | ${f(c.a.composition)} → ${f(c.b.composition)} | ${f(c.a.typography)} → ${f(c.b.typography)} | ${f(c.a.lighting)} → ${f(c.b.lighting)} | ${f(c.a.coherence)} → ${f(c.b.coherence)} | ${c.a.gates} → ${c.b.gates} |`);
const md = `# A/B real con Codex — Visual Engine 1.0.0-rc.2

${runs.agent}. Mismo modelo, misma referencia adjunta (\`-i\`), mismo prompt y mismo sandbox en cada pareja. La única diferencia es Visual Engine: A corre en un directorio limpio; B recibe \`ve install --agents codex\` y el servidor MCP por \`-c\`. Referencias sintéticas 16:9 declaradas (no son material de cliente) y prohibido incrustar la imagen: se reconstruye con código.

## Calidad medida por el mismo motor

| Caso | Calidad | Fidelidad | Composición | Tipografía | Iluminación | Coherencia | Gates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows.join('\n')}

## Invocación, coste y correcciones

| Caso | Comandos \`ve\` A → B | Tokens entrada A → B | Tokens salida A → B | Duración A → B | Bytes A → B | Referencia incrustada |
| --- | --- | --- | --- | --- | --- | --- |
${Object.entries(results.cases).map(([id, c]) => `| ${id} | 0 → ${c.b.calls.ve} | ${c.a.calls.tokens?.input_tokens ?? '—'} → ${c.b.calls.tokens?.input_tokens ?? '—'} | ${c.a.calls.tokens?.output_tokens ?? '—'} → ${c.b.calls.tokens?.output_tokens ?? '—'} | ${Math.round(c.a.calls.ms / 1000)} s → ${Math.round(c.b.calls.ms / 1000)} s | ${c.a.calls.bytes} → ${c.b.calls.bytes} | ${c.a.calls.embeddedReference ? 'A' : ''}${c.b.calls.embeddedReference ? 'B' : ''}${!c.a.calls.embeddedReference && !c.b.calls.embeddedReference ? 'no' : ''} |`).join('\n')}

## Límites

- Una pasada por rama y caso: no se estima varianza.
- El agente B puede leer el código fuente del motor desde su ruta de instalación; A no. Es una asimetría de información declarada.
- Las referencias son sintéticas (generadas para este banco), 16:9 y sin material de cliente.
- Los tokens son los que reporta \`codex exec --json\` (\`turn.completed.usage\`), no una estimación.
- La puntuación automática no es un juicio artístico humano.
`;
fs.writeFileSync(path.join(here, 'README.md'), md);
console.log('\nListo:', path.join(here, 'results.json'));
