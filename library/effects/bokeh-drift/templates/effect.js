import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Discos desenfocados de gran formato que se cruzan con mezcla aditiva; profundidad de campo abstracta. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    if (!state.bokeh) {
      const rnd = mulberry32(113);
      state.bokeh = Array.from({ length: 28 }, () => ({ x: rnd(), y: rnd(), r: 0.04 + rnd() * 0.16, v: 0.1 + rnd() * 0.5, hue: rnd() }));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.bokeh) {
      const x = (b.x + Math.sin(t * 0.08 * b.v + b.r * 20) * 0.12 + 1) % 1;
      const y = (b.y - t * 0.012 * b.v + 1) % 1;
      const rad = b.r * Math.min(w, h) * (1 + Math.sin(t * 0.3 + b.x * 9) * 0.06);
      const g = ctx.createRadialGradient(x * w, y * h, rad * 0.1, x * w, y * h, rad);
      const col = b.hue > 0.68 ? p.accent2 : p.accent;
      g.addColorStop(0, rgba(col, 0.16));
      g.addColorStop(0.55, rgba(col, 0.08));
      g.addColorStop(0.82, rgba(col, 0.12));
      g.addColorStop(0.9, rgba(col, 0.03));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x * w, y * h, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  });
}
