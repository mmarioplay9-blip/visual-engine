import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Retícula de seguimiento con corchetes, círculo de bloqueo, deriva y datos de objetivo en tiempo real. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * (0.5 + Math.sin(t * 0.55) * 0.18);
    const cy = h * (0.5 + Math.cos(t * 0.43) * 0.14);
    const R = Math.min(w, h) * 0.16;
    ctx.strokeStyle = rgba(p.accent, 0.7); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const b = R + 22, len = 18;
    ctx.lineWidth = 2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * b, cy + sy * (b - len));
      ctx.lineTo(cx + sx * b, cy + sy * b);
      ctx.lineTo(cx + sx * (b - len), cy + sy * b);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx - R * 0.4, cy); ctx.lineTo(cx + R * 0.4, cy); ctx.moveTo(cx, cy - R * 0.4); ctx.lineTo(cx, cy + R * 0.4); ctx.stroke();
    ctx.fillStyle = rgba(p.accent2, 0.85);
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillText('LOCK', cx + R + 22, cy - R + 4);
    ctx.fillStyle = rgba('#dffcff', 0.65);
    ctx.fillText('X ' + Math.round(cx) + '  Y ' + Math.round(cy), cx + R + 22, cy - R + 20);
    ctx.fillText('CONF ' + (86 + Math.round(Math.sin(t) * 4)) + '%', cx + R + 22, cy - R + 34);
    ctx.strokeStyle = rgba(p.accent, 0.16); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - R - 30); ctx.lineTo(cx, 0); ctx.stroke();
  });
}
