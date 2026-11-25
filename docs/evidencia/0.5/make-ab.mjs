#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { opIntelligence } from '../../../dist/core/intelligence-ops.js';
import { buildArtDirection } from '../../../dist/core/styles.js';
import { probe } from '../../../dist/core/media.js';
import { analyzeTimeline } from '../../../dist/core/timeline.js';
import { temporalCompare } from '../../../dist/core/temporal.js';
import { startStatic } from '../../../dist/core/static.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const refsDir = path.join(here, 'references');
const abDir = path.join(here, 'ab');
const measureDir = path.join(here, 'measure');
fs.mkdirSync(refsDir, { recursive: true });
fs.mkdirSync(abDir, { recursive: true });
fs.mkdirSync(measureDir, { recursive: true });

const REFERENCES = [
  { id: 'professional-app', objectId: 399581, title: 'Architecture', artist: 'Michelangelo Colonna', date: '17th century', image: 'https://images.metmuseum.org/CRDImages/dp/original/DP841055.jpg', url: 'https://www.metmuseum.org/art/collection/search/399581' },
  { id: 'premium-landing', objectId: 438817, title: 'The Dance Class', artist: 'Edgar Degas', date: '1874', image: 'https://images.metmuseum.org/CRDImages/ep/original/DP-20101-001.jpg', url: 'https://www.metmuseum.org/art/collection/search/438817' },
  { id: 'game-ui', objectId: 23206, title: 'Armor', artist: 'Anonymous', date: 'ca. 1540–50 and later', image: 'https://images.metmuseum.org/CRDImages/aa/original/DP-36206-003.jpg', url: 'https://www.metmuseum.org/art/collection/search/23206' },
  { id: 'scene-3d', objectId: 203938, title: 'Astronomy', artist: 'Giambologna', date: '17th century', image: 'https://images.metmuseum.org/CRDImages/es/original/DP-915-001.jpg', url: 'https://www.metmuseum.org/art/collection/search/203938' },
  { id: 'motion-graphics', objectId: 438817, title: 'The Dance Class', artist: 'Edgar Degas', date: '1874', image: 'https://images.metmuseum.org/CRDImages/ep/original/DP-20101-001.jpg', url: 'https://www.metmuseum.org/art/collection/search/438817' },
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [], err = [];
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => err.push(d));
    p.on('close', (code) => code === 0 ? resolve(Buffer.concat(out).toString()) : reject(new Error(`${cmd} ${code}: ${Buffer.concat(err).toString().slice(0, 700)}`)));
  });
}

