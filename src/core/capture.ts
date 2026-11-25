import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { analyzeSequence, type VisualProfile } from './analysis.js';
import { ensureDir, newRunDir } from './paths.js';

export interface CaptureOptions {
  /** URL http(s)://, file:// o ruta local a un HTML. */
  target: string;
  width?: number;
  height?: number;
  /** número de capturas (para analizar animación) */
  frames?: number;
  intervalMs?: number;
  /** espera inicial tras cargar, antes de la primera captura */
  waitMs?: number;
  outDir?: string;
  deviceScaleFactor?: number;
  fullPage?: boolean;
  timeoutMs?: number;
}

export interface CaptureResult {
  ok: boolean;
  url: string;
  outDir: string;
  frames: string[];
  errors: string[];
  consoleErrors: string[];
  profile?: VisualProfile;
  title: string;
}

function toUrl(target: string): string {
  if (/^https?:\/\//i.test(target) || /^file:\/\//i.test(target)) return target;
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) throw new Error(`No existe el destino: ${abs}`);
  return pathToFileURL(abs).href;
}

/**
 * Abre un proyecto real en Chromium, captura su estado visual y devuelve el perfil
 * medido. No simula nada: si la página falla, los errores salen en el resultado.
 */
export async function capture(opts: CaptureOptions): Promise<CaptureResult> {
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const frameCount = Math.max(1, opts.frames ?? 1);
  const intervalMs = opts.intervalMs ?? 400;
  const outDir = ensureDir(opts.outDir ?? newRunDir('captures'));
  const url = toUrl(opts.target);
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  const files: string[] = [];
  let title = '';
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--hide-scrollbars',
        '--force-color-profile=srgb',
        '--font-render-hinting=none',
        '--disable-dev-shm-usage',
      ],
    });
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: opts.deviceScaleFactor ?? 1,
      reducedMotion: 'no-preference',
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 500)}`));
    page.on('requestfailed', (req) => {
      const f = req.failure();
      errors.push(`recurso fallido: ${req.url().slice(0, 200)} (${f?.errorText ?? 'desconocido'})`);
    });

    const resp = await page.goto(url, { waitUntil: 'load', timeout: opts.timeoutMs ?? 45_000 });
    if (resp && resp.status() >= 400) errors.push(`HTTP ${resp.status()} en ${url}`);
    title = await page.title();

    // Señal opcional del proyecto para esperar a que termine su animación inicial.
    await page
      .waitForFunction(() => (window as any).__veReady === true, undefined, { timeout: 4000 })
      .catch(() => undefined);
    await page.waitForTimeout(opts.waitMs ?? 900);

    for (let i = 0; i < frameCount; i++) {
      const file = path.join(outDir, `capture-${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
      files.push(file);
      if (i < frameCount - 1) await page.waitForTimeout(intervalMs);
    }
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  const profile = await analyzeSequence(files, { width: 192, intervalMs });
  profile.source = `captura:${url}`;
  profile.fps = 0;
  profile.width = width;
  profile.height = height;
  profile.aspect = Math.round((width / height) * 1000) / 1000;

  return {
    ok: errors.length === 0 && consoleErrors.length === 0,
    url,
    outDir,
    frames: files,
    errors,
    consoleErrors,
    profile,
    title,
  };
}
