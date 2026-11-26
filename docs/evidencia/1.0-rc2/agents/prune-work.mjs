#!/usr/bin/env node
/** Borra ramas de `work/` que runs.json ya no referencia (ejecuciones descartadas). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runs = JSON.parse(fs.readFileSync(path.join(here, 'runs.json'), 'utf8'));
const keep = new Set();
for (const c of Object.values(runs.cases)) {
  if (c.dirA) keep.add(c.dirA.split(path.sep).join('/'));
  if (c.dirB) keep.add(c.dirB.split(path.sep).join('/'));
}
const base = path.join(here, 'work');
for (const id of fs.readdirSync(base)) {
  // Si el caso no declara dirA/dirB, su evidencia vive en work/<id>/{a,b}:
  // no se toca nada de ese caso.
  if (![...keep].some((k) => k.startsWith(`work/${id}/`))) {
    console.log('conservar (caso sin marca):', id);
    continue;
  }
  for (const sub of fs.readdirSync(path.join(base, id))) {
    const rel = ['work', id, sub].join('/');
    const used = [...keep].some((k) => k.startsWith(rel));
    if (!used) {
      console.log('borrar', rel);
      try { fs.rmSync(path.join(base, id, sub), { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); }
      catch (e) { console.log('  no se pudo borrar:', e.code); }
    }
  }
}
console.log('conservadas:', [...keep].join(', '));
