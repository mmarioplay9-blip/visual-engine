import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Cámara en mano con microsacudidas, encuadre de monitor y timecode; textura de rodaje real. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = '#030507'; ctx.fillRect(0, 0, w, h);
    const shake = p.amount * 8;
    const dx = (noise2(t * 2.2, 1.7, 3) - 0.5) * shake + Math.sin(t * 7) * shake * 0.35;
    const dy = (noise2(t * 1.9, 8.1, 5) - 0.5) * shake + Math.cos(t * 6.3) * shake * 0.25;
    ctx.save(); ctx.translate(dx, dy);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgba(p.accent, 0.35)); sky.addColorStop(1, p.bg);
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.fillStyle = 'rgba(4,8,12,0.9)';
    ctx.beginPath(); ctx.moveTo(-20, h * 0.72);
    for (let i = 0; i <= 8; i++) ctx.lineTo((i / 8) * (w + 40) - 20, h * 0.62 + Math.sin(i * 1.3) * h * 0.06);
    ctx.lineTo(w + 20, h + 20); ctx.lineTo(-20, h + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(p.accent2, 0.7);
    ctx.beginPath(); ctx.arc(w * 0.72, h * 0.34, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(235,250,255,0.28)'; ctx.lineWidth = 1;
    ctx.strokeRect(w * 0.08, h * 0.1, w * 0.84, h * 0.8);
    ctx.fillStyle = 'rgba(255,70,90,0.9)';
    ctx.beginPath(); ctx.arc(w * 0.1, h * 0.08, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(235,250,255,0.65)';
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText('REC  ' + (t * 10).toFixed(1).padStart(6, '0'), w * 0.115, h * 0.085);
    ctx.fillText('24 FPS · 1/50 · ISO 800', w * 0.76, h * 0.885);
  });
}
