import fs from 'node:fs';
import path from 'node:path';
import { analyzeFile, describeProfile, type VisualProfile } from './analysis.js';
import { capture, type CaptureOptions, type CaptureResult } from './capture.js';
import { compareImages, compareProfiles, type Comparison, type ImageComparison } from './compare.js';
import { ensureDir, newRunDir } from './paths.js';
import { startStatic, type StaticServer } from './static.js';
import { sampleFrames, rgbToPng } from './media.js';
import { evaluateQuality, type QualityEvaluation } from './quality.js';

export interface ReviewOptions {
  /** Imagen o vídeo de referencia. */
  reference: string;
  /** URL o ruta a un HTML concreto. */
  target?: string;
  /** Directorio del proyecto a servir y capturar. */
  targetDir?: string;
  width?: number;
  height?: number;
  frames?: number;
  intervalMs?: number;
  waitMs?: number;
  samples?: number;
  outDir?: string;
}

export interface ReviewResult {
  id: string;
  outDir: string;
  score: number;
  grade: Comparison['grade'];
  reference: { path: string; profile: VisualProfile; description: string[] };
  target: {
    url: string;
    title: string;
    frames: string[];
    errors: string[];
    consoleErrors: string[];
    profile: VisualProfile;
    accessibility?: import('./capture.js').AccessibilityAudit;
    typography?: import('./capture.js').TypographyAudit;
  };
  comparison: Comparison;
  quality: QualityEvaluation;
  image?: ImageComparison;
  heatmap?: string;
  referenceFrame?: string;
  warnings: string[];
  report: { md: string; json: string };
}

function mdTable(rows: string[][], headers: string[]): string {
  const esc = (s: string) => String(s).replace(/\|/g, '\\|');
  return [
    `| ${headers.map(esc).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`),
  ].join('\n');
}

