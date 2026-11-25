import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Foco de luz que sigue al puntero, con partículas atraídas y caída suave; iluminación interactiva real. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const px = (pointer.active ? pointer.x : 0.55 + Math.sin(t * 0.4) * 0.08) * w;
    const py = (pointer.active ? pointer.y : 0.45 + Math.cos(t * 0.33) * 0.06) * h;
    if (!state.parts) {
      const rnd = mulberry32(81);
      state.parts = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), s: 0.4 + rnd() }));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const q of state.parts) {
      const dx = px - q.x * w, dy = py - q.y * h;
      const d = Math.hypot(dx, dy);
      const pull = pointer.active ? Math.min(26, 900 / Math.max(30, d)) : 0;
      const x = q.x * w + (dx / Math.max(1, d)) * pull;
      const y = q.y * h + (dy / Math.max(1, d)) * pull;
      ctx.fillStyle = rgba(q.s > 0.7 ? p.accent2 : p.accent, 0.15 + q.s * 0.5);
      ctx.beginPath(); ctx.arc(x, y, 0.7 + q.s * 2, 0, Math.PI * 2); ctx.fill();
    }
    const spot = ctx.createRadialGradient(px, py, 0, px, py, Math.min(w, h) * 0.45);
    spot.addColorStop(0, rgba(p.accent, 0.26)); spot.addColorStop(0.25, rgba(p.accent, 0.1)); spot.addColorStop(1, rgba(p.bg, 0.94));
    ctx.fillStyle = spot; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba(p.accent, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 18 + Math.sin(t * 2) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rgba('#dffcff', 0.7);
    ctx.font = '500 11px ui-monospace, monospace';
    ctx.fillText('x ' + Math.round(px) + '  y ' + Math.round(py), px + 26, py + 4);
  });
}
