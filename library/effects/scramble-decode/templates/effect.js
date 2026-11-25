import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Código que se resuelve en texto legible con caracteres aleatorios y bloques de color; efecto de descifrado. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@';
    const target = p.title;
    const chars = Array.from(target);
    const cyc = (t * 0.2 * p.speed) % 1;
    const resolved = Math.floor(clamp((cyc - 0.1) / 0.55) * chars.length);
    const font = Math.min(w * 0.11, h * 0.18);
    ctx.font = '700 ' + Math.round(font) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    let text = '';
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === ' ') { text += ' '; continue; }
      text += i < resolved ? chars[i] : glyphs[Math.floor(noise2(i * 4.1, Math.floor(t * 18), 6) * glyphs.length)];
    }
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = rgba(p.accent, 0.1);
    ctx.fillRect(w * 0.5 - tw / 2 - 24, h * 0.5 - font * 0.7, tw + 48, font * 1.4);
    ctx.fillStyle = '#f4faff';
    ctx.fillText(text, w * 0.5 - tw / 2, h * 0.5);
    ctx.fillStyle = p.accent;
    ctx.fillRect(w * 0.5 - tw / 2, h * 0.5 + font * 0.58, tw * clamp((cyc - 0.1) / 0.55), 2);
    ctx.textBaseline = 'alphabetic';
  });
}
