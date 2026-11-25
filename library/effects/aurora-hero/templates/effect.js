// Aurora de gradientes en canvas 2D. Sin dependencias.
// Lee los colores de las variables CSS para respetar los parámetros del efecto.
const canvas = document.querySelector('#aurora');
const ctx = canvas.getContext('2d', { alpha: true });
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const style = getComputedStyle(document.body);
const accent = style.getPropertyValue('--accent').trim() || '#12e0c8';
const accent2 = style.getPropertyValue('--accent-2').trim() || '#ffb454';

const blobs = [
  { color: accent, x: 0.24, y: 0.36, r: 0.62, ax: 0.10, ay: 0.06, speed: 0.00022, phase: 0.0, alpha: 0.55 },
  { color: accent2, x: 0.74, y: 0.28, r: 0.42, ax: 0.07, ay: 0.09, speed: 0.00031, phase: 1.7, alpha: 0.35 },
  { color: accent, x: 0.58, y: 0.72, r: 0.48, ax: 0.12, ay: 0.05, speed: 0.00018, phase: 3.1, alpha: 0.30 },
  { color: '#3a6cff', x: 0.12, y: 0.82, r: 0.40, ax: 0.06, ay: 0.08, speed: 0.00027, phase: 4.4, alpha: 0.24 },
  { color: '#ffffff', x: 0.46, y: 0.10, r: 0.30, ax: 0.05, ay: 0.03, speed: 0.0004, phase: 2.2, alpha: 0.12 },
];

const pointer = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 };
let width = 0;
let height = 0;
let dpr = 1;

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function paint(time) {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  pointer.x += (pointer.tx - pointer.x) * 0.04;
  pointer.y += (pointer.ty - pointer.y) * 0.04;
  const min = Math.min(width, height);

  for (const blob of blobs) {
    const t = reduce ? blob.phase : time * blob.speed + blob.phase;
    const x = (blob.x + Math.sin(t) * blob.ax + (pointer.x - 0.5) * 0.05) * width;
    const y = (blob.y + Math.cos(t * 0.8) * blob.ay + (pointer.y - 0.5) * 0.05) * height;
    const radius = min * blob.r * (0.92 + Math.sin(t * 1.4) * 0.08);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, hexAlpha(blob.color, blob.alpha));
    gradient.addColorStop(0.45, hexAlpha(blob.color, blob.alpha * 0.32));
    gradient.addColorStop(1, hexAlpha(blob.color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function hexAlpha(color, alpha) {
  const c = color.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(18,224,200,${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

let raf = 0;
function loop(time) {
  paint(time);
  raf = requestAnimationFrame(loop);
}

function start() {
  cancelAnimationFrame(raf);
  if (document.hidden) return;
  if (reduce) {
    paint(0);
    return;
  }
  raf = requestAnimationFrame(loop);
}

addEventListener('resize', () => {
  resize();
  if (reduce) paint(0);
});

addEventListener('pointermove', (e) => {
  pointer.tx = e.clientX / innerWidth;
  pointer.ty = e.clientY / innerHeight;
});

document.addEventListener('visibilitychange', start);

resize();
start();
// Señal para capturas deterministas de Visual Engine.
window.__veReady = true;
