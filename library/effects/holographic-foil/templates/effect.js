import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Lámina holográfica con franjas de difracción, motas de brillo y relieve que responde al puntero. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const px = pointer.active ? pointer.x : 0.55;
    const py = pointer.active ? pointer.y : 0.4;
    const cw = Math.min(w * 0.72, 640), ch = Math.min(h * 0.6, 360);
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 20); else ctx.rect(x, y, cw, ch);
    ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      const hue = (k * 260 + t * 22 * p.speed + px * 80) % 360;
      g.addColorStop(k, 'hsla(' + hue + ', 75%, ' + (45 + Math.sin(k * 9 + py * 5) * 18) + '%, 0.9)');
    }
    ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 22; i++) {
      const yy = y + ((i / 22) * ch + Math.sin(t * 0.5 + i * 1.7) * 18 + ch) % ch;
      const gg = ctx.createLinearGradient(x, yy, x + cw, yy + 40);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.45, 'rgba(255,255,255,0.2)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(x, yy, cw, 2 + (i % 3));
    }
    const rnd = mulberry32(44);
    for (let i = 0; i < 140; i++) {
      const sx = x + rnd() * cw, sy = y + rnd() * ch;
      const a = 0.12 + rnd() * 0.35;
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.fillRect(sx, sy, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    const sheen = ctx.createRadialGradient(x + cw * px, y + ch * py, 0, x + cw * px, y + ch * py, cw * 0.5);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen; ctx.fillRect(x, y, cw, ch);
    ctx.restore();
    ctx.fillStyle = 'rgba(8,12,18,0.72)';
    ctx.font = '700 ' + Math.round(Math.min(34, cw * 0.07)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 28, y + ch - 34);
  });
}
