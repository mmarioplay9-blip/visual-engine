import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Motas de polvo con deriva sinusoidal, profundidad simulada y halos suaves; atmósfera de interior cinematográfico. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const n = Math.round(clamp(p.count, 20, 240));
    if (!state.motes || state.motes.length !== n) {
      const rnd = mulberry32(7);
      state.motes = Array.from({ length: n }, () => ({
        x: rnd(), y: rnd(), z: 0.25 + rnd() * 0.75,
        a: rnd() * Math.PI * 2, v: 0.4 + rnd() * 0.8,
      }));
    }
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, p.bg); bg.addColorStop(1, rgba(p.accent, 0.08));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const m of state.motes) {
      const x = (m.x + Math.sin(t * 0.13 * m.v + m.a) * 0.06 + t * 0.003 * m.v + 1) % 1;
      const y = (m.y - t * 0.007 * m.v + Math.cos(t * 0.11 + m.a) * 0.02 + 1) % 1;
      const r = (1.2 + m.z * p.size) * (0.8 + Math.sin(t * 0.7 + m.a) * 0.2);
      const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * 4);
      const col = m.z > 0.72 ? p.accent2 : p.accent;
      g.addColorStop(0, rgba(col, 0.5 * m.z));
      g.addColorStop(0.35, rgba(col, 0.16 * m.z));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x * w, y * h, r * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  });
}