function buildReport(r: Omit<ReviewResult, 'report' | 'id'>): string {
  const { reference: ref, target: tgt, comparison: cmp } = r;
  const p = ref.profile;
  const c = tgt.profile;
  const lines: string[] = [];
  lines.push(`# Revisión visual — ${cmp.score.toFixed(1)}/100 (${cmp.grade})`);
  lines.push('');
  lines.push(`Generado: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(cmp.summary);
  lines.push('');
  lines.push('## Referencia');
  lines.push('');
  for (const l of ref.description) lines.push(`- ${l}`);
  lines.push('');
  lines.push('## Resultado capturado');
  lines.push('');
  lines.push(`- URL: ${tgt.url}`);
  lines.push(`- Título: ${tgt.title || '(sin título)'}`);
  lines.push(`- Capturas: ${tgt.frames.length} en \`${path.dirname(tgt.frames[0] ?? '')}\``);
  lines.push(`- Perfil: ${c.width}x${c.height}, luminancia ${(c.aggregate.luma * 100).toFixed(1)}%, contraste ${(c.aggregate.contrast * 100).toFixed(1)}%, movimiento ${(c.motion * 100).toFixed(2)}`);
  if (tgt.errors.length) lines.push(`- Fallos de red: ${tgt.errors.length} (${tgt.errors.slice(0, 3).join('; ')})`);
  if (tgt.consoleErrors.length) lines.push(`- Errores JS: ${tgt.consoleErrors.length} (${tgt.consoleErrors.slice(0, 3).join(' | ')})`);
  lines.push('');
  lines.push('## Diferencias medidas');
  lines.push('');
  lines.push(
    mdTable(
      cmp.metrics.map((m) => [m.metric, m.reference.toFixed(4), m.candidate.toFixed(4), m.delta.toFixed(4), `${(m.similarity * 100).toFixed(1)}%`]),
      ['Métrica', 'Referencia', 'Resultado', 'Δ', 'Similitud'],
    ),
  );
  lines.push('');
  lines.push(`Paleta de referencia: ${cmp.palette.reference.join(', ')}`);
  lines.push('');
  lines.push(`Paleta del resultado: ${cmp.palette.candidate.join(', ')}`);
  lines.push('');
  lines.push(`ΔE medio entre paletas: ${cmp.palette.meanDeltaE} (similitud ${(cmp.palette.similarity * 100).toFixed(1)}%)`);
  if (cmp.palette.missing.length) {
    lines.push('');
    lines.push(`Acentos ausentes: ${cmp.palette.missing.map((m) => `${m.hex} → más cercano ${m.nearest}`).join(', ')}`);
  }
  if (cmp.palette.extra.length) {
    lines.push('');
    lines.push(`Colores ajenos: ${cmp.palette.extra.map((m) => m.hex).join(', ')}`);
  }
  if (r.image) {
    lines.push('');
    lines.push('## Diferencia por píxel (primer fotograma)');
    lines.push('');
    lines.push(mdTable([
      ['SSIM', r.image.ssim.toFixed(4)],
      ['MAE', r.image.mae.toFixed(4)],
      ['RMSE', r.image.rmse.toFixed(4)],
      ['ΔE medio', String(r.image.deltaE)],
    ], ['Medida', 'Valor']));
  }
  lines.push('');
  if (tgt.accessibility) {
    lines.push('## Accesibilidad de contraste (medida en DOM)');
    lines.push('');
    lines.push(`Elementos comprobados: ${tgt.accessibility.checked} · incumplimientos orientativos: ${tgt.accessibility.violations} · contraste medio ${tgt.accessibility.averageContrast}:1 · peor ${tgt.accessibility.worstContrast}:1.`);
    lines.push('');
    for (const s of tgt.accessibility.samples.slice(0, 6)) lines.push(`- ${s.text}: ${s.contrast}:1 (mínimo ${s.required}:1, ${s.fontSize}px)`);
    lines.push('');
    lines.push(tgt.accessibility.note);
    lines.push('');
  }
  lines.push('## Calidad por dimensiones');
  lines.push('');
  lines.push(r.quality.summary);
  lines.push('');
  lines.push(mdTable(
    r.quality.dimensions.map((d) => [d.label, d.score !== null ? d.score.toFixed(1) : '—', d.available ? 'sí' : 'no', Object.entries(d.evidence).map(([k, v]) => `${k}=${v}`).join(', ')]),
    ['Dimensión', 'Puntuación', 'Disponible', 'Evidencia'],
  ));
  lines.push('');
  lines.push('## Correcciones priorizadas');
  lines.push('');
  cmp.recommendations.forEach((rec, i) => lines.push(`${i + 1}. ${rec}`));
  lines.push('');
  lines.push('## Artefactos');
  lines.push('');
  lines.push(`- Capturas: \`${path.join(r.outDir, 'captures')}\``);
  if (r.referenceFrame) lines.push(`- Fotograma de referencia: \`${r.referenceFrame}\``);
  if (r.heatmap) lines.push(`- Mapa de calor de diferencias: \`${r.heatmap}\``);
  lines.push(`- Informe JSON: \`${path.join(r.outDir, 'review.json')}\``);
  lines.push('');
  if (r.warnings.length) {
    lines.push('## Limitaciones de esta revisión');
    lines.push('');
    for (const w of r.warnings) lines.push(`- ${w}`);
    lines.push('');
  }
  lines.push('## Cómo iterar');
  lines.push('');
  lines.push('1. Aplica sólo las correcciones medidas que afecten a la fidelidad (no añadas efectos sueltos).');
  lines.push('2. Vuelve a ejecutar `ve review` con la misma referencia y compara la puntuación.');
  lines.push('3. Repite hasta que el Δ quede por debajo del umbral o el cambio deje de mejorar la puntuación.');
  lines.push('');
  return lines.join('\n');
}

/**
 * Ciclo completo: analiza la referencia → sirve y captura el resultado → compara →
 * escribe informe y mapa de calor. Todo con archivos reales.
 */
