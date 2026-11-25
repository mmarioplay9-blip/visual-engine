import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(import.meta.url);
/** Raíz del paquete instalado (contiene dist/, library/, skills/...). */
export const PACKAGE_ROOT = path.resolve(path.dirname(here), '..', '..');

/** Directorio de estado del usuario: capturas, informes, caché. */
export function veHome(): string {
  return process.env.VISUAL_ENGINE_HOME
    ? path.resolve(process.env.VISUAL_ENGINE_HOME)
    : path.join(os.homedir(), '.visual-engine');
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function stamp(): string {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Directorio de salida nuevo dentro de ~/.visual-engine/<kind>/ */
export function newRunDir(kind: string): string {
  return ensureDir(path.join(veHome(), kind, `${stamp()}-${Math.random().toString(36).slice(2, 7)}`));
}

export function libraryDir(): string {
  return path.join(PACKAGE_ROOT, 'library', 'effects');
}

export function skillsDir(): string {
  return path.join(PACKAGE_ROOT, 'skills');
}

export function agentsDir(): string {
  return path.join(PACKAGE_ROOT, 'agents');
}

/** Busca la raíz de un proyecto de usuario (package.json o .git) subiendo directorios. */
export function findProjectRoot(start = process.cwd()): string {
  let dir = path.resolve(start);
  for (let i = 0; i < 12; i++) {
    if (
      fs.existsSync(path.join(dir, 'package.json')) ||
      fs.existsSync(path.join(dir, '.git'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start);
}

/** Relativo y con separadores POSIX, para informes portables. */
export function rel(p: string, base = process.cwd()): string {
  return path.relative(base, p).split(path.sep).join('/');
}
