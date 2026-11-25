import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Malla de gradientes que respira con cuatro focos de color y grano fino; fondo premium sin imágenes. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const blobs = [
      [0.22 + Math.sin(t * 0.17) * 0.08, 0.28 + Math.cos(t * 0.13) * 0.07, 0.55, p.accent],
      [0.76 + Math.cos(t * 0.11) * 0.07, 0.24 + Math.sin(t * 0.19) * 0.06, 0.5, p.accent2],
      [0.58 + Math.sin(t * 0.09 + 2) * 0.1, 0.8 + Math.cos(t * 0.12) * 0.05, 0.62, p.accent],
      [0.1 + Math.cos(t * 0.07) * 0.05, 0.86 + Math.sin(t * 0.15) * 0.05, 0.4, p.accent2],
    ];
    for (const [x, y, r, col] of blobs) {
      const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h));
      g.addColorStop(0, rgba(col, 0.34)); g.addColorStop(0.4, rgba(col, 0.09)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
    const rnd = mulberry32(61);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.01 + rnd() * 0.025) + ')';
      ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
    }
  });
}
