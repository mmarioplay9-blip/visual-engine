import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Núcleo incandescente con destello horizontal anamórfico y halos escalonados; postproceso óptico de cine. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * (0.5 + Math.sin(t * 0.21 * p.speed) * 0.08);
    const cy = h * 0.47;
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.22);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.08, rgba(p.accent, 0.8));
    core.addColorStop(0.32, rgba(p.accent, 0.22));
    core.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const y = cy + (i - 1) * 2;
      const g = ctx.createLinearGradient(0, y, w, y);
      g.addColorStop(0, rgba(p.accent, 0));
      g.addColorStop(0.3, rgba(p.accent, 0.06));
      g.addColorStop(0.5, rgba('#dffcff', 0.75));
      g.addColorStop(0.7, rgba(p.accent, 0.06));
      g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, y - (2 + i * 2), w, 4 + i * 4);
    }
    const streak = ctx.createLinearGradient(cx, 0, cx, h);
    streak.addColorStop(0, rgba(p.accent, 0));
    streak.addColorStop(0.5, rgba(p.accent, 0.22));
    streak.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = streak; ctx.fillRect(cx - 1.5, 0, 3, h);
    ctx.fillStyle = rgba('#ffffff', 0.8);
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  });
}
