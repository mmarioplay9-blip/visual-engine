// Prepara los recursos de la demo: copia GSAP y Three.js a demo/site/vendor
// y genera la referencia si falta. No hay descargas de red.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const vendor = path.join(here, 'site', 'vendor');
fs.mkdirSync(vendor, { recursive: true });

const copies = [
  [path.join(root, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), path.join(vendor, 'gsap.min.js')],
  [path.join(root, 'node_modules', 'three', 'build', 'three.module.min.js'), path.join(vendor, 'three.module.min.js')],
];

for (const [from, to] of copies) {
  if (!fs.existsSync(from)) {
    console.error(`Falta ${from}. Ejecuta npm install antes.`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log(`copiado ${path.relative(root, to)} (${(fs.statSync(to).size / 1024).toFixed(0)} KB)`);
}

const reference = path.join(here, 'reference', 'brand-intro.mp4');
if (!fs.existsSync(reference)) {
  console.log('\nGenerando referencia sintética...');
  execFileSync(process.execPath, [path.join(here, 'make-reference.mjs')], { stdio: 'inherit' });
} else {
  console.log(`referencia existente: ${path.relative(root, reference)}`);
}

const refs02 = ['premium-ui.mp4', 'premium-ui-alt.mp4', 'motion-graphics.mp4', 'depth-3d.mp4', 'camera-pan.mp4', 'camera-zoom.mp4'];
const refs02Dir = path.join(here, 'reference', '0.2');
if (!refs02.every((f) => fs.existsSync(path.join(refs02Dir, f)))) {
  console.log('\nGenerando referencias variadas 0.2...');
  execFileSync(process.execPath, [path.join(here, 'make-refs-0.2.mjs')], { stdio: 'inherit' });
} else {
  console.log(`referencias 0.2 existentes: ${refs02.length}`);
}

console.log('\nListo. Revisión:');
console.log('  node dist/cli/index.js review --reference demo/reference/brand-intro.mp4 --target-dir demo/site --target index.html --width 540 --height 960 --frames 6 --out demo/out/review');
