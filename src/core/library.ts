import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, libraryDir } from './paths.js';

export interface EffectParam {
  name: string;
  type: 'color' | 'number' | 'string' | 'boolean';
  default: string | number | boolean;
  description: string;
}

export interface EffectFile {
  path: string;
  content: string;
}

export interface EffectRecipe {
  id: string;
  name: string;
  category: string;
  summary: string;
  tags: string[];
  engines: string[];
  requires: string[];
  performance: string;
  license: string;
  params: EffectParam[];
  files: EffectFile[];
  entry: string;
  dir: string;
}

export interface AppliedEffect {
  id: string;
  dir: string;
  entry: string;
  files: string[];
  params: Record<string, string | number | boolean>;
  requires: string[];
  notes: string[];
}

function listFilesRecursive(dir: string, base = dir): EffectFile[] {
  const out: EffectFile[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, base));
    else if (entry.isFile()) {
      out.push({ path: path.relative(base, full).split(path.sep).join('/'), content: fs.readFileSync(full, 'utf8') });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Cada efecto es una carpeta con recipe.json (metadatos) y templates/ (archivos reales). */
export function listEffects(): EffectRecipe[] {
  const root = libraryDir();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'recipe.json')))
    .map((d) => loadRecipe(path.join(root, d.name)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function loadRecipe(dir: string): EffectRecipe {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'recipe.json'), 'utf8'));
  if (!raw.id || !raw.name) throw new Error(`Receta inválida en ${dir}`);
  const templatesDir = path.join(dir, 'templates');
  const files = fs.existsSync(templatesDir) ? listFilesRecursive(templatesDir) : [];
  if (!files.length) throw new Error(`La receta ${raw.id} no tiene plantillas`);
  return {
    id: String(raw.id),
    name: String(raw.name),
    category: String(raw.category ?? 'general'),
    summary: String(raw.summary ?? ''),
    tags: raw.tags ?? [],
    engines: raw.engines ?? [],
    requires: raw.requires ?? [],
    performance: String(raw.performance ?? 'Sin medición registrada.'),
    license: String(raw.license ?? 'MIT'),
    params: raw.params ?? [],
    files,
    entry: String(raw.entry ?? files.find((f) => f.path.endsWith('.html'))?.path ?? files[0].path),
    dir,
  };
}

export function getEffect(id: string): EffectRecipe {
  const found = listEffects().find((e) => e.id === id);
  if (!found) {
    throw new Error(`Efecto desconocido: ${id}. Disponibles: ${listEffects().map((e) => e.id).join(', ')}`);
  }
  return found;
}

function applyTemplate(content: string, params: Record<string, string | number | boolean>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = params[key];
    if (v === undefined) throw new Error(`Parámetro sin valor: {{${key}}}`);
    return String(v);
  });
}

/** Aplica una receta en disco con parámetros validados y devuelve la ruta de entrada. */
export function applyEffect(
  id: string,
  opts: { outDir: string; params?: Record<string, string | number | boolean> } = { outDir: '.' },
): AppliedEffect {
  const recipe = getEffect(id);
  const params: Record<string, string | number | boolean> = {};
  for (const p of recipe.params) params[p.name] = p.default;
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    const def = recipe.params.find((p) => p.name === k);
    if (!def) throw new Error(`Parámetro desconocido para ${id}: ${k}`);
    if (def.type === 'number') {
      const num = Number(v);
      if (!Number.isFinite(num)) throw new Error(`El parámetro ${k} debe ser numérico`);
      params[k] = num;
    } else if (def.type === 'boolean') {
      params[k] = v === true || v === 'true' || v === '1';
    } else {
      params[k] = String(v);
    }
  }
  const dir = ensureDir(path.resolve(opts.outDir, recipe.id));
  const written: string[] = [];
  for (const file of recipe.files) {
    const target = path.join(dir, file.path);
    ensureDir(path.dirname(target));
    fs.writeFileSync(target, applyTemplate(file.content, params), 'utf8');
    written.push(target);
  }
  return {
    id,
    dir,
    entry: path.join(dir, recipe.entry),
    files: written,
    params,
    requires: recipe.requires,
    notes: [
      recipe.performance,
      recipe.requires.length ? `Dependencias: ${recipe.requires.join(', ')}` : 'Sin dependencias: funciona offline.',
      `Licencia: ${recipe.license}`,
      `Entrada: ${recipe.entry}${recipe.requires.length ? ' (sirve el proyecto desde la raíz)' : ' (también abre por file://)'}`,
    ],
  };
}
