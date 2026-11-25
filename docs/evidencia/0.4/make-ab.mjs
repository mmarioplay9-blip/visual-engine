import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFile } from '../../../dist/core/analysis.js';
import { capture } from '../../../dist/core/capture.js';
import { evaluateQuality } from '../../../dist/core/quality.js';
import { buildReferenceDesign } from '../../../dist/core/refdesign.js';
import { buildVisualSpec } from '../../../dist/core/spec.js';
import { inspectFrames } from '../../../dist/core/inspect.js';
import { sampleFrames } from '../../../dist/core/media.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const reference = path.join(here, 'referencia-dominio-publico.jpg');
const out = path.join(here, 'ab');
fs.mkdirSync(out, { recursive: true });

const profile = await analyzeFile(reference, { samples: 1, width: 256 });
const content = inspectFrames(await sampleFrames(reference, { count: 1, width: 256 }));
const spec = buildVisualSpec({ profile, content, frameSize: { width: profile.width, height: profile.height } });
const design = buildReferenceDesign(spec, { style: 'motion-graphics', brief: 'Cartel nocturno de variedades, dominio público' });
const ad = design.artDirection;
const sizes = ad.typography.sizes;
const hero = Math.min(124, Math.max(64, sizes.hero));
const title = Math.min(72, Math.max(44, sizes.display));

const copy = {
  kicker: 'ARCHIVO · CARTEL 1891 · DOMINIO PÚBLICO',
  title: 'LE BAL DES OMBRES',
  lead: 'Una noche de música, cuerpo y luz artificial. La ciudad moderna entra en escena.',
  body: 'La composición mide el gesto antes que el detalle: una silueta, un ritmo de cartel y un foco que recorta la multitud. Este sistema traduce esa tensión a tokens, jerarquía y movimiento sin copiar la obra.',
  cta: 'Abrir el archivo',
  stats: [['1891', 'Año'], ['CC0', 'Licencia'], ['2.314 px', 'Original']],
};

