#!/usr/bin/env node
/**
 * Sustituye rutas personales absolutas por marcadores en la evidencia de texto.
 * No toca binarios (PNG/JPG). Idempotente.
 *
 * Uso: node docs/evidencia/1.0-rc2/sanitize.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEXT = new Set(['.json', '.md', '.txt', '.log', '.mjs', '.html', '.js', '.css', '.jsonl', '.csv']);
const RULES = [
  [/D:[\\/]+<home>[\\/]+visual-engine/gi, '<repo>'],
  [/C:[\\/]+Users[\\/]+[^\\/"'\s]+/gi, '<home>'],
];

let changed = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!TEXT.has(path.extname(entry.name).toLowerCase())) continue;
    const before = fs.readFileSync(full, 'utf8');
    let after = before;
    for (const [re, to] of RULES) after = after.replace(re, to);
    if (after !== before) {
      fs.writeFileSync(full, after);
      changed++;
    }
  }
}

walk(here);
console.log(`Archivos saneados: ${changed}`);
