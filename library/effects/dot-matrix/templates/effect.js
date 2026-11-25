import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Matriz de puntos con ondas de luminancia, halos y desplazamiento diagonal; textura técnica serena. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const gap = Math.max(10, p.gap);
    const cols = Math.ceil(w / gap) + 2, rows = Math.ceil(h / gap) + 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = x / cols, v = y / rows;
        const wave = 0.5 + 0.5 * Math.sin((u * 6 + v * 4 + t * 0.5 * p.speed) * Math.PI);
        const halo = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 1.8);
        const a = 0.06 + wave * halo * 0.55;
        const r = 0.6 + wave * 1.9;
        ctx.fillStyle = rgba(wave > 0.82 ? p.accent2 : p.accent, a);
        ctx.beginPath(); ctx.arc(x * gap, y * gap + Math.sin(t * 0.4 + x * 0.2) * 2, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
}
