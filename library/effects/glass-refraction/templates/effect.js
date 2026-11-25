import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Panel de cristal que refracta bandas de color del fondo, con borde luminoso y sombra de contacto. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const x = ((i / 7 + t * 0.02 * p.speed) % 1) * w;
      const g = ctx.createLinearGradient(x, 0, x + w * 0.25, h);
      g.addColorStop(0, rgba(i % 2 ? p.accent : p.accent2, 0.35)); g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g; ctx.fillRect(x, 0, w * 0.22, h);
    }
    const cw = Math.min(w * 0.64, 560), ch = Math.min(h * 0.54, 330);
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 22;
    ctx.fillStyle = 'rgba(8,14,22,0.38)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, p.radius); else ctx.rect(x, y, cw, ch);
    ctx.fill(); ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, p.radius); else ctx.rect(x, y, cw, ch);
    ctx.clip();
    for (let i = 0; i < 16; i++) {
      const yy = y + (i / 16) * ch + Math.sin(t * 0.7 + i) * 4;
      ctx.fillStyle = rgba(i % 3 === 0 ? p.accent2 : p.accent, 0.05 + (i % 4) * 0.015);
      ctx.fillRect(x, yy, cw, 2 + (i % 3));
    }
    const sheen = ctx.createLinearGradient(x - cw, y, x + cw * 1.6, y + ch);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.42, 'rgba(255,255,255,0.16)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    sheen.addColorStop(0.58, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen; ctx.fillRect(x, y, cw, ch);
    ctx.restore();
    ctx.strokeStyle = rgba('#eaffff', 0.55); ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + 0.5, cw - 1, ch - 1, p.radius); else ctx.rect(x, y, cw, ch);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,250,255,0.82)';
    ctx.font = '600 ' + Math.round(Math.min(30, cw * 0.06)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 28, y + 54);
    ctx.fillStyle = 'rgba(220,240,250,0.45)';
    ctx.font = '400 ' + Math.round(Math.min(14, cw * 0.03)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('refracción · borde · sombra', x + 29, y + 79);
  });
}
