import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Botón que se inclina y desplaza hacia el puntero con retorno elástico y halo de energía. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const bw = Math.min(280, w * 0.42), bh = 62;
    const cx = w * 0.5, cy = h * 0.5;
    const mx = pointer.active ? (pointer.x - 0.5) * 60 : Math.sin(t * 0.8) * 22;
    const my = pointer.active ? (pointer.y - 0.5) * 30 : Math.cos(t * 0.6) * 8;
    const x = cx - bw / 2 + mx * 0.45, y = cy - bh / 2 + my * 0.35;
    const rot = (mx / 60) * 0.06;
    ctx.save();
    ctx.translate(x + bw / 2, y + bh / 2); ctx.rotate(rot); ctx.translate(-bw / 2, -bh / 2);
    ctx.shadowColor = rgba(p.accent, 0.45); ctx.shadowBlur = 30;
    ctx.fillStyle = rgba(p.accent, 0.16);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, bw, bh, 20); else ctx.rect(0, 0, bw, bh);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba('#e9ffff', 0.6); ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0.5, 0.5, bw - 1, bh - 1, 20); else ctx.rect(0, 0, bw, bh);
    ctx.stroke();
    ctx.fillStyle = '#f2ffff';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.label, bw / 2, bh / 2);
    ctx.restore();
    ctx.strokeStyle = rgba(p.accent, 0.18); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx + mx * 0.3, cy + my * 0.2, 100 + Math.sin(t * 1.4) * 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + mx * 0.2, cy + my * 0.15, 140 + Math.sin(t * 0.9) * 8, 0, Math.PI * 2); ctx.stroke();
  });
}
