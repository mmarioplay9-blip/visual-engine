import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Paisaje en cuatro profundidades que se desplazan a velocidades distintas con el puntero y el tiempo. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.bg); sky.addColorStop(0.55, rgba(p.accent, 0.24)); sky.addColorStop(1, rgba(p.accent2, 0.2));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    const px = pointer.active ? pointer.x - 0.5 : Math.sin(t * 0.2) * 0.2;
    const layers = [
      { y: 0.68, amp: 0.1, speed: 0.15, col: rgba(p.accent, 0.18), n: 5 },
      { y: 0.74, amp: 0.14, speed: 0.28, col: rgba(p.accent, 0.32), n: 7 },
      { y: 0.82, amp: 0.18, speed: 0.48, col: 'rgba(10,20,28,0.82)', n: 9 },
      { y: 0.9, amp: 0.24, speed: 0.75, col: 'rgba(3,6,10,0.96)', n: 11 },
    ];
    for (let k = 0; k < layers.length; k++) {
      const L = layers[k];
      const off = px * -80 * (k + 1) + Math.sin(t * L.speed * 0.5) * 18;
      ctx.fillStyle = L.col;
      ctx.beginPath(); ctx.moveTo(-100, h);
      for (let i = 0; i <= L.n; i++) {
        const x = -100 + (i / L.n) * (w + 200) + off;
        const y = h * L.y - Math.abs(Math.sin(i * 1.7 + k * 2.1)) * h * L.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 100, h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = rgba('#ffffff', 0.05);
    for (let i = 0; i < 6; i++) ctx.fillRect(0, h * (0.2 + i * 0.06), w, 1);
  });
}
