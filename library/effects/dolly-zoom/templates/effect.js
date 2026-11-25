import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Contra-zoom de vértigo: el fondo se comprime mientras el marco crece; efecto Hitchcock en 2D. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cyc = (t * 0.18 * p.speed) % 1;
    const k = cyc < 0.5 ? cyc * 2 : (1 - cyc) * 2;
    const cx = w * 0.5, cy = h * 0.5;
    const rings = 16;
    for (let i = rings; i >= 0; i--) {
      const depth = i / rings;
      const scale = 0.18 + depth * 0.92 + k * 0.35 * depth;
      const rw = w * scale, rh = h * scale * 0.72;
      ctx.strokeStyle = rgba(i % 4 === 0 ? p.accent2 : p.accent, 0.12 + depth * 0.25);
      ctx.lineWidth = 0.8 + depth * 1.4;
      ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);
      if (i % 4 === 0) {
        ctx.fillStyle = rgba(p.accent, 0.018 + depth * 0.02);
        ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
      }
    }
    ctx.strokeStyle = rgba(p.accent, 0.4); ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * w * 0.03, cy); ctx.lineTo(cx + i * w * 0.14, 0); ctx.stroke();
    }
    ctx.fillStyle = rgba(p.accent, 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, 3 + k * 4, 0, Math.PI * 2); ctx.fill();
  });
}
