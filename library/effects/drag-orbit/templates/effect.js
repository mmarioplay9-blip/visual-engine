import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Esfera de partículas orbitable arrastrando; inercia, paralaje y estela de rotación. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    if (!state.pts) {
      const rnd = mulberry32(23);
      state.pts = Array.from({ length: 420 }, () => {
        const theta = rnd() * Math.PI * 2, z = rnd() * 2 - 1;
        const r = Math.sqrt(1 - z * z);
        return { x: r * Math.cos(theta), y: z, z: r * Math.sin(theta), s: rnd() };
      });
      state.rx = 0.35; state.ry = 0.4; state.vx = 0.002; state.vy = 0.004; state.last = null;
    }
    if (pointer.down) {
      if (state.last) {
        state.vy += (pointer.x - state.last.x) * 0.008;
        state.vx += (pointer.y - state.last.y) * 0.008;
      }
      state.last = { x: pointer.x, y: pointer.y };
    } else state.last = null;
    state.rx += state.vx; state.ry += state.vy;
    state.vx *= 0.97; state.vy *= 0.97;
    const cy = Math.cos(state.rx), sy = Math.sin(state.rx);
    const cxr = Math.cos(state.ry), sxr = Math.sin(state.ry);
    const scale = Math.min(w, h) * 0.34;
    const sorted = state.pts.map((p) => {
      const x1 = p.x * cxr + p.z * sxr;
      const z1 = -p.x * sxr + p.z * cxr;
      const y1 = p.y * cy - z1 * sy;
      const z2 = p.y * sy + z1 * cy;
      return { ...p, x: x1, y: y1, z: z2 };
    }).sort((a, b) => a.z - b.z);
    ctx.globalCompositeOperation = 'lighter';
    for (const q of sorted) {
      const s = 1.6 / (2.2 - q.z);
      ctx.fillStyle = rgba(q.s > 0.8 ? p.accent2 : p.accent, 0.15 + (q.z + 1) * 0.3);
      ctx.beginPath(); ctx.arc(w / 2 + q.x * scale * s, h / 2 + q.y * scale * s, 0.7 + s * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(235,250,255,0.4)';
    ctx.font = '500 11px ui-monospace, monospace';
    ctx.fillText(pointer.down ? 'arrastrando · inercia activa' : 'arrastra para orbitar', 22, h - 22);
  });
}
