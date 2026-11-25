#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ADAPTERS } from '../core/adapters.js';
import { runNpm } from '../core/deps.js';
import { initProject, type AgentName, type ClientName } from '../core/init.js';
import {
  opAdapters,
  opAnalyze,
  opApplyEffect,
  opCapture,
  opCompare,
  opDepsPlan,
  opDoctor,
  opExtractFrames,
  opGetEffect,
  opInstallDeps,
  opListEffects,
  opReview,
  opScaffold,
  opVersion,
} from '../core/ops.js';
import { startApi } from '../api/server.js';
import { PACKAGE_ROOT } from '../core/paths.js';
import { exec } from '../core/run.js';
import {
  opBackups,
  opCamera,
  opDetectEffects,
  opInspect,
  opIterate,
  opRecommend,
  opRestoreBackup,
  opSpec,
  opTemporal,
  opTimeline,
  opVision,
  opCompose,
  opReferenceEffects,
  opBenchmark,
  opArtDirection,
  opMotionDirector,
  opReferenceDesign,
  opShowcase,
} from '../core/advanced.js';
import { startGallery } from '../core/gallery.js';
import { describeIteration } from '../core/iterate.js';
import { describeTemporal } from '../core/temporal.js';

interface Parsed {
  _: string[];
  flags: Record<string, string | true | string[]>;
}

function parse(argv: string[]): Parsed {
  const positional: string[] = [];
  const flags: Parsed['flags'] = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const key = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);
      let value: string | true = true;
      if (eq >= 0) value = arg.slice(eq + 1);
      else if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        value = argv[i + 1];
        i++;
      }
      const prev = flags[key];
      if (prev === undefined) flags[key] = value;
      else if (Array.isArray(prev)) prev.push(String(value));
      else flags[key] = [String(prev), String(value)];
    } else if (arg.startsWith('-') && arg.length === 2) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }
  return { _: positional, flags };
}

const s = (p: Parsed, k: string): string | undefined => {
  const v = p.flags[k];
  return typeof v === 'string' ? v : undefined;
};
const n = (p: Parsed, k: string): number | undefined => {
  const v = s(p, k);
  if (v === undefined) return undefined;
  const num = Number(v);
  if (!Number.isFinite(num)) throw new Error(`--${k} debe ser numérico`);
  return num;
};
const b = (p: Parsed, k: string): boolean => p.flags[k] === true || p.flags[k] === 'true' || p.flags[k] === '1';
const multi = (p: Parsed, k: string): string[] => {
  const v = p.flags[k];
  if (v === undefined || v === true) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean);
};
const jsonOut = (p: Parsed) => b(p, 'json');

