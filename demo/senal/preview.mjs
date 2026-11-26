#!/usr/bin/env node
/**
 * Captura rápida de la demo para revisión visual (no sustituye a `ve capture`,
 * que además mide errores de consola, recursos y fluidez).
 *
 * node demo/senal/preview.mjs [salida.png] [ancho] [alto]
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const out = process.argv[2] ?? 'demo/senal/evidencia/preview.png';
const width = Number(process.argv[3] ?? 1392);
const height = Number(process.argv[4] ?? 752);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
const url = pathToFileURL(path.resolve('demo/senal/index.html')).href + '?clean=1';
await page.goto(url);
await page.waitForTimeout(1400);

page.on('console', (m) => {
  if (m.type() === 'error') console.log('consola:', m.text().slice(0, 200));
});

const info = await page.evaluate(() => {
  const canvas = document.getElementById('ring');
  const gl = canvas.getContext('webgl');
  const bars = [...document.querySelectorAll('.bar')].map((el) => ({
    w: el.offsetWidth,
    h: el.offsetHeight,
    transform: getComputedStyle(el).transform,
  }));
  return {
    canvas: [canvas.width, canvas.height],
    webgl: Boolean(gl),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    bars,
  };
});

await page.screenshot({ path: out });
await browser.close();
console.log(JSON.stringify({ out, ...info }));
