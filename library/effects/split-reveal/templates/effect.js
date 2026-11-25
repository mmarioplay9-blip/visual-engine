import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Letras que suben desde una máscara con escalonado y easing; entrada tipográfica limpia y repetible. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const chars = Array.from(p.title);
    let fontSize = Math.min(w * 0.15, h * 0.24);
    ctx.font = '800 ' + Math.round(fontSize) + 'px ui-sans-serif, system-ui, sans-serif';
    // Encaje real: un titular largo no debe salir del lienzo (0.3).
    const rawWidth = ctx.measureText(p.title).width;
    if (rawWidth > w * 0.86) {
      fontSize *= (w * 0.86) / rawWidth;
      ctx.font = '800 ' + Math.round(fontSize) + 'px ui-sans-serif, system-ui, sans-serif';
    }
    ctx.textBaseline = 'middle';
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = (w - total) / 2;
    const baseY = h * 0.52;
    for (let i = 0; i < chars.length; i++) {
      // Entrada escalonada que se mantiene visible; antes se repetía y sólo
      // mostraba una ventana de letras, lo que rompía la composición.
      const local = clamp((t * p.speed - i * 0.045) / 0.55);
      const e = 1 - Math.pow(1 - local, 3);
      const y = baseY + (1 - e) * fontSize * 0.95;
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 2, baseY - fontSize * 0.62, widths[i] + 4, fontSize * 0.92); ctx.clip();
      ctx.fillStyle = i === chars.length - 1 ? p.accent : '#f2f8ff';
      ctx.fillText(chars[i], x, y);
      ctx.restore();
      x += widths[i];
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = rgba(p.accent, 0.55);
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.kicker, w * 0.5 - ctx.measureText(p.kicker).width / 2, h * 0.7);
  });
}
