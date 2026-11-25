import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Panel de telemetría con retícula, barras vivas, sparkline y lecturas numéricas coherentes. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(p.accent, 0.07); ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = rgba('#eaffff', 0.85);
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.fillText('VITAL / TELEMETRÍA', 24, 34);
    ctx.fillStyle = rgba(p.accent, 0.7);
    ctx.fillText('ENLACE ' + (Math.floor(t * 2) % 2 ? 'ESTABLE' : 'ACTIVO'), w - 168, 34);
    const bars = 12;
    for (let i = 0; i < bars; i++) {
      const val = 0.25 + 0.65 * Math.abs(Math.sin(t * 0.9 + i * 0.7) * Math.cos(t * 0.31 + i));
      const x = 24 + i * ((w - 48) / bars);
      const bh = (h * 0.26) * val;
      ctx.fillStyle = rgba(i > 8 ? p.accent2 : p.accent, 0.16 + val * 0.35);
      ctx.fillRect(x, h * 0.62 - bh, (w - 48) / bars - 5, bh);
      ctx.fillStyle = rgba('#dffcff', 0.35);
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(String(Math.round(val * 100)).padStart(2, '0'), x, h * 0.62 + 12);
    }
    ctx.strokeStyle = rgba(p.accent, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = 24 + (i / 120) * (w - 48);
      const y = h * 0.82 + Math.sin(i * 0.18 + t * 2) * 8 + Math.sin(i * 0.05 - t) * 12;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(p.accent, 0.5);
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText('t+ ' + t.toFixed(2) + 's · 60 Hz · local', 24, h - 18);
  });
}
