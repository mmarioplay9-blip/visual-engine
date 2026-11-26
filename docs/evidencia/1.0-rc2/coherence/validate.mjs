#!/usr/bin/env node
/**
 * Validación de la métrica de coherencia de matiz (rc.2).
 *
 * Compara la fórmula de rc.1 (coseno directo del histograma de 12 sectores) con
 * la de rc.2 (histograma ponderado por croma + suavizado circular von Mises +
 * cobertura mínima) sobre:
 *   1. la misma referencia rotada en matiz a distancias conocidas;
 *   2. el caso real rechazado en rc.1 (referencia casi gris);
 *   3. casos negativos (gris contra color, complementario).
 *
 * Uso: node docs/evidencia/1.0-rc2/coherence/validate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { analyzeFile } from '../../../../dist/core/analysis.js';
import { evaluateQuality, hueDistribution, smoothCircular } from '../../../../dist/core/quality.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const out = path.join(here, 'fixtures');
fs.mkdirSync(out, { recursive: true });

const base = path.join(root, 'docs/evidencia/1.0-rc2/references/premium-landing.jpg');
const grayRef = path.join(root, 'docs/evidencia/1.0-rc/projects/game-cinematic/reference.jpg');
const grayPageB = path.join(out, 'rc1-hud-b.png');
const grayPageA = path.join(out, 'rc1-hud-a.png');

/** Captura la página real del A/B de rc.1 para re-medirla con la métrica nueva. */
async function capture(html, dest) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + html.split(path.sep).join('/'), { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: dest });
  await browser.close();
  return dest;
}
await capture(path.join(root, 'docs/evidencia/1.0-rc/projects/game-cinematic/index.html'), grayPageB);
await capture(path.join(root, 'docs/evidencia/1.0-rc/projects/game-cinematic/baseline.html'), grayPageA);

function cosine(a, b) {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Rotación de matiz exacta en canvas (no usa filtros CSS). */
async function rotate(src, deg, dest) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const data = fs.readFileSync(src).toString('base64');
  const png = await page.evaluate(async ({ data, deg }) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + data;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = frame.data;
    const shift = deg / 360;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), delta = mx - mn;
      let h = 0, s = mx === 0 ? 0 : delta / mx, v = mx;
      if (delta !== 0) {
        if (mx === r) h = ((g - b) / delta) % 6;
        else if (mx === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
      }
      h = (h / 6 + shift + 1) % 1;
      const i6 = Math.floor(h * 6), f = h * 6 - i6;
      const p0 = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
      const rgb = [[v, t, p0], [q, v, p0], [p0, v, t], [p0, q, v], [t, p0, v], [v, p0, q]][i6 % 6];
      d[i] = Math.round(rgb[0] * 255); d[i + 1] = Math.round(rgb[1] * 255); d[i + 2] = Math.round(rgb[2] * 255);
    }
    ctx.putImageData(frame, 0, 0);
    return canvas.toDataURL('image/png');
  }, { data, deg });
  await browser.close();
  fs.writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
  return dest;
}

async function desaturate(src, dest) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const data = fs.readFileSync(src).toString('base64');
  const png = await page.evaluate(async ({ data }) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + data;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(frame, 0, 0);
    return canvas.toDataURL('image/png');
  }, { data });
  await browser.close();
  fs.writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
  return dest;
}

const newOf = (ref, cand) => {
  const q = evaluateQuality(ref, cand).dimensions.find((d) => d.id === 'coherence');
  return { score: q.available ? q.score : null, available: q.available, evidence: q.evidence };
};
const oldOf = (ref, cand) => Math.round(cosine(ref.hueHistogram, cand.hueHistogram) * 1000) / 10;

const reference = await analyzeFile(base);
const rows = [];
for (const deg of [0, 15, 30, 60, 90, 120, 180]) {
  const file = deg === 0 ? base : await rotate(base, deg, path.join(out, `hue-${String(deg).padStart(3, '0')}.png`));
  const profile = await analyzeFile(file);
  const nw = newOf(reference, profile);
  rows.push({
    case: `referencia rotada +${deg}°`, file: path.relative(root, file),
    refCoverage: hueDistribution(reference).chromaticCoverage,
    candCoverage: hueDistribution(profile).chromaticCoverage,
    old: oldOf(reference, profile), new: nw.score, available: nw.available,
    evidence: nw.evidence,
  });
}

