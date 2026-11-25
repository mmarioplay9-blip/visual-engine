import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Titular que respira con peso, ancho y altura variables por letra; movimiento tipográfico, no un fade. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const chars = Array.from(p.title);
    const size = Math.min(w * 0.13, h * 0.2);
    const total = chars.length;
    let x = w * 0.08;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < total; i++) {
      const phase = Math.sin(t * 1.6 * p.speed - i * 0.42);
      const weight = Math.round(300 + (phase * 0.5 + 0.5) * 600);
      const scale = 1 + phase * 0.045 * p.range;
      const fs = size * scale;
      ctx.font = weight + ' ' + Math.round(fs) + 'px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = i % 3 === 0 ? p.accent : '#f1f7ff';
      ctx.fillText(chars[i], x, h * 0.5 + Math.sin(t * 1.1 - i * 0.3) * 4);
      x += ctx.measureText(chars[i]).width + size * 0.01;
      if (x > w * 0.9) break;
    }
    ctx.fillStyle = rgba(p.accent2, 0.65);
    ctx.font = '500 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('peso variable · onda individual', w * 0.08, h * 0.72);
    ctx.textBaseline = 'alphabetic';
  });
}
