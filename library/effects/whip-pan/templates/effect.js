import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


function sceneA(g, w, h, p, t) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, p.bg); grad.addColorStop(0.6, rgba(p.accent, 0.55)); grad.addColorStop(1, rgba('#0a1018', 0.95));
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  g.strokeStyle = rgba('#ffffff', 0.18); g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = h * (0.2 + i * 0.12) + Math.sin(t + i) * 4;
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
}
function sceneB(g, w, h, p, t) {
  const grad = g.createLinearGradient(w, 0, 0, h);
  grad.addColorStop(0, p.bg); grad.addColorStop(0.5, rgba(p.accent2, 0.6)); grad.addColorStop(1, rgba('#160c08', 0.95));
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    g.fillStyle = rgba('#ffffff', 0.04 + (i % 3) * 0.02);
    g.beginPath(); g.arc(w * (0.18 + (i % 4) * 0.2), h * (0.2 + (i % 5) * 0.14), 24 + i * 5, 0, Math.PI * 2); g.fill();
  }
}

export const defaults = config;

/** Barrido lateral con estelas direccionales entre dos escenas; el movimiento tapa el corte en lugar de ocultarlo. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cyc = (t * 0.25 * p.speed) % 1;
    const k = clamp((cyc - 0.35) / 0.3);
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    if (!state.ga) {
      state.ga = document.createElement('canvas'); state.gb = document.createElement('canvas');
      state.gactx = state.ga.getContext('2d'); state.gbctx = state.gb.getContext('2d');
    }
    if (state.gw !== w || state.gh !== h) {
      state.ga.width = state.gb.width = Math.round(w); state.ga.height = state.gb.height = Math.round(h);
      state.gw = w; state.gh = h;
    }
    sceneA(state.gactx, w, h, p, t); sceneB(state.gbctx, w, h, p, t);
    const xoff = ease * w;
    ctx.drawImage(state.ga, -xoff, 0, w, h);
    ctx.drawImage(state.ga, w - xoff, 0, w, h);
    ctx.save();
    ctx.globalAlpha = clamp(ease * 1.4);
    ctx.drawImage(state.gb, w - xoff, 0, w, h);
    ctx.drawImage(state.gb, -xoff, 0, w, h);
    ctx.restore();
    const dir = ease > 0 && ease < 1 ? 1 : 0;
    if (dir) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const sx = (w - xoff) + (i / 14) * w * 0.3;
        ctx.fillStyle = rgba(i % 2 ? p.accent : '#ffffff', 0.05);
        ctx.fillRect(sx, 0, 2 + (i % 4) * 3, h);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  });
}
