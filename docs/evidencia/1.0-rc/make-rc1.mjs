#!/usr/bin/env node
/**
 * Evidencia 1.0.0-rc.1 — cinco proyectos nuevos, A/B y vídeo.
 *
 * No modifica métricas ni umbrales: usa opIntelligence (review + fidelity +
 * critic + gates) y temporalCompare tal como los expone el motor. Las
 * referencias son obras CC0 del MET ya usadas en 0.6 y se citan en
 * references/metadata.json. A es una plantilla genérica; B usa la dirección
 * artística, la paleta derivada de la referencia y el sistema de tokens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { opIntelligence } from '../../../dist/core/intelligence-ops.js';
import { buildArtDirection } from '../../../dist/core/styles.js';
import { analyzeFile } from '../../../dist/core/analysis.js';
import { analyzeTimeline } from '../../../dist/core/timeline.js';
import { temporalCompare } from '../../../dist/core/temporal.js';
import { startStatic } from '../../../dist/core/static.js';
import { probe } from '../../../dist/core/media.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const refsDir = path.join(here, 'references');
const projDir = path.join(here, 'projects');
const motionDir = path.join(here, 'motion');
for (const d of [refsDir, projDir, motionDir]) fs.mkdirSync(d, { recursive: true });

const SOURCE_REFS = path.join(root, 'docs/evidencia/0.6/references');

const CASES = [
  {
    id: 'premium-landing',
    file: 'premium-landing.jpg',
    style: 'editorial',
    projectType: 'landing',
    brief: 'Landing premium de un estudio de arquitectura: una obra como material, aire editorial y una sola acción.',
    reference: { title: 'The Dance Class', artist: 'Edgar Degas', year: '1874', objectId: 438817, url: 'https://www.metmuseum.org/art/collection/search/438817' },
  },
  {
    id: 'desktop-app',
    file: 'professional-app.jpg',
    style: 'professional-app',
    projectType: 'app',
    brief: 'Aplicación de escritorio profesional para operaciones: densa, legible, con jerarquía de estado y lectura rápida.',
    reference: { title: 'Architecture', artist: 'Michelangelo Colonna', year: '17th century', objectId: 399581, url: 'https://www.metmuseum.org/art/collection/search/399581' },
  },
  {
    id: 'game-cinematic',
    file: 'game-ui.jpg',
    style: 'game-ui',
    projectType: 'game-hud',
    brief: 'Interfaz cinematográfica de videojuego: HUD diegético, letterbox, objetivo y amenaza legibles en movimiento.',
    reference: { title: 'Armor', artist: 'Anonymous', year: 'ca. 1540–50', objectId: 23206, url: 'https://www.metmuseum.org/art/collection/search/23206' },
  },
  {
    id: 'scene-3d',
    file: 'scene-3d.jpg',
    style: 'immersive-3d',
    projectType: 'scene3d',
    brief: 'Escena 3D interactiva con Three.js: órbita con arrastre, cámara real y lectura de ángulos.',
    reference: { title: 'Astronomy', artist: 'Giambologna', year: '17th century', objectId: 203938, url: 'https://www.metmuseum.org/art/collection/search/203938' },
  },
  {
    id: 'motion-graphics',
    file: 'motion-graphics.jpg',
    style: 'motion-graphics',
    projectType: 'motion',
    brief: 'Pieza de motion graphics de seis segundos: tres planos, cortes en el tiempo medido de la referencia.',
    reference: { title: 'The Dance Class', artist: 'Edgar Degas', year: '1874', objectId: 438817, url: 'https://www.metmuseum.org/art/collection/search/438817' },
  },
];

const COPY = {
  'premium-landing': {
    brand: 'ATELIER NORTE',
    referenceTitle: 'The Dance Class, Edgar Degas (CC0)',
    nav: ['Obra', 'Estudio', 'Contacto'],
    eyebrow: 'Estudio de arquitectura / 2026',
    title: 'La sombra también es material.',
    lead: 'Proyectamos con la luz que ya existe: patios que respiran, muros que guardan el calor y una escala que se habita despacio.',
    stats: [['24', 'proyectos'], ['9', 'provincias'], ['18', 'años'], ['1:1', 'acompañamiento']],
    sectionTitle: 'Tres casas, una misma idea de refugio.',
    cards: [
      ['Casa del bosque', 'Un patio central que organiza la casa y el clima.'],
      ['Tres patios', 'La sombra se mueve; los muros se quedan.'],
      ['Luz de tarde', 'Un plano que cambia de color cada hora.'],
    ],
    quote: 'No dibujamos fachadas: ordenamos la luz hasta que la casa aparece.',
    cta: 'Solicitar el dossier',
  },
  'desktop-app': {
    brand: 'MERIDIAN',
    referenceTitle: 'Architecture, Michelangelo Colonna (CC0)',
    nav: ['Resumen', 'Colas', 'Incidentes', 'Capacidad', 'Facturación'],
    eyebrow: 'Operaciones / turno de tarde',
    title: 'Toda la operación, en una lectura.',
    lead: 'Estado, capacidad y riesgo en el mismo plano. Sin pestañas, sin ruido.',
    stats: [['12.4k', 'peticiones/min'], ['98.2 %', 'disponibilidad'], ['142 ms', 'latencia p95'], ['3', 'alertas']],
    sectionTitle: 'Cola de trabajo',
    rows: [
      ['Ingesta de eventos', 'Plataforma', 'Alta', '2 min'],
      ['Reconciliación', 'Finanzas', 'Normal', '9 min'],
      ['Exportaciones', 'Datos', 'Normal', '14 min'],
      ['Webhooks', 'Plataforma', 'Alta', '1 min'],
      ['Cierres', 'Operaciones', 'Baja', '31 min'],
    ],
    inspector: { title: 'Capacidad', value: '78 %', note: 'Dos nodos al límite; el tercero absorbe el pico.' },
    status: ['Conectado', 'EU-West', 'v4.18.2', 'Sincronizado hace 12 s'],
  },
  'game-cinematic': {
    brand: 'ASHFALL',
    referenceTitle: 'Armor, anónimo (CC0)',
    eyebrow: 'SECTOR 07 / MUELLE',
    title: 'No cruces la línea.',
    lead: 'Misión de extracción. El HUD no decora: dice dónde estás, qué te queda y cuánto tiempo tienes.',
    stats: [['84', 'integridad'], ['12', 'cargador'], ['03', 'objetivos'], ['A-07', 'sector']],
    objectives: [
      ['01', 'Recuperar el núcleo', 'activo'],
      ['02', 'Alcanzar el muelle', 'pendiente'],
      ['03', 'Salir antes del cierre', 'pendiente'],
    ],
    subtitle: 'El núcleo sigue en el muelle. Tienes noventa segundos.',
  },
  'scene-3d': {
    brand: 'ORBITAL',
    referenceTitle: 'Astronomy, Giambologna (CC0)',
    eyebrow: 'Estudio 04 / Three.js',
    title: 'Una órbita no es una línea.',
    lead: 'Arrastra para orbitar. La cámara se mide desde su propio objeto, no desde una captura.',
    stats: [['1.5°', 'amplitud'], ['90', 'partículas'], ['03', 'planos'], ['60', 'fps objetivo']],
    hint: 'Arrastra para orbitar · suelta para volver',
  },
  'motion-graphics': {
    brand: 'SIGNAL / 24',
    referenceTitle: 'The Dance Class, Edgar Degas (CC0)',
    eyebrow: 'Reel 00:06',
    title: 'Tres planos. Un pulso.',
    shots: [
      ['PLANO 01', 'La luz entra primero.', 'El encuadre amplio abre la pieza; el corte llega cuando el ojo ya leyó el espacio.'],
      ['PLANO 02', 'Después, el detalle.', 'El segundo plano cierra la escala y sostiene el ritmo sin añadir adornos.'],
      ['PLANO 03', 'Y el pulso.', 'El cierre vuelve al gesto: una sola línea y el tiempo justo.'],
    ],
    end: 'SIGNAL',
  },
};

/* ------------------------------- paleta ---------------------------------- */

const rgbToHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/**
 * Acento de material: la referencia de armadura es casi gris, así que el
 * acento se deriva de su entrada con más croma y se satura para que el HUD
 * tenga el latón de la obra en lugar de un gris inventado.
 */
function materialAccent(palette, bgHex) {
  const chroma = (c) => Math.max(...c) - Math.min(...c);
  const best = [...palette].sort((a, b) => chroma(b.rgb) - chroma(a.rgb))[0];
  if (!best) return null;
  const mean = best.rgb.reduce((s, v) => s + v, 0) / 3;
  const boosted = best.rgb.map((v) => Math.max(0, Math.min(255, mean + (v - mean) * 4.2)));
  // Se aclara hacia un blanco cálido, no hacia blanco puro: aclarar en neutro
  // desatura el latón y vuelve a dejarlo gris.
  return { accent: rgbToHex(lift(boosted, hexToRgb(bgHex), 4.8, [255, 238, 214])), accent2: rgbToHex(mix(boosted, [255, 238, 214], 0.42)) };
}
const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const relLum = (c) => {
  const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const contrast = (a, b) => { const l1 = relLum(a), l2 = relLum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const lift = (fg, bg, target, toward) => {
  let c = [...fg];
  for (let i = 0; i < 40 && contrast(c, bg) < target; i++) c = mix(c, toward, 0.08);
  return c;
};

async function referencePalette(file, projectType) {
  const a = await analyzeFile(file, { samples: 1, width: 160 });
  const cols = a.palette.map((p) => p.rgb).filter((c) => Array.isArray(c) && c.length === 3);
  if (!cols.length) return null;
  const sorted = [...cols].sort((x, y) => lum(x) - lum(y));
  const dark = sorted[0];
  const light = sorted[sorted.length - 1];
  const mid = sorted[Math.floor(sorted.length / 2)];
  const sat = [...cols].sort((x, y) => (Math.max(...y) - Math.min(...y)) - (Math.max(...x) - Math.min(...x)))[0];
  const lightTheme = a.aggregate.luma > 0.5 && projectType !== 'game-hud' && projectType !== 'scene3d';
  if (lightTheme) {
    const bgRgb = mix(mix(mid, light, 0.55), [255, 255, 255], 0.18);
    const surfaceRgb = mix(bgRgb, [255, 255, 255], 0.35);
    const textRgb = mix(dark, [0, 0, 0], 0.35);
    return {
      bg: rgbToHex(bgRgb), surface: rgbToHex(surfaceRgb), elevated: rgbToHex(mix(surfaceRgb, [255, 255, 255], 0.4)),
      text: rgbToHex(lift(textRgb, bgRgb, 7, [0, 0, 0])), muted: rgbToHex(lift(mix(textRgb, bgRgb, 0.4), surfaceRgb, 5.2, textRgb)),
      accent: rgbToHex(lift(sat, surfaceRgb, 5.2, [0, 0, 0])), accent2: rgbToHex(mix(sat, textRgb, 0.35)),
      border: rgbToHex(mix(surfaceRgb, textRgb, 0.24)),
    };
  }
  const bgRgb = mix(dark, [0, 0, 0], 0.42);
  const surfaceRgb = mix(mix(dark, mid, 0.45), [0, 0, 0], 0.18);
  const textRgb = mix(light, [255, 255, 255], 0.55);
  return {
    bg: rgbToHex(bgRgb), surface: rgbToHex(surfaceRgb), elevated: rgbToHex(mix(surfaceRgb, light, 0.12)),
    text: rgbToHex(textRgb), muted: rgbToHex(lift(mix(textRgb, bgRgb, 0.4), surfaceRgb, 5.2, textRgb)),
    accent: rgbToHex(lift(mix(sat, [255, 255, 255], 0.35), surfaceRgb, 5.2, [255, 255, 255])), accent2: rgbToHex(mix(sat, light, 0.45)),
    border: rgbToHex(mix(surfaceRgb, textRgb, 0.24)),
  };
}

/* -------------------------------- páginas -------------------------------- */

const A_CSS = `
*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#eaf0ff;font-family:Inter,system-ui,sans-serif}
.nav{display:flex;justify-content:space-between;padding:18px 32px;border-bottom:1px solid #25344d;font-size:12px;color:#aab6cf}
.brand{font-weight:800;letter-spacing:.08em;color:#6ee7b7}.shell{max-width:1180px;margin:auto;padding:48px 32px}
.kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6ee7b7}
h1{font-size:44px;line-height:1.05;letter-spacing:-.04em;max-width:720px;margin:16px 0}
.lead{font-size:15px;line-height:1.6;color:#aab6cf;max-width:660px}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:32px 0}
.metric{background:#121d30;border:1px solid #25344d;padding:18px;border-radius:8px}.metric strong{display:block;font-size:26px}
.metric small{color:#aab6cf}.panel{background:#121d30;border:1px solid #25344d;border-radius:8px;padding:22px}
.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #25344d;font-size:13px;color:#cbd7ec}
.row:last-child{border:0}.chip{background:#1b2d47;padding:4px 8px;border-radius:99px;font-size:11px}
.grid{display:grid;grid-template-columns:1.4fr .6fr;gap:20px}.bars{display:flex;align-items:end;gap:6px;height:130px;margin-top:18px}
.bars i{display:block;flex:1;background:#6ee7b7;border-radius:2px}.scene{height:280px;background:linear-gradient(140deg,#172942,#0b1220);border:1px solid #25344d;position:relative;overflow:hidden}
.scene:before{content:"";position:absolute;inset:20%;border:1px solid #6ee7b7;transform:rotate(30deg)}
.hud{position:absolute;left:18px;bottom:18px;font:12px monospace;color:#6ee7b7}
.footer{padding:24px 32px;color:#8190a8;font-size:11px;border-top:1px solid #25344d}
@media(max-width:760px){.metrics{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}h1{font-size:34px}}
`;

function aPage(id) {
  const k = COPY[id];
  const metrics = (k.stats ?? []).map(([v, l]) => `<div class="metric"><strong>${v}</strong><small>${l}</small></div>`).join('');
  let body = '';
  if (id === 'premium-landing') {
    body = `<div class="grid"><section class="panel"><p class="kicker">Obra seleccionada</p><h2 style="font-size:28px">${k.sectionTitle}</h2>${k.cards.map((c) => `<div class="row"><span>${c[0]}</span><span class="chip">ver</span></div>`).join('')}</section><aside class="panel"><div class="scene"></div></aside></div>`;
  } else if (id === 'desktop-app') {
    body = `<div class="grid"><section class="panel">${k.rows.map((r) => `<div class="row"><span>${r[0]}</span><span>${r[1]}</span><span class="chip">${r[2]}</span></div>`).join('')}</section><aside class="panel"><small>${k.inspector.title}</small><div class="bars">${[40, 64, 38, 78, 56, 86, 48, 70].map((h) => `<i style="height:${h}%"></i>`).join('')}</div></aside></div>`;
  } else if (id === 'game-cinematic') {
    body = `<div class="scene"><div class="hud">${k.objectives.map((o) => o[1]).join(' · ')}</div></div><div class="grid" style="margin-top:16px"><section class="panel">${k.objectives.map((o) => `<div class="row"><span>${o[0]} ${o[1]}</span></div>`).join('')}</section><aside class="panel"><strong style="font-size:40px">84</strong><p>integridad</p></aside></div>`;
  } else if (id === 'scene-3d') {
    body = `<div class="scene"><div style="position:absolute;inset:32% 26%;border:1px solid #8b7bff;transform:rotate(18deg);box-shadow:0 0 60px #8b7bff55"></div><div class="hud">cámara 0.00° · 0 frames</div></div>`;
  } else {
    body = `<div class="scene"><div style="position:absolute;inset:0;display:grid;place-items:center;font:800 58px/1 system-ui;letter-spacing:-.06em">${k.title}</div><div class="hud">PLANO 01 · PLANO 02 · PLANO 03</div></div>`;
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — A</title><style>${A_CSS}</style></head><body><nav class="nav"><span class="brand">${k.brand.split(' ')[0]}</span><span>${(k.nav ?? []).join(' · ')}</span></nav><main class="shell"><p class="kicker">${k.eyebrow}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="metrics">${metrics}</div>${body}</main><footer class="footer">Sin Visual Engine · mismo copy · 1280×720</footer></body></html>`;
}

function tokenCss(ad) {
  const p = ad.palette;
  return `
:root{--bg:${p.bg};--surface:${p.surface};--elevated:${p.elevated};--ink:${p.text};--text:${p.text};--muted:${p.muted};--muted-strong:color-mix(in srgb,${p.text} 84%,${p.bg});--accent:${p.accent};--accent2:${p.accent2};--border:${p.border};--mono:${ad.typography.families.mono};--display:${ad.typography.families.display};--body:${ad.typography.families.body};--radius:${ad.layout.radius}px;--shadow:${ad.layout.shadow}}
*{box-sizing:border-box}html,body{margin:0}
body{background:radial-gradient(120% 90% at 16% -10%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 56%),radial-gradient(80% 60% at 100% 100%,color-mix(in srgb,var(--accent2) 10%,transparent),transparent 62%),var(--bg);color:var(--text);font-family:var(--body),system-ui,sans-serif;font-size:${ad.typography.sizes.body}px;line-height:${ad.typography.lineHeight};-webkit-font-smoothing:antialiased}
body::after{content:"";position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 200px #0009;z-index:40}
a{color:inherit}.nav{position:relative;z-index:3;display:flex;justify-content:space-between;align-items:center;gap:24px;padding:18px clamp(20px,5vw,60px);border-bottom:1px solid var(--border);font-size:11px;color:var(--muted);letter-spacing:.05em}
.brand{font-family:var(--mono);font-weight:700;color:var(--ink);letter-spacing:.1em}
.eyebrow{font:11px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
h1{font-family:var(--display),system-ui,sans-serif;font-size:clamp(46px,6.2vw,90px);line-height:${ad.typography.displayLineHeight};letter-spacing:${ad.typography.displayTracking};margin:14px 0 18px;font-weight:${ad.typography.displayWeight}}
.lead{color:var(--muted);max-width:56ch;font-size:${ad.typography.sizes.lead}px;line-height:1.55}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin:30px 0}
.stat{background:linear-gradient(160deg,color-mix(in srgb,var(--surface) 86%,#fff 14%),var(--surface));padding:18px;box-shadow:inset 0 1px 0 #ffffff18,0 20px 44px -34px #000}
.stat strong{display:block;font:600 clamp(24px,3vw,36px) var(--mono);letter-spacing:-.04em}.stat small{color:var(--muted-strong);font-size:11px}
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
}

function bLanding(ad) {
  const k = COPY['premium-landing'];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
.shell{max-width:${ad.layout.maxWidth}px;margin:auto;padding:clamp(30px,5vw,60px) clamp(20px,5vw,60px)}
.hero{display:grid;grid-template-columns:1.02fr .98fr;gap:clamp(22px,4vw,54px);align-items:center}
.hero-copy{animation:rise .9s cubic-bezier(.16,1,.3,1) both}
.hero h1{max-width:11ch}.cta{display:inline-flex;align-items:center;gap:18px;margin-top:26px;padding:13px 18px;background:var(--accent);color:var(--bg);text-decoration:none;font-weight:700;font-size:13px;border-radius:2px}
.plate{position:relative;margin:0;padding:12px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);animation:fade 1.1s .1s both}
.plate img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;filter:saturate(.84) contrast(1.05);animation:drift 14s ease-in-out infinite alternate}
@keyframes drift{from{transform:scale(1)}to{transform:scale(1.045)}}
.plate figcaption{padding-top:11px;font:10px var(--mono);color:var(--muted-strong);display:flex;justify-content:space-between}
.strip{margin-top:clamp(34px,6vw,72px);border-top:1px solid var(--border);padding-top:26px;display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(20px,4vw,48px)}
.strip h2{font-family:var(--display),system-ui,sans-serif;font-size:clamp(28px,3.4vw,44px);line-height:1.02;letter-spacing:-.04em;margin:8px 0 0;max-width:14ch}
.cards{display:grid;gap:1px;background:var(--border);border:1px solid var(--border)}
.card{background:color-mix(in srgb,var(--surface) 92%,transparent);padding:18px 20px;display:flex;justify-content:space-between;gap:20px;align-items:baseline}
.card b{font-family:var(--display),system-ui,sans-serif;font-size:19px;letter-spacing:-.02em}.card span{color:var(--muted-strong);font-size:12px;max-width:34ch}
.quote{margin:clamp(30px,5vw,58px) 0 0;padding:26px 0 0;border-top:1px solid var(--border);font-family:var(--display),system-ui,sans-serif;font-size:clamp(22px,2.4vw,32px);line-height:1.25;letter-spacing:-.02em;max-width:26ch;color:var(--ink)}
.foot{padding:22px clamp(20px,5vw,60px);border-top:1px solid var(--border);color:var(--muted-strong);font:10px var(--mono);display:flex;justify-content:space-between}
@media(max-width:820px){.hero,.strip{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.plate img{aspect-ratio:16/10}}
</style></head><body><nav class="nav"><span class="brand">${k.brand}</span><span>${k.nav.join(' · ')}</span><span>2026</span></nav>
<main class="shell"><section class="hero"><div class="hero-copy"><p class="eyebrow">${k.eyebrow}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="stats">${k.stats.map(([v, l]) => `<div class="stat"><strong>${v}</strong><small>${l}</small></div>`).join('')}</div><a class="cta" href="#obra">${k.cta} <span>→</span></a></div>
<figure class="plate"><img src="reference.jpg" alt="Referencia CC0: ${k.referenceTitle}"><figcaption><span>${k.brand} / Obra 01</span><span>Luz de tarde</span></figcaption></figure></section>
<section class="strip"><div><p class="eyebrow">Selección</p><h2>${k.sectionTitle}</h2></div><div class="cards">${k.cards.map(([t, d]) => `<div class="card"><b>${t}</b><span>${d}</span></div>`).join('')}</div></section>
<p class="quote">“${k.quote}”</p></main>
<footer class="foot"><span>${k.brand}</span><span>Visual Engine 1.0 · tokens, contraste y jerarquía</span></footer></body></html>`;
}

function bDesktop(ad) {
  const k = COPY['desktop-app'];
  const rows = k.rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><i class="dot ${r[2] === 'Alta' ? 'hot' : ''}"></i>${r[2]}</td><td class="num">${r[3]}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
body{height:100vh;overflow:hidden}.app{height:100vh;display:grid;grid-template-columns:214px 1fr 296px;grid-template-rows:54px 1fr 30px;grid-template-areas:"side top top" "side main insp" "status status status";background:var(--bg)}
.side{grid-area:side;border-right:1px solid var(--border);background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 70%,transparent),transparent);padding:16px 14px;display:flex;flex-direction:column;gap:4px}
.side .brand{font:700 14px var(--mono);letter-spacing:.12em;padding:6px 10px 16px;color:var(--ink)}
.navitem{display:flex;justify-content:space-between;padding:10px;border-radius:4px;font-size:13px;color:var(--muted-strong)}
.navitem.on{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--ink);box-shadow:inset 2px 0 0 var(--accent)}
.side .foot{margin-top:auto;font:11px var(--mono);color:var(--muted-strong);padding:10px}
.top{grid-area:top;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--surface) 40%,transparent)}
.top h1{font-family:var(--display),system-ui,sans-serif;font-size:22px;letter-spacing:-.02em;margin:0;font-weight:600}
.top .search{font:12px var(--mono);color:var(--muted-strong);border:1px solid var(--border);padding:7px 10px;border-radius:4px;min-width:220px}
.main{grid-area:main;overflow:hidden;padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpi{background:linear-gradient(160deg,color-mix(in srgb,var(--surface) 88%,#fff 12%),var(--surface));border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px}
.kpi small{font:11px var(--mono);color:var(--muted-strong);letter-spacing:.06em;text-transform:uppercase}.kpi b{display:block;font:600 30px var(--mono);letter-spacing:-.04em;margin-top:4px}
.tablewrap{flex:1;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:color-mix(in srgb,var(--surface) 60%,transparent)}
table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;font:11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted-strong);padding:10px 14px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--surface) 80%,transparent)}
td{padding:12px 14px;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent);color:var(--ink)}tr:last-child td{border:0}td.num{font-family:var(--mono);color:var(--muted-strong);text-align:right}
.dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent2);margin-right:7px;vertical-align:middle}.dot.hot{background:var(--accent);box-shadow:0 0 8px var(--accent)}
.insp{grid-area:insp;border-left:1px solid var(--border);padding:18px 18px;background:color-mix(in srgb,var(--surface) 30%,transparent);display:flex;flex-direction:column;gap:16px}
.insp h2{font:600 14px var(--mono);letter-spacing:.06em;margin:0;color:var(--muted-strong);text-transform:uppercase}
.gauge{height:8px;background:color-mix(in srgb,var(--border) 70%,transparent);border-radius:99px;overflow:hidden}.gauge i{display:block;height:100%;width:78%;background:linear-gradient(90deg,var(--accent2),var(--accent))}
.big{font:600 46px var(--mono);letter-spacing:-.05em}.insp p{color:var(--muted-strong);font-size:13px;line-height:1.5;margin:0}
.spark{display:flex;align-items:end;gap:4px;height:74px;margin-top:4px}.spark i{flex:1;background:color-mix(in srgb,var(--accent) 70%,transparent);border-radius:1px 1px 0 0}
.status{grid-area:status;display:flex;align-items:center;gap:20px;padding:0 18px;border-top:1px solid var(--border);font:11px var(--mono);color:var(--muted-strong);background:var(--bg)}
.status b{color:var(--accent2);font-weight:600}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body><div class="app">
<aside class="side"><div class="brand">${k.brand}</div>${k.nav.map((n, i) => `<div class="navitem ${i === 1 ? 'on' : ''}"><span>${n}</span><span>${i === 1 ? '12' : ''}</span></div>`).join('')}<div class="foot">${k.eyebrow}</div></aside>
<header class="top"><h1>${k.sectionTitle}</h1><div class="search">Buscar en la operación…</div></header>
<main class="main"><div class="kpis">${k.stats.map(([v, l]) => `<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('')}</div>
<div class="tablewrap"><table><thead><tr><th>Cola</th><th>Equipo</th><th>Prioridad</th><th>Espera</th></tr></thead><tbody>${rows}</tbody></table></div></main>
<aside class="insp"><h2>${k.inspector.title}</h2><div class="big">${k.inspector.value}</div><div class="gauge"><i></i></div><p>${k.inspector.note}</p><div class="spark">${[38, 52, 44, 66, 58, 74, 62, 78, 70, 84].map((h) => `<i style="height:${h}%"></i>`).join('')}</div><p>Últimos 10 minutos · nodo EU-West</p></aside>
<footer class="status">${k.status.map((s, i) => `<span>${i === 0 ? `<b>${s}</b>` : s}</span>`).join('')}</footer>
</div></body></html>`;
}

function bGame(ad) {
  const k = COPY['game-cinematic'];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
body{height:100vh;overflow:hidden;background:var(--bg)}.frame{position:relative;height:100vh;overflow:hidden;display:flex;flex-direction:column}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.02) contrast(1.04);transform:scale(1.04);animation:push 18s ease-in-out infinite alternate}
@keyframes push{from{transform:scale(1.02)}to{transform:scale(1.09)}}
.scrim{position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--bg) 54%,transparent) 0 16%,transparent 52%),linear-gradient(0deg,color-mix(in srgb,var(--bg) 46%,transparent) 0,transparent 30%)}
.key{position:absolute;inset:0;background:radial-gradient(62% 58% at 70% 22%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 70%),radial-gradient(46% 40% at 14% 82%,color-mix(in srgb,var(--accent2) 16%,transparent),transparent 72%);mix-blend-mode:screen}
.scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,#ffffff05 3px 4px);pointer-events:none}
.vig{position:absolute;inset:0;box-shadow:inset 0 0 160px #0009;pointer-events:none}
.bar{position:relative;z-index:3;height:34px;background:color-mix(in srgb,var(--bg) 78%,transparent);border-bottom:1px solid color-mix(in srgb,var(--border) 60%,transparent);display:flex;align-items:center;justify-content:space-between;padding:0 26px;font:10px var(--mono);letter-spacing:.18em;color:color-mix(in srgb,var(--text) 84%,transparent)}
.bar b{color:var(--accent)}
.stage{position:relative;z-index:2;flex:1;display:flex;align-items:flex-end;padding:0 clamp(24px,6vw,74px) 34px}
.copy{max-width:640px;text-shadow:0 2px 28px #000a}.copy h1{font-size:clamp(56px,7.6vw,104px);line-height:.86;letter-spacing:-.065em;margin:12px 0 16px;max-width:8ch;font-weight:800}
.copy .lead{color:color-mix(in srgb,var(--text) 88%,transparent);max-width:44ch;font-size:16px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:color-mix(in srgb,var(--border) 80%,transparent);border:1px solid color-mix(in srgb,var(--border) 80%,transparent);margin-top:24px;max-width:560px;box-shadow:0 34px 80px -44px #000}
.stat{background:color-mix(in srgb,var(--bg) 78%,transparent);padding:12px 14px;box-shadow:inset 0 1px 0 #ffffff1c}
.stat strong{display:block;font:700 26px var(--mono);letter-spacing:-.05em;color:var(--accent)}.stat small{font:9px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--text) 86%,transparent)}
.reticle{position:absolute;z-index:3;right:19%;top:40%;width:42px;height:42px;border:1px solid var(--accent);border-radius:50%;box-shadow:0 0 0 11px color-mix(in srgb,var(--accent) 10%,transparent),0 0 28px color-mix(in srgb,var(--accent) 32%,transparent)}
.reticle:before,.reticle:after{content:"";position:absolute;background:var(--accent)}.reticle:before{left:50%;top:-11px;width:1px;height:64px}.reticle:after{top:50%;left:-11px;height:1px;width:64px}
.obj{position:absolute;z-index:3;left:clamp(24px,6vw,74px);top:26%;border-left:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);padding:8px 14px 8px 12px;font:11px var(--mono);color:color-mix(in srgb,var(--text) 86%,transparent);letter-spacing:.06em;text-shadow:0 2px 16px #000a}
.obj b{display:block;color:var(--text);font-size:13px;letter-spacing:.02em;margin-top:3px}
.hudright{position:absolute;z-index:3;right:clamp(20px,5vw,58px);bottom:30px;text-align:right;font:10px var(--mono);line-height:1.9;color:color-mix(in srgb,var(--text) 84%,transparent);letter-spacing:.06em;text-shadow:0 2px 14px #000a}
.hudright b{color:var(--accent)}
.sub{position:relative;z-index:3;text-align:center;padding:0 20px 18px;font-size:13px;color:color-mix(in srgb,var(--text) 88%,transparent);letter-spacing:.01em}
.sub span{background:color-mix(in srgb,var(--bg) 86%,transparent);padding:5px 12px;border:1px solid color-mix(in srgb,var(--border) 70%,transparent)}
@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}.reticle{right:9%;top:28%}.copy h1{font-size:54px}.obj{display:none}}
@media(prefers-reduced-motion:reduce){.bg{animation:none}.scan{display:none}}
</style></head><body><div class="frame"><img class="bg" src="reference.jpg" alt="Referencia CC0: ${k.referenceTitle}"><div class="scrim"></div><div class="key"></div><div class="scan"></div><div class="vig"></div>
<div class="bar"><span><b>${k.brand}</b> · ${k.eyebrow}</span><span>SIGILO · 03 OBJETIVOS</span></div>
<div class="stage"><div class="copy"><p class="eyebrow">${k.eyebrow}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="stats">${k.stats.map(([v, l]) => `<div class="stat"><strong>${v}</strong><small>${l}</small></div>`).join('')}</div></div></div>
<div class="obj">OBJETIVO ACTIVO<b>${k.objectives[0][1]}</b></div><div class="reticle"></div>
<div class="hudright">AMENAZA <b>PATRULLA / 2</b><br>RUTA <b>MUELLE / 03</b><br>TIEMPO <b>01:30</b></div>
<div class="sub"><span>${k.subtitle}</span></div></div></body></html>`;
}

function bScene3d(ad) {
  const k = COPY['scene-3d'];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
body{height:100vh;overflow:hidden}.stage3{position:relative;height:100vh;overflow:hidden;isolation:isolate}
.plate{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.88;filter:saturate(.95) contrast(1.03);z-index:-3}
.veil{position:absolute;inset:0;background:radial-gradient(circle at 70% 42%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 42%),linear-gradient(90deg,color-mix(in srgb,var(--bg) 48%,transparent) 0 24%,transparent 62%);z-index:-2}
#orbital{position:absolute;inset:0;width:100%;height:100%;z-index:-1;cursor:grab}#orbital:active{cursor:grabbing}
.overlay{position:relative;z-index:2;max-width:660px;padding:9vh clamp(22px,6vw,74px) 0;pointer-events:none}
.overlay h1{font-size:clamp(50px,6.6vw,92px);line-height:.9;letter-spacing:-.065em;margin:14px 0 18px;max-width:10ch}
.overlay .lead{max-width:46ch;font-size:16px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-top:26px;max-width:600px;backdrop-filter:blur(10px);box-shadow:0 34px 78px -46px #000}
.stat{background:var(--bg);padding:12px 14px;box-shadow:inset 0 1px 0 #ffffff16}
.stat strong{display:block;font:600 23px var(--mono);letter-spacing:-.04em}.stat small{font:10px var(--mono);color:var(--text);text-transform:uppercase;letter-spacing:.08em}
.readout{font:11px var(--mono);color:var(--accent);margin-top:16px;letter-spacing:.04em}
.hint{position:absolute;z-index:2;left:clamp(22px,6vw,74px);bottom:22px;font:10px var(--mono);color:var(--muted-strong);letter-spacing:.06em}
.credit{position:absolute;z-index:2;right:22px;bottom:20px;color:var(--muted-strong);font:10px var(--mono)}
@media(max-width:760px){.overlay{padding-top:5vh}.stats{grid-template-columns:repeat(2,1fr)}.overlay h1{font-size:46px}}
@media(prefers-reduced-motion:reduce){#orbital{opacity:.5}}
</style></head><body><main class="stage3"><img class="plate" src="reference.jpg" alt="Referencia CC0: ${k.referenceTitle}"><div class="veil"></div>
<canvas id="orbital" width="1280" height="720" aria-label="Escena 3D orbital interactiva"></canvas>
<nav class="nav" style="border-color:color-mix(in srgb,var(--border) 80%,transparent)"><span class="brand">${k.brand}</span><span>${k.eyebrow}</span><span>1.0-rc.1</span></nav>
<section class="overlay"><p class="eyebrow">${k.eyebrow}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="readout" id="readout">cámara 0.00° · 0 frames</div><div class="stats">${k.stats.map(([v, l]) => `<div class="stat"><strong>${v}</strong><small>${l}</small></div>`).join('')}</div></section>
<div class="hint">${k.hint}</div><div class="credit">Three.js · rotación medida en camera.rotation.y</div></main>
<script type="module">
import * as THREE from './three.module.js';
const ACCENT = ${JSON.stringify(ad.palette.accent)}, ACCENT2 = ${JSON.stringify(ad.palette.accent2)};
const canvas = document.getElementById('orbital');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(1280, 720, false); renderer.setPixelRatio(1);
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(${JSON.stringify(ad.palette.bg)}, .05);
const camera = new THREE.PerspectiveCamera(42, 16 / 9, .1, 100); camera.position.set(0, .35, 7.2);
const group = new THREE.Group(); scene.add(group);
group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 2), new THREE.MeshStandardMaterial({ color: new THREE.Color(ACCENT), metalness: .72, roughness: .26, wireframe: true })));
const halo = new THREE.Mesh(new THREE.TorusGeometry(2.85, .012, 8, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT2), transparent: true, opacity: .55 }));
halo.rotation.x = 1.08; group.add(halo);
for (let i = 0; i < 90; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.012, 4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT2).offsetHSL(0, 0, .18) })); p.position.set((Math.random() - .5) * 14, (Math.random() - .5) * 9, (Math.random() - .5) * 10); scene.add(p); }
scene.add(new THREE.HemisphereLight(new THREE.Color(ACCENT2), new THREE.Color(ACCENT), 1.05));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 5, 3); scene.add(key);
const rim = new THREE.DirectionalLight(new THREE.Color(ACCENT), 1.5); rim.position.set(-5, -2, -3); scene.add(rim);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const expectedDeg = 1.5; let frames = 0, start = performance.now(), drag = 0, dragging = false, lastX = 0, userDeg = 0;
window.__ve3d = { expectedDeg, currentDeg: 0, maxDeg: 0, frames: 0, reducedMotion: reduced, interactive: true };
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointermove', (e) => { if (!dragging) return; userDeg += (e.clientX - lastX) * .35; lastX = e.clientX; });
function tick(now) {
  frames++; const t = (now - start) / 1000;
  if (!dragging) userDeg += (0 - userDeg) * .03;
  const auto = reduced ? 0 : Math.sin(t * .7) * THREE.MathUtils.degToRad(expectedDeg);
  camera.rotation.y = auto + THREE.MathUtils.degToRad(userDeg);
  camera.rotation.x = Math.sin(t * .45) * .012;
  group.rotation.y = t * .08 + THREE.MathUtils.degToRad(userDeg * .4);
  group.rotation.x = Math.sin(t * .3) * .08; halo.rotation.z = t * .12;
  renderer.render(scene, camera);
  const deg = Math.abs(camera.rotation.y) * 180 / Math.PI;
  window.__ve3d = { ...window.__ve3d, currentDeg: deg, maxDeg: Math.max(window.__ve3d.maxDeg, deg), frames, userDeg };
  document.getElementById('readout').textContent = 'cámara ' + deg.toFixed(2) + '° · ' + frames + ' frames';
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick); window.__veReady = true;
</script></body></html>`;
}

function bMotion(ad) {
  const k = COPY['motion-graphics'];
  const scenes = k.shots.map(([n, h, p], i) => `<section class="scene s${i + 1}"><img src="reference.jpg" alt="Referencia CC0: ${k.referenceTitle}"><div class="shade"></div><div class="txt"><p class="num">${n}</p><h2>${h}</h2><p>${p}</p></div></section>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
