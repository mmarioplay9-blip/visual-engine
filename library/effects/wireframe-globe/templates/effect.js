import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Globo de alambre con rotación 3D, meridianos y paralelos; proyección propia sin dependencias. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.32;
    const ry = t * 0.22 * p.speed, rx = -0.32;
    const project = (x, y, z) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      const s = 1 / (2.4 - z2 * 0.55);
      return [cx + x1 * R * s, cy + y1 * R * s, z2];
    };
    ctx.globalCompositeOperation = 'lighter';
    for (let lat = -80; lat <= 80; lat += 20) {
      const phi = (lat * Math.PI) / 180;
      ctx.beginPath();
      for (let lon = 0; lon <= 360; lon += 6) {
        const th = (lon * Math.PI) / 180;
        const [x, y, z] = project(Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th));
        if (lon === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(Math.abs(lat) % 40 === 0 ? p.accent2 : p.accent, 0.3);
      ctx.lineWidth = 1; ctx.stroke();
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const th = (lon * Math.PI) / 180;
      ctx.beginPath();
      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (lat * Math.PI) / 180;
        const [x, y] = project(Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th));
        if (lat === -90) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(p.accent, 0.18); ctx.lineWidth = 1; ctx.stroke();
    }
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    glow.addColorStop(0, rgba(p.accent, 0.12)); glow.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#eafcff', 0.4);
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText(p.label, 20, h - 20);
  });
}
