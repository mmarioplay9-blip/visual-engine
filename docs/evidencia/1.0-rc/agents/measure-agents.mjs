#!/usr/bin/env node
/**
 * Mide el A/B real de Codex con el mismo motor y los mismos umbrales.
 * Entradas: .tmp/rc1/agent-ab/{a,b}/index.html y los JSONL de Codex.
 * Salidas: comparison.json, captures, logs saneados y README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { opIntelligence } from '../../../../dist/core/intelligence-ops.js';
import { startStatic } from '../../../../dist/core/static.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const src = path.join(root, '.tmp/rc1/agent-ab');
const reference = path.join(root, 'docs/evidencia/1.0-rc/references/premium-landing.jpg');
const brief = 'Landing editorial y sobria para un estudio de cerámica de autor, 1280×720, CSS autocontenido, tono editorial.';

const SANITIZE = [
  [/D:\\\\<home>\\\\visual-engine/g, '<repo>'],
  [/D:\/<home>\/visual-engine/g, '<repo>'],
  [/<repo>/g, '<repo>'],
  [/C:\\\\Users\\\\<user>/g, '<home>'],
  [/C:\/Users\/<user>/g, '<home>'],
  [/<home>/g, '<home>'],
];

function sanitize(text) {
  let out = text;
  for (const [re, to] of SANITIZE) out = out.replace(re, to);
  return out;
}

async function measure(dir, outDir, shot) {
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
    await page.screenshot({ path: shot });
    await context.close();
    return { fps, loadMs };
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
  }
}

const dim = (q, id) => { const d = q?.dimensions?.find((x) => x.id === id); return d?.available && d.score !== null ? d.score : null; };

const aDir = path.join(src, 'a');
const bDir = path.join(src, 'b');
const aPerf = await measure(aDir, path.join(here, 'measure-a'), path.join(here, 'a.png'));
const bPerf = await measure(bDir, path.join(here, 'measure-b'), path.join(here, 'b.png'));
const common = { reference, brief, style: 'editorial', projectType: 'landing', width: 1280, height: 720, frames: 6, intervalMs: 250, waitMs: 700 };
const aIntel = await opIntelligence({ ...common, targetDir: aDir, target: 'index.html', outDir: path.join(here, 'measure-a'), performance: aPerf });
const bIntel = await opIntelligence({ ...common, targetDir: bDir, target: 'index.html', outDir: path.join(here, 'measure-b'), performance: bPerf });

const pick = (i, perf) => ({
  quality: i.review.quality.overall, fidelity: i.fidelity.score,
  composition: dim(i.review.quality, 'composition'), typography: dim(i.review.quality, 'typography'),
  accessibility: dim(i.review.quality, 'accessibility'), lighting: dim(i.review.quality, 'lighting'),
  coherence: dim(i.review.quality, 'coherence'), performance: dim(i.review.quality, 'performance'),
  fps: perf.fps, loadMs: perf.loadMs, critic: i.critic.score, critical: i.critic.counts.critical, high: i.critic.counts.high,
  gates: i.gates.decision,
});

const ab = JSON.parse(fs.readFileSync(path.join(src, 'agents-ab.json'), 'utf8'));
for (const name of ['a', 'b']) {
  fs.writeFileSync(path.join(here, `${name}.jsonl`), sanitize(fs.readFileSync(path.join(src, `${name}.jsonl`), 'utf8')));
  fs.writeFileSync(path.join(here, `${name}.last.txt`), sanitize(fs.readFileSync(path.join(src, `${name}-last.txt`), 'utf8')));
}
fs.copyFileSync(path.join(aDir, 'index.html'), path.join(here, 'a.html'));
fs.copyFileSync(path.join(bDir, 'index.html'), path.join(here, 'b.html'));
if (fs.existsSync(path.join(src, 'install-b.log'))) fs.writeFileSync(path.join(here, 'install-b.log'), sanitize(fs.readFileSync(path.join(src, 'install-b.log'), 'utf8')));

const comparison = {
  generatedAt: new Date().toISOString(),
  agent: 'Codex CLI 0.172.0 (codex exec, no interactivo)',
  task: 'Landing nueva de HALO FOUNDRY, 1280×720, CSS autocontenido. Prompt idéntico en los dos brazos.',
  isolation: 'Ambos brazos: --ignore-user-config --ignore-rules --dangerously-bypass-approvals-and-sandbox en un directorio temporal. Mismo modelo y mismo prompt. B recibe además `ve install --agents codex` y el servidor MCP por -c.',
  environmentNote: 'El agente puede leer archivos del HOME por shell. Ambos brazos encontraron y usaron la skill global design-taste-frontend; por tanto A no es un agente "en blanco", sino un agente sin Visual Engine.',
  a: { ...pick(aIntel, aPerf), bytes: fs.statSync(path.join(aDir, 'index.html')).size, ms: ab.a.ms, veCommands: ab.a.veCommands, mcpCalls: ab.a.mcpCalls },
  b: { ...pick(bIntel, bPerf), bytes: fs.statSync(path.join(bDir, 'index.html')).size, ms: ab.b.ms, veCommands: ab.b.veCommands, mcpCalls: ab.b.mcpCalls },
  invocation: {
    a: 'Sin Visual Engine: 0 comandos `ve`, 0 llamadas MCP.',
    b: 'Visual Engine invocado: 9 comandos `ve` (doctor, context, effects list, vision status, agents, art, capture) y lectura de `.codex/skills/visual-engine/SKILL.md`. En una ejecución previa del mismo montaje también invocó `visual_agents` por MCP; `codex exec` exige `default_tools_approval_mode="approve"` o deniega la llamada.',
  },
};
fs.writeFileSync(path.join(here, 'comparison.json'), JSON.stringify(comparison, null, 2) + '\n');

const f = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(1));
const md = `# A/B real con Codex — Visual Engine 1.0.0-rc.1

Tarea nueva e idéntica: landing de **HALO FOUNDRY** a 1280×720, CSS autocontenido. Mismo modelo, mismo prompt, mismo sandbox y mismo directorio temporal. La única diferencia es Visual Engine.

| Métrica | A sin VE | B con VE |
| --- | ---: | ---: |
| Calidad global | ${f(comparison.a.quality)} | **${f(comparison.b.quality)}** |
| Fidelidad estructural | ${f(comparison.a.fidelity)} | **${f(comparison.b.fidelity)}** |
| Composición | ${f(comparison.a.composition)} | ${f(comparison.b.composition)} |
| Tipografía | ${f(comparison.a.typography)} | ${f(comparison.b.typography)} |
| Accesibilidad | ${f(comparison.a.accessibility)} | ${f(comparison.b.accessibility)} |
| Iluminación | ${f(comparison.a.lighting)} | ${f(comparison.b.lighting)} |
| Coherencia | ${f(comparison.a.coherence)} | ${f(comparison.b.coherence)} |
| FPS | ${comparison.a.fps} | ${comparison.b.fps} |
| Gates | ${comparison.a.gates} | **${comparison.b.gates}** |
| Tamaño HTML | ${comparison.a.bytes} B | ${comparison.b.bytes} B |
| Duración | ${Math.round(comparison.a.ms / 1000)} s | ${Math.round(comparison.b.ms / 1000)} s |

## ¿Invocó las herramientas?

- **A**: 0 comandos \`ve\`, 0 llamadas MCP. Usó su skill global de diseño y Chrome para revisar su página.
- **B**: **9 comandos \`ve\`** con salida real — \`doctor\`, \`context\`, \`effects list\`, \`vision status\`, \`agents\`, \`art\`, \`capture\` — y leyó la skill instalada en \`.codex/skills/visual-engine/SKILL.md\`.
- El detalle de cada llamada está en \`b.jsonl\` (JSONL de Codex, saneado). Las capturas son \`a.png\` y \`b.png\`.

## Límites

- Ambos brazos podían leer el HOME y encontraron la skill global \`design-taste-frontend\`; A no es un agente en blanco.
- Es una sola pasada por brazo; no se repitió para estimar varianza.
- Las métricas son las del motor, sin cambios de umbrales ni fórmulas.
- \`codex exec\` deniega MCP por defecto en modo no interactivo; para que B use MCP hace falta \`-c mcp_servers.visual-engine.default_tools_approval_mode="approve"\`, documentado en la guía de agentes.
`;
fs.writeFileSync(path.join(here, 'README.md'), md);
console.log(`A: calidad ${comparison.a.quality} · gates ${comparison.a.gates} · ve ${comparison.a.veCommands}`);
console.log(`B: calidad ${comparison.b.quality} · gates ${comparison.b.gates} · ve ${comparison.b.veCommands}`);
