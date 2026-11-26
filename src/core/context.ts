import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeFile, type VisualProfile } from './analysis.js';
import { listEffects } from './library.js';
import type { ReviewResult } from './review.js';
import { selectSmartEffects, compactRecipe } from './smart-effects.js';
import { getProfile, type ProfileId } from './profiles.js';

/**
 * Contexto para agentes 0.5.
 *
 * No envía los 58 efectos ni la documentación completa en cada petición.
 * Clasifica la tarea, selecciona herramientas/recetas, cachea análisis por hash
 * y ofrece recuperación puntual de una receta. El informe compacto es explícito
 * sobre lo que omite.
 */

export type TaskKind = 'design' | 'review' | 'reference' | 'motion' | 'effects' | 'compose' | 'debug' | 'loop' | 'analyze';

export interface ToolHint {
  name: string;
  kind: TaskKind[];
  purpose: string;
  command: string;
}

const TOOLS: ToolHint[] = [
  { name: 'visual_context', kind: ['design', 'review', 'reference', 'motion', 'effects', 'compose', 'debug', 'loop', 'analyze'], purpose: 'Carga selectiva de herramientas y recetas.', command: 've context "<tarea>"' },
  { name: 'visual_doctor', kind: ['review', 'compose', 'debug', 'loop'], purpose: 'Comprueba dependencias reales.', command: 've doctor' },
  { name: 'visual_art_direction', kind: ['design'], purpose: 'Identidad, tokens, tipografía y CSS.', command: 've art "<brief>"' },
  { name: 'visual_smart_effects', kind: ['design', 'effects'], purpose: 'Selección contextual de efectos.', command: 've effects select "<brief>"' },
  { name: 'visual_reference_design', kind: ['reference'], purpose: 'Referencia → sistema y componentes.', command: 've refdesign <archivo>' },
  { name: 'visual_motion_director', kind: ['motion'], purpose: 'Curvas, cámara y reduced motion.', command: 've motiondirector' },
  { name: 'visual_capture', kind: ['review', 'debug', 'loop'], purpose: 'Captura real y auditoría DOM.', command: 've capture <target>' },
  { name: 'visual_review', kind: ['review', 'loop'], purpose: 'Fidelidad, calidad y mapa de calor.', command: 've review --reference ...' },
  { name: 'visual_debug', kind: ['debug', 'loop'], purpose: 'Selector, CSS, capas, frames y fuente.', command: 've debug <target>' },
  { name: 'visual_critic', kind: ['review', 'debug', 'loop'], purpose: 'Defectos con evidencia y corrección.', command: 've critic <target> --reference ...' },
  { name: 'visual_fidelity', kind: ['review', 'reference'], purpose: 'Fidelidad estructural, no píxeles.', command: 've fidelity ...' },
  { name: 'visual_gate', kind: ['review', 'loop'], purpose: 'Criterios de aceptación y bloqueo crítico.', command: 've gate <informe.json>' },
  { name: 'visual_loop', kind: ['loop'], purpose: 'Ciclo con copia, límites y reversión.', command: 've loop ...' },
  { name: 'visual_effects_list', kind: ['effects', 'design'], purpose: 'Biblioteca filtrada, no completa.', command: 've effects list' },
  { name: 'visual_effect_apply', kind: ['effects'], purpose: 'Aplica una receta concreta.', command: 've effects apply <id>' },
  { name: 'visual_compose', kind: ['compose'], purpose: 'Compone capas y timeline.', command: 've compose <json>' },
  { name: 'visual_temporal', kind: ['motion', 'review'], purpose: 'Comparación temporal.', command: 've temporal <ref> <cand>' },
  { name: 'visual_camera', kind: ['motion'], purpose: 'Movimiento de cámara medido.', command: 've camera <vídeo>' },
  { name: 'visual_benchmark', kind: ['performance', 'review'] as TaskKind[], purpose: 'FPS y memoria reales.', command: 've benchmark' },
  { name: 'visual_vision', kind: ['analyze', 'reference'], purpose: 'OCR/visión local opcional.', command: 've vision status' },
];

