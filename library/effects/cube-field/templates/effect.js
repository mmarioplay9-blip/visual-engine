import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Campo de cubos 3D con caras translúcidas y orden de profundidad; rejilla espacial en rotación. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5, scale = Math.min(w, h) * 0.16;
    const ry = t * 0.3 * p.speed, rx = 0.5;
    const project = (x, y, z) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      const s = 1.8 / (3.6 - z2);
      return [cx + x1 * scale * s, cy + y1 * scale * s, z2, s];
    };
    const cubes = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) cubes.push([x * 1.35, y * 1.35, z * 1.35]);
    const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]];
    const items = [];
    for (const [x, y, z] of cubes) {
      const verts = [];
      for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) verts.push(project(x + dx, y + dy, z + dz));
      items.push({ verts, depth: z });
    }
    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) {
      for (const f of faces) {
        const vs = f.map((i) => item.verts[i]);
        const depth = (vs[0][2] + vs[1][2] + vs[2][2]) / 3;
        ctx.fillStyle = rgba(depth > 0 ? p.accent2 : p.accent, 0.03 + (depth + 2) * 0.015);
        ctx.strokeStyle = rgba(p.accent, 0.16 + (depth + 2) * 0.05);
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(vs[0][0], vs[0][1]);
        for (let i = 1; i < vs.length; i++) ctx.lineTo(vs[i][0], vs[i][1]);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    ctx.fillStyle = rgba('#eafcff', 0.35);
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText('27 cubos · painter\'s algorithm', 20, h - 20);
  });
}