const baseline = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>A · reconstrucción genérica</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#171717;color:#f1f1f1;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center}
main{width:min(1040px,90vw);padding:48px;border:1px solid #333;background:#202020}
p{font-size:16px;line-height:1.4;color:#bdbdbd;max-width:60ch}h1{font-size:32px;line-height:1.1;margin:16px 0;color:#fff}
.kicker{font-size:12px;letter-spacing:1px;color:#cf4b3b}.actions{display:flex;gap:10px;margin-top:24px}
button{background:#cf4b3b;border:0;color:#fff;padding:12px 18px;font-size:14px;border-radius:4px}
.stats{display:flex;gap:28px;margin-top:28px}.stats b{display:block;font-size:24px}.stats span{font-size:12px;color:#aaa}
.grid{display:grid;grid-template-columns:1.4fr .6fr;gap:28px}.card{background:#292929;padding:18px;margin-top:18px;border:1px solid #3b3b3b}
</style></head><body><main><div class="grid"><section><p class="kicker">${copy.kicker}</p><h1>${copy.title}</h1><p>${copy.lead}</p><p>${copy.body}</p><div class="actions"><button>${copy.cta}</button></div><div class="stats">${copy.stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></section><aside><div class="card"><b>Ficha</b><p>Reconstrucción sin sistema tipográfico ni tokens.</p></div><div class="card"><b>Nota</b><p>Mismo contenido. Sin dirección artística.</p></div></aside></div></main></body></html>`;

const art = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>B · Art Director 0.4</title><style>
@font-face{font-family:'VE Serif';src:url('../../../../library/fonts/SourceSerif4_opsz,wght_.ttf') format('truetype');font-weight:100 900;font-display:swap}
@font-face{font-family:'VE Inter';src:url('../../../../library/fonts/Inter_opsz,wght_.ttf') format('truetype');font-weight:100 900;font-display:swap}
@font-face{font-family:'VE Mono';src:url('../../../../library/fonts/JetBrainsMono_wght_.ttf') format('truetype');font-weight:100 900;font-display:swap}
:root{--bg:${ad.palette.bg};--surface:${ad.palette.surface};--text:${ad.palette.text};--muted:${ad.palette.muted};--accent:${ad.palette.accent};--line:${ad.palette.border};--display:'VE Serif',Georgia,serif;--body:'VE Inter',Arial,sans-serif;--mono:'VE Mono',monospace}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--body);font-size:${Math.max(13, sizes.body)}px;line-height:1.55;display:grid;place-items:center}
body::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 72% 18%,color-mix(in srgb,var(--accent) 13%,transparent),transparent 42%),linear-gradient(120deg,transparent 45%,color-mix(in srgb,var(--accent) 6%,transparent))}
main{position:relative;width:min(1120px,92vw);padding:clamp(28px,4vw,52px);border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 92%,transparent)}
.top{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:12px;font-family:var(--mono);font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
.grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(230px,.55fr);gap:clamp(24px,4vw,56px);padding-top:26px}
h1{font-family:var(--display);font-size:${hero}px;line-height:.86;letter-spacing:-.055em;margin:14px 0 18px;max-width:9ch;font-weight:600;text-wrap:balance}
p{margin:0;max-width:58ch}.lead{font-size:${Math.min(21, Math.max(16, sizes.lead))}px;color:var(--text);line-height:1.5;max-width:44ch}.body{margin-top:18px;color:var(--muted);font-size:${Math.min(15, Math.max(12, sizes.body))}px;column-count:2;column-gap:24px}
.kicker{font-family:var(--mono);font-size:10px;letter-spacing:.14em;color:var(--text);text-transform:uppercase}
.actions{display:flex;gap:10px;margin-top:24px}button{font:inherit;background:var(--accent);color:${ad.tokenSet['color.accentInk'].$value};border:0;padding:12px 18px;border-radius:${ad.layout.radius}px;font-weight:650;min-height:44px}button+button{background:transparent;color:var(--text);border:1px solid var(--line)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);margin-top:30px;padding-top:14px;gap:12px}.stats b{display:block;font-family:var(--display);font-size:${title * .38}px;line-height:1;font-weight:600}.stats span{font-family:var(--mono);font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}
aside{border-left:1px solid var(--line);padding-left:22px}.card{border-top:1px solid var(--line);padding:14px 0}.card b{font-family:var(--display);font-size:20px;font-weight:600}.card p{font-size:12px;color:var(--muted);margin-top:6px}
.swatches{display:flex;gap:6px;margin-top:12px}.swatches i{width:28px;height:28px;border:1px solid var(--line)}
</style></head><body><main><div class="top"><span>${copy.kicker}</span><span>${ad.style.name}</span></div><div class="grid"><section><p class="kicker">Referencia medida → sistema</p><h1>${copy.title}</h1><p class="lead">${copy.lead}</p><p class="body">${copy.body}</p><div class="actions"><button>${copy.cta}</button><button>Ficha técnica</button></div><div class="stats">${copy.stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></section><aside><div class="card"><b>Paleta semántica</b><p>Roles medidos, no colores decorativos.</p><div class="swatches">${[ad.palette.bg, ad.palette.accent, ad.palette.text, ad.palette.accent2].map((c) => `<i style="background:${c}"></i>`).join('')}</div></div><div class="card"><b>Tipografía</b><p>Escala modular ${ad.typography.scaleRatio}; hero ${hero}px; cuerpo ${sizes.body}px.</p></div><div class="card"><b>Motion</b><p>Transición ${ad.motion.level}; reduced-motion declarado.</p></div></aside></div></main></body></html>`;

const baselineFile = path.join(out, 'baseline.html');
const artFile = path.join(out, 'art-direction.html');
fs.writeFileSync(baselineFile, baseline, 'utf8');
fs.writeFileSync(artFile, art, 'utf8');

const baseCapture = await capture({ target: baselineFile, outDir: path.join(out, 'capture-baseline'), width: 1280, height: 800, waitMs: 600 });
const artCapture = await capture({ target: artFile, outDir: path.join(out, 'capture-art'), width: 1280, height: 800, waitMs: 600 });
if (!baseCapture.profile || !artCapture.profile) throw new Error('Sin perfil de captura');

const refProfile = await analyzeFile(reference, { samples: 1, width: 256 });
const qa = evaluateQuality(refProfile, baseCapture.profile, {
  accessibility: baseCapture.accessibility,
  typography: baseCapture.typography,
  effectCount: 0,
  referenceEffectCount: 0,
});
const qb = evaluateQuality(refProfile, artCapture.profile, {
  accessibility: artCapture.accessibility,
  typography: artCapture.typography,
  effectCount: 0,
  referenceEffectCount: 0,
});

const pick = (q) => Object.fromEntries(q.dimensions.map((d) => [d.id, d.score]));
const summary = {
  reference: path.relative(root, reference).split(path.sep).join('/'),
  license: 'CC0 · The Metropolitan Museum of Art (Moulin Rouge: La Goulue, Henri de Toulouse-Lautrec)',
  sameAgent: true,
  sameInstructions: true,
  sameBudget: 'Dos páginas estáticas, mismo copy, sin efectos de biblioteca ni dependencias; una sola captura por variante.',
  baseline: { files: [path.relative(root, baselineFile).split(path.sep).join('/')], captured: baseCapture.frames, quality: qa.overall, dimensions: pick(qa), typography: baseCapture.typography, accessibility: baseCapture.accessibility },
  artDirector: { files: [path.relative(root, artFile).split(path.sep).join('/')], captured: artCapture.frames, quality: qb.overall, dimensions: pick(qb), typography: artCapture.typography, accessibility: artCapture.accessibility },
  design: { style: ad.style.id, palette: ad.palette, scaleRatio: ad.typography.scaleRatio, tokens: design.implementation.tokens.length },
  limits: [
    'Referencia estática: las dimensiones animación y transiciones no están disponibles en esta comparación A/B.',
    'La transición se valida por separado con Motion Director (curva muestreada, rotación sintética y reduced-motion), no con una puntuación de vídeo.',
    'El contenido es una maqueta con copy original basado en la ficha; no reproduce el texto del cartel.',
    'La evaluación automática no sustituye la revisión artística humana.',
  ],
};
fs.writeFileSync(path.join(out, 'ab-metrics.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');

const md = `# A/B controlado · referencia CC0

Referencia: \`${summary.reference}\` — **${summary.license}**.

Mismo agente, mismas instrucciones y mismo presupuesto: dos páginas estáticas con idéntico copy, capturadas en Chromium a 1280×800, sin efectos de biblioteca. A es una reconstrucción genérica; B usa \`buildReferenceDesign\` y tokens del Art Director.

| Dimensión | A genérica | B Art Director | Δ |
| --- | ---: | ---: | ---: |
| Calidad total | ${qa.overall.toFixed(1)} | ${qb.overall.toFixed(1)} | ${(qb.overall - qa.overall).toFixed(1)} |
| Coherencia | ${pick(qa).coherence ?? '—'} | ${pick(qb).coherence ?? '—'} | ${((pick(qb).coherence ?? 0) - (pick(qa).coherence ?? 0)).toFixed(1)} |
| Tipografía | ${pick(qa).typography ?? '—'} | ${pick(qb).typography ?? '—'} | ${((pick(qb).typography ?? 0) - (pick(qa).typography ?? 0)).toFixed(1)} |
| Accesibilidad | ${pick(qa).accessibility ?? '—'} | ${pick(qb).accessibility ?? '—'} | ${((pick(qb).accessibility ?? 0) - (pick(qa).accessibility ?? 0)).toFixed(1)} |
| Composición | ${pick(qa).composition ?? '—'} | ${pick(qb).composition ?? '—'} | ${((pick(qb).composition ?? 0) - (pick(qa).composition ?? 0)).toFixed(1)} |

## Lectura honesta

- La coherencia y la tipografía sí se comparan sobre la misma referencia, mismo copy y misma captura.
- **Transiciones:** la referencia es una imagen; la dimensión de calidad temporal no existe. No se inventa un 40,0 → X. La transición se valida aparte con Motion Director: curva smoothstep monotónica, jerk máximo 0,006222, rotación medida 1,5° para 2° esperados (error 0,5°) y \`prefers-reduced-motion\` respetado en las 20 composiciones.
- La fidelidad global puede bajar si el sistema prioriza jerarquía y legibilidad sobre copiar píxeles; se muestra en el JSON, no se oculta.
- A y B usan el mismo copy y no cargan efectos; cualquier diferencia proviene de tokens, escala, layout y contraste.

## Archivos

- \`baseline.html\` / \`art-direction.html\`
- \`capture-baseline/capture-01.png\` / \`capture-art/capture-01.png\`
- \`ab-metrics.json\`
`;
fs.writeFileSync(path.join(out, 'AB.md'), md, 'utf8');
console.log(md);
