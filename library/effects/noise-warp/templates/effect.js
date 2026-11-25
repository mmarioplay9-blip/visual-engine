// Transición de franjas con desplazamiento de ruido. Sin dependencias.
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const bar = document.querySelector('#bar');
const labels = window.__VE_LABELS ?? { a: 'A', b: 'B', colorA: '#0b3b45', colorB: '#4a2a0c' };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let width = 0;
let height = 0;
let dpr = 1;
let sceneA;
let sceneB;

function makeScene(color, label, index) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const g = c.getContext('2d');
  const w = width;
  const h = height;

  const grad = g.createRadialGradient(w * 0.28, h * 0.32, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#05060a');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  g.strokeStyle = 'rgba(255,255,255,0.07)';
  g.lineWidth = 1;
  for (let x = 0; x < w; x += Math.round(w / 26)) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.beginPath();
  g.arc(w * 0.72, h * 0.34, Math.min(w, h) * 0.22, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(w * 0.72, h * 0.34, Math.min(w, h) * 0.14, 0.4, Math.PI * 1.4);
  g.stroke();

  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = `600 ${Math.round(Math.min(w, h) * 0.16)}px Inter, system-ui, sans-serif`;
  g.letterSpacing = '-0.03em';
  g.fillText(label, w * 0.08, h * 0.82);
  g.font = `600 ${Math.round(Math.min(w, h) * 0.045)}px ui-monospace, monospace`;
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fillText(index, w * 0.08, h * 0.87);

  return c;
}

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  width = Math.round(innerWidth * dpr);
  height = Math.round(innerHeight * dpr);
  canvas.width = width;
  canvas.height = height;
  sceneA = makeScene(labels.colorA, labels.a, '01 / REFERENCIA');
  sceneB = makeScene(labels.colorB, labels.b, '02 / RESULTADO');
}

function noise(x, y) {
  return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

/** p: 0 = escena A, 1 = escena B */
function draw(p, time) {
  const slice = Math.max(2, Math.round(4 * dpr));
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += slice) {
    const n = Math.abs(noise(y * 0.02, time * 0.35));
    const amount = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * (0.35 + n) * width * 0.09;
    const reveal = y / height;
    const localP = Math.min(1, Math.max(0, (p - reveal * 0.35) * 1.45));
    const shift = (n - 0.5) * amount;

    ctx.drawImage(sceneA, 0, y, width, slice, shift, y, width, slice);
    ctx.globalAlpha = localP;
    ctx.drawImage(sceneB, 0, y, width, slice, shift * 0.6, y, width, slice);
    ctx.globalAlpha = 1;
  }
}

let phase = 0; // 0 = A, 1 = B
let progress = 0;
let direction = 1;
let hold = 0;
let last = performance.now();

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (hold > 0) {
    hold -= dt;
  } else {
    progress += (dt / 2.1) * direction;
    if (progress >= 1) {
      progress = 1;
      direction = -1;
      hold = 1.5;
      phase = 1;
    } else if (progress <= 0) {
      progress = 0;
      direction = 1;
      hold = 1.5;
      phase = 0;
    }
  }

  draw(progress, now / 1000);
  bar.style.width = `${Math.min(100, Math.max(0, progress * 100)).toFixed(1)}%`;
  requestAnimationFrame(tick);
}

function trigger() {
  if (reduce) {
    progress = progress ? 0 : 1;
    draw(progress, 0);
    bar.style.width = progress ? '100%' : '0%';
    return;
  }
  hold = 0;
  direction = progress > 0.5 ? -1 : 1;
}

addEventListener('resize', resize);
addEventListener('click', trigger);
addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    trigger();
  }
});

resize();
void phase;
if (reduce) {
  draw(0.45, 0);
  bar.style.width = '45%';
} else {
  requestAnimationFrame(tick);
}
window.__veReady = true;
