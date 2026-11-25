import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Trazas ortogonales que crecen por la retícula con pulsos de energía y nodos; fondo de sistema vivo. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const grid = Math.max(24, p.gap);
    ctx.strokeStyle = rgba(p.accent, 0.08); ctx.lineWidth = 1;
    for (let x = 0; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (!state.paths) {
      const rnd = mulberry32(71);
      state.paths = Array.from({ length: 26 }, () => {
        const pts = [[Math.floor(rnd() * (w / grid)) * grid, Math.floor(rnd() * (h / grid)) * grid]];
        for (let i = 0; i < 4; i++) {
          const last = pts[pts.length - 1];
          const horiz = i % 2 === 0;
          pts.push(horiz ? [last[0] + (rnd() > 0.5 ? 1 : -1) * grid * (2 + Math.floor(rnd() * 5)), last[1]] : [last[0], last[1] + (rnd() > 0.5 ? 1 : -1) * grid * (2 + Math.floor(rnd() * 4))]);
        }
        return pts;
      });
    }
    for (let i = 0; i < state.paths.length; i++) {
      const pts = state.paths[i];
      ctx.strokeStyle = rgba(i % 4 === 0 ? p.accent2 : p.accent, 0.18 + (i % 3) * 0.07);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
      const total = Math.max(1, pts.length - 1);
      const k = (t * 0.18 * (0.5 + (i % 5) * 0.2) + i * 0.13) % 1;
      const rawSeg = Number.isFinite(k) ? Math.floor(k * total) : 0;
      const seg = Math.max(0, Math.min(total - 1, rawSeg));
      const local = Math.max(0, Math.min(1, k * total - seg));
      const p0 = pts[seg] ?? pts[0];
      const p1 = pts[seg + 1] ?? p0;
      const x = p0[0] + (p1[0] - p0[0]) * local;
      const y = p0[1] + (p1[1] - p0[1]) * local;
      ctx.fillStyle = rgba(p.accent, 0.9);
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(p.accent, 0.15);
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    }
  });
}