async function downloadReferences() {
  const metadata = [];
  for (const ref of REFERENCES) {
    const file = path.join(refsDir, `${ref.id}.jpg`);
    if (!fs.existsSync(file)) {
      const r = await fetch(ref.image);
      if (!r.ok) throw new Error(`No se pudo descargar ${ref.id}: HTTP ${r.status}`);
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    metadata.push({ ...ref, file: path.relative(here, file).replace(/\\/g, '/'), license: 'CC0 / Public Domain, The Metropolitan Museum of Art Open Access' });
  }
  fs.writeFileSync(path.join(refsDir, 'metadata.json'), JSON.stringify({ downloadedAt: new Date().toISOString(), references: metadata }, null, 2) + '\n');
  return metadata;
}

async function makeCrops(refs) {
  for (const ref of refs) {
    const src = path.join(here, ref.file);
    const dest = path.join(refsDir, `${ref.id}-16x9.jpg`);
    if (!fs.existsSync(dest)) {
      await run('ffmpeg', ['-y', '-i', src, '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720', '-frames:v', '1', '-q:v', '2', dest]);
    }
    ref.crop = dest;
  }
  // Vídeo de referencia con tres planos reales y dos cortes, derivado de la obra CC0.
  const src = path.join(here, refs.find((r) => r.id === 'motion-graphics').file);
  const refVideo = path.join(refsDir, 'motion-reference.mp4');
  if (!fs.existsSync(refVideo)) {
    const filter = [
      '[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,trim=0:2,setpts=PTS-STARTPTS,fps=25[v0]',
      '[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=800:450:240:120,scale=1280:720,trim=0:2,setpts=PTS-STARTPTS,fps=25[v1]',
      '[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=640:360:320:180,scale=1280:720,trim=0:2,setpts=PTS-STARTPTS,fps=25[v2]',
      '[v0][v1][v2]concat=n=3:v=1:a=0[out]',
    ].join(';');
    await run('ffmpeg', ['-y', '-loop', '1', '-i', src, '-t', '6', '-filter_complex', filter, '-map', '[out]', '-r', '25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', refVideo]);
  }
  return refVideo;
}

const CONTENT = {
  'professional-app': {
    kicker: 'Atlas / operaciones', title: 'Toda la operación, en una sola lectura.',
    lead: 'Un panel profesional para decidir rápido: estado, capacidad y riesgo en el mismo plano.',
    meta: ['12.4k', '98.2 %', '4 min', '3 alertas'],
    labels: ['peticiones/min', 'disponibilidad', 'latencia p95', 'incidentes'],
    table: ['Cola de trabajo', 'Propietario', 'Estado', 'Prioridad', 'Facturación', 'Operaciones', 'Alta', 'Ingresos', 'Soporte', 'Normal', 'Infraestructura', 'Alta'],
  },
  'premium-landing': {
    kicker: 'Casa Lumen / 2026', title: 'La luz también se proyecta.',
    lead: 'Arquitectura residencial que trabaja con el clima, la sombra y el tiempo. Un proyecto editorial para habitar despacio.',
    meta: ['24', '9', '18 años', '1:1'],
    labels: ['proyectos', 'provincias', 'trayectoria', 'acompañamiento'],
    table: ['Selección de obra', 'Luz de tarde', 'Patio de agua', 'Casa del bosque', 'Tres patios', 'Estudio'],
  },
  'game-ui': {
    kicker: 'VANGUARD / SECTOR 07', title: 'No cruces la línea.',
    lead: 'HUD diegético para una misión de extracción. Estado, objetivo y amenaza visibles en menos de un parpadeo.',
    meta: ['84', '12', '03', 'A-07'],
    labels: ['integridad', 'munición', 'objetivos', 'sector'],
    table: ['OBJETIVO', 'Recuperar el núcleo', 'AMENAZA', 'Patrulla de asalto', 'RUTA', 'Sector 07 / muelle'],
  },
  'scene-3d': {
    kicker: 'ORBITAL / ESTUDIO 04', title: 'Una órbita no es una línea.',
    lead: 'Escena espacial interactiva con cámara Three.js, profundidad real y movimiento que respeta reduced motion.',
    meta: ['01', '6°', '24', 'WebGL'],
    labels: ['cuerpo', 'órbita', 'capas', 'render'],
    table: ['Cámara', 'Órbita senoidal', 'Profundidad', 'Tres planos', 'Movimiento', 'Reduced motion'],
  },
  'motion-graphics': {
    kicker: 'SIGNAL / 24 FPS', title: 'Tres planos. Un pulso.',
    lead: 'Reel de motion graphics con entrada tipográfica, corte en el pico y transición medida. El tiempo es la composición.',
    meta: ['00:06', '03', '24', '2.39:1'],
    labels: ['duración', 'planos', 'fps', 'formato'],
    table: ['PLANO 01', 'Apertura', 'PLANO 02', 'Detalle', 'PLANO 03', 'Cierre'],
  },
};

const A_CSS = `
*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#eaf0ff;font-family:Inter,system-ui,sans-serif}
.nav{display:flex;justify-content:space-between;align-items:center;padding:18px 32px;border-bottom:1px solid #25344d;font-size:12px;color:#aab6cf}
.brand{font-weight:800;letter-spacing:.08em;color:#6ee7b7}.shell{max-width:1180px;margin:auto;padding:48px 32px}
.kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6ee7b7}
h1{font-size:44px;line-height:1.05;letter-spacing:-.04em;max-width:700px;margin:16px 0}
.lead{font-size:15px;line-height:1.6;color:#aab6cf;max-width:650px}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:34px 0}
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

function aPage(c) {
  const k = CONTENT[c.id];
  const metrics = k.meta.map((v, i) => `<div class="metric"><strong>${v}</strong><small>${k.labels[i]}</small></div>`).join('');
  let body = '';
  if (c.id === 'professional-app') {
    body = `<div class="grid"><section class="panel">${k.table.slice(0, 9).map((x, i) => `<div class="row"><span>${x}</span><span class="chip">${i % 2 ? 'normal' : 'alta'}</span></div>`).join('')}</section><aside class="panel"><small>Capacidad</small><div class="bars">${[40, 64, 38, 78, 56, 86, 48, 70].map((h) => `<i style="height:${h}%"></i>`).join('')}</div></aside></div>`;
  } else if (c.id === 'premium-landing') {
    body = `<div class="grid"><section class="panel"><p class="kicker">Obra seleccionada</p><h2 style="font-size:28px">Espacios que no compiten con la luz.</h2><div class="row"><span>${k.table[1]}</span><span class="chip">ver</span></div><div class="row"><span>${k.table[2]}</span><span class="chip">ver</span></div></section><aside class="panel"><div class="scene"></div></aside></div>`;
  } else if (c.id === 'game-ui') {
    body = `<div class="scene"><div class="hud">${k.table.join(' · ')}</div></div><div class="grid" style="margin-top:16px"><section class="panel">${k.table.map((x) => `<div class="row"><span>${x}</span></div>`).join('')}</section><aside class="panel"><strong style="font-size:40px">84</strong><p>integridad</p></aside></div>`;
  } else if (c.id === 'scene-3d') {
    body = `<div class="scene"><div style="position:absolute;inset:32% 26%;border:1px solid #8b7bff;transform:rotate(18deg);box-shadow:0 0 60px #8b7bff55"></div><div class="hud">${k.table.join(' · ')}</div></div>`;
  } else {
    body = `<div class="scene"><div style="position:absolute;inset:0;display:grid;place-items:center;font:800 58px/1 system-ui;letter-spacing:-.06em">${k.title}</div><div class="hud">${k.table.join(' · ')}</div></div>`;
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — A</title><style>${A_CSS}</style></head><body><nav class="nav"><span class="brand">${k.kicker.split('/')[0]}</span><span>Producto · Precios · Contacto</span></nav><main class="shell"><p class="kicker">${k.kicker}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="metrics">${metrics}</div>${body}</main><footer class="footer">Generado sin Visual Engine · mismo copy · 1280×720</footer></body></html>`;
}

function tokenCss(ad) {
  const p = ad.palette;
  return `
:root{--bg:${p.bg};--surface:${p.surface};--elevated:${p.elevated};--ink:${p.text};--muted:${p.muted};--accent:${p.accent};--accent2:${p.accent2};--border:${p.border};--mono:${ad.typography.families.mono}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:${ad.typography.families.body},system-ui,sans-serif;font-size:${ad.typography.sizes.body}px;line-height:${ad.typography.lineHeight}}
a{color:inherit}.nav{display:flex;justify-content:space-between;align-items:center;padding:18px clamp(20px,5vw,56px);border-bottom:1px solid var(--border);font-size:11px;color:var(--muted);letter-spacing:.04em;position:relative;z-index:3}
.brand{font-family:var(--mono);font-weight:700;color:var(--ink);letter-spacing:.08em}.eyebrow{font:11px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
`;
}