const HELP = `visual-engine (ve) · motor de calidad visual para agentes

USO
  ve <comando> [opciones]

COMANDOS
  doctor                 Comprueba herramientas reales (ffmpeg, Playwright, GSAP, Three.js, Motion, Remotion)
  analyze <archivos...>  Perfil visual de imágenes o vídeos de referencia
  frames <archivo>       Extrae fotogramas con FFmpeg
  capture <destino>      Captura el proyecto en Chromium y mide el resultado
  compare <ref> <cand>   Compara referencia y resultado
  review                 Ciclo completo: analizar + capturar + comparar + informe
  timeline <vídeo>       Escenas, fotogramas clave y storyboard medidos
  motion <vídeo>         Movimiento de cámara (desplazamiento, zoom, rotación)
  inspect <archivo>      Composición, formas, texto y profundidad estimada
  detect <vídeo>         Efectos visuales con evidencia y estado (verified/estimated)
  spec <vídeo>           Especificación visual estructurada (JSON + Markdown)
  recommend              Tecnología y código por efecto (--effect o --spec)
  temporal <ref> <cand>  Comparación temporal y calidad multidimensional
  compose <json>         Valida y renderiza una composición de capas (0.3)
  refeffects <vídeo>     Referencia medida → composición de efectos y código
  art <brief>            Dirección artística: identidad, tokens, tipografía, efectos y CSS
  refdesign <archivo>    Reference-to-Design: identidad, layout, componentes, motion y código
  motiondirector         Plan de movimiento, cámara, reduced motion y laboratorio
  showcase               Genera 20 composiciones; --measure las mide en Chromium
  gallery                Galería local opcional (efectos, parámetros, composición)
  benchmark              Mide FPS, frame time, memoria y carga de los efectos
  vision [status|describe|ocr|setup]  Tesseract, VRAM y modelos locales de Ollama
  iterate                Aplica un cambio, mide y revierte si empeora
  backup [list|restore]  Copias de seguridad de las iteraciones
  effects [list]         Biblioteca de efectos reutilizables
  effects show <id>      Ficha de un efecto
  effects apply <id>     Aplica un efecto en --out
  adapters               Adaptadores de GSAP, Three.js, Motion, Remotion, React Bits, Playwright, FFmpeg
  adapters scaffold <id> Genera la integración en --out
  deps                   Plan de dependencias por capacidad
  deps install <pkgs...> Instala paquetes gratuitos (requiere --yes)
  init                   Instala instrucciones, skills y config MCP en el proyecto
  serve                  API local (127.0.0.1:4747)
  mcp                    Servidor MCP por stdio
  update                 Actualiza desde GitHub (git pull + instalación + build)
  version                Versión y entorno

EJEMPLOS
  ve doctor --json
  ve analyze referencia.mp4 --samples 12
  ve review --reference referencia.mp4 --target-dir ./mi-web --frames 6 --out ./out
  ve review --reference intro.mp4 --target http://localhost:3000 --width 1080 --height 1920
  ve timeline intro.mp4 --out ./analisis --storyboard
  ve spec intro.mp4 --out ./analisis
  ve temporal referencia.mp4 resultado.mp4 --out ./analisis
  ve compose composicion.json --out ./mi-composicion
  ve refeffects referencia.mp4 --out ./reconstruccion --vision --compare
  ve art "panel financiero sobrio" --style financial-dashboard --out ./sistema
  ve refdesign referencia.png --out ./sistema --vision
  ve motiondirector --style cinematic --out ./motion
  ve showcase --out ./showcase --measure
  ve gallery --port 4173
  ve benchmark --ms 800 --width 960 --height 540
  ve iterate --reference referencia.mp4 --target-dir ./mi-web --replace index.nuevo.html
  ve effects apply aurora-hero --out ./mi-web --set accent=#12e0c8
  ve adapters scaffold three --out ./mi-web/visual/three
  ve init --agents all --clients claude,cursor

Todo funciona en local y gratis. Sin claves ni APIs de pago.`;

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

async function cmdDoctor(p: Parsed) {
  const r = await opDoctor({ project: s(p, 'project'), capabilities: multi(p, 'capabilities') });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  console.log(`Proyecto: ${r.projectDir}`);
  console.log(`Herramientas: ${r.ready}/${r.total} disponibles\n`);
  for (const t of r.tools) {
    const state = t.available ? `OK  ${t.version ?? ''}` : 'FALTA';
    console.log(`${pad(t.id, 13)} ${pad(state, 26)} ${t.source}`);
    if (t.detail) console.log(`${' '.repeat(14)}${t.detail}`);
  }
  if (r.install.length) console.log(`\nInstalar gratuitas: npm install ${r.install.join(' ')}`);
  console.log('\nLicencias y límites: ve adapters');
}

async function cmdAnalyze(p: Parsed) {
  if (!p._.length) throw new Error('Indica al menos una imagen o vídeo: ve analyze <archivo>');
  const results = await opAnalyze({ paths: p._, samples: n(p, 'samples'), width: n(p, 'width'), outDir: s(p, 'out') });
  if (jsonOut(p)) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  for (const r of results) {
    console.log(`\n${r.path}`);
    for (const line of r.description) console.log(`  ${line}`);
  }
}

