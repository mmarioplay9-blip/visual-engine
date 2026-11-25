// Genera referencias variadas para la fase 0.2, dibujadas por código para que
// sean reproducibles y sin licencias de terceros:
//   premium-ui.mp4      interfaz oscura con titular, anillo, glow y viñeta
//   premium-ui-alt.mp4  misma escena, acento cálido y otro zoom (para temporal)
//   motion-graphics.mp4 tres planos con corte duro, partículas y tipografía
//   depth-3d.mp4        capas con parallax, bokeh y reflejo
//   camera-pan.mp4      patrón que se desplaza 4 px/fotograma
//   camera-zoom.mp4     patrón que crece 1,2 % por fotograma
//
// Uso: node demo/make-refs-0.2.mjs [--force]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'reference', '0.2');
const force = process.argv.includes('--force');

const FONT = {
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
};

const clamp = (v, lo = 0, hi = 255) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function makeMask(text, scale, gap = 1) {
  const gw = 5;
  const gh = 7;
  const cols = text.length * (gw + gap) - gap;
  const w = cols * scale;
  const h = gh * scale;
  const mask = new Uint8Array(w * h);
  for (let ci = 0; ci < text.length; ci++) {
    const glyph = FONT[text[ci]];
    if (!glyph) continue;
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        if (glyph[gy][gx] !== '1') continue;
        const px = (ci * (gw + gap) + gx) * scale;
        const py = gy * scale;
        for (let y = 0; y < scale; y++) {
          for (let x = 0; x < scale; x++) mask[(py + y) * w + px + x] = 255;
        }
      }
    }
  }
  return { mask, w, h };
}

function blurMask(mask, w, h, radius) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) s += mask[y * w + Math.min(w - 1, Math.max(0, x + k))];
      tmp[y * w + x] = s / (radius * 2 + 1);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) s += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      out[y * w + x] = s / (radius * 2 + 1);
    }
  }
  return out;
}

function sampleMask(mask, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return 0;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = mask[y0 * w + x0];
  const b = mask[y0 * w + x0 + 1];
  const c = mask[(y0 + 1) * w + x0];
  const d = mask[(y0 + 1) * w + x0 + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function writeClip(file, width, height, fps, frames, render) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-v', 'error', '-y',
      '-f', 'rawvideo', '-pix_fmt', 'rgb24',
      '-s', `${width}x${height}`,
      '-r', String(fps),
      '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      file,
    ], { stdio: ['pipe', 'ignore', 'inherit'] });
    const write = (chunk) => new Promise((done) => (ff.stdin.write(chunk) ? done() : ff.stdin.once('drain', done)));
    (async () => {
      const t0 = Date.now();
      for (let i = 0; i < frames; i++) await write(render(i, fps));
      ff.stdin.end();
      await new Promise((done, fail) => ff.on('close', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg ${code}`)))));
      const kb = fs.statSync(file).size / 1024;
      console.log(`  ${path.basename(file)} · ${width}x${height} · ${frames} f · ${kb.toFixed(0)} KB · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      resolve();
    })().catch(reject);
  });
}

const TEXT_UI = makeMask('LUMEN', 4);
const TEXT_UI_GLOW = blurMask(TEXT_UI.mask, TEXT_UI.w, TEXT_UI.h, 6);
const TEXT_MOTION = makeMask('MOTION', 3);
const TEXT_MOTION_GLOW = blurMask(TEXT_MOTION.mask, TEXT_MOTION.w, TEXT_MOTION.h, 5);
const TEXT_DEPTH = makeMask('DEPTH', 3);
const TEXT_DEPTH_GLOW = blurMask(TEXT_DEPTH.mask, TEXT_DEPTH.w, TEXT_DEPTH.h, 5);

