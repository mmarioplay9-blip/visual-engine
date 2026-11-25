import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Cambio de foco entre fondo y primer plano con bokeh que se abre y cierra; profundidad de campo explícita. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const focus = 0.5 + 0.5 * Math.sin(t * 0.8 * p.speed);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const x = w * (0.55 + Math.sin(i * 2.3) * 0.36);
      const y = h * (0.45 + Math.cos(i * 1.7) * 0.32);
      const r = (18 + (i % 5) * 10) * (0.5 + focus * 0.9);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(i % 3 === 0 ? p.accent2 : p.accent, 0.18)); g.addColorStop(0.7, rgba(p.accent, 0.06)); g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'blur(' + ((1 - focus) * 7).toFixed(1) + 'px)';
    const cw = Math.min(w * 0.5, 420), ch = Math.min(h * 0.36, 200);
    const x = w * 0.08, y = h * 0.56;
    ctx.fillStyle = 'rgba(8,14,22,0.88)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 18); else ctx.rect(x, y, cw, ch);
    ctx.fill();
    ctx.strokeStyle = rgba(p.accent, 0.6); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#f4fbff';
    ctx.font = '700 ' + Math.round(Math.min(30, cw * 0.08)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 24, y + 54);
    ctx.fillStyle = 'rgba(220,240,250,0.6)';
    ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('foco ' + (focus * 100).toFixed(0) + '% · primer plano', x + 25, y + 78);
    ctx.filter = 'none';
    ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const fy = y + ch * (0.55 + i * 0.1);
      ctx.beginPath(); ctx.moveTo(x + 24, fy); ctx.lineTo(x + 24 + (cw - 48) * (0.3 + i * 0.15), fy); ctx.stroke();
    }
  });
}
