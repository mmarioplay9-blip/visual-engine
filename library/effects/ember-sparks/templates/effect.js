import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Brasas ascendentes con parpadeo térmico, estelas y cambio de naranja a blanco; atmósfera de fragua. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const g = ctx.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h * 1.1, h * 0.9);
    g.addColorStop(0, rgba(p.accent2, 0.22)); g.addColorStop(0.55, rgba(p.bg, 0.9)); g.addColorStop(1, p.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (!state.sparks) {
      const rnd = mulberry32(52);
      state.sparks = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), v: 0.3 + rnd(), s: 0.4 + rnd(), w: rnd() * 6.28 }));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const s of state.sparks) {
      const life = (s.y - t * 0.045 * s.v * p.speed + 2) % 1;
      const x = (s.x + Math.sin(t * 0.8 + s.w) * 0.035 + Math.cos(t * 0.31 + s.w * 2) * 0.02) * w;
      const y = life * h;
      const heat = clamp(1 - life * 1.25);
      const col = heat > 0.58 ? p.accent2 : heat > 0.28 ? '#ff7a3d' : p.accent;
      const r = (1 + s.s * 3) * (0.4 + heat);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      rg.addColorStop(0, rgba('#fff2d0', 0.85 * heat));
      rg.addColorStop(0.22, rgba(col, 0.65 * heat));
      rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.16 * heat);
      ctx.lineWidth = Math.max(0.5, r * 0.45);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 3, y + 12 * heat, x - 1, y + 26 * heat); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  });
}
