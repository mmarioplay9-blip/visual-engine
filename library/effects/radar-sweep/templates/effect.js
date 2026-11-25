import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Radar circular con barrido cónico, retícula, blips con estela y lectura de rumbo; instrumento coherente. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    const R = Math.min(w, h) * 0.36;
    ctx.strokeStyle = rgba(p.accent, 0.25); ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    const a = (t * 0.9 * p.speed) % (Math.PI * 2);
    const grad = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
    if (grad) {
      grad.addColorStop(0, rgba(p.accent, 0.4)); grad.addColorStop(0.12, rgba(p.accent, 0)); grad.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = rgba(p.accent, 0.9); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    const blips = [[0.8, 1.2], [2.4, 0.55], [4.2, 1.7], [5.4, 0.9]];
    for (const [ba, br] of blips) {
      const x = cx + Math.cos(ba + t * 0.02) * R * br * 0.72;
      const y = cy + Math.sin(ba + t * 0.02) * R * br * 0.72;
      const phase = Math.max(0, Math.sin(a - ba - t * 0.02));
      ctx.fillStyle = rgba(p.accent2, 0.15 + phase * 0.6);
      ctx.beginPath(); ctx.arc(x, y, 2 + phase * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = rgba('#eafcff', 0.8);
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(p.label, cx - R, cy + R + 26);
    ctx.fillText('R ' + Math.round(R) + '  BRG ' + String(Math.round((a * 180) / Math.PI) % 360).padStart(3, '0'), cx - R, cy + R + 44);
  });
}