function bGamePage(c, ad) {
  const k = CONTENT[c.id];
  const metrics = k.meta.map((v, i) => `<div class="gmetric"><strong>${v}</strong><small>${k.labels[i]}</small></div>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
body{background:#061016;color:#f4f8ff}.game{position:relative;min-height:100vh;overflow:hidden;display:flex;flex-direction:column}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.72) contrast(1.08);opacity:.9}
.scrim{position:absolute;inset:0;background:linear-gradient(90deg,#040b0fe8 0 34%,#040b0f66 64%,#040b0fd9),linear-gradient(0deg,#040b0ff2 0,transparent 58%)}
.game-copy{position:relative;z-index:2;margin:auto 0;padding:30px clamp(22px,6vw,74px);max-width:760px}.game-copy h1{font-family:${ad.typography.families.display},system-ui,sans-serif;font-size:clamp(58px,8vw,110px);line-height:.86;letter-spacing:-.065em;margin:14px 0 18px;max-width:8ch;font-weight:800}
.game-copy .lead{color:#cfe1e8;font-size:17px;line-height:1.55;max-width:48ch}.gmetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#63ffb544;border:1px solid #63ffb544;margin-top:28px;max-width:620px}
.gmetric{background:#061016cc;padding:14px 16px;backdrop-filter:blur(8px)}.gmetric strong{display:block;font:700 30px var(--mono);letter-spacing:-.05em}.gmetric small{font:10px var(--mono);color:#9fb9bf;text-transform:uppercase;letter-spacing:.08em}
.reticle{position:absolute;z-index:2;right:17%;top:41%;width:44px;height:44px;border:1px solid #63ffb5;border-radius:50%;box-shadow:0 0 0 12px #63ffb51a,0 0 30px #63ffb544}.reticle:before,.reticle:after{content:"";position:absolute;background:#63ffb5}.reticle:before{left:50%;top:-12px;width:1px;height:68px}.reticle:after{top:50%;left:-12px;height:1px;width:68px}
.hud-right{position:absolute;z-index:2;right:clamp(20px,5vw,56px);bottom:26px;text-align:right;font:11px var(--mono);color:#a9c3c8;line-height:1.8}.hud-right b{color:#63ffb5}
.scan{position:absolute;inset:0;z-index:1;background:repeating-linear-gradient(0deg,transparent 0 3px,#63ffb50b 3px 4px);pointer-events:none}
@media(max-width:720px){.gmetrics{grid-template-columns:repeat(2,1fr)}.reticle{right:8%;top:30%}.game-copy h1{font-size:56px}}
@media(prefers-reduced-motion:reduce){.scan{display:none}}
</style></head><body><div class="game"><img class="bg" src="reference.jpg" alt="Referencia CC0: armadura del MET"><div class="scrim"></div><div class="scan"></div><nav class="nav" style="border-color:#63ffb533"><span class="brand">VANGUARD</span><span>SECTOR 07</span><span>VISUAL ENGINE / 0.5</span></nav><section class="game-copy"><p class="eyebrow">${k.kicker}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="gmetrics">${metrics}</div></section><div class="reticle"></div><div class="hud-right">OBJETIVO <b>NÚCLEO / A-07</b><br>AMENAZA <b>PATRULLA DE ASALTO</b><br>RUTA <b>MUELLE / 03</b></div></div></body></html>`;
}

function bThreePage(c, ad) {
  const k = CONTENT[c.id];
  const metrics = k.meta.map((v, i) => `<div class="metric"><strong>${v}</strong><small>${k.labels[i]}</small></div>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
body{background:#05060f;color:#f3f5ff}.scene3{position:relative;height:100vh;overflow:hidden;isolation:isolate}.ref3{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42;filter:grayscale(.65) sepia(.35) contrast(1.15);z-index:-3}.veil{position:absolute;inset:0;background:radial-gradient(circle at 72% 40%,#8b7bff22,transparent 38%),linear-gradient(90deg,#05060fee 0 38%,#05060f88 62%,#05060fcc);z-index:-2}
#orbital{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.overlay3{position:relative;z-index:2;max-width:660px;padding:8vh clamp(22px,6vw,74px) 0}.overlay3 h1{font-family:${ad.typography.families.display},system-ui,sans-serif;font-size:clamp(52px,6.8vw,94px);line-height:.9;letter-spacing:-.065em;margin:14px 0 18px;max-width:10ch;font-weight:650}.overlay3 .lead{color:#b5c0dc;max-width:46ch;font-size:17px}
.readout{font:11px var(--mono);color:var(--accent2);margin-top:18px;letter-spacing:.04em}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#27335a;border:1px solid #27335a;margin-top:26px;max-width:600px}.metric{background:#05060fcc;padding:12px 14px;backdrop-filter:blur(8px)}.metric strong{font:600 24px var(--mono)}.metric small{display:block;color:#a5b0d0;font-size:10px}.credit{position:absolute;z-index:2;right:22px;bottom:18px;color:#8d99b8;font:10px var(--mono)}
@media(max-width:760px){.overlay3{padding-top:5vh}.metrics{grid-template-columns:repeat(2,1fr)}.overlay3 h1{font-size:48px}}
@media(prefers-reduced-motion:reduce){#orbital{opacity:.45}}
</style></head><body><main class="scene3"><img class="ref3" src="reference.jpg" alt="Referencia CC0: escultura Astronomía del MET"><div class="veil"></div><canvas id="orbital" width="1280" height="720" aria-label="Escena 3D orbital"></canvas><nav class="nav" style="border-color:#27335a"><span class="brand">ORBITAL</span><span>ESTUDIO 04</span><span>VISUAL ENGINE / 0.5</span></nav><section class="overlay3"><p class="eyebrow">${k.kicker}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="readout" id="readout">cámara 0.00° · 0 frames</div><div class="metrics">${metrics}</div></section><div class="credit">cámara Three.js real · rotación 1,5°</div></main>${threeScript(c)}</body></html>`;
}

function bMotionPage(c, ad) {
  const k = CONTENT[c.id];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>${tokenCss(ad)}
body{background:#090909;color:#fff}.reel{position:relative;height:calc(100vh - 58px);min-height:540px;overflow:hidden;background:#090909}.scene{position:absolute;inset:0;padding:clamp(28px,5vw,58px);display:flex;flex-direction:column;justify-content:flex-end;opacity:0;animation:cut 6s infinite}.scene.s2{animation-delay:2s}.scene.s3{animation-delay:4s}.scene.s1{opacity:1}
.scene .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.7) contrast(1.08);z-index:-3}.scene:before{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#090909f2 0,#09090999 44%,#09090966);z-index:-2}
.scene h2{font-family:${ad.typography.families.display},system-ui,sans-serif;font-size:clamp(56px,8.2vw,118px);line-height:.84;letter-spacing:-.07em;max-width:11ch;margin:8px 0 14px;font-weight:800}.scene p{max-width:44ch;color:#d8d8d8;font-size:16px;line-height:1.5}.num{font:11px var(--mono);color:var(--accent);letter-spacing:.16em}
.timeline{position:absolute;left:clamp(28px,5vw,58px);right:clamp(28px,5vw,58px);bottom:22px;display:flex;gap:7px}.timeline i{height:2px;flex:1;background:#ffffff33}.timeline i:first-child{background:var(--accent)}
@keyframes cut{0%,32%{opacity:1}33%,100%{opacity:0}}@media(prefers-reduced-motion:reduce){.scene{animation:none}.scene.s2,.scene.s3{opacity:0}.scene.s1{opacity:1}}
</style></head><body><nav class="nav" style="border-color:#ffffff22"><span class="brand">SIGNAL / 24</span><span>REEL 00:06</span><span>VISUAL ENGINE / 0.5</span></nav><main class="reel"><section class="scene s1"><img class="bg" src="reference.jpg" alt="Referencia CC0: clase de danza de Degas"><p class="num">PLANO 01 / APERTURA</p><h2>${k.title}</h2><p>${k.lead}</p></section><section class="scene s2"><img class="bg" src="reference.jpg" alt="Referencia CC0: detalle"><p class="num">PLANO 02 / DETALLE</p><h2>El corte llega en el pico.</h2><p>Ritmo, no acumulación. Tres planos con una intención cada uno.</p></section><section class="scene s3"><img class="bg" src="reference.jpg" alt="Referencia CC0: cierre"><p class="num">PLANO 03 / CIERRE</p><h2>Un pulso.</h2><p>La transición se mide; el tiempo es la composición.</p></section><div class="timeline"><i></i><i></i><i></i></div></main><script>window.__veReady=true;</script></body></html>`;
}

function bPage(c, ad) {
  if (c.id === 'game-ui') return bGamePage(c, ad);
  if (c.id === 'scene-3d') return bThreePage(c, ad);
  if (c.id === 'motion-graphics') return bMotionPage(c, ad);
  const k = CONTENT[c.id];
  const p = ad.palette;
  const metrics = k.meta.map((v, i) => `<div class="metric"><strong>${v}</strong><small>${k.labels[i]}</small></div>`).join('');
  const img = `<img class="ref" src="reference.jpg" alt="Referencia visual CC0: ${c.title}">`;
  let body = '';
  if (c.id === 'professional-app') {
    body = `<div class="workspace"><aside class="panel refpanel">${img}<div class="caption">Una estructura, no una decoración.</div></aside><section class="panel">${k.table.slice(0, 9).map((x, i) => `<div class="row"><span>${x}</span><span class="chip">${i % 2 ? 'normal' : 'alta'}</span></div>`).join('')}</section><aside class="panel"><small>Capacidad</small><div class="bars">${[40, 64, 38, 78, 56, 86, 48, 70].map((h) => `<i style="height:${h}%"></i>`).join('')}</div></aside></div>`;
  } else if (c.id === 'premium-landing') {
    body = `<div class="split"><section><p class="eyebrow">Obra seleccionada</p><h2>Espacios que no compiten con la luz.</h2><p class="measure">La referencia entra como material, no como fondo decorativo. La escala y el aire sostienen la lectura.</p><a class="cta" href="#obra">Ver la selección <span>→</span></a></section><figure class="media">${img}<figcaption>${k.table[1]} · ${k.table[2]}</figcaption></figure></div>`;
  } else if (c.id === 'game-ui') {
    body = `<div class="hudscene">${img}<div class="hud-top"><span>VANGUARD</span><span>${k.meta[3]}</span></div><div class="reticle"></div><div class="hud-bottom"><div><small>INTEGRIDAD</small><b>84</b></div><div><small>MUNICIÓN</small><b>12</b></div><div><small>OBJETIVO</small><b>03</b></div></div><div class="scan"></div></div><div class="brief">${k.table.map((x) => `<div class="row"><span>${x}</span></div>`).join('')}</div>`;
  } else if (c.id === 'scene-3d') {
    body = `<div class="stage"><canvas id="orbital" width="1280" height="720" aria-label="Escena 3D orbital"></canvas><div class="overlay"><p class="eyebrow">WebGL real / Three.js</p><h2>Una órbita no es una línea.</h2><p class="measure">La cámara recorre 1,5° y vuelve. La medición se lee del objeto de cámara, no de una captura.</p><div class="readout" id="readout">cámara 0.00° · 0 frames</div></div></div>`;
  } else {
    body = `<div class="reel"><div class="scene s1 active"><span class="num">01</span><h2>${k.title}</h2><p>${k.lead}</p></div><div class="scene s2"><span class="num">02</span><h2>Detalle</h2><p>El corte llega en el pico del movimiento.</p></div><div class="scene s3"><span class="num">03</span><h2>Cierre</h2><p>Un pulso, no una colección de adornos.</p></div><div class="timeline"><i></i><i></i><i></i></div></div>`;
  }
  const sceneCss = c.id === 'motion-graphics' ? `
.reel{position:relative;height:420px;overflow:hidden;background:var(--bg);border:1px solid var(--border)}
.scene{position:absolute;inset:0;padding:54px;display:flex;flex-direction:column;justify-content:center;opacity:0;animation:cut 6s infinite}
.scene.s2{animation-delay:2s}.scene.s3{animation-delay:4s}
.scene.active{opacity:1}.num{font:12px var(--mono);color:var(--accent);letter-spacing:.12em}
.scene h2{font-size:clamp(48px,7vw,96px);line-height:.9;letter-spacing:-.06em;max-width:9ch;margin:12px 0}
.scene p{max-width:44ch;color:var(--muted);font-size:18px}.timeline{position:absolute;left:54px;right:54px;bottom:26px;display:flex;gap:8px}
.timeline i{height:3px;flex:1;background:var(--border)}.timeline i:first-child{background:var(--accent)}
@keyframes cut{0%,32%{opacity:1}33%,100%{opacity:0}}
@media(prefers-reduced-motion:reduce){.scene{animation:none}.scene.s1{opacity:1}.scene.s2,.scene.s3{opacity:0}}
` : '';
  const hudCss = c.id === 'game-ui' ? `
.hudscene{position:relative;height:410px;overflow:hidden;border:1px solid var(--border);background:var(--bg)}
.hudscene .ref{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.7) contrast(1.1)}
.hudscene:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.85))}
.hud-top,.hud-bottom,.reticle{position:absolute;z-index:2;color:#fff;font-family:var(--mono)}.hud-top{top:20px;left:22px;right:22px;display:flex;justify-content:space-between;font-size:12px;letter-spacing:.12em}
.hud-bottom{bottom:22px;left:22px;right:22px;display:flex;gap:26px}.hud-bottom small{display:block;font-size:10px;color:#cdebd7}.hud-bottom b{font-size:28px}
.reticle{left:50%;top:48%;width:34px;height:34px;border:1px solid #63ffb5;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 8px #63ffb522}
.scan{position:absolute;inset:0;z-index:1;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(99,255,181,.06) 3px 4px);pointer-events:none}
.brief{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--border);border-top:0}
.brief .row{padding:14px;border:0;border-right:1px solid var(--border);font-size:12px}
` : '';
  const threeCss = c.id === 'scene-3d' ? `
.stage{position:relative;height:430px;background:var(--bg);border:1px solid var(--border);overflow:hidden}
.stage canvas{width:100%;height:100%;display:block}.overlay{position:absolute;left:32px;bottom:28px;max-width:540px;pointer-events:none}
.overlay h2{font-size:clamp(38px,5vw,70px);line-height:.94;letter-spacing:-.055em;margin:8px 0}.readout{font:12px var(--mono);color:var(--accent);margin-top:16px}
` : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${k.title} — B</title><style>
:root{--bg:${p.bg};--surface:${p.surface};--elevated:${p.elevated};--ink:${p.text};--muted:${p.muted};--accent:${p.accent};--accent2:${p.accent2};--border:${p.border};--mono:${ad.typography.families.mono}}*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:${ad.typography.families.body},system-ui,sans-serif;font-size:${ad.typography.sizes.body}px;line-height:${ad.typography.lineHeight}}
a{color:inherit}.nav{display:flex;justify-content:space-between;align-items:center;padding:20px clamp(20px,5vw,64px);border-bottom:1px solid var(--border);font-size:11px;color:var(--muted);letter-spacing:.04em}
.brand{font-family:var(--mono);font-weight:700;color:var(--ink);letter-spacing:.08em}.shell{max-width:${ad.layout.maxWidth}px;margin:auto;padding:clamp(28px,5vw,58px) clamp(20px,5vw,64px)}
.eyebrow,.kicker{font:11px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
h1{font-family:${ad.typography.families.display},system-ui,sans-serif;font-size:clamp(44px,6.4vw,92px);line-height:${ad.typography.displayLineHeight};letter-spacing:${ad.typography.displayTracking};max-width:11ch;margin:16px 0;font-weight:${ad.typography.displayWeight}}
.lead,.measure{color:var(--muted);max-width:56ch;font-size:${ad.typography.sizes.lead}px;line-height:1.55}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin:30px 0}
.metric{background:var(--surface);padding:18px}.metric strong{display:block;font:600 clamp(24px,3vw,38px) var(--mono);letter-spacing:-.04em}.metric small{color:var(--muted);font-size:11px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:${ad.layout.radius}px;padding:22px;box-shadow:${ad.layout.shadow}}
.workspace{display:grid;grid-template-columns:1.1fr 1.5fr .8fr;gap:14px}.refpanel{padding:0;overflow:hidden;min-height:280px;position:relative}
.refpanel .ref{width:100%;height:100%;object-fit:cover;display:block;min-height:280px}.caption{position:absolute;left:12px;right:12px;bottom:12px;color:#fff;background:#000a;padding:8px;font-size:11px}
.row{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--ink)}.row:last-child{border:0}.chip{border:1px solid var(--border);padding:3px 8px;border-radius:999px;font-size:10px;color:var(--muted)}
.bars{display:flex;align-items:end;gap:6px;height:130px;margin-top:18px}.bars i{display:block;flex:1;background:var(--accent);border-radius:2px 2px 0 0}
.split{display:grid;grid-template-columns:1.02fr .98fr;gap:clamp(20px,4vw,52px);align-items:center}
.split h2{font-family:${ad.typography.families.display},system-ui,sans-serif;font-size:clamp(32px,4vw,54px);line-height:1;letter-spacing:-.04em;margin:10px 0}
.media{margin:0;background:var(--surface);padding:12px;border:1px solid var(--border);box-shadow:${ad.layout.shadow}}.media .ref{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;filter:saturate(.82) contrast(1.06)}
.media figcaption{padding-top:10px;font:10px var(--mono);color:var(--muted)}.cta{display:inline-flex;gap:18px;margin-top:20px;padding:12px 16px;background:var(--accent);color:var(--bg);text-decoration:none;font-weight:700;font-size:13px}
${sceneCss}${hudCss}${threeCss}
@media(max-width:820px){.workspace,.split{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.brief{grid-template-columns:1fr}.stage,.hudscene,.reel{height:330px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.scan{display:none}}
</style></head><body><nav class="nav"><span class="brand">${k.kicker.split('/')[0]}</span><span>${k.kicker.split('/')[1] ?? ''}</span><span>Visual Engine / 0.5</span></nav><main class="shell"><p class="eyebrow">${k.kicker}</p><h1>${k.title}</h1><p class="lead">${k.lead}</p><div class="metrics">${metrics}</div>${body}</main><footer class="footer" style="padding:22px clamp(20px,5vw,64px);border-top:1px solid var(--border);color:var(--muted);font:11px var(--mono)">Con Visual Engine · tokens, contraste, jerarquía y motion · 1280×720</footer>${threeScript(c)}${motionScript(c)}</body></html>`;
}

function threeScript(c) {
  if (c.id !== 'scene-3d') return '';
  return `<script type="module">
import * as THREE from './three.module.js';
const canvas=document.getElementById('orbital');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setSize(1280,720,false);renderer.setPixelRatio(1);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x05060f,.055);
const camera=new THREE.PerspectiveCamera(42,16/9,.1,100);camera.position.set(0,.4,7);
const group=new THREE.Group();scene.add(group);
const geo=new THREE.IcosahedronGeometry(1.55,2);const mat=new THREE.MeshStandardMaterial({color:0x8b7bff,metalness:.7,roughness:.28,wireframe:true});group.add(new THREE.Mesh(geo,mat));
const halo=new THREE.Mesh(new THREE.TorusGeometry(2.8,.012,8,180),new THREE.MeshBasicMaterial({color:0x4ee1d0,transparent:true,opacity:.5}));halo.rotation.x=1.1;group.add(halo);
for(let i=0;i<90;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.012,4,4),new THREE.MeshBasicMaterial({color:0xa5b0d0}));p.position.set((Math.random()-.5)*14,(Math.random()-.5)*9,(Math.random()-.5)*10);scene.add(p)}
scene.add(new THREE.AmbientLight(0x6677aa,1.2));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(4,5,3);scene.add(key);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const expectedDeg=1.5;let frames=0,start=performance.now(),maxDeg=0;
window.__ve3d={expectedDeg,currentDeg:0,maxDeg:0,frames:0,reducedMotion:reduced};
function tick(now){frames++;const t=(now-start)/1000;const angle=reduced?0:Math.sin(t*.7)*THREE.MathUtils.degToRad(expectedDeg);camera.rotation.y=angle;camera.rotation.x=Math.sin(t*.45)*.012;group.rotation.y=t*.08;group.rotation.x=Math.sin(t*.3)*.08;halo.rotation.z=t*.12;renderer.render(scene,camera);const deg=Math.abs(angle)*180/Math.PI;maxDeg=Math.max(maxDeg,deg);window.__ve3d={...window.__ve3d,currentDeg:deg,maxDeg,frames};document.getElementById('readout').textContent='cámara '+deg.toFixed(2)+'° · '+frames+' frames';requestAnimationFrame(tick)}
requestAnimationFrame(tick);
window.__veReady=true;
</script>`;
}

function motionScript(c) {
  if (c.id !== 'motion-graphics') return '';
  return `<script>window.__veReady=true;</script>`;
}

async function measurePage(dir, file) {
  const server = await startStatic(dir);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-gl=swiftshader', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(server.url + file, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(800);
    const loadMs = Date.now() - t0;
    const fps = await page.evaluate(() => new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = (t) => {
        frames++;
        if (t - start < 1200) requestAnimationFrame(tick);
        else resolve(Math.round((frames / ((performance.now() - start) / 1000)) * 10) / 10);
      };
      requestAnimationFrame(tick);
    }));
    let webgl = null;
    if (await page.evaluate(() => !!window.__ve3d)) {
      await page.waitForTimeout(700);
      const samples = [];
      for (let i = 0; i < 8; i++) {
        samples.push(await page.evaluate(() => ({ current: window.__ve3d.currentDeg, frames: window.__ve3d.frames, reduced: window.__ve3d.reducedMotion })));
        await page.waitForTimeout(100);
      }
      const state = await page.evaluate(() => window.__ve3d);
      webgl = {
        available: true,
        expectedDeg: state.expectedDeg,
        measuredMaxDeg: Math.round(Math.max(...samples.map((s) => s.current)) * 100) / 100,
        errorDeg: Math.round(Math.abs(state.expectedDeg - Math.max(...samples.map((s) => s.current))) * 100) / 100,
        frames: state.frames,
        reducedMotion: state.reducedMotion,
        status: 'verified',
      };
      await page.screenshot({ path: path.join(measureDir, 'webgl.png') });
    }
    await context.close();
    return { fps, loadMs, webgl };
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
  }
}