const DOCS: Record<TaskKind, { path: string; why: string }[]> = {
  design: [{ path: 'CAPABILITIES.md', why: 'Límites y capacidades reales.' }, { path: 'docs/ARQUITECTURA.md', why: 'Integración de módulos.' }],
  review: [{ path: 'CAPABILITIES.md', why: 'Qué se puede afirmar.' }, { path: 'docs/VERIFICACION-0.4.md', why: 'Método de evidencia.' }],
  reference: [{ path: 'CAPABILITIES.md', why: 'Límites de visión.' }],
  motion: [{ path: 'docs/VERIFICACION-0.4.md', why: 'Validación de rotación/transición.' }],
  effects: [{ path: 'library/README.md', why: 'Contratos de efectos.' }],
  compose: [{ path: 'CAPABILITIES.md', why: 'Límites de composición.' }],
  debug: [{ path: 'CAPABILITIES.md', why: 'Qué mide el DOM.' }],
  loop: [{ path: 'CAPABILITIES.md', why: 'Límites de reversión y tokens.' }, { path: 'docs/VERIFICACION-0.4.md', why: 'Evidencia y método.' }],
  analyze: [{ path: 'CAPABILITIES.md', why: 'Límites de análisis.' }],
};

function classify(task: string): TaskKind {
  const t = task.toLowerCase();
  if (/loop|iteraci[oó]n|aut[oó]nomo|mejora/.test(t)) return 'loop';
  if (/debug|selector|dom|css|overflow|fuente|archivo/.test(t)) return 'debug';
  if (/review|revisi[oó]n|calidad|critic|cr[ií]tica/.test(t)) return 'review';
  if (/motion|animaci[oó]n|transici[oó]n|c[aá]mara|rotaci[oó]n/.test(t)) return 'motion';
  if (/referencia|refdesign|fidelidad|imagen|v[ií]deo/.test(t)) return 'reference';
  if (/efecto|effect|glow|part[ií]cula/.test(t)) return 'effects';
  if (/compose|composici[oó]n|capas/.test(t)) return 'compose';
  if (/dise[nñ]o|art|landing|dashboard|app|estilo|tipograf/.test(t)) return 'design';
  return 'analyze';
}

const CACHE_VERSION = '0.5-analysis-v1';

function cacheRoot(): string {
  return path.join(os.tmpdir(), 'visual-engine-cache', CACHE_VERSION);
}

function sha256File(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export interface CachedAnalysis {
  profile: VisualProfile;
  cache: 'hit' | 'miss';
  key: string;
}

/** Caché de análisis por contenido + opciones; no cachea por nombre. */
export async function cachedAnalyze(
  file: string,
  options: { samples?: number; width?: number } = {},
  cacheDir = cacheRoot(),
): Promise<CachedAnalysis> {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`No existe el archivo: ${abs}`);
  const key = crypto.createHash('sha256')
    .update(sha256File(abs))
    .update(JSON.stringify({ samples: options.samples ?? 8, width: options.width ?? 192, v: CACHE_VERSION }))
    .digest('hex');
  const dir = path.join(cacheDir, key.slice(0, 2));
  const target = path.join(dir, `${key}.json`);
  if (fs.existsSync(target)) {
    try {
      return { profile: JSON.parse(fs.readFileSync(target, 'utf8')) as VisualProfile, cache: 'hit', key };
    } catch {
      /* caché corrupta: se recalcula */
    }
  }
  const profile = await analyzeFile(abs, { samples: options.samples ?? 8, width: options.width ?? 192 });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, JSON.stringify(profile, null, 2) + '\n', 'utf8');
  return { profile, cache: 'miss', key };
}

export function clearAnalysisCache(cacheDir = cacheRoot()): number {
  if (!fs.existsSync(cacheDir)) return 0;
  let removed = 0;
  const visit = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) visit(full);
      else if (e.isFile() && e.name.endsWith('.json')) {
        fs.rmSync(full);
        removed++;
      }
    }
  };
  visit(cacheDir);
  return removed;
}

export interface ContextSelection {
  version: '1.0';
  profile: ProfileId;
  tokenBudget: number;
  task: string;
  kind: TaskKind;
  tools: ToolHint[];
  recipes: ReturnType<typeof compactRecipe>[];
  docs: { path: string; why: string }[];
  estimatedTokens: number;
  cache: { root: string; note: string };
  compact: string;
  limits: string[];
}

export function estimateTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return Math.ceil(text.length / 4);
}

/**
 * Selecciona el contexto mínimo suficiente. No devuelve código de efectos;
 * para eso se llama a `loadRecipe` con un id concreto.
 */
