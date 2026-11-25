import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Terreno wireframe en perspectiva con ruido fractal y cámara en vuelo; horizonte y niebla por profundidad. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.bg); sky.addColorStop(0.6, rgba(p.accent, 0.12)); sky.addColorStop(1, p.bg);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    const cols = 26, rows = 22;
    const camZ = t * 0.55 * p.speed;
    const project = (x, y, z) => {
      const dist = z + 2.2;
      const s = 1.8 / Math.max(0.25, dist);
      return [w * 0.5 + x * s * w * 0.55, h * 0.62 - y * s * h * 0.5 + (1 - s) * h * 0.18, s];
    };
    const pts = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) - 0.5) * 9;
        const z = (r / (rows - 1)) * 9 + camZ;
        const hgt = (fbm(x * 0.3 + camZ * 0.12, z * 0.3, 4, 12) - 0.5) * 2.3 + Math.sin(z * 0.9 + x * 0.4) * 0.12;
        row.push(project(x, hgt, z));
      }
      pts.push(row);
    }
    ctx.strokeStyle = rgba(p.accent, 0.2); ctx.lineWidth = 1;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.beginPath(); ctx.moveTo(pts[r][c][0], pts[r][c][1]); ctx.lineTo(pts[r + 1][c][0], pts[r + 1][c][1]); ctx.stroke();
      }
    }
    for (let r = 0; r < rows; r++) {
      ctx.strokeStyle = rgba(p.accent, 0.08 + (r / rows) * 0.22);
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        if (c === 0) ctx.moveTo(pts[r][c][0], pts[r][c][1]); else ctx.lineTo(pts[r][c][0], pts[r][c][1]);
      }
      ctx.stroke();
    }
    ctx.fillStyle = rgba(p.accent2, 0.5);
    for (let c = 0; c < cols; c += 4) {
      if (pts[rows - 2][c][2] > 0.5) { ctx.beginPath(); ctx.arc(pts[rows - 2][c][0], pts[rows - 2][c][1], 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = rgba('#eafcff', 0.32);
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText('TERRAIN · fbm · z ' + camZ.toFixed(1), 20, h - 20);
  });
}
