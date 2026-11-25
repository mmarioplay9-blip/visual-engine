import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Estrellas en fuga radial con estelas de velocidad y núcleo luminoso; salto al hiperespacio controlable. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    if (!state.stars) {
      const rnd = mulberry32(31);
      state.stars = Array.from({ length: 360 }, () => ({ a: rnd() * Math.PI * 2, r: rnd(), z: 0.2 + rnd() }));
    }
    ctx.globalCompositeOperation = 'lighter';
    const k = p.speed * 0.16;
    for (const s of state.stars) {
      const r = (s.r + t * k * s.z) % 1;
      const r2 = Math.max(0, r - 0.018 * s.z - (pointer.down ? 0.05 : 0));
      const x1 = cx + Math.cos(s.a) * r * w * 0.65;
      const y1 = cy + Math.sin(s.a) * r * h * 0.65;
      const x2 = cx + Math.cos(s.a) * r2 * w * 0.65;
      const y2 = cy + Math.sin(s.a) * r2 * h * 0.65;
      ctx.strokeStyle = rgba(s.z > 0.75 ? p.accent2 : p.accent, 0.15 + r * 0.7);
      ctx.lineWidth = 0.6 + r * 2.2;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.3);
    core.addColorStop(0, rgba(p.accent, 0.3)); core.addColorStop(0.12, rgba(p.accent, 0.1)); core.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}
