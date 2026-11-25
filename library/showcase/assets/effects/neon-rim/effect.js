import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Borde de neón pulsante sobre una tarjeta oscura, con dos temperaturas y caída de luz realista. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const pulse = 0.55 + Math.sin(t * 2.1 * p.speed) * 0.25;
    const cardW = Math.min(w * 0.68, 520), cardH = Math.min(h * 0.5, 280);
    const x = (w - cardW) / 2, y = (h - cardH) / 2;
    ctx.fillStyle = rgba('#0b111b', 0.86);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cardW, cardH, 22); else ctx.rect(x, y, cardW, cardH);
    ctx.fill();
    const rim = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
    rim.addColorStop(0, p.accent); rim.addColorStop(0.55, rgba(p.accent, 0.25)); rim.addColorStop(1, p.accent2);
    ctx.strokeStyle = rim; ctx.lineWidth = 1.4 + pulse * 2; ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.shadowColor = p.accent; ctx.shadowBlur = 18 + pulse * 22;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cardW, cardH, 22); else ctx.rect(x, y, cardW, cardH);
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(p.accent, 0.08);
    ctx.fillRect(x + 24, y + cardH - 76, cardW - 48, 1);
    ctx.font = '600 ' + Math.round(Math.min(34, cardW * 0.06)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#eef7ff';
    ctx.fillText('SUPERFICIE', x + 26, y + 52);
    ctx.font = '400 ' + Math.round(Math.min(15, cardW * 0.028)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = rgba('#cfe4f4', 0.6);
    ctx.fillText('luz de borde · dos temperaturas', x + 27, y + 77);
  });
}
