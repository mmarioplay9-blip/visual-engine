#!/usr/bin/env node
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
    console.log(JSON.stringify({ score: r.score, grade: r.grade, comparison: r.comparison, image: r.image, report: r.report, warnings: r.warnings, heatmap: r.heatmap }, null, 2));
  } else {
    console.log(`\nFidelidad: ${r.score.toFixed(1)}/100 (${r.grade})`);
    console.log(r.comparison.summary);
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