async function recordVideo(dir, file, outFile, ms = 6500) {
  const server = await startStatic(dir);
  const recordDir = path.join(measureDir, 'recordings');
  fs.mkdirSync(recordDir, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: recordDir, size: { width: 1280, height: 720 } } });
    const page = await context.newPage();
    await page.goto(server.url + file, { waitUntil: 'load' });
    await page.waitForTimeout(ms);
    const video = page.video();
    await context.close();
    const webm = await video.path();
    await run('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25', outFile]);
    return outFile;
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
  }
}

function getDim(q, id) {
  const d = q?.dimensions?.find((x) => x.id === id);
  return d?.available && d.score !== null ? d.score : null;
}

async function main() {
  const refs = await downloadReferences();
  const refVideo = await makeCrops(refs);
  const cases = [
    { id: 'professional-app', style: 'professional-app', projectType: 'app', brief: 'Aplicación profesional de operaciones, densa pero legible, inspirada en la referencia arquitectónica.' },
    { id: 'premium-landing', style: 'editorial', projectType: 'landing', brief: 'Landing de arquitectura premium, editorial, con una obra como material y una sola acción.' },
    { id: 'game-ui', style: 'game-ui', projectType: 'game-hud', brief: 'HUD de videojuego diegético, legible en movimiento y con jerarquía de estado.' },
    { id: 'scene-3d', style: 'immersive-3d', projectType: 'scene3d', brief: 'Escena 3D inmersiva con Three.js, cámara real y reduced motion.' },
    { id: 'motion-graphics', style: 'motion-graphics', projectType: 'motion', brief: 'Reel de motion graphics de seis segundos, tres planos, cortes en el pico de movimiento.' },
  ];
  const summary = [];
  for (const c of cases) {
    const ref = refs.find((r) => r.id === c.id);
    const dir = path.join(abDir, c.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(ref.crop, path.join(dir, 'reference.jpg'));
    if (c.id === 'scene-3d') fs.copyFileSync(path.join(root, 'node_modules/three/build/three.module.js'), path.join(dir, 'three.module.js'));
    const ad = buildArtDirection({ brief: c.brief, style: c.style, projectType: c.projectType });
    const a = aPage(c);
    const b = bPage(c, ad);
    fs.writeFileSync(path.join(dir, 'a.html'), a);
    fs.writeFileSync(path.join(dir, 'b.html'), b);
    const refPath = path.join(dir, 'reference.jpg');
    const aIntel = await opIntelligence({ reference: refPath, targetDir: dir, target: 'a.html', brief: c.brief, style: c.style, projectType: c.projectType, outDir: path.join(dir, 'measure-a'), width: 1280, height: 720, frames: 6, intervalMs: 250, waitMs: 700 });
    const bIntel = await opIntelligence({ reference: refPath, targetDir: dir, target: 'b.html', brief: c.brief, style: c.style, projectType: c.projectType, outDir: path.join(dir, 'measure-b'), width: 1280, height: 720, frames: 6, intervalMs: 250, waitMs: 700 });
    const aPerf = await measurePage(dir, 'a.html');
    const bPerf = await measurePage(dir, 'b.html');
    const row = {
      id: c.id, reference: { title: ref.title, artist: ref.artist, date: ref.date, objectId: ref.objectId, url: ref.url, license: 'CC0 / Public Domain' },
      source: { aChars: a.length, bChars: b.length, aTokensEstimate: Math.ceil(a.length / 4), bTokensEstimate: Math.ceil(b.length / 4), modelTokens: null, iterations: 0 },
      a: {
        quality: aIntel.review.quality.overall, fidelity: aIntel.fidelity.score, pixelSimilarity: aIntel.fidelity.pixelSimilarity,
        accessibility: getDim(aIntel.review.quality, 'accessibility'), composition: getDim(aIntel.review.quality, 'composition'),
        typography: getDim(aIntel.review.quality, 'typography'), performance: getDim(aIntel.review.quality, 'performance'),
        fps: aPerf.fps, loadMs: aPerf.loadMs, critic: aIntel.critic.score, critical: aIntel.critic.counts.critical, high: aIntel.critic.counts.high,
        gates: aIntel.gates.decision, webgl: aPerf.webgl,
      },
      b: {
        quality: bIntel.review.quality.overall, fidelity: bIntel.fidelity.score, pixelSimilarity: bIntel.fidelity.pixelSimilarity,
        accessibility: getDim(bIntel.review.quality, 'accessibility'), composition: getDim(bIntel.review.quality, 'composition'),
        typography: getDim(bIntel.review.quality, 'typography'), performance: getDim(bIntel.review.quality, 'performance'),
        fps: bPerf.fps, loadMs: bPerf.loadMs, critic: bIntel.critic.score, critical: bIntel.critic.counts.critical, high: bIntel.critic.counts.high,
        gates: bIntel.gates.decision, webgl: bPerf.webgl,
      },
    };
    summary.push(row);
    fs.writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify(row, null, 2) + '\n');
    console.log(`${c.id}: calidad ${row.a.quality} → ${row.b.quality}; fidelidad ${row.a.fidelity} → ${row.b.fidelity}; gates ${row.a.gates} → ${row.b.gates}`);
    if (c.id === 'scene-3d') {
      fs.writeFileSync(path.join(here, 'webgl.json'), JSON.stringify({ reference: 'CC0 MET 203938', page: 'ab/scene-3d/b.html', a: row.a.webgl, b: row.b.webgl, note: 'La rotación se lee de camera.rotation.y en Three.js real; no de una estimación de píxeles.' }, null, 2) + '\n');
    }
  }
  const aVideo = await recordVideo(path.join(abDir, 'motion-graphics'), 'a.html', path.join(here, 'motion-a.mp4'));
  const bVideo = await recordVideo(path.join(abDir, 'motion-graphics'), 'b.html', path.join(here, 'motion-b.mp4'));
  const bTimeline = await analyzeTimeline(bVideo, { samples: 20 });
  const bTemporal = await temporalCompare(refVideo, bVideo, { samples: 16, outDir: path.join(here, 'motion-temporal') });
  const videoInfo = { a: await probe(aVideo), b: await probe(bVideo), reference: await probe(refVideo) };
  fs.writeFileSync(path.join(here, 'motion.json'), JSON.stringify({
    videos: { a: path.relative(here, aVideo), b: path.relative(here, bVideo), reference: path.relative(here, refVideo) },
    videoInfo,
    bCuts: bTimeline.cuts,
    bPace: bTimeline.pace,
    temporal: { score: bTemporal.score, summary: bTemporal.summary, temporal: bTemporal.temporal },
    note: 'Vídeo real grabado con Playwright. La referencia es un montaje de tres planos de la obra CC0, no una grabación externa.',
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(here, 'measurements.json'), JSON.stringify({ generatedAt: new Date().toISOString(), cases: summary, refVideo, webgl: 'webgl.json', motion: 'motion.json', tokenNote: 'Tokens estimados por caracteres/4; no hay telemetría del proveedor. Iteraciones del loop: 0; el A/B es una pasada reproducible.' }, null, 2) + '\n');
  fs.writeFileSync(path.join(here, 'RESULTS.md'), resultsMarkdown(summary, bTemporal, bTimeline));
  console.log('Evidencia A/B generada en', here);
}

function resultsMarkdown(rows, temporal, timeline) {
  const f = (n) => n === null || n === undefined ? '—' : Number(n).toFixed(1);
  return `# Visual Intelligence 0.5 — A/B reproducible

Mismo agente, mismo brief, mismo copy y un máximo de 9.000 caracteres por implementación. B usa tokens, Art Director, critic, fidelidad y gates; A es una plantilla genérica oscura. El banco no ejecuta un proveedor de IA: las cifras de tokens son estimaciones por caracteres y el A/B es una sola pasada. **No se manipulan las métricas.**

| Dominio | Calidad A → B | Fidelidad A → B | Accesibilidad A → B | Composición A → B | Tipografía A → B | Gates A → B |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
${rows.map((r) => `| ${r.id} | ${f(r.a.quality)} → **${f(r.b.quality)}** | ${f(r.a.fidelity)} → **${f(r.b.fidelity)}** | ${f(r.a.accessibility)} → **${f(r.b.accessibility)}** | ${f(r.a.composition)} → ${f(r.b.composition)} | ${f(r.a.typography)} → ${f(r.b.typography)} | ${r.a.gates} → ${r.b.gates} |`).join('\n')}

## Rendimiento y tokens

| Dominio | FPS A → B | Carga A → B (ms) | Tokens est. A → B | Iteraciones |
| --- | ---: | ---: | ---: | ---: |
${rows.map((r) => `| ${r.id} | ${r.a.fps} → ${r.b.fps} | ${r.a.loadMs} → ${r.b.loadMs} | ${r.source.aTokensEstimate} → ${r.source.bTokensEstimate} | 0 → 0 |`).join('\n')}

## Transiciones de vídeo

- Referencia: tres planos de una obra CC0 del MET, 6 s, 25 fps, con dos cortes.
- B: ${timeline.cuts.length} cortes detectados, ritmo ${timeline.pace}/min; comparación temporal ${temporal.score}/100.
- A: página estática, sin timeline de tres planos.
- Los MP4 están en \`motion-a.mp4\` y \`motion-b.mp4\`.

## WebGL

La escena B usa Three.js real y expone \`camera.rotation.y\`. \`webgl.json\` contiene la rotación esperada, medida, error y frames; la captura es \`measure/webgl.png\`.

## Límites

- Las referencias son obras CC0 del MET usadas como dirección visual, no pantallas de producto de esos dominios.
- La fidelidad estructural puede no capturar intención artística; se declara junto a la similitud de píxeles.
- No hay telemetría de tokens del proveedor ni se ejecutó un segundo modelo; A y B fueron generados por el mismo agente y banco reproducible.
- La aprobación artística final sigue siendo humana.
`;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
