import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Refracción ondulante por franjas verticales sobre una escena de color; el puntero desplaza el centro de la onda. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    if (!state.base || state.bw !== w || state.bh !== h) {
      const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
      const g = c.getContext('2d');
      g.fillStyle = p.bg; g.fillRect(0, 0, w, h);
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, rgba(p.accent, 0.55)); grad.addColorStop(0.5, rgba('#0a1420', 0.8)); grad.addColorStop(1, rgba(p.accent2, 0.55));
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = rgba(i % 2 ? p.accent2 : p.accent, 0.28); g.lineWidth = 1 + (i % 3);
        g.beginPath(); g.moveTo((i / 9) * w, 0); g.lineTo((i / 9) * w + h * 0.35, h); g.stroke();
      }
      for (let i = 0; i < 6; i++) {
        g.fillStyle = rgba('#ffffff', 0.05 + i * 0.012);
        g.fillRect(0, (i / 6) * h, w, h / 18);
      }
      state.base = c; state.bw = w; state.bh = h;
    }
    const cx = pointer.active ? pointer.x : 0.62;
    const slices = 96;
    const slice = w / slices;
    for (let i = 0; i < slices; i++) {
      const u = i / slices;
      const d = Math.hypot(u - cx, 0.45 - pointer.y);
      const off = Math.sin(u * 34 * Math.PI + t * 1.5 * p.speed + d * 8) * (2 + p.amplitude * 10) * (0.35 + d);
      ctx.drawImage(state.base, i * (state.bw / slices), 0, state.bw / slices, state.bh, i * slice + off, 0, slice + 1, h);
    }
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.06)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0.14)'); sheen.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = sheen; ctx.fillRect(0, 0, w, h);
  });
}
