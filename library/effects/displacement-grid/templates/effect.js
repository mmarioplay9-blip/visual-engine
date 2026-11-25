import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Retícula de puntos desplazada por un campo de ruido viajero; ondas de densidad legibles y precisas. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const gap = Math.max(12, p.gap);
    const cols = Math.ceil(w / gap) + 2, rows = Math.ceil(h / gap) + 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = x / cols, v = y / rows;
        const n = fbm(u * 5 + t * 0.12 * p.speed, v * 5 - t * 0.08, 3, 8);
        const dx = Math.sin(n * 8 + t) * gap * 0.8;
        const dy = Math.cos(n * 8 + t * 1.2) * gap * 0.8;
        const r = 0.7 + n * p.dot * 2.4;
        ctx.fillStyle = rgba(n > 0.58 ? p.accent2 : p.accent, 0.12 + n * 0.6);
        ctx.beginPath(); ctx.arc(x * gap + dx, y * gap + dy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
}
