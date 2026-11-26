#!/usr/bin/env node
/**
 * Resume results.json + runs.json en README.md. No vuelve a medir.
 * Uso: node docs/evidencia/1.0-rc2/agents/summarize.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const results = JSON.parse(fs.readFileSync(path.join(here, 'results.json'), 'utf8'));
const runs = JSON.parse(fs.readFileSync(path.join(here, 'runs.json'), 'utf8'));

const f = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(1));
const delta = (a, b) => (a === null || b === null || a === undefined || b === undefined ? '—' : `${(b - a) >= 0 ? '+' : ''}${(b - a).toFixed(1)}`);

const rows = [];
const costs = [];
const flags = [];
for (const [id, c] of Object.entries(results.cases)) {
  const run = runs.cases[id];
  c.a.calls = { ...c.a.calls, cached: run.a.usage?.cached_input_tokens ?? null, output: run.a.usage?.output_tokens ?? null };
  c.b.calls = { ...c.b.calls, cached: run.b.usage?.cached_input_tokens ?? null, output: run.b.usage?.output_tokens ?? null };
  rows.push(`| ${id} | ${f(c.a.quality)} → **${f(c.b.quality)}** (${delta(c.a.quality, c.b.quality)}) | ${f(c.a.fidelity)} → **${f(c.b.fidelity)}** (${delta(c.a.fidelity, c.b.fidelity)}) | ${f(c.a.composition)} → ${f(c.b.composition)} | ${f(c.a.typography)} → ${f(c.b.typography)} | ${f(c.a.lighting)} → ${f(c.b.lighting)} | ${f(c.a.coherence)} → ${f(c.b.coherence)} | ${c.a.gates} → ${c.b.gates} |`);
  costs.push(`| ${id} | 0 → ${c.b.calls.ve} | ${run.a.usage?.input_tokens ?? '—'} → ${run.b.usage?.input_tokens ?? '—'} | ${run.a.usage?.cached_input_tokens ?? '—'} → ${run.b.usage?.cached_input_tokens ?? '—'} | ${run.a.usage?.output_tokens ?? '—'} → ${run.b.usage?.output_tokens ?? '—'} | ${Math.round(c.a.calls.ms / 1000)} s → ${Math.round(c.b.calls.ms / 1000)} s | ${c.a.calls.bytes} → ${c.b.calls.bytes} |`);
  for (const k of ['composition', 'typography', 'lighting', 'depth', 'accessibility', 'coherence']) {
    if (c.a[k] !== null && c.b[k] !== null && c.b[k] < c.a[k] - 2) flags.push(`${id}: ${k} ${f(c.a[k])} → ${f(c.b[k])} (${delta(c.a[k], c.b[k])})`);
  }
  if (c.a.gates !== c.b.gates) flags.push(`${id}: gates ${c.a.gates} → ${c.b.gates}${c.a.blockers.length ? ` (A bloqueaba: ${c.a.blockers.join(', ')})` : ''}`);
  if (c.b.calls.embeddedReference || c.a.calls.embeddedReference) flags.push(`${id}: referencia incrustada (${c.a.calls.embeddedReference ? 'A' : ''}${c.b.calls.embeddedReference ? 'B' : ''})`);
}

const better = Object.values(results.cases).filter((c) => c.b.quality > c.a.quality + 1).length;
const ties = Object.values(results.cases).filter((c) => Math.abs(c.b.quality - c.a.quality) <= 1).length;
const worse = Object.values(results.cases).filter((c) => c.b.quality < c.a.quality - 1).length;

const md = `# A/B real con Codex — Visual Engine 1.0.0-rc.2

${runs.agent}. Mismo modelo, misma referencia adjunta (\`-i\`), mismo prompt y mismo sandbox en cada pareja. La única diferencia es Visual Engine: A corre en un directorio limpio; B recibe \`ve install --agents codex\` y el servidor MCP por \`-c\`. Referencias sintéticas 16:9 declaradas, sin material de cliente, y prohibido incrustar la imagen: se reconstruye con código.

**Resultado:** B mejora en ${better}/5 casos, empata en ${ties}/5 y empeora en ${worse}/5. La mejora grande está en el caso difícil (game-hud, +7,3 de calidad y +13,1 de fidelidad); professional-app sube +1,6 al corregir contraste, y los tres restantes quedan dentro de la resolución del proxy. **No se observa regresión de calidad global, sí una regresión de dimensión** (ver abajo).

## Calidad medida por el mismo motor

| Caso | Calidad | Fidelidad | Composición | Tipografía | Iluminación | Coherencia | Gates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows.join('\n')}

## Invocación, coste y tiempo

| Caso | Comandos \`ve\` A → B | Tokens entrada A → B | De ellos cacheados A → B | Tokens salida A → B | Duración A → B | Bytes A → B |
| --- | --- | --- | --- | --- | --- | --- |
${costs.join('\n')}

## Diferencias que importan

${flags.length ? flags.map((x) => `- ${x}`).join('\n') : '- Sin diferencias relevantes.'}

## Lectura honesta

- **game-hud**: A dejó una banda negra de ~20 % de alto (el canvas no llenaba 720 px), la tipografía del HUD quedó por debajo del umbral (61,5) y el gate la rechazó. B midió la referencia, capturó a 1280×720, corrigió y llenó el lienzo: 92,6 y gate aceptado. La diferencia es visible en \`evidence/game-hud/*/review/captures/capture-01.png\`.
- **professional-app**: A tenía 31 incumplimientos de contraste y un hallazgo crítico; B los corrigió. Aun así B bajó tipografía de 91,1 a 72,2 (texto más fino en la tabla), y se publica.
- **scene-3d / motion-title / premium-landing**: diferencias ≤ 1,2 puntos. Son empates dentro de la resolución del proxy, no victorias.
- **Coste**: los tokens de entrada crecen 1,4×–6,8×, pero 97–99 % son lecturas de caché; el coste real es el **tiempo** (1,6×–3×) y el número de turnos. No hay telemetría de facturación del proveedor.

## Límites

- **professional-app**: la carpeta cruda de ejecución (\`work/professional-app/{a,b}\`) se eliminó en una limpieza de directorios no referenciados. Se conservan el HTML de cada rama, las capturas, los artefactos de revisión, \`results.json\`, \`runs.json\` y \`evidence/professional-app/*-agent.json\`, que contienen comandos, invocaciones y consumo reales. El JSONL crudo de Codex de ese caso es el único artefacto perdido.
- Una pasada por rama y caso: no se estima varianza; un empate no demuestra equivalencia.
- El agente B puede leer el código fuente del motor desde su ruta de instalación; A no. Asimetría de información declarada.
- El modelo es el de por defecto de la cuenta, el mismo en las dos ramas; no se fija versión exacta del modelo.
- La puntuación automática no es un juicio artístico humano; las capturas se conservan para revisión.
`;
fs.writeFileSync(path.join(here, 'README.md'), md);
fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify(results, null, 2) + '\n');
console.log(md);
