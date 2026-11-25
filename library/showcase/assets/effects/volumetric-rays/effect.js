import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Haces volumétricos desde una fuente fuera de cuadro, con polvo y desvanecimiento atmosférico. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const sx = w * (0.18 + Math.sin(t * 0.09 * p.speed) * 0.04);
    const sy = -h * 0.15;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const a = -0.35 + (i / 22) * 1.5 + Math.sin(t * 0.18 + i * 1.7) * 0.018;
      const len = h * (1.4 + (i % 5) * 0.18);
      const spread = 0.012 + (i % 4) * 0.012;
      const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
      g.addColorStop(0, rgba(i % 5 === 0 ? p.accent2 : p.accent, 0.2));
      g.addColorStop(0.35, rgba(p.accent, 0.07));
      g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - spread) * len, sy + Math.sin(a - spread) * len);
      ctx.lineTo(sx + Math.cos(a + spread) * len, sy + Math.sin(a + spread) * len);
      ctx.closePath(); ctx.fill();
    }
    const haze = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 1.2);
    haze.addColorStop(0, rgba(p.accent, 0.12)); haze.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}
