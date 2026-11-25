import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Tarjeta con inclinación 3D, brillo especular y paralaje interno; respuesta física al puntero. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const px = pointer.active ? pointer.x : 0.62 + Math.sin(t * 0.3) * 0.08;
    const py = pointer.active ? pointer.y : 0.4 + Math.cos(t * 0.27) * 0.06;
    const cw = Math.min(w * 0.62, 520), ch = Math.min(h * 0.58, 320);
    const cx = w / 2, cy = h / 2;
    const rx = (py - 0.5) * 0.22, ry = (px - 0.5) * 0.36;
    ctx.save();
    ctx.translate(cx, cy); ctx.transform(1, rx, ry, 1, 0, 0);
    const sheen = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
    sheen.addColorStop(0, 'rgba(20,30,44,0.96)'); sheen.addColorStop(1, 'rgba(7,11,18,0.96)');
    ctx.fillStyle = sheen;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 24;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 24); else ctx.rect(-cw / 2, -ch / 2, cw, ch);
    ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = rgba(p.accent, 0.45); ctx.lineWidth = 1;
    ctx.stroke();
    const gx = -cw / 2 + px * cw, gy = -ch / 2 + py * ch;
    const spec = ctx.createRadialGradient(gx, gy, 0, gx, gy, cw * 0.6);
    spec.addColorStop(0, 'rgba(255,255,255,0.18)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.fillStyle = rgba(p.accent, 0.12);
    ctx.fillRect(-cw / 2 + 34, -ch / 2 + 60, 40, 2);
    ctx.fillStyle = '#f2f8ff';
    ctx.font = '650 ' + Math.round(Math.min(28, cw * 0.06)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, -cw / 2 + 34, -ch / 2 + 108);
    ctx.fillStyle = 'rgba(210,230,245,0.5)';
    ctx.font = '400 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('la luz sigue la geometría', -cw / 2 + 35, -ch / 2 + 134);
    ctx.restore();
  });
}
