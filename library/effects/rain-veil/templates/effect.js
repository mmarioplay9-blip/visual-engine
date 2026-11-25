import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Lluvia fina con inclinación, estelas variables y ondas al pie; capa de clima sin texturas externas. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.bg); sky.addColorStop(1, rgba(p.accent, 0.13));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    if (!state.drops) {
      const rnd = mulberry32(91);
      state.drops = Array.from({ length: 240 }, () => ({ x: rnd(), y: rnd(), v: 0.7 + rnd() * 1.6, l: 0.01 + rnd() * 0.05, a: 0.15 + rnd() * 0.5 }));
    }
    const slant = 0.08 + (pointer.x - 0.5) * 0.12;
    ctx.lineCap = 'round';
    for (const d of state.drops) {
      const y = (d.y + t * 0.28 * d.v * p.speed) % 1.05;
      const x = (d.x - y * slant + 2) % 1;
      ctx.strokeStyle = rgba(p.accent, d.a * 0.55);
      ctx.lineWidth = 0.5 + d.v * 0.7;
      ctx.beginPath();
      ctx.moveTo(x * w, y * h);
      ctx.lineTo((x + slant * d.l * 6) * w, (y - d.l) * h);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(p.accent2, 0.14);
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = (i / 9 + Math.sin(t * 0.7 + i) * 0.01) * w;
      const y = h * (0.92 + Math.sin(t * 1.1 + i) * 0.005);
      ctx.beginPath(); ctx.ellipse(x, y, 18 + i * 2, 3 + (i % 3), 0, 0, Math.PI * 2); ctx.stroke();
    }
  });
}