export function selectContext(task: string, opts: { profile?: string; maxTools?: number; maxRecipes?: number; style?: string; projectType?: string } = {}): ContextSelection {
  const kind = classify(task);
  const profile = getProfile(opts.profile);
  const maxTools = Math.max(2, Math.min(12, opts.maxTools ?? profile.maxTools));
  const maxRecipes = Math.max(0, Math.min(5, opts.maxRecipes ?? profile.maxRecipes));
  const tools = TOOLS.filter((t) => t.kind.includes(kind) || t.name === 'visual_context').slice(0, maxTools);
  let recipes: ReturnType<typeof compactRecipe>[] = [];
  if (kind === 'design' || kind === 'effects') {
    const smart = selectSmartEffects({ brief: task, style: opts.style, projectType: opts.projectType, maxEffects: maxRecipes });
    recipes = smart.selected.slice(0, maxRecipes).map((e) => ({
      id: e.id, name: e.name, category: e.category, summary: e.role,
      role: e.role, engines: [], performance: e.performance, params: e.params.map((p) => ({ name: p, type: 'string' as const, default: '', description: '' })), entry: '', files: [],
    }));
  } else {
    const words = task.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length >= 3);
    recipes = listEffects()
      .filter((e) => words.some((w) => `${e.id} ${e.name} ${e.category} ${e.tags.join(' ')}`.toLowerCase().includes(w)))
      .slice(0, maxRecipes)
      .map((e) => compactRecipe(e.id));
  }
  const docs = DOCS[kind].slice(0, Math.max(0, Math.min(2, profile.maxDocs)));
  const compact = [
    `TAREA: ${task}`,
    `TIPO: ${kind}`,
    `HERRAMIENTAS: ${tools.map((t) => t.name).join(', ')}`,
    `RECETAS: ${recipes.map((r) => `${r.id} (${r.role})`).join(', ') || 'ninguna; pide una concreta'}`,
    `DOCS: ${docs.map((d) => d.path).join(', ')}`,
    `REGLAS: no cargar los 58 efectos; pedir un id; verificar antes de afirmar.`,
  ].join('\n');
  return {
    version: '1.0', profile: profile.id, tokenBudget: profile.tokenBudget, task, kind, tools, recipes, docs,
    estimatedTokens: estimateTokens(compact),
    cache: { root: cacheRoot(), note: 'Caché local por contenido y opciones; se puede borrar con ve context --clear-cache.' },
    compact,
    limits: [
      'El contexto seleccionado no contiene el código de los efectos; se recupera sólo el id necesario.',
      'Las recetas son sugerencias; no sustituyen la medición del resultado.',
      'La estimación de tokens es aproximada (caracteres/4), no un recuento del proveedor; el presupuesto es un límite local.',
      `Perfil ${profile.id}: selecciona capacidades y presupuesto, nunca una estética.`,
    ],
  };
}

/** Recuperación puntual de una receta completa; no se usa en la carga inicial. */
export function loadRecipe(id: string) {
  return compactRecipe(id);
}

/** Informe compacto para no reenviar la revisión entera al modelo. */
export function compactReview(r: ReviewResult) {
  const low = (r.quality?.dimensions ?? [])
    .filter((d) => d.available && d.score !== null)
    .sort((a, b) => a.score! - b.score!)
    .slice(0, 4)
    .map((d) => ({ id: d.id, score: d.score, evidence: d.evidence }));
  return {
    version: '0.5',
    score: r.score,
    grade: r.grade,
    quality: r.quality?.overall,
    summary: r.quality?.summary,
    weakest: low,
    contrast: r.target.accessibility?.violations,
    consoleErrors: r.target.consoleErrors.length,
    frames: r.target.frames.length,
    artifacts: { json: r.report.json, heatmap: r.heatmap ?? null },
    omitted: 'Se omiten perfiles, paletas completas y muestras; se recuperan con ve review --json o del artefacto.',
    estimatedTokens: 0,
  };
}

export function describeContext(c: ContextSelection): string[] {
  return [
    `Contexto para ${c.kind}: ${c.tools.length} herramientas, ${c.recipes.length} receta(s), ${c.docs.length} documento(s).`,
    ...c.tools.map((t) => `  ${t.name}: ${t.purpose}`),
    ...c.recipes.map((r) => `  ${r.id} · ${r.role} · ${r.performance}`),
    ...c.docs.map((d) => `  ${d.path}: ${d.why}`),
    `Tokens estimados: ${c.estimatedTokens}. Caché: ${c.cache.root}`,
    ...c.limits.map((l) => `Límite: ${l}`),
  ];
}