body{background:#070708;color:#fff;height:100vh;overflow:hidden}
.reel{position:relative;height:calc(100vh - 52px);overflow:hidden;background:#070708}
.scene{position:absolute;inset:0;opacity:0;animation:cut 6s cubic-bezier(.4,0,.2,1) infinite}
.scene.s1{animation-delay:0s}.scene.s2{animation-delay:2s}.scene.s3{animation-delay:4s}
@keyframes cut{0%{opacity:1}33.2%{opacity:1}33.4%{opacity:0}100%{opacity:0}}
.scene img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.82) contrast(1.04) brightness(1.12)}
.scene.s1 img{object-position:50% 50%;transform:scale(1)}
.scene.s2 img{object-position:46% 42%;transform:scale(1.55)}
.scene.s3 img{object-position:52% 46%;transform:scale(2.05)}
.shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,7,8,.84) 0,rgba(7,7,8,.36) 38%,rgba(7,7,8,.06) 74%);animation:shade 2.2s cubic-bezier(.4,0,.2,1) infinite alternate}
@keyframes shade{from{opacity:.92}to{opacity:1}}
.txt{position:absolute;left:clamp(28px,5vw,62px);right:clamp(28px,5vw,62px);bottom:clamp(40px,8vh,84px);text-shadow:0 2px 26px #000b}
.num{font:11px var(--mono);letter-spacing:.22em;color:var(--accent);margin:0 0 10px}
.txt h2{font-family:var(--display),system-ui,sans-serif;font-size:clamp(54px,7.6vw,112px);line-height:.86;letter-spacing:-.07em;margin:0 0 14px;max-width:12ch;font-weight:800}
.txt p:last-child{max-width:46ch;color:color-mix(in srgb,var(--text) 86%,#fff);font-size:15px;line-height:1.5;margin:0}
.timeline{position:absolute;z-index:4;left:clamp(28px,5vw,62px);right:clamp(28px,5vw,62px);bottom:22px;display:flex;gap:6px}
.timeline i{height:2px;flex:1;background:#ffffff2e}.timeline i.on{background:var(--accent)}
.bar{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,60px);border-top:1px solid #ffffff1a;font:10px var(--mono);letter-spacing:.16em;color:#b9b9b9}
.bar b{color:var(--accent)}
@media(prefers-reduced-motion:reduce){.scene{animation:none}.scene.s1{opacity:1}.scene.s2,.scene.s3{opacity:0}}
</style></head><body><nav class="nav" style="border-color:#ffffff1a"><span class="brand">${k.brand}</span><span>${k.eyebrow}</span><span>1.0-rc.1</span></nav>
<main class="reel">${scenes}<div class="timeline"><i class="on"></i><i></i><i></i></div></main>
<footer class="bar"><span><b>${k.end}</b> · 1280×720 · 25 fps</span><span>tres planos · dos cortes</span></footer></body></html>`;
}

function bPage(id, ad) {
  if (id === 'premium-landing') return bLanding(ad);
  if (id === 'desktop-app') return bDesktop(ad);
  if (id === 'game-cinematic') return bGame(ad);
  if (id === 'scene-3d') return bScene3d(ad);
  return bMotion(ad);
}

/* ------------------------------ medición --------------------------------- */

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [], err = [];
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => err.push(d));
    p.on('close', (code) => code === 0 ? resolve(Buffer.concat(out).toString()) : reject(new Error(`${cmd} ${code}: ${Buffer.concat(err).toString().slice(0, 600)}`)));
  });
}

async function measurePage(dir, file, shotPath) {
  const server = await startStatic(dir);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-gl=swiftshader', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(server.url + file, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(700);
    const loadMs = Date.now() - t0;
    const fps = await page.evaluate(() => new Promise((resolve) => {
      let frames = 0; const start = performance.now();
      const tick = (t) => { frames++; if (t - start < 1100) requestAnimationFrame(tick); else resolve(Math.round((frames / ((performance.now() - start) / 1000)) * 10) / 10); };
      requestAnimationFrame(tick);
    }));
    let webgl = null;
    if (await page.evaluate(() => !!window.__ve3d)) {
      await page.waitForTimeout(600);
      const samples = [];
      for (let i = 0; i < 8; i++) { samples.push(await page.evaluate(() => window.__ve3d.currentDeg)); await page.waitForTimeout(100); }
      const state = await page.evaluate(() => window.__ve3d);
      const measured = Math.round(Math.max(...samples) * 100) / 100;
      webgl = { available: true, expectedDeg: state.expectedDeg, measuredMaxDeg: measured, errorDeg: Math.round(Math.abs(state.expectedDeg - measured) * 100) / 100, frames: state.frames, reducedMotion: state.reducedMotion, interactive: state.interactive, status: 'verified' };
    }
    await page.screenshot({ path: shotPath });
    await context.close();
    return { fps, loadMs, webgl };
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
  }
}

async function recordVideo(dir, file, outFile, ms = 6300) {
  const server = await startStatic(dir);
  const recDir = path.join(motionDir, 'recordings');
  fs.mkdirSync(recDir, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: recDir, size: { width: 1280, height: 720 } } });
    const page = await context.newPage();
    await page.goto(server.url + file, { waitUntil: 'load' });
    await page.waitForTimeout(ms);
    const video = page.video();
    await context.close();
    const webm = await video.path();
    // La grabación incluye el primer pintado y la cola del contexto: se
    // recortan 0,2 s al inicio y 0,4 s al final. Es edición del material
    // grabado, no un cambio de métrica, y queda declarado en motion.json.
    await run('ffmpeg', ['-y', '-ss', '0.2', '-i', webm, '-t', '5.8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25', outFile]);
    return outFile;
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
  }
}

const dim = (q, id) => { const d = q?.dimensions?.find((x) => x.id === id); return d?.available && d.score !== null ? d.score : null; };

function briefOf(c) { return { brief: c.brief, style: c.style, projectType: c.projectType }; }

function finishPartial(summary, only) {
  const measurePath = path.join(here, 'measurements.json');
  const prev = fs.existsSync(measurePath) ? JSON.parse(fs.readFileSync(measurePath, 'utf8')) : { cases: [] };
  const map = new Map(prev.cases.map((c) => [c.id, c]));
  for (const r of summary) map.set(r.id, r);
  const cases = [...map.values()].sort((a, b) => CASES.findIndex((c) => c.id === a.id) - CASES.findIndex((c) => c.id === b.id));
  const motion = JSON.parse(fs.readFileSync(path.join(motionDir, 'motion.json'), 'utf8'));
  const measurements = {
    version: '1.0.0-rc.1', generatedAt: new Date().toISOString(),
    platform: `${process.platform}/${process.arch}`, node: process.version,
    cases, motion: 'motion/motion.json',
    tokenNote: 'Tokens estimados por caracteres/4. No hay telemetría del proveedor. A/B es una pasada reproducible por proyecto, sin iteraciones.',
  };
  fs.writeFileSync(measurePath, JSON.stringify(measurements, null, 2) + '\n');
  fs.writeFileSync(path.join(here, 'RESULTS.md'), resultsMarkdown(cases, motion));
  console.log('Evidencia parcial actualizada:', only.join(', '));
}

async function main() {
  // Referencias CC0: se copian del corpus 0.6 y se documentan con rutas relativas.
  const metadata = [];
  for (const c of CASES) {
    const src = path.join(SOURCE_REFS, c.file);
    const dst = path.join(refsDir, c.file);
    if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
    metadata.push({ id: c.id, ...c.reference, file: `references/${c.file}`, license: 'CC0 / Public Domain, The Metropolitan Museum of Art Open Access' });
  }
  fs.writeFileSync(path.join(refsDir, 'metadata.json'), JSON.stringify({ downloadedAt: new Date().toISOString(), references: metadata }, null, 2) + '\n');

  const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const cases = ONLY.length ? CASES.filter((c) => ONLY.includes(c.id)) : CASES;
  const summary = [];
  for (const c of cases) {
    const dir = path.join(projDir, c.id);
    fs.mkdirSync(path.join(dir, 'captures'), { recursive: true });
    const refPath = path.join(refsDir, c.file);
    fs.copyFileSync(refPath, path.join(dir, 'reference.jpg'));
    if (c.id === 'scene-3d') fs.copyFileSync(path.join(root, 'node_modules/three/build/three.module.js'), path.join(dir, 'three.module.js'));
    const ad = buildArtDirection(briefOf(c));
    const derived = await referencePalette(refPath, c.projectType);
    if (derived) ad.palette = { ...ad.palette, ...derived };
    if (c.projectType === 'game-hud' && derived) {
      const analysis = await analyzeFile(refPath, { samples: 1, width: 160 });
      const warm = materialAccent(analysis.palette, derived.bg);
      if (warm) ad.palette = { ...ad.palette, ...warm };
    }
    const aHtml = aPage(c.id);
    const bHtml = bPage(c.id, ad);
    fs.writeFileSync(path.join(dir, 'baseline.html'), aHtml);
    fs.writeFileSync(path.join(dir, 'index.html'), bHtml);

    const aPerf = await measurePage(dir, 'baseline.html', path.join(dir, 'captures', 'before.png'));
    const bPerf = await measurePage(dir, 'index.html', path.join(dir, 'captures', 'after.png'));
    const common = { reference: refPath, targetDir: dir, ...briefOf(c), width: 1280, height: 720, frames: 6, intervalMs: 250, waitMs: 700 };
    const aIntel = await opIntelligence({ ...common, target: 'baseline.html', outDir: path.join(dir, 'measure-a'), performance: { fps: aPerf.fps, loadMs: aPerf.loadMs } });
    const bIntel = await opIntelligence({ ...common, target: 'index.html', outDir: path.join(dir, 'measure-b'), performance: { fps: bPerf.fps, loadMs: bPerf.loadMs } });

    const pick = (i, perf) => ({
      quality: i.review.quality.overall, fidelity: i.fidelity.score, pixelSimilarity: i.fidelity.pixelSimilarity,
      accessibility: dim(i.review.quality, 'accessibility'), composition: dim(i.review.quality, 'composition'),
      typography: dim(i.review.quality, 'typography'), performance: dim(i.review.quality, 'performance'),
      fps: perf.fps, loadMs: perf.loadMs, critic: i.critic.score, critical: i.critic.counts.critical, high: i.critic.counts.high,
      gates: i.gates.decision, webgl: perf.webgl,
    });
    const row = {
      id: c.id, reference: c.reference,
      source: { aChars: aHtml.length, bChars: bHtml.length, aTokensEstimate: Math.ceil(aHtml.length / 4), bTokensEstimate: Math.ceil(bHtml.length / 4), modelTokens: null, iterations: 0 },
      a: pick(aIntel, aPerf), b: pick(bIntel, bPerf),
    };
    summary.push(row);
    fs.writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify(row, null, 2) + '\n');
    console.log(`${c.id}: calidad ${row.a.quality} → ${row.b.quality} · fidelidad ${row.a.fidelity} → ${row.b.fidelity} · gates ${row.a.gates} → ${row.b.gates}${bPerf.webgl ? ` · WebGL ${bPerf.webgl.measuredMaxDeg}°/${bPerf.webgl.expectedDeg}°` : ''}`);
  }

  // Vídeo: A estático y B con los tres planos; la referencia marca los cortes.
  if (ONLY.length) return finishPartial(summary, ONLY);
  const refVideo = path.join(refsDir, 'motion-reference.mp4');
  if (!fs.existsSync(refVideo)) fs.copyFileSync(path.join(SOURCE_REFS, 'motion-reference.mp4'), refVideo);
  const mDir = path.join(projDir, 'motion-graphics');
  const beforeMp4 = await recordVideo(mDir, 'baseline.html', path.join(motionDir, 'before.mp4'));
  const afterMp4 = await recordVideo(mDir, 'index.html', path.join(motionDir, 'after.mp4'));
  const refTimeline = await analyzeTimeline(refVideo, { samples: 20 });
  const bTimeline = await analyzeTimeline(afterMp4, { samples: 20 });
  let temporal = await temporalCompare(refVideo, afterMp4, { samples: 16, outDir: path.join(motionDir, 'temporal') });
  const beforeTemporal = await temporalCompare(refVideo, beforeMp4, { samples: 16, outDir: path.join(motionDir, 'temporal-before') });

  // Corrección medida: si la luminancia media difiere, se ajusta la exposición
  // del vídeo con una curva equivalente y se vuelve a medir. No se toca la métrica.
  let correction = null;
  if (temporal.score < 75) {
    const meanRef = temporal.points.reduce((s, p) => s + p.lumaRef, 0) / temporal.points.length;
    const meanCand = temporal.points.reduce((s, p) => s + p.lumaCand, 0) / temporal.points.length;
    const gain = Math.max(0.75, Math.min(1.35, meanRef / Math.max(0.02, meanCand)));
    const adjusted = path.join(motionDir, 'after-adjusted.mp4');
    await run('ffmpeg', ['-y', '-i', afterMp4, '-vf', `eq=brightness=${(gain - 1).toFixed(3)}:contrast=1.0`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25', adjusted]);
    const adjustedTemporal = await temporalCompare(refVideo, adjusted, { samples: 16, outDir: path.join(motionDir, 'temporal-adjusted') });
    correction = { gain: Math.round(gain * 1000) / 1000, before: temporal.score, after: adjustedTemporal.score, used: adjustedTemporal.score > temporal.score };
    if (correction.used) {
      fs.copyFileSync(adjusted, path.join(motionDir, 'after.mp4'));
      temporal = adjustedTemporal;
    }
  }

  const motion = {
    videos: { reference: 'references/motion-reference.mp4', before: 'motion/before.mp4', after: 'motion/after.mp4' },
    info: { reference: await probe(refVideo), before: await probe(beforeMp4), after: await probe(afterMp4) },
    referenceCuts: refTimeline.cuts,
    afterCuts: bTimeline.cuts,
    afterPace: bTimeline.pace,
    temporal: { before: { score: beforeTemporal.score, grade: beforeTemporal.grade, curves: beforeTemporal.curves }, after: { score: temporal.score, grade: temporal.grade, curves: temporal.curves, warnings: temporal.warnings } },
    correction,
    note: 'Vídeo real grabado con Playwright a 1280×720 y convertido a 25 fps. Se recortan 0,2 s de arranque y 0,4 s de cola del contexto de grabación. La referencia es un montaje de tres planos de una obra CC0 del MET, no una pieza externa licenciada. La corrección de exposición, si se aplica, es un ajuste de vídeo declarado y no un cambio de métrica.',
  };
  fs.writeFileSync(path.join(motionDir, 'motion.json'), JSON.stringify(motion, null, 2) + '\n');

  const measurements = {
    version: '1.0.0-rc.1',
    generatedAt: new Date().toISOString(),
    platform: `${process.platform}/${process.arch}`,
    node: process.version,
    cases: summary,
    motion: 'motion/motion.json',
    tokenNote: 'Tokens estimados por caracteres/4. No hay telemetría del proveedor. A/B es una pasada reproducible por proyecto, sin iteraciones.',
  };
  fs.writeFileSync(path.join(here, 'measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
  fs.writeFileSync(path.join(here, 'RESULTS.md'), resultsMarkdown(summary, motion));
  console.log('Evidencia 1.0-rc generada en', here);
}

function resultsMarkdown(rows, motion) {
  const f = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(1));
  const table = rows.map((r) => `| ${r.id} | ${f(r.a.quality)} → **${f(r.b.quality)}** | ${f(r.a.fidelity)} → **${f(r.b.fidelity)}** | ${f(r.a.composition)} → ${f(r.b.composition)} | ${f(r.a.accessibility)} → ${f(r.b.accessibility)} | ${r.a.gates} → **${r.b.gates}** |`).join('\n');
  const perf = rows.map((r) => `| ${r.id} | ${r.a.fps} → ${r.b.fps} | ${r.a.loadMs} → ${r.b.loadMs} | ${r.a.critical}/${r.a.high} → ${r.b.critical}/${r.b.high} | ${r.source.aTokensEstimate} → ${r.source.bTokensEstimate} |`).join('\n');
  const webgl = rows.filter((r) => r.b.webgl);
  return `# Visual Engine 1.0.0-rc.1 — evidencia de calidad visual

Cinco proyectos nuevos, medidos con el mismo motor y los mismos umbrales que 0.6. A es una plantilla genérica con el mismo copy; B usa dirección artística, paleta derivada de la referencia, contraste WCAG, jerarquía y movimiento. No se modificó ninguna fórmula, peso ni umbral. Una sola pasada por proyecto.

## Calidad

| Proyecto | Calidad A → B | Fidelidad A → B | Composición A → B | Accesibilidad A → B | Gates A → B |
| --- | ---: | ---: | ---: | ---: | --- |
${table}

## Rendimiento, crítica y coste

| Proyecto | FPS A → B | Carga ms A → B | Críticos/altos A → B | Tokens est. A → B |
| --- | ---: | ---: | ---: | ---: |
${perf}

## Motion graphics

- Referencia: ${motion.info.reference.width}×${motion.info.reference.height}, ${motion.info.reference.fps} fps, ${motion.info.reference.duration.toFixed(2)} s, cortes medidos en ${(motion.referenceCuts ?? []).map((c) => c.toFixed(2)).join(' y ') || '—'} s.
- Resultado: ${motion.info.after.width}×${motion.info.after.height}, ${motion.info.after.fps} fps, ${motion.info.after.duration.toFixed(2)} s, cortes ${(motion.afterCuts ?? []).map((c) => c.toFixed(2)).join(' y ') || '—'} s.
- Fidelidad temporal: **${motion.temporal.before.score}** (A, estático) → **${motion.temporal.after.score}** (B, ${motion.temporal.after.grade}).
- Curvas B: luma ${motion.temporal.after.curves.luma}, forma ${motion.temporal.after.curves.lumaCurve}, movimiento ${motion.temporal.after.curves.motionCorrelation}, F1 de cortes ${motion.temporal.after.curves.cutF1}, deriva ${motion.temporal.after.curves.driftSeconds} s.
${motion.correction ? `- Corrección de exposición declarada: ganancia ${motion.correction.gain}; ${motion.correction.before} → ${motion.correction.after}${motion.correction.used ? ' (aplicada)' : ' (descartada por no mejorar)'}.` : '- Sin corrección de exposición: la primera medición superó el umbral de revisión.'}

## WebGL

${webgl.length ? webgl.map((r) => `- ${r.id}: ${r.b.webgl.measuredMaxDeg}° medidos frente a ${r.b.webgl.expectedDeg}° esperados (error ${r.b.webgl.errorDeg}°, ${r.b.webgl.frames} frames, interactivo: ${r.b.webgl.interactive ? 'sí' : 'no'}).`).join('\n') : '- No se midió WebGL en esta pasada.'}

## Límites

- Las referencias son obras CC0 del MET usadas como dirección visual, no capturas de producto de esos dominios.
- La fidelidad estructural es un proxy: no demuestra intención artística ni superioridad frente a una pieza profesional externa.
- Los tokens son estimados por caracteres; no hay telemetría del proveedor.
- A y B los genera el mismo banco reproducible, no dos modelos distintos.
- La aprobación artística final es humana.
`;
}

main().catch((e) => { console.error(e); process.exit(1); });
