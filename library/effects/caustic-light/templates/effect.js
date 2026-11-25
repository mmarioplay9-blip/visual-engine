import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Cáusticas de agua proyectadas por dos campos de ondas; luz orgánica que se mueve sin textura externa. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const cols = 26, rows = 16;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = x / cols, v = y / rows;
        const field = Math.sin((u * 9 + t * 0.35) * Math.PI) * Math.cos((v * 7 - t * 0.28) * Math.PI)
          + Math.sin((u * 5 - v * 6 + t * 0.2) * Math.PI) * 0.7;
        const k = Math.max(0, field - 0.35);
        if (k <= 0) continue;
        const px = u * w, py = v * h;
        const r = (16 + k * 34) * (w / 900);
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, rgba(p.accent, 0.22 * k));
        g.addColorStop(0.5, rgba(p.accent, 0.07 * k));
        g.addColorStop(1, rgba(p.accent, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    const band = ctx.createLinearGradient(0, 0, w, h);
    band.addColorStop(0, rgba(p.accent2, 0)); band.addColorStop(0.5, rgba(p.accent2, 0.05)); band.addColorStop(1, rgba(p.accent2, 0));
    ctx.fillStyle = band; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}