function uiFrame(i, fps, variant = false) {
  const W = 360;
  const H = 640;
  const frames = 48;
  const t = i / fps;
  const dur = frames / fps;
  const zoom = variant ? 1 + 0.12 * (t / dur) : 1 + 0.06 * (t / dur);
  const accent = variant ? [255, 180, 84] : [18, 224, 200];
  const accent2 = variant ? [255, 120, 60] : [58, 108, 255];
  const buf = Buffer.allocUnsafe(W * H * 3);
  const cx = W / 2;
  const cy = H / 2;
  const ringCx = 0.68 * W;
  const ringCy = 0.31 * H;
  const ringR = 0.15 * Math.min(W, H) * zoom;
  const textX = (W - TEXT_UI.w * zoom) / 2;
  const textY = 0.7 * H - (TEXT_UI.h * zoom) / 2;
  const rand = mulberry(7);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = cx + (x - cx) / zoom;
      const sy = cy + (y - cy) / zoom;
      const u = sx / W;
      const v = sy / H;
      // Fondo: azul noche → petróleo → negro.
      let r = 5 + 8 * Math.sin(v * Math.PI) + 3 * u;
      let g = 8 + 26 * Math.sin(v * Math.PI) + 6 * u;
      let b = 16 + 30 * Math.sin(v * Math.PI) + 10 * u;

      // Rejilla fina que también se acerca con el zoom.
      const gx = ((sx % 44) + 44) % 44;
      const gy = ((sy % 44) + 44) % 44;
      if (gx < 1 || gy < 1) {
        r += 8;
        g += 14;
        b += 16;
      }

      // Luz focal.
      const ld = Math.hypot(sx - 0.62 * W, sy - 0.36 * H) / (0.5 * Math.min(W, H));
      const light = Math.exp(-ld * ld * 2.2) * 26;
      r += light * 0.4;
      g += light;
      b += light * 0.9;

      // Anillo con halo.
      const rd = Math.hypot(sx - ringCx, sy - ringCy);
      const ringDiff = Math.abs(rd - ringR);
      if (ringDiff < 5) {
        const f = (1 - ringDiff / 5) ** 2;
        r += accent[0] * f * 0.9;
        g += accent[1] * f * 0.9;
        b += accent[2] * f * 0.9;
      } else if (rd > ringR && rd < ringR * 1.35) {
        const f = (1 - (rd - ringR) / (ringR * 0.35)) * 0.12;
        r += accent[0] * f;
        g += accent[1] * f;
        b += accent[2] * f;
      }

      // Titular con glow.
      const m = sampleMask(TEXT_UI.mask, TEXT_UI.w, TEXT_UI.h, (sx - textX) / zoom, (sy - textY) / zoom);
      if (m > 0) {
        r = r * (1 - m / 255) + 232 * (m / 255);
        g = g * (1 - m / 255) + 244 * (m / 255);
        b = b * (1 - m / 255) + 255 * (m / 255);
      } else {
        const gmask = sampleMask(TEXT_UI_GLOW, TEXT_UI.w, TEXT_UI.h, (sx - textX) / zoom, (sy - textY) / zoom) / 255;
        r += accent[0] * gmask * 0.42;
        g += accent[1] * gmask * 0.42;
        b += accent[2] * gmask * 0.42;
      }

      // Barra de acento y microtexto (formas geométricas, no letras legibles).
      if (Math.abs(sy - 0.81 * H) < 2 && sx > W * 0.2 && sx < W * 0.8) {
        const f = 0.65;
        r += accent2[0] * f;
        g += accent2[1] * f;
        b += accent2[2] * f;
      }
      if (Math.abs(sy - 0.86 * H) < 1.5 && sx > W * 0.35 && sx < W * 0.65) {
        r += 90;
        g += 100;
        b += 120;
      }

      const dist = Math.hypot(x - cx, y - cy) / Math.hypot(cx, cy);
      const vig = 1 - 0.58 * Math.pow(dist, 2.1);
      const grain = (rand() - 0.5) * 7;
      const o = (y * W + x) * 3;
      buf[o] = clamp(r * vig + grain);
      buf[o + 1] = clamp(g * vig + grain);
      buf[o + 2] = clamp(b * vig + grain);
    }
  }
  return buf;
}

