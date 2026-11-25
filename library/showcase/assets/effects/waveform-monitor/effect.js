import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Osciloscopio con onda compuesta, espectro de barras y lectura de pico; señal viva, no decorativa. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(p.accent, 0.08); ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const mid = h * 0.55;
    ctx.strokeStyle = rgba(p.accent, 0.75); ctx.lineWidth = 1.4;
    ctx.beginPath();
    let peak = 0;
    for (let i = 0; i <= 240; i++) {
      const u = i / 240;
      const env = Math.exp(-Math.pow((u - 0.5) * 3, 2));
      const v = (Math.sin(u * 42 + t * 5) * 0.5 + Math.sin(u * 17 - t * 2.1) * 0.3 + Math.sin(u * 91 + t * 8) * 0.18) * env;
      peak = Math.max(peak, Math.abs(v));
      const x = u * w, y = mid + v * h * 0.2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(p.accent2, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    const bars = 48;
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(Math.sin(i * 0.6 + t * 2.4) * Math.cos(i * 0.13 - t * 0.8));
      ctx.fillStyle = rgba(i % 5 === 0 ? p.accent2 : p.accent, 0.15 + v * 0.45);
      ctx.fillRect((i / bars) * w, h * 0.1, w / bars - 2, v * h * 0.22);
    }
    ctx.fillStyle = rgba('#dffcff', 0.8);
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(p.label, 22, 28);
    ctx.fillStyle = rgba(p.accent, 0.7);
    ctx.fillText('PEAK ' + (peak * 100).toFixed(0) + '%', w - 110, 28);
  });
}