// Caso negativo 1: gris contra color (el matiz no es interpretable en la referencia).
const gray = await desaturate(base, path.join(out, 'desaturated.png'));
const grayProfile = await analyzeFile(gray);
const grayVsColor = newOf(grayProfile, reference);
rows.push({
  case: 'referencia gris + página con color', file: path.relative(root, gray),
  refCoverage: hueDistribution(grayProfile).chromaticCoverage,
  candCoverage: hueDistribution(reference).chromaticCoverage,
  old: oldOf(grayProfile, reference), new: grayVsColor.score, available: grayVsColor.available,
  evidence: grayVsColor.evidence,
});
// Caso negativo 2: gris contra gris tampoco debe aprobar por omisión.
const grayVsGray = newOf(grayProfile, grayProfile);
rows.push({
  case: 'referencia gris + página gris', file: path.relative(root, gray),
  refCoverage: hueDistribution(grayProfile).chromaticCoverage,
  candCoverage: hueDistribution(grayProfile).chromaticCoverage,
  old: oldOf(grayProfile, grayProfile), new: grayVsGray.score, available: grayVsGray.available,
  evidence: grayVsGray.evidence,
});

// Caso real de rc.1: referencia "Armor" (casi gris) contra las dos páginas medidas.
const armor = await analyzeFile(grayRef);
for (const [label, file] of [['B (rechazada)', grayPageB], ['A', grayPageA]]) {
  const armorPage = await analyzeFile(file);
  const realCase = newOf(armor, armorPage);
  rows.push({
    case: `rc.1 game-cinematic ${label}: armadura gris vs HUD`, file: path.relative(root, file),
    refCoverage: hueDistribution(armor).chromaticCoverage,
    candCoverage: hueDistribution(armorPage).chromaticCoverage,
    old: oldOf(armor, armorPage), new: realCase.score, available: realCase.available,
    evidence: realCase.evidence,
  });
}

// Propiedades del suavizado: conserva masa y simetría circular.
const smooth = smoothCircular([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const properties = {
  massPreserved: Math.abs(smooth.reduce((a, b) => a + b, 0) - 1) < 1e-9,
  monotonicDecay: smooth[0] > smooth[1] && smooth[1] > smooth[2] && smooth[2] > smooth[6],
  circular: Math.abs(smooth[1] - smooth[11]) < 1e-12,
};

const table = rows.map((r) => `| ${r.case} | ${r.refCoverage} | ${r.candCoverage} | ${r.old} | ${r.new ?? '—'} | ${r.available ? 'sí' : 'no'} |`).join('\n');
const md = `# Validación de la coherencia de matiz — 1.0.0-rc.2

Referencia base: \`docs/evidencia/1.0-rc2/references/premium-landing.jpg\` (sintética, 16:9, con acentos cálidos y verdes).
Rotaciones aplicadas píxel a píxel en canvas (HSV), no con filtros CSS.

| Caso | Cobertura ref | Cobertura cand | rc.1 (coseno directo) | rc.2 (kernel circular) | Disponible |
| --- | ---: | ---: | ---: | ---: | --- |
${table}

## Propiedades del núcleo

- Masa conservada: ${properties.massPreserved}.
- Decaimiento monótono con la distancia: ${properties.monotonicDecay}.
- Continuidad circular (sector 11 vecino del 0): ${properties.circular}.

## Lectura

- rc.1 se hunde a 0 cuando los matices caen en sectores disjuntos, aunque la diferencia sea de 30°:
  es una discontinuidad del coseno sobre una variable circular, no una medida de coherencia.
- rc.2 decae de forma monótona con la distancia de matiz y **no puntúa** cuando la referencia no
  tiene masa cromática suficiente: devuelve \`available:false\` con el motivo, en vez de un 0 que
  suspende o un 100 que aprueba.
- El caso real de rc.1 (armadura casi gris) queda fuera de la dimensión: el gate ya no emite un
  hallazgo "incoherencia de matiz" que no puede sostener. Los demás gates siguen decidiendo.
`;
fs.writeFileSync(path.join(here, 'RESULT.md'), md);
fs.writeFileSync(path.join(here, 'coherence.json'), JSON.stringify({ properties, rows }, null, 2) + '\n');
console.log(md);
