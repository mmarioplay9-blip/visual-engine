import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Manchas de tinta que se expanden con ruido fractal y bordes de color; fluido orgánico calculado en baja resolución. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const lw = 160, lh = 90;
    if (!state.ink || state.ink.width !== lw) {
      const c = document.createElement('canvas'); c.width = lw; c.height = lh; state.ink = c;
      state.inkCtx = c.getContext('2d'); state.img = state.inkCtx.createImageData(lw, lh);
    }
    const img = state.img;
    const [ar, ag, ab] = hexToRgb(p.accent);
    const [br, bgc, bb] = hexToRgb(p.accent2);
    const [gr, gg, gb] = hexToRgb(p.bg);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const u = x / lw, v = y / lh;
        const n = fbm(u * 4 + Math.sin(t * 0.1) * 0.2, v * 4 - t * 0.05, 4, 3);
        const blob = Math.max(0, n - (0.47 - p.spread * 0.18));
        const edge = Math.pow(blob * 4.2, 2.2);
        const idx = (y * lw + x) * 4;
        const mix = clamp(edge * 1.8);
        img.data[idx] = Math.round((gr + (ar - gr) * mix + br * Math.pow(edge, 4)) * 255);
        img.data[idx + 1] = Math.round((gg + (ag - gg) * mix + bgc * Math.pow(edge, 4)) * 255);
        img.data[idx + 2] = Math.round((gb + (ab - gb) * mix + bb * Math.pow(edge, 4)) * 255);
        img.data[idx + 3] = 255;
      }
    }
    state.inkCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(state.ink, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.min(w, h) * 0.45);
    glow.addColorStop(0, rgba(p.accent, 0.1)); glow.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}
