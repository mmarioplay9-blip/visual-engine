import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Panel esmerilado con dispersión de luz, micrograno y capas translúcidas; profundidad sin backdrop-filter. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, p.bg); bg.addColorStop(0.5, rgba(p.accent, 0.22)); bg.addColorStop(1, rgba(p.accent2, 0.16));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97 + t * 12 * p.speed) % (w + 120)) - 60;
      ctx.fillStyle = rgba(i % 2 ? p.accent2 : p.accent, 0.06);
      ctx.beginPath(); ctx.arc(x, h * (0.2 + (i % 5) * 0.16), 50 + (i % 4) * 22, 0, Math.PI * 2); ctx.fill();
    }
    const cw = Math.min(w * 0.7, 620), ch = Math.min(h * 0.58, 360);
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
    ctx.fillStyle = 'rgba(18,26,36,0.42)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 26); else ctx.rect(x, y, cw, ch);
    ctx.fill(); ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 26); else ctx.rect(x, y, cw, ch);
    ctx.clip();
    const rnd = mulberry32(5);
    for (let i = 0; i < 900; i++) {
      const px = x + rnd() * cw, py = y + rnd() * ch;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.015 + rnd() * 0.045) + ')';
      ctx.fillRect(px, py, 1.2, 1.2);
    }
    const glow = ctx.createRadialGradient(x + cw * 0.25, y + ch * 0.2, 0, x + cw * 0.25, y + ch * 0.2, cw * 0.7);
    glow.addColorStop(0, 'rgba(255,255,255,0.2)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(x, y, cw, ch);
    ctx.restore();
    ctx.strokeStyle = 'rgba(235,250,255,0.32)'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + 0.5, cw - 1, ch - 1, 26); else ctx.rect(x, y, cw, ch);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,250,255,0.86)';
    ctx.font = '600 ' + Math.round(Math.min(26, cw * 0.05)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 30, y + 56);
    ctx.fillStyle = 'rgba(225,242,250,0.45)';
    ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('dispersión + micrograno · sin textura externa', x + 31, y + 80);
  });
}