export async function review(opts: ReviewOptions): Promise<ReviewResult> {
  const outDir = ensureDir(opts.outDir ?? newRunDir('reviews'));
  const warnings: string[] = [];
  const refProfile = await analyzeFile(opts.reference, { samples: opts.samples ?? 10, width: 192 });
  const refDescription = describeProfile(refProfile);

  let server: StaticServer | undefined;
  let targetUrl = opts.target;
  if (opts.targetDir) {
    server = await startStatic(opts.targetDir);
    targetUrl = `${server.url}${opts.target && !/^https?:/.test(opts.target) ? opts.target.replace(/^\/+/, '') : ''}`;
  }
  if (!targetUrl) throw new Error('Indica un destino: `target` (URL/HTML) o `targetDir` (carpeta del proyecto).');

  const captureOpts: CaptureOptions = {
    target: targetUrl,
    width: opts.width ?? 1280,
    height: opts.height ?? 720,
    frames: opts.frames ?? 6,
    intervalMs: opts.intervalMs ?? 400,
    waitMs: opts.waitMs ?? 900,
    outDir: path.join(outDir, 'captures'),
  };

  let cap: CaptureResult;
  try {
    cap = await capture(captureOpts);
  } finally {
    await server?.close();
  }

  if (Math.abs(refProfile.aspect - captureOpts.width! / captureOpts.height!) > 0.05) {
    warnings.push(
      `La relación de aspecto no coincide (referencia ${refProfile.aspect.toFixed(2)}:1, captura ${(captureOpts.width! / captureOpts.height!).toFixed(2)}:1). ` +
      'La comparación de color y contraste sigue siendo válida, pero la composición se estira en el mapa de calor.',
    );
  }
  if (!cap.ok) warnings.push('La captura registró errores; revisa `consoleErrors` y `errors` antes de valorar el diseño.');

  const comparison = compareProfiles(refProfile, cap.profile!);
  const quality = evaluateQuality(refProfile, cap.profile!, {
    captureTimings: cap.timings,
    targetIntervalMs: captureOpts.intervalMs,
    accessibility: cap.accessibility,
    typography: cap.typography,
  });

  // Fotograma de referencia al mismo aspecto que la captura, y diferencia por píxel.
  let referenceFrame: string | undefined;
  let image: ImageComparison | undefined;
  let heatmap: string | undefined;
  try {
    const w = 240;
    const h = Math.max(16, Math.round((w * captureOpts.height!) / captureOpts.width!));
    const [sample] = await sampleFrames(opts.reference, { count: 1, width: w, height: h });
    const refPng = await rgbToPng(sample.rgb, sample.width, sample.height, path.join(outDir, 'reference-frame.png'));
    referenceFrame = refPng;
    image = await compareImages(refPng, cap.frames[0], { width: 240, height: h, outDir: path.join(outDir, 'diff') });
    heatmap = image.heatmap;
  } catch (e) {
    warnings.push(`No se pudo generar el mapa de calor: ${(e as Error).message}`);
  }

  if (cap.profile!.frameCount < 3) {
    warnings.push('Menos de 3 capturas: el movimiento medido es indicativo. Usa `--frames 6` o más.');
  }

  const partial: Omit<ReviewResult, 'report' | 'id'> = {
    outDir,
    score: comparison.score,
    grade: comparison.grade,
    reference: { path: path.resolve(opts.reference), profile: refProfile, description: refDescription },
    target: {
      url: cap.url,
      title: cap.title,
      frames: cap.frames,
      errors: cap.errors,
      consoleErrors: cap.consoleErrors,
      profile: cap.profile!,
      accessibility: cap.accessibility,
      typography: cap.typography,
    },
    comparison,
    quality,
    image,
    heatmap,
    referenceFrame,
    warnings,
  };

  const md = buildReport(partial);
  const mdPath = path.join(outDir, 'report.md');
  const jsonPath = path.join(outDir, 'review.json');
  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(partial, null, 2), 'utf8');

  return {
    ...partial,
    id: path.basename(outDir),
    report: { md: mdPath, json: jsonPath },
  };
}
