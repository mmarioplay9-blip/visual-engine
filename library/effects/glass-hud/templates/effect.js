// HUD: marcas reales en SVG, contadores con un solo RAF y telemetría del navegador.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ticks = document.querySelector('#ticks');
const fidelity = document.querySelector('#fidelity');
const clock = document.querySelector('#clock');
const fpsNode = document.querySelector('#fps');
const bars = document.querySelector('#bars');
const motionNode = document.querySelector('#motion');

const SVG_NS = 'http://www.w3.org/2000/svg';
const cx = 200;
const cy = 200;

for (let i = 0; i < 72; i++) {
  const major = i % 6 === 0;
  const angle = (i / 72) * Math.PI * 2 - Math.PI / 2;
  const outer = 182;
  const inner = major ? 168 : 175;
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(cx + Math.cos(angle) * inner));
  line.setAttribute('y1', String(cy + Math.sin(angle) * inner));
  line.setAttribute('x2', String(cx + Math.cos(angle) * outer));
  line.setAttribute('y2', String(cy + Math.sin(angle) * outer));
  line.setAttribute('stroke-width', major ? '2' : '1');
  if (major) line.classList.add('major');
  ticks.appendChild(line);
}

for (let i = 0; i < 22; i++) {
  const bar = document.createElement('i');
  bar.style.height = '20%';
  bars.appendChild(bar);
}

const BARS = [...bars.children];
let startedAt = performance.now();
let lastFrame = startedAt;
let frames = 0;

function pad(n) {
  return String(n).padStart(2, '0');
}

function loop(now) {
  const elapsed = (now - startedAt) / 1000;
  const target = Math.min(99.9, elapsed * 34);
  fidelity.textContent = target.toFixed(1);

  frames++;
  if (now - lastFrame > 500) {
    fpsNode.textContent = `${Math.round((frames * 1000) / (now - lastFrame))} fps`;
    lastFrame = now;
    frames = 0;
  }

  const d = new Date();
  clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const motion = 0.18 + Math.abs(Math.sin(elapsed * 0.9)) * 0.42;
  motionNode.textContent = motion.toFixed(2);
  BARS.forEach((bar, i) => {
    const h = 18 + Math.abs(Math.sin(elapsed * 1.2 + i * 0.55)) * 78;
    bar.style.height = `${h.toFixed(0)}%`;
  });

  requestAnimationFrame(loop);
}

if (reduce) {
  fidelity.textContent = '94.2';
  BARS.forEach((bar, i) => (bar.style.height = `${30 + ((i * 17) % 60)}%`));
  clock.textContent = new Date().toLocaleTimeString('es-ES', { hour12: false });
  fpsNode.textContent = 'estático';
} else {
  requestAnimationFrame(loop);
}

window.__veReady = true;
