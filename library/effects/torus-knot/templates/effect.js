import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Nudo toroidal paramétrico con 720 segmentos, giro 3D y brillo aditivo; geometría matemática pura. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5, scale = Math.min(w, h) * 0.23;
    const ry = t * 0.24 * p.speed, rx = 0.4 + Math.sin(t * 0.2) * 0.1;
    const p1 = 2, p2 = 3;
    const project = (x, y, z) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      const s = 1.7 / (2.7 - z2 * 0.7);
      return [cx + x1 * scale * s, cy + y1 * scale * s, z2];
    };
    const pts = [];
    const N = 360;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * Math.PI * 2;
      const q = 2 + Math.cos(p2 * u);
      const x = q * Math.cos(p1 * u), y = q * Math.sin(p1 * u), z = Math.sin(p2 * u) * 1.4;
      pts.push(project(x, y + Math.sin(u * 3) * 0.15, z));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const depth = (a[2] + 1) / 2;
      ctx.strokeStyle = rgba(i % 30 === 0 ? p.accent2 : p.accent, 0.12 + depth * 0.45);
      ctx.lineWidth = 0.7 + depth * 1.8;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#eafcff', 0.35);
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText('p=2  q=3  ·  ' + N + ' segmentos', 20, h - 20);
  });
}
