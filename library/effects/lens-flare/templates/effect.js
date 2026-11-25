import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Fuente de luz con fantasmas ópticos alineados, anillo de difracción y velo; simulación de cristal real. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * (0.3 + (pointer.active ? pointer.x : 0.65) * 0.4);
    const cy = h * (0.28 + (pointer.active ? pointer.y : 0.4) * 0.35);
    const dx = w * 0.5 - cx, dy = h * 0.5 - cy;
    ctx.globalCompositeOperation = 'lighter';
    const veil = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    veil.addColorStop(0, rgba(p.accent2, 0.25)); veil.addColorStop(0.2, rgba(p.accent, 0.07)); veil.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = veil; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const k = -0.4 + i * 0.28;
      const x = cx + dx * k, y = cy + dy * k;
      const r = (8 + i * 9) * (1 + Math.sin(t * 0.5 + i) * 0.04);
      ctx.strokeStyle = rgba(i % 3 === 0 ? p.accent2 : p.accent, 0.22);
      ctx.lineWidth = 1 + (i % 2);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rgba(p.accent, 0.03); ctx.fill();
    }
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    halo.addColorStop(0, 'rgba(255,255,255,0.95)');
    halo.addColorStop(0.12, rgba(p.accent2, 0.55));
    halo.addColorStop(0.4, rgba(p.accent2, 0.12));
    halo.addColorStop(1, rgba(p.accent2, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(p.accent, 0.18); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  });
}
