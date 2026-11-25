import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Curvas de nivel topográficas desplazadas por ruido; terreno abstracto con lectura de profundidad. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, p.bg); g.addColorStop(1, rgba(p.accent, 0.12));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const lines = Math.round(p.lines);
    for (let i = 0; i < lines; i++) {
      const baseY = (i / lines) * h;
      const amp = (9 + Math.sin(i * 0.7) * 6) * (1 + p.depth * 0.8);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const n = fbm(x * 0.005 + t * 0.06, i * 0.23 - t * 0.02, 3, 4);
        const y = baseY + (n - 0.5) * amp * 3 + Math.sin(x * 0.01 + t * 0.4 + i) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(i % 6 === 0 ? p.accent2 : p.accent, 0.1 + (i / lines) * 0.3);
      ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.7;
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(w * 0.65, h * 0.35, 0, w * 0.65, h * 0.35, w * 0.5);
    glow.addColorStop(0, rgba(p.accent2, 0.12)); glow.addColorStop(1, rgba(p.accent2, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  });
}