function motionFrame(i, fps) {
  const W = 480;
  const H = 270;
  const t = i / fps;
  const scene = t < 0.8 ? 0 : t < 1.6 ? 1 : 2;
  const accent = scene === 0 ? [18, 224, 200] : scene === 1 ? [255, 180, 84] : [58, 108, 255];
  const buf = Buffer.allocUnsafe(W * H * 3);
  const cx = W / 2;
  const cy = H / 2;
  const zoom = 1 + 0.04 * t;
  const textX = (W - TEXT_MOTION.w * zoom) / 2;
  const textY = H * 0.5 - (TEXT_MOTION.h * zoom) / 2;
  const rand = mulberry(21 + i);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = cx + (x - cx) / zoom;
      const sy = cy + (y - cy) / zoom;
      const u = sx / W;
      const v = sy / H;
      let r = scene === 1 ? 14 + 26 * v : 4 + 8 * v;
      let g = scene === 1 ? 10 + 18 * v : 6 + 20 * v;
      let b = scene === 1 ? 8 + 10 * v : 14 + 34 * v;

      if (scene === 0) {
        const d = Math.hypot(sx - (0.3 + t * 0.24) * W, sy - 0.52 * H) / (0.3 * Math.min(W, H));
        if (d < 1) {
          const f = (1 - d) ** 2;
          r += accent[0] * f * 0.5;
          g += accent[1] * f * 0.5;
          b += accent[2] * f * 0.5;
        }
        const band = Math.abs(sx / W - (0.2 + t * 0.5)) < 0.01;
        if (band) { r += 120; g += 140; b += 150; }
      } else if (scene === 1) {
        const d = Math.abs((sx / W) * 0.8 + (sy / H) * 0.6 - (0.2 + (t - 0.8) * 0.7));
        if (d < 0.035) {
          const f = (1 - d / 0.035) ** 2 * 0.55;
          r += accent[0] * f;
          g += accent[1] * f;
          b += accent[2] * f;
        }
      } else {
        const d = Math.abs(Math.hypot(sx - cx, sy - cy) - (0.16 + (t - 1.6) * 0.18) * Math.min(W, H));
        if (d < 4) {
          const f = (1 - d / 4) ** 2 * 0.8;
          r += accent[0] * f;
          g += accent[1] * f;
          b += accent[2] * f;
        }
      }

      const m = sampleMask(TEXT_MOTION.mask, TEXT_MOTION.w, TEXT_MOTION.h, (sx - textX) / zoom, (sy - textY) / zoom);
      if (m > 0) {
        r = r * (1 - m / 255) + 240 * (m / 255);
        g = g * (1 - m / 255) + 245 * (m / 255);
        b = b * (1 - m / 255) + 250 * (m / 255);
      } else {
        const gm = sampleMask(TEXT_MOTION_GLOW, TEXT_MOTION.w, TEXT_MOTION.h, (sx - textX) / zoom, (sy - textY) / zoom) / 255;
        r += accent[0] * gm * 0.4;
        g += accent[1] * gm * 0.4;
        b += accent[2] * gm * 0.4;
      }

      const dist = Math.hypot(x - cx, y - cy) / Math.hypot(cx, cy);
      const vig = 1 - 0.45 * dist * dist;
      const grain = (rand() - 0.5) * 8;
      const o = (y * W + x) * 3;
      buf[o] = clamp(r * vig + grain);
      buf[o + 1] = clamp(g * vig + grain);
      buf[o + 2] = clamp(b * vig + grain);
    }
  }

  // Partículas pequeñas (deterministas) para todos los planos.
  const prand = mulberry(99);
  for (let p = 0; p < 70; p++) {
    const baseX = prand();
    const baseY = prand();
    const speed = 0.02 + prand() * 0.06;
    const px = Math.round(((baseX + t * speed) % 1) * W);
    const py = Math.round(((baseY - t * speed * 0.6 + 1) % 1) * H);
    const rad = 1 + Math.floor(prand() * 2);
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        const xx = px + dx;
        const yy = py + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const o = (yy * W + xx) * 3;
        buf[o] = clamp(buf[o] + 90);
        buf[o + 1] = clamp(buf[o + 1] + 110);
        buf[o + 2] = clamp(buf[o + 2] + 90);
      }
    }
  }
  return buf;
}

