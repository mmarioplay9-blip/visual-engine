import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Texto que se escribe carácter a carácter con cursor parpadeante, salto de línea y pausa; ritmo controlable. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const chars = Array.from(p.title);
    const speed = Math.max(1, p.cps);
    const shown = Math.min(chars.length, Math.floor((t * speed * p.speed) % (chars.length + 18)));
    const font = Math.min(w * 0.07, h * 0.16);
    ctx.font = '600 ' + Math.round(font) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = p.accent2;
    const kicker = p.kicker;
    ctx.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(kicker, w * 0.08, h * 0.24);
    ctx.fillStyle = '#eef7ff';
    ctx.font = '600 ' + Math.round(font) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const maxW = w * 0.84;
    const lines = [];
    let current = '';
    for (const ch of chars.slice(0, shown)) {
      if (ctx.measureText(current + ch).width > maxW) { lines.push(current); current = ch; }
      else current += ch;
    }
    lines.push(current);
    const lineH = font * 1.16;
    const startY = h * 0.5 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, w * 0.08, startY + i * lineH);
      if (i === lines.length - 1 && Math.floor(t * 2.2) % 2 === 0) {
        const tw = ctx.measureText(line).width;
        ctx.fillStyle = p.accent;
        ctx.fillRect(w * 0.08 + tw + 5, startY + i * lineH - font * 0.8, Math.max(2, font * 0.08), font);
        ctx.fillStyle = '#eef7ff';
      }
    });
  });
}
