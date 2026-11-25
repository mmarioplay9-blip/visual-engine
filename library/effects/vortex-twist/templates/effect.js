import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Vórtice de trazos y partículas que se enroscan hacia el centro con torsión variable y estelas de color. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 150; i++) {
      const seed = i * 12.9898;
      const baseA = (seed % 6.283) + t * 0.22 * p.speed;
      const radius = (0.05 + ((i * 37) % 100) / 100 * 0.62) * Math.min(w, h);
      const twist = p.twist * (1 - radius / (Math.min(w, h) * 0.75));
      const a = baseA + twist * 2.4;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius * 0.72;
      const prevA = a - 0.08;
      const px = cx + Math.cos(prevA) * radius * 0.96;
      const py = cy + Math.sin(prevA) * radius * 0.72 * 0.96;
      ctx.strokeStyle = rgba(i % 7 === 0 ? p.accent2 : p.accent, 0.1 + (i % 9) * 0.03);
      ctx.lineWidth = 0.6 + (i % 4) * 0.6;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(cx + Math.cos(a - 0.04) * radius * 1.08, cy + Math.sin(a - 0.04) * radius * 0.72 * 1.08, x, y); ctx.stroke();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.2);
    core.addColorStop(0, 'rgba(255,255,255,0.9)'); core.addColorStop(0.15, rgba(p.accent, 0.4)); core.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  });
}