function depthFrame(i, fps) {
  const W = 480;
  const H = 270;
  const t = i / fps;
  const buf = Buffer.allocUnsafe(W * H * 3);
  const rand = mulberry(5);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = y / H;
      let r = 3 + 6 * v;
      let g = 5 + 10 * v;
      let b = 12 + 22 * v;

      // Fondo: rejilla que se desplaza despacio.
      const backX = ((x + t * 14) % 60 + 60) % 60;
      const backY = ((y + t * 6) % 60 + 60) % 60;
      if (backX < 1 || backY < 1) { r += 5; g += 10; b += 16; }

      // Capa media: anillos que se desplazan más rápido.
      const midD = Math.hypot(x - (0.3 + t * 0.08) * W, y - 0.45 * H);
      const midRing = Math.abs(midD - 46);
      if (midRing < 3) {
        const f = (1 - midRing / 3) ** 2;
        r += 40 * f; g += 120 * f; b += 110 * f;
      }

      // Bokeh (círculos suaves) en el fondo.
      const bokeh = [
        [0.78, 0.28, 0.1], [0.2, 0.22, 0.07], [0.62, 0.7, 0.09], [0.86, 0.62, 0.06],
      ];
      for (const [bx, by, br] of bokeh) {
        const d = Math.hypot(x / W - bx, y / H - by) / br;
        if (d < 1) {
          const f = (1 - d) ** 3 * 0.22;
          r += 30 * f; g += 90 * f; b += 100 * f;
        }
      }

      // Reflejo del anillo por debajo del eje (simetría vertical).
      const axis = 0.82 * H;
      if (y > axis) {
        const mirrorY = axis - (y - axis);
        const d = Math.hypot(x - (0.3 + t * 0.08) * W, mirrorY - 0.45 * H);
        const ring = Math.abs(d - 46);
        if (ring < 3) {
          const f = (1 - ring / 3) ** 2 * 0.28;
          r += 20 * f; g += 70 * f; b += 65 * f;
        }
      }

      // Titular fijo en primer plano (nítido).
      const textX = (W - TEXT_DEPTH.w) / 2;
      const textY = 0.18 * H;
      const m = sampleMask(TEXT_DEPTH.mask, TEXT_DEPTH.w, TEXT_DEPTH.h, x - textX, y - textY);
      if (m > 0) {
        r = r * (1 - m / 255) + 235 * (m / 255);
        g = g * (1 - m / 255) + 245 * (m / 255);
        b = b * (1 - m / 255) + 255 * (m / 255);
      } else {
        const gm = sampleMask(TEXT_DEPTH_GLOW, TEXT_DEPTH.w, TEXT_DEPTH.h, x - textX, y - textY) / 255;
        r += 20 * gm; g += 100 * gm; b += 90 * gm;
      }

      const dist = Math.hypot(x - W / 2, y - H / 2) / Math.hypot(W / 2, H / 2);
      const vig = 1 - 0.5 * dist * dist;
      const grain = (rand() - 0.5) * 6;
      const o = (y * W + x) * 3;
      buf[o] = clamp(r * vig + grain);
      buf[o + 1] = clamp(g * vig + grain);
      buf[o + 2] = clamp(b * vig + grain);
    }
  }
  return buf;
}

function panFrame(i, fps) {
  const W = 320;
  const H = 180;
  const shift = i * 4;
  const buf = Buffer.allocUnsafe(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bx = (x - shift + W * 10) % 64;
      const by = (y + H * 10) % 64;
      const grid = bx < 1 || by < 1;
      const line = Math.abs(((x - shift + W * 10) % 160) - 80) < 2;
      let v = grid ? 70 : 12 + 18 * (y / H);
      if (line) v = 150;
      const o = (y * W + x) * 3;
      buf[o] = grid ? 40 : v;
      buf[o + 1] = grid ? 90 : v + 30;
      buf[o + 2] = grid ? 110 : v + 50;
    }
  }
  return buf;
}

function zoomFrame(i, fps) {
  const W = 320;
  const H = 180;
  const zoom = Math.pow(1.012, i);
  const buf = Buffer.allocUnsafe(W * H * 3);
  const cx = W / 2;
  const cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = cx + (x - cx) / zoom;
      const sy = cy + (y - cy) / zoom;
      const d = Math.hypot(sx - cx, sy - cy);
      const ring = Math.abs(((d + 12) % 46) - 23);
      const checker = (Math.floor(sx / 24) + Math.floor(sy / 24)) % 2 === 0;
      let r = 8;
      let g = 12;
      let b = 22;
      if (ring < 2) { r += 30; g += 140; b += 120; }
      if (checker) { r += 10; g += 18; b += 26; }
      const o = (y * W + x) * 3;
      buf[o] = clamp(r);
      buf[o + 1] = clamp(g);
      buf[o + 2] = clamp(b);
    }
  }
  return buf;
}

fs.mkdirSync(OUT, { recursive: true });
const clips = [
  { name: 'premium-ui.mp4', w: 360, h: 640, fps: 24, frames: 48, fn: (i, f) => uiFrame(i, f, false) },
  { name: 'premium-ui-alt.mp4', w: 360, h: 640, fps: 24, frames: 48, fn: (i, f) => uiFrame(i, f, true) },
  { name: 'motion-graphics.mp4', w: 480, h: 270, fps: 24, frames: 48, fn: motionFrame },
  { name: 'depth-3d.mp4', w: 480, h: 270, fps: 24, frames: 58, fn: depthFrame },
  { name: 'camera-pan.mp4', w: 320, h: 180, fps: 24, frames: 29, fn: panFrame },
  { name: 'camera-zoom.mp4', w: 320, h: 180, fps: 24, frames: 29, fn: zoomFrame },
];

console.log(`Referencias 0.2 → ${OUT}`);
for (const c of clips) {
  const file = path.join(OUT, c.name);
  if (!force && fs.existsSync(file)) {
    console.log(`  ${c.name} ya existe`);
    continue;
  }
  await writeClip(file, c.w, c.h, c.fps, c.frames, c.fn);
}
console.log('Listo.');
