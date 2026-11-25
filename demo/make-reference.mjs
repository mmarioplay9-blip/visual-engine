// Genera la referencia de prueba: un clip de 3 s, 30 fps, con paleta azul petróleo,
// turquesa y ámbar, dos cortes y movimiento continuo. Se dibuja con matemáticas
// propias (sin librerías) para que la referencia sea independiente de la web demo.
//
// Uso: node demo/make-reference.mjs [salida.mp4]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] ?? path.join(here, 'reference', 'brand-intro.mp4'));
const W = 540;
const H = 960;
const FPS = 30;
const FRAMES = 90;

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const NAVY = hex('#05070d');
const DEEP = hex('#071a1e');
const BLACK = hex('#030507');
const TEAL = hex('#12e0c8');
const AMBER = hex('#ffb454');
const BLUE = hex('#3a6cff');
const INK = hex('#eaf3ff');

let seed = 0x9e3779b9;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 10000) / 10000;
};

function sceneParams(t) {
  // Tres actos con cortes en 1.0 s y 2.0 s.
  if (t < 1) {
    return {
      act: 0,
      blobs: [
        { x: 0.22 + Math.sin(t * 1.6) * 0.05, y: 0.3 + Math.cos(t * 1.2) * 0.03, r: 0.5, c: TEAL, i: 0.85 },
        { x: 0.78, y: 0.62 + Math.sin(t * 2.1) * 0.04, r: 0.34, c: AMBER, i: 0.3 },
        { x: 0.55, y: 0.16, r: 0.3, c: BLUE, i: 0.34 },
      ],
      ring: { cx: 0.68, cy: 0.4, r: 0.2, w: 0.0035, c: TEAL, i: 0.55 },
      band: 0,
    };
  }
  if (t < 2) {
    return {
      act: 1,
      blobs: [
        { x: 0.76 - (t - 1) * 0.2, y: 0.36, r: 0.46, c: AMBER, i: 0.7 },
        { x: 0.2, y: 0.7, r: 0.42, c: TEAL, i: 0.55 },
        { x: 0.5, y: 0.9, r: 0.3, c: BLUE, i: 0.28 },
      ],
      ring: { cx: 0.3, cy: 0.58, r: 0.26, w: 0.004, c: AMBER, i: 0.5 },
      band: 1,
    };
  }
  return {
    act: 2,
    blobs: [
      { x: 0.5, y: 0.44, r: 0.5, c: TEAL, i: 0.68 },
      { x: 0.5, y: 0.44, r: 0.28, c: INK, i: 0.2 },
      { x: 0.18, y: 0.82, r: 0.34, c: AMBER, i: 0.34 },
    ],
    ring: { cx: 0.5, cy: 0.44, r: 0.3, w: 0.003, c: TEAL, i: 0.75 },
    band: 0,
  };
}

function render(frame, time) {
  const buf = Buffer.allocUnsafe(W * H * 3);
  const scene = sceneParams(time);
  const cx = W / 2;
  const cy = H / 2;
  const maxDist = Math.hypot(cx, cy);
  const bandPos = (time % 1) * 1.4 - 0.2;

  for (let y = 0; y < H; y++) {
    const v = y / H;
    // Fondo: azul noche arriba, petróleo al centro, casi negro abajo.
    const base = [
      NAVY[0] + (DEEP[0] - NAVY[0]) * Math.sin(v * Math.PI) + (BLACK[0] - NAVY[0]) * v * 0.6,
      NAVY[1] + (DEEP[1] - NAVY[1]) * Math.sin(v * Math.PI) + (BLACK[1] - NAVY[1]) * v * 0.6,
      NAVY[2] + (DEEP[2] - NAVY[2]) * Math.sin(v * Math.PI) + (BLACK[2] - NAVY[2]) * v * 0.6,
    ];
    for (let x = 0; x < W; x++) {
      let r = base[0];
      let g = base[1];
      let b = base[2];

      for (const blob of scene.blobs) {
        const bx = blob.x * W;
        const by = blob.y * H;
        const radius = blob.r * Math.min(W, H);
        const dx = x - bx;
        const dy = y - by;
        const d2 = dx * dx + dy * dy;
        const rr = radius * radius;
        if (d2 > rr) continue;
        const fall = 1 - d2 / rr;
        const f = fall * fall * blob.i;
        r += blob.c[0] * f;
        g += blob.c[1] * f;
        b += blob.c[2] * f;
      }

      const ring = scene.ring;
      const rdx = x - ring.cx * W;
      const rdy = y - ring.cy * H;
      const rd = Math.hypot(rdx, rdy) / Math.min(W, H);
      const ringDiff = Math.abs(rd - ring.r);
      if (ringDiff < ring.w * 6) {
        const f = Math.pow(1 - ringDiff / (ring.w * 6), 3) * ring.i;
        r += ring.c[0] * f;
        g += ring.c[1] * f;
        b += ring.c[2] * f;
      }

      if (scene.band) {
        const diag = (x / W) * 0.65 + (y / H) * 0.35;
        const d = Math.abs(diag - bandPos);
        if (d < 0.06) {
          const f = (1 - d / 0.06) ** 2 * 0.35;
          r += INK[0] * f;
          g += INK[1] * f;
          b += INK[2] * f;
        }
      } else if (Math.abs(bandPos - (x / W) * 0.5 - (y / H) * 0.5) < 0.015) {
        r += 22;
        g += 34;
        b += 38;
      }

      if (x % 54 === 0 || y % 54 === 0) {
        r += 7;
        g += 10;
        b += 12;
      }

      const dist = Math.hypot(x - cx, y - cy) / maxDist;
      const vig = 1 - 0.62 * Math.pow(dist, 2.1);
      const grain = (rand() - 0.5) * 9;

      const o = (y * W + x) * 3;
      buf[o] = clamp(r * vig + grain, 0, 255);
      buf[o + 1] = clamp(g * vig + grain, 0, 255);
      buf[o + 2] = clamp(b * vig + grain, 0, 255);
    }
  }
  return buf;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const ff = spawn('ffmpeg', [
  '-v', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgb24',
  '-s', `${W}x${H}`,
  '-r', String(FPS),
  '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  OUT,
], { stdio: ['pipe', 'ignore', 'inherit'] });

const write = (chunk) => new Promise((resolve) => {
  if (ff.stdin.write(chunk)) resolve();
  else ff.stdin.once('drain', resolve);
});

const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) {
  await write(render(i, i / FPS));
  if (i % 30 === 0) process.stdout.write(`frame ${i}/${FRAMES}\r`);
}
ff.stdin.end();
await new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg salió con ${code}`)))));

const bytes = fs.statSync(OUT).size;
console.log(`\nReferencia: ${OUT}`);
console.log(`${W}x${H}, ${FRAMES} fotogramas, ${(FRAMES / FPS).toFixed(1)} s, ${(bytes / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s de generación`);
