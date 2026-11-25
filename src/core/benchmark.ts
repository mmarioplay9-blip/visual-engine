import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { applyEffect, listEffects } from './library.js';
import { ensureDir, PACKAGE_ROOT } from './paths.js';
import { startStatic } from './static.js';

export interface EffectBenchmark {
  id: string;
  category: string;
  engine: string;
  width: number;
  height: number;
  fps: number;
  frameMsMean: number;
  frameMsP95: number;
  heapMb: number | null;
  loadMs: number;
  errors: string[];
  ok: boolean;
}

export interface BenchmarkReport {
  generatedAt: string;
  runtime: { width: number; height: number; durationMs: number; browser: string; node: string };
  effects: EffectBenchmark[];
  summary: { tested: number; ok: number; medianFps: number; minFps: number; notes: string[] };
}

/**
 * Banco de rendimiento reproducible. Mide rAF real (no un temporizador),
 * memoria JS si Chromium la expone y tiempo de carga. No estima FPS.
 */
export async function benchmarkEffects(opts: {
  ids?: string[];
  ms?: number;
  width?: number;
  height?: number;
  outFile?: string;
  docsFile?: string;
} = {}): Promise<BenchmarkReport> {
  const all = listEffects();
  const selected = opts.ids?.length ? all.filter((e) => opts.ids!.includes(e.id)) : all;
  if (!selected.length) throw new Error('No hay efectos para medir.');
  const width = opts.width ?? 960;
  const height = opts.height ?? 540;
  const duration = Math.max(300, Math.min(4000, opts.ms ?? 800));
  const work = ensureDir(path.join(os.tmpdir(), `ve-bench-${Date.now()}`));
  // La nebulosa usa Three.js mediante un import absoluto /node_modules/...
  const three = path.join(PACKAGE_ROOT, 'node_modules', 'three', 'build', 'three.module.js');
  if (fs.existsSync(three)) {
    const target = ensureDir(path.join(work, 'node_modules', 'three', 'build'));
    fs.copyFileSync(three, path.join(target, 'three.module.js'));
  }
  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    runtime: { width, height, durationMs: duration, browser: 'Chromium (Playwright, headless)', node: process.version },
    effects: [],
    summary: { tested: 0, ok: 0, medianFps: 0, minFps: 0, notes: [] },
  };

  for (const effect of selected) {
    try {
      applyEffect(effect.id, { outDir: work });
    } catch (e) {
      report.effects.push({
        id: effect.id, category: effect.category, engine: effect.engines.join('+'), width, height,
        fps: 0, frameMsMean: 0, frameMsP95: 0, heapMb: null, loadMs: 0,
        errors: [`aplicar: ${(e as Error).message}`], ok: false,
      });
    }
  }

  const server = await startStatic(work);
  const browser = await chromium.launch({
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
  });
  try {
    for (const effect of selected) {
      const errors: string[] = [];
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: 'dark' });
      page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
      const started = Date.now();
      let loadMs = 0;
      try {
        const url = `${server.url}${effect.id}/index.html`;
        await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
        await page.waitForFunction(() => (window as any).__veReady === true, undefined, { timeout: 8000 }).catch(() => undefined);
        loadMs = Date.now() - started;
        const measure = await page.evaluate(async (ms) => {
          const frames: number[] = [];
          let start = 0;
          await new Promise<void>((resolve) => {
            const loop = (now: number) => {
              if (!start) start = now;
              frames.push(now);
              if (now - start >= ms) resolve();
              else requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
          });
          const deltas = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b);
          const mean = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
          const p95 = deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * 0.95))] ?? 0;
          const heap = (performance as any).memory?.usedJSHeapSize;
          return {
            frames: deltas.length,
            fps: 1000 / Math.max(0.01, mean),
            mean,
            p95,
            heapMb: typeof heap === 'number' ? heap / 1024 / 1024 : null,
          };
        }, duration);
        const ok = errors.length === 0 && measure.frames > 0;
        report.effects.push({
          id: effect.id,
          category: effect.category,
          engine: effect.engines.join('+'),
          width, height,
          fps: Math.round(measure.fps * 10) / 10,
          frameMsMean: Math.round(measure.mean * 100) / 100,
          frameMsP95: Math.round(measure.p95 * 100) / 100,
          heapMb: measure.heapMb === null ? null : Math.round(measure.heapMb * 10) / 10,
          loadMs,
          errors,
          ok,
        });
      } catch (e) {
        errors.push((e as Error).message.slice(0, 300));
        report.effects.push({
          id: effect.id, category: effect.category, engine: effect.engines.join('+'), width, height,
          fps: 0, frameMsMean: 0, frameMsP95: 0, heapMb: null, loadMs, errors, ok: false,
        });
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
    await server.close();
  }

  const fps = report.effects.filter((e) => e.ok).map((e) => e.fps).sort((a, b) => a - b);
  report.summary = {
    tested: report.effects.length,
    ok: report.effects.filter((e) => e.ok).length,
    medianFps: fps.length ? fps[Math.floor(fps.length / 2)] : 0,
    minFps: fps[0] ?? 0,
    notes: [
      'FPS medido con requestAnimationFrame en Chromium headless; no es una garantía en otros equipos.',
      'La memoria es usedJSHeapSize, no memoria GPU; los shaders WebGL no exponen su VRAM desde la página.',
      'La carga incluye la espera de red local y el primer frame; no incluye el arranque del navegador.',
    ],
  };
  const outFile = path.resolve(opts.outFile ?? path.join(PACKAGE_ROOT, 'library', 'benchmarks.json'));
  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf8');
  if (opts.docsFile) {
    const lines = [
      '# Rendimiento medido · Visual Engine 0.3',
      '',
      `Generado: ${report.generatedAt} · ${width}×${height} · ${duration} ms por efecto · ${report.runtime.browser}.`,
      '',
      '| Efecto | Categoría | Motor | FPS | Frame medio | P95 | Heap JS | Carga |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
      ...report.effects.map((e) => `| ${e.id} | ${e.category} | ${e.engine} | ${e.fps} | ${e.frameMsMean} ms | ${e.frameMsP95} ms | ${e.heapMb ?? '—'} MB | ${e.loadMs} ms |`),
      '',
      '## Límites',
      '',
      ...report.summary.notes.map((n) => `- ${n}`),
      '',
      'La evaluación artística es humana y no se deriva de estas cifras. Una puntuación de calidad alta no implica que el efecto sea apropiado para una referencia concreta.',
    ].join('\n');
    ensureDir(path.dirname(path.resolve(opts.docsFile)));
    fs.writeFileSync(path.resolve(opts.docsFile), lines + '\n', 'utf8');
  }
  return report;
}