async function cmdFrames(p: Parsed) {
  const file = p._[0];
  if (!file) throw new Error('Uso: ve frames <archivo> [--count n] [--width px] [--out dir]');
  const r = await opExtractFrames({ path: file, outDir: s(p, 'out'), count: n(p, 'count'), fps: n(p, 'fps'), width: n(p, 'width'), format: (s(p, 'format') as 'png' | 'jpg') ?? 'png' });
  if (jsonOut(p)) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.files.length} fotogramas en ${r.outDir}`);
    console.log(`${r.info.width}x${r.info.height}, ${r.info.duration.toFixed(2)} s, ${r.info.fps} fps, ${r.info.codec}`);
  }
}

async function cmdCapture(p: Parsed) {
  const target = p._[0] ?? 'index.html';
  const r = await opCapture({
    target,
    serveDir: s(p, 'serve'),
    width: n(p, 'width'),
    height: n(p, 'height'),
    frames: n(p, 'frames'),
    intervalMs: n(p, 'interval'),
    waitMs: n(p, 'wait'),
    outDir: s(p, 'out'),
    fullPage: b(p, 'full'),
  });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ ...r, profile: r.profile }, null, 2));
    return;
  }
  console.log(`Capturado: ${r.url}`);
  console.log(`Título: ${r.title || '(sin título)'}`);
  for (const line of r.description) console.log(`  ${line}`);
  console.log(`Capturas: ${r.frames.length} en ${r.outDir}`);
  if (r.consoleErrors.length) {
    console.log(`\nErrores de consola (${r.consoleErrors.length}):`);
    r.consoleErrors.slice(0, 5).forEach((e) => console.log(`  - ${e}`));
  }
  if (r.errors.length) {
    console.log(`\nRecursos fallidos (${r.errors.length}):`);
    r.errors.slice(0, 5).forEach((e) => console.log(`  - ${e}`));
  }
}

async function cmdCompare(p: Parsed) {
  const [reference, candidate] = p._;
  if (!reference || !candidate) throw new Error('Uso: ve compare <referencia> <candidato>');
  const r = await opCompare({ reference, candidate, outDir: s(p, 'out') });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  console.log(`${r.comparison.score.toFixed(1)}/100 (${r.comparison.grade}) · ${r.comparison.summary}`);
  for (const m of r.comparison.metrics) {
    console.log(`  ${pad(m.metric, 20)} ref ${m.reference.toFixed(4)}  resultado ${m.candidate.toFixed(4)}  sim ${(m.similarity * 100).toFixed(0)}%`);
  }
  console.log('\nCorrecciones:');
  r.comparison.recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
  if (r.heatmap) console.log(`\nMapa de calor: ${r.heatmap}`);
}

async function cmdReview(p: Parsed) {
  const reference = s(p, 'reference');
  if (!reference) throw new Error('Falta --reference <imagen|vídeo>');
  const targetDir = s(p, 'target-dir');
  const target = s(p, 'target');
  if (!targetDir && !target) throw new Error('Indica --target-dir <carpeta> o --target <url|html>');
  const r = await opReview({
    reference,
    target,
    targetDir,
    width: n(p, 'width'),
    height: n(p, 'height'),
    frames: n(p, 'frames'),
    intervalMs: n(p, 'interval'),
    waitMs: n(p, 'wait'),
    samples: n(p, 'samples'),
    outDir: s(p, 'out'),
  });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ score: r.score, grade: r.grade, quality: r.quality, comparison: r.comparison, image: r.image, report: r.report, warnings: r.warnings, heatmap: r.heatmap }, null, 2));
  } else {
    console.log(`\nFidelidad: ${r.score.toFixed(1)}/100 (${r.grade})`);
    console.log(r.comparison.summary);
    console.log(`Calidad: ${r.quality.summary}`);
    console.log('\nCorrecciones priorizadas:');
    r.comparison.recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
    if (r.image) console.log(`\nSSIM ${r.image.ssim} · ΔE ${r.image.deltaE} · MAE ${r.image.mae}`);
    if (r.heatmap) console.log(`Mapa de calor: ${r.heatmap}`);
    console.log(`Informe: ${r.report.md}`);
    if (r.warnings.length) {
      console.log('\nAvisos:');
      r.warnings.forEach((w) => console.log(`  - ${w}`));
    }
  }
  const min = n(p, 'fail-under');
  if (min !== undefined && r.score < min) {
    console.error(`\nLa puntuación ${r.score.toFixed(1)} está por debajo de --fail-under ${min}`);
    process.exitCode = 1;
  }
}

async function cmdEffects(p: Parsed) {
  const sub = p._[0] ?? 'list';
  if (sub === 'list') {
    const effects = opListEffects({ category: s(p, 'category'), query: s(p, 'q') });
    if (jsonOut(p)) {
      console.log(JSON.stringify(effects, null, 2));
      return;
    }
    console.log(`Biblioteca: ${effects.length} efectos\n`);
    for (const e of effects) {
      console.log(`${pad(e.id, 20)} ${pad(e.category, 12)} ${e.summary}`);
      console.log(`${' '.repeat(21)}${e.engines.join(', ')} · ${e.requires.length ? e.requires.join(', ') : 'sin dependencias'} · ${e.performance}`);
    }
    return;
  }
  if (sub === 'show') {
    const id = p._[1];
    if (!id) throw new Error('Uso: ve effects show <id>');
    const e = opGetEffect(id);
    console.log(JSON.stringify(e, null, 2));
    return;
  }
  if (sub === 'apply') {
    const id = p._[1];
    if (!id) throw new Error('Uso: ve effects apply <id> --out <carpeta>');
    const outDir = s(p, 'out');
    if (!outDir) throw new Error('Falta --out <carpeta>');
    const params: Record<string, string> = {};
    for (const pair of multi(p, 'set')) {
      const [k, ...rest] = pair.split('=');
      if (!k || !rest.length) throw new Error(`Parámetro inválido: ${pair}. Usa --set nombre=valor`);
      params[k] = rest.join('=');
    }
    const applied = opApplyEffect({ id, outDir, params });
    console.log(`Efecto ${id} escrito en ${applied.dir}`);
    console.log(`Entrada: ${applied.entry}`);
    applied.notes.forEach((note) => console.log(`  ${note}`));
    return;
  }
  throw new Error(`Subcomando desconocido: ${sub}. Usa list, show o apply.`);
}

async function cmdAdapters(p: Parsed) {
  const sub = p._[0] ?? 'list';
  if (sub === 'list') {
    if (jsonOut(p)) {
      console.log(JSON.stringify(opAdapters(), null, 2));
      return;
    }
    for (const a of ADAPTERS) {
      console.log(`\n${pad(a.id, 12)} ${a.title}`);
      console.log(`  Licencia: ${a.license}`);
      console.log(`  Gratis: ${a.freeTier}`);
      for (const note of a.notes) console.log(`  - ${note}`);
    }
    return;
  }
  if (sub === 'scaffold') {
    const id = p._[1];
    const outDir = s(p, 'out');
    if (!id) throw new Error(`Indica el adaptador: ${ADAPTERS.map((a) => a.id).join(', ')}`);
    if (!outDir) throw new Error('Falta --out <carpeta>');
    const sc = await opScaffold({ adapter: id, outDir, write: !b(p, 'dry-run') });
    console.log(`${sc.title} → ${sc.outDir}`);
    sc.files.forEach((f) => console.log(`  ${f}`));
    if (sc.install.length) console.log(`Instalar: npm install ${sc.install.join(' ')}`);
    for (const c of sc.checked) console.log(`  node --check ${c.ok ? 'OK' : 'FALLO'}: ${path.basename(c.file)}${c.ok ? '' : `\n${c.output}`}`);
    if (sc.entry) console.log(`Entrada: ${sc.entry}`);
    return;
  }
  throw new Error(`Subcomando desconocido: ${sub}. Usa list o scaffold.`);
}

async function cmdDeps(p: Parsed) {
  const sub = p._[0] ?? 'plan';
  if (sub === 'plan') {
    const r = await opDepsPlan({ capabilities: multi(p, 'cap'), project: s(p, 'project') });
    if (jsonOut(p)) {
      console.log(JSON.stringify(r.plan, null, 2));
      return;
    }
    for (const c of r.plan) {
      console.log(`${pad(c.capability, 22)} ${c.installed.length ? 'OK ' + c.installed.join(', ') : 'sin herramientas'}${c.missing.length ? ` · falta ${c.missing.join(', ')}` : ''}`);
    }
    const install = [...new Set(r.plan.flatMap((c) => c.install))];
    if (install.length) console.log(`\nInstalar: npm install ${install.join(' ')}`);
    return;
  }
  if (sub === 'install') {
    const packages = p._.slice(1);
    if (!packages.length) throw new Error('Uso: ve deps install <paquete...> --yes');
    const r = await opInstallDeps({ packages, project: s(p, 'project'), confirm: b(p, 'yes'), dryRun: b(p, 'dry-run') });
    console.log(`${r.dryRun ? 'Simulación' : 'Ejecutado'}: ${r.command} (${r.manager})`);
    if (r.stdout) console.log(r.stdout);
    if (r.stderr) console.error(r.stderr);
    if (!r.ok) process.exitCode = 1;
    return;
  }
  throw new Error(`Subcomando desconocido: ${sub}. Usa plan o install.`);
}

async function cmdInit(p: Parsed) {
  const agentsRaw = multi(p, 'agents');
  const agents = agentsRaw.includes('all') || !agentsRaw.length
    ? undefined
    : (agentsRaw as AgentName[]);
  const clients = multi(p, 'clients') as ClientName[];
  const r = initProject({ projectDir: s(p, 'project'), agents, clients: clients.includes('all' as ClientName) ? ['claude', 'cursor', 'gemini', 'opencode', 'codex'] : clients, force: b(p, 'force') });
  console.log(`Proyecto: ${r.projectDir}`);
  for (const f of r.files) console.log(`  ${f.status.padEnd(18)} ${f.path}`);
  for (const m of r.mcp) console.log(`  MCP ${m.client.padEnd(9)} ${m.status.padEnd(8)} ${m.path}${m.note ? `\n    ${m.note}` : ''}`);
  console.log('\nSiguiente:');
  r.next.forEach((x) => console.log(`  - ${x}`));
}

async function cmdServe(p: Parsed) {
  const api = await startApi({ port: n(p, 'port'), allowInstall: b(p, 'allow-install') });
  console.log(`API local: ${api.url}`);
  console.log(`Instalación de paquetes: ${b(p, 'allow-install') ? 'PERMITIDA' : 'bloqueada (usa --allow-install)'}`);
  console.log('Endpoints: /v1/health, /v1/doctor, /v1/analyze, /v1/capture, /v1/compare, /v1/review, /v1/effects, /v1/deps');
  console.log('Ctrl+C para detener.');
  const shutdown = async () => {
    await api.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function cmdMcp() {
  const { runStdio } = await import('../mcp/server.js');
  await runStdio();
}

async function cmdUpdate(p: Parsed) {
  const dir = path.resolve(s(p, 'dir') ?? PACKAGE_ROOT);
  const steps: { label: string; npm?: string[]; git?: string[] }[] = [
    { label: 'git pull', git: ['-C', dir, 'pull', '--ff-only'] },
    { label: 'npm install', npm: ['install', '--no-audit', '--no-fund'] },
    { label: 'npm run build', npm: ['run', 'build'] },
  ];
  for (const step of steps) {
    console.log(`> ${step.label}`);
    const r = step.npm
      ? await runNpm(step.npm, dir)
      : await exec('git', step.git!, { cwd: dir, timeoutMs: 600_000 });
    if (r.stdout.length) process.stdout.write(r.stdout.toString('utf8'));
    if (r.stderr.length) process.stderr.write(r.stderr);
    if (!r.ok) {
      console.error(`Falló: ${step.label}`);
      process.exitCode = 1;
      return;
    }
  }
  console.log('\nActualizado. Reinicia los clientes MCP para recargar las herramientas.');
}

async function cmdTimeline(p: Parsed) {
  const file = p._[0];
  if (!file) throw new Error('Uso: ve timeline <vídeo> [--samples n] [--out dir] [--storyboard]');
  const r = await opTimeline({ path: file, samples: n(p, 'samples'), outDir: s(p, 'out'), storyboard: b(p, 'storyboard') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ timeline: r.timeline, json: r.json, storyboard: r.storyboard }, null, 2));
    return;
  }
  for (const line of r.description) console.log(line);
  if (r.json) console.log(`\nLínea temporal: ${r.json}`);
  if (r.storyboard?.length) {
    console.log(`Storyboard: ${r.storyboard.length} fotogramas clave`);
    r.storyboard.forEach((f) => console.log(`  ${f}`));
  }
}

async function cmdMotion(p: Parsed) {
  const file = p._[0];
  if (!file) throw new Error('Uso: ve motion <vídeo> [--samples n]');
  const r = await opCamera({ path: file, samples: n(p, 'samples'), width: n(p, 'width') });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r.camera, null, 2));
    return;
  }
  for (const line of r.description) console.log(line);
  if (r.camera.warnings.length) {
    console.log('\nAvisos:');
    r.camera.warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

async function cmdInspect(p: Parsed) {
  const file = p._[0];
  if (!file) throw new Error('Uso: ve inspect <archivo> [--frames n] [--ocr]');
  const r = await opInspect({ path: file, frames: n(p, 'frames'), ocr: b(p, 'ocr'), outDir: s(p, 'out') });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  for (const line of r.description) console.log(line);
  if (r.ocr?.available && r.ocr.lines?.length) {
    console.log('\nTexto leído (Tesseract):');
    r.ocr.lines.forEach((l) => console.log(`  [${l.confidence.toFixed(0)}%] ${l.text}`));
  } else if (b(p, 'ocr')) {
    console.log(`\nOCR: ${r.ocr?.reason ?? 'no disponible'}`);
  }
}

async function cmdDetect(p: Parsed) {
  const file = p._[0];
  if (!file) throw new Error('Uso: ve detect <vídeo> [--samples n] [--out dir]');
  const r = await opDetectEffects({ path: file, samples: n(p, 'samples'), outDir: s(p, 'out') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ report: r.report, json: r.json }, null, 2));
    return;
  }
  for (const line of r.description) console.log(line);
  if (r.json) console.log(`\nDatos: ${r.json}`);
}

async function cmdSpec(p: Parsed) {
  const file = p._[0];
  if (!file) throw new Error('Uso: ve spec <vídeo> [--samples n] [--out dir] [--vision]');
  const r = await opSpec({ path: file, samples: n(p, 'samples'), outDir: s(p, 'out'), vision: b(p, 'vision'), model: s(p, 'model') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ spec: r.spec, paths: r.paths }, null, 2));
    return;
  }
  for (const line of r.description) console.log(line);
  console.log('\nEfectos:');
  if (!r.spec.effects.length) console.log('  ninguno por encima del umbral');
  r.spec.effects.forEach((e) => console.log(`  ${e.label} (${e.status}, ${(e.confidence * 100).toFixed(0)}%) → ${e.technology}`));
  console.log(`\nJSON: ${r.paths.json}\nMarkdown: ${r.paths.md}`);
}

async function cmdRecommend(p: Parsed) {
  const effect = s(p, 'effect') ?? (p._[0] !== 'recommend' ? p._[0] : undefined);
  const specFile = s(p, 'spec');
  if (!effect && !specFile) {
    const r = await opRecommend({});
    console.log(`Efectos con recomendación: ${r.catalog.join(', ')}`);
    console.log('Uso: ve recommend --effect glow | ve recommend --spec spec.json --out ./codigo');
    return;
  }
  const r = await opRecommend({ effect, specFile });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r.recommendations, null, 2));
    return;
  }
  const outDir = s(p, 'out');
  for (const rec of r.recommendations) {
    console.log(`\n${rec.label} → ${rec.tech}${rec.checked ? ' · sintaxis JS OK' : ' · revisar código'}`);
    console.log(`  ${rec.why}`);
    console.log(`  Rendimiento: ${rec.performance}`);
    if (rec.install.length) console.log(`  Instalar: npm install ${rec.install.join(' ')}`);
    for (const sn of rec.snippets) {
      const target = outDir ? path.join(outDir, rec.id, sn.filename) : undefined;
      if (target) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, sn.code, 'utf8');
        console.log(`  ${sn.language}: ${target}`);
      } else {
        console.log(`  ${sn.language}: ${sn.filename} (usa --out para escribirlo)`);
      }
    }
    if (rec.checkOutput) console.log(`  Error de sintaxis: ${rec.checkOutput}`);
  }
}

async function cmdTemporal(p: Parsed) {
  const [reference, candidate] = p._;
  if (!reference || !candidate) throw new Error('Uso: ve temporal <referencia.mp4> <resultado.mp4>');
  const r = await opTemporal({ reference, candidate, samples: n(p, 'samples'), outDir: s(p, 'out') });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  for (const line of describeTemporal(r)) console.log(line);
  if (r.report) console.log(`\nInforme: ${r.report.md}`);
}

async function cmdVision(p: Parsed) {
  const action = (p._[0] ?? 'status') as 'status' | 'describe' | 'ocr' | 'setup';
  if (!['status', 'describe', 'ocr', 'setup'].includes(action)) throw new Error('Uso: ve vision [status|describe|ocr|setup] [imagen] [--model nombre] [--install]');
  const r = await opVision({ action, path: p._[1], model: s(p, 'model'), prompt: s(p, 'prompt'), install: b(p, 'install') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ status: r.status, result: r.result }, null, 2));
    return;
  }
  for (const line of r.description) console.log(line);
}

async function cmdCompose(p: Parsed) {
  const file = p._[0];
  const inline = s(p, 'json');
  if (!file && !inline) throw new Error('Uso: ve compose <composicion.json> [--out dir] [--validate]');
  const r = await opCompose({
    file,
    composition: inline ? JSON.parse(inline) : undefined,
    outDir: s(p, 'out') ?? 'composicion',
    validateOnly: b(p, 'validate'),
  });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  if (!r.valid) {
    console.error('Composición inválida:');
    r.errors.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
    return;
  }
  r.description.forEach((l) => console.log(l));
  if (r.rendered) {
    console.log(`\nAbre ${r.rendered.html} con un servidor local (npx serve).`);
    if (r.rendered.warnings.length) r.rendered.warnings.forEach((w) => console.log(`  Aviso: ${w}`));
  }
}

async function cmdReferenceEffects(p: Parsed) {
  const file = p._[0];
  const specFile = s(p, 'spec');
  if (!file && !specFile) throw new Error('Uso: ve refeffects <vídeo> [--out dir] [--vision] [--spec spec.json]');
  const r = await opReferenceEffects({ path: file, specFile, outDir: s(p, 'out'), vision: b(p, 'vision'), model: s(p, 'model'), render: !b(p, 'no-render') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ mapping: r.mapping, coverage: r.coverage, warnings: r.warnings, composition: r.composition, rendered: r.rendered }, null, 2));
    return;
  }
  console.log(`Señales detectadas: ${r.coverage.detected} · asignadas: ${r.coverage.mapped} · capas: ${r.coverage.selected}`);
  for (const m of r.mapping) {
    console.log(`  ${m.detected.padEnd(12)} → ${m.mappedTo.padEnd(18)} ${m.status} ${(m.confidence * 100).toFixed(0)}%`);
    console.log(`    ${m.note}`);
  }
  for (const w of r.warnings) console.log(`  Aviso: ${w}`);
  if (r.rendered) {
    console.log(`\nComposición: ${r.rendered.config}`);
    console.log(`HTML: ${r.rendered.html}`);
    console.log(`Efectos: ${r.rendered.effects.join(', ')}`);
  }
}

async function cmdArt(p: Parsed) {
  const brief = p._.join(' ').trim() || s(p, 'brief');
  if (!brief) throw new Error('Uso: ve art "brief del proyecto" [--style id] [--project tipo] [--out dir]');
  const r = opArtDirection({ brief, style: s(p, 'style'), projectType: s(p, 'project'), outDir: s(p, 'out') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ artDirection: r.artDirection, design: r.design }, null, 2));
    return;
  }
  r.description.forEach((line) => console.log(line));
}

async function cmdMotionDirector(p: Parsed) {
  const r = opMotionDirector({ style: s(p, 'style'), brief: s(p, 'brief'), projectType: s(p, 'project'), outDir: s(p, 'out') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ plan: r.plan, html: r.html }, null, 2));
    return;
  }
  r.description.forEach((line) => console.log(line));
}

async function cmdReferenceDesign(p: Parsed) {
  const file = p._[0];
  const specFile = s(p, 'spec');
  if (!file && !specFile) throw new Error('Uso: ve refdesign <imagen|vídeo> [--out dir] [--vision] [--spec spec.json]');
  const r = await opReferenceDesign({ path: file, specFile, style: s(p, 'style'), brief: s(p, 'brief'), outDir: s(p, 'out'), vision: b(p, 'vision'), model: s(p, 'model') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ design: r.design, rendered: r.rendered }, null, 2));
    return;
  }
  r.description.forEach((line) => console.log(line));
  console.log('\nConfirmado:');
  r.design.confirmed.forEach((c) => console.log(`  ${c.value} — ${c.evidence}`));
  console.log('\nEstimado:');
  r.design.estimated.forEach((c) => console.log(`  ${c.value} — ${c.evidence}`));
}

async function cmdShowcase(p: Parsed) {
  const r = await opShowcase({ outDir: s(p, 'out'), ids: multi(p, 'ids'), measure: b(p, 'measure') });
  if (jsonOut(p)) {
    console.log(JSON.stringify({ rendered: r.rendered, measurements: r.measurements }, null, 2));
    return;
  }
  r.description.forEach((line) => console.log(line));
  if (r.measurements) {
    console.log('\nComposición      FPS  Contraste  Overflow');
    for (const m of r.measurements) console.log(`  ${m.id.padEnd(15)} ${String(m.fps).padStart(3)}  ${String(m.contrastViolations).padStart(9)}  ${String(m.overflowX).padStart(8)}  ${m.ok ? 'OK' : 'REVISAR'}`);
  }
}

async function cmdBenchmark(p: Parsed) {
  const effects = multi(p, 'effects');
  const r = await opBenchmark({ effects: effects.includes('all') ? undefined : effects.length ? effects : undefined, ms: n(p, 'ms'), width: n(p, 'width'), height: n(p, 'height'), outFile: s(p, 'out'), docsFile: s(p, 'docs') });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  console.log(`Medidos ${r.summary.ok}/${r.summary.tested} efectos · FPS mediana ${r.summary.medianFps} · mínimo ${r.summary.minFps}`);
  for (const e of r.effects) console.log(`  ${e.id.padEnd(20)} ${String(e.fps).padStart(6)} fps  ${String(e.frameMsMean).padStart(6)} ms  heap ${e.heapMb ?? '—'} MB  ${e.ok ? '' : 'ERROR'}`);
  console.log(`\nJSON: ${s(p, 'out') ?? 'library/benchmarks.json'}`);
}

async function cmdGallery(p: Parsed) {
  const g = await startGallery({ port: n(p, 'port') ?? 0 });
  console.log(`Galería local: ${g.url}`);
  console.log('Ctrl+C para detener. Visual Engine sigue funcionando sin esta interfaz.');
  const shutdown = async () => { await g.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function cmdIterate(p: Parsed) {
  const reference = s(p, 'reference');
  const targetDir = s(p, 'target-dir') ?? s(p, 'project');
  if (!reference) throw new Error('Falta --reference <imagen|vídeo>');
  const r = await opIterate({
    projectDir: targetDir,
    target: s(p, 'target') ?? 'index.html',
    reference,
    targetDir,
    patchFile: s(p, 'patch'),
    replaceFile: s(p, 'replace'),
    width: n(p, 'width'),
    height: n(p, 'height'),
    frames: n(p, 'frames'),
    intervalMs: n(p, 'interval'),
    outDir: s(p, 'out'),
    minDelta: n(p, 'min-delta'),
    keep: b(p, 'keep'),
  });
  if (jsonOut(p)) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    for (const line of describeIteration(r)) console.log(line);
  }
  if (r.status === 'failed') process.exitCode = 1;
}

async function cmdBackup(p: Parsed) {
  const sub = p._[0] ?? 'list';
  const project = s(p, 'project');
  if (sub === 'list') {
    const items = opBackups(project);
    if (jsonOut(p)) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }
    console.log(`Iteraciones: ${items.length}`);
    for (const m of items) {
      console.log(`  ${m.id}  ${m.status.padEnd(9)} objetivo ${m.target}${m.before ? ` · antes ${m.before.score.toFixed(1)}` : ''}${m.after ? ` → después ${m.after.score.toFixed(1)}` : ''}`);
    }
    return;
  }
  if (sub === 'restore') {
    const id = p._[1];
    if (!id) throw new Error('Uso: ve backup restore <id> --project <dir>');
    const r = opRestoreBackup(project, id);
    console.log(r.message);
    r.restored.forEach((f) => console.log(`  ${f}`));
    return;
  }
  throw new Error(`Subcomando desconocido: ${sub}. Usa list o restore.`);
}

async function main() {
  const p = parse(process.argv.slice(2));
  const cmd = p._[0] ?? 'help';
  const rest = { ...p, _: p._.slice(1) };

  switch (cmd) {
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      return;
    case 'version':
    case '--version':
    case '-v': {
      const v = opVersion();
      console.log(`visual-engine ${v.version} · node ${v.node} · ${v.platform}\n${v.root}`);
      return;
    }
    case 'doctor':
      await cmdDoctor(rest);
      return;
    case 'analyze':
      await cmdAnalyze(rest);
      return;
    case 'frames':
      await cmdFrames(rest);
      return;
    case 'capture':
      await cmdCapture(rest);
      return;
    case 'compare':
      await cmdCompare(rest);
      return;
    case 'review':
      await cmdReview(rest);
      return;
    case 'timeline':
      await cmdTimeline(rest);
      return;
    case 'motion':
      await cmdMotion(rest);
      return;
    case 'inspect':
      await cmdInspect(rest);
      return;
    case 'detect':
      await cmdDetect(rest);
      return;
    case 'spec':
      await cmdSpec(rest);
      return;
    case 'recommend':
      await cmdRecommend(rest);
      return;
    case 'temporal':
      await cmdTemporal(rest);
      return;
    case 'vision':
      await cmdVision(rest);
      return;
    case 'compose':
      await cmdCompose(rest);
      return;
    case 'refeffects':
      await cmdReferenceEffects(rest);
      return;
    case 'art':
      await cmdArt(rest);
      return;
    case 'refdesign':
      await cmdReferenceDesign(rest);
      return;
    case 'motiondirector':
    case 'motion-director':
      await cmdMotionDirector(rest);
      return;
    case 'showcase':
      await cmdShowcase(rest);
      return;
    case 'benchmark':
      await cmdBenchmark(rest);
      return;
    case 'gallery':
      await cmdGallery(rest);
      return;
    case 'iterate':
      await cmdIterate(rest);
      return;
    case 'backup':
      await cmdBackup(rest);
      return;
    case 'effects':
      await cmdEffects(rest);
      return;
    case 'adapters':
      await cmdAdapters(rest);
      return;
    case 'deps':
      await cmdDeps(rest);
      return;
    case 'init':
      await cmdInit(rest);
      return;
    case 'serve':
      await cmdServe(rest);
      return;
    case 'mcp':
      await cmdMcp();
      return;
    case 'update':
      await cmdUpdate(rest);
      return;
    default:
      // Permite `ve <archivo>` como atajo de análisis.
      if (cmd && !cmd.startsWith('-')) {
        await cmdAnalyze(p);
        return;
      }
      console.error(`Comando desconocido: ${cmd}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`Error: ${(e as Error).message}`);
  process.exitCode = 1;
});

