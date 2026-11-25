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

/** Transición por zoom radial con anillos repetidos y desenfoque direccional simulado; energía de lente. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cyc = (t * 0.24 * p.speed) % 1;
    const k = clamp((cyc - 0.4) / 0.32);
    const ease = k * k * (3 - 2 * k);
    if (!state.ga) {
      state.ga = document.createElement('canvas'); state.gb = document.createElement('canvas');
      state.gactx = state.ga.getContext('2d'); state.gbctx = state.gb.getContext('2d');
    }
    if (state.gw !== w || state.gh !== h) {
      state.ga.width = state.gb.width = Math.round(w); state.ga.height = state.gb.height = Math.round(h);
      state.gw = w; state.gh = h;
    }
    sceneA(state.gactx, w, h, p, t); sceneB(state.gbctx, w, h, p, t);
    const cx = w / 2, cy = h / 2;
    for (let i = 6; i >= 0; i--) {
      const scale = 1 - i * 0.035 - (1 - ease) * 0.06 + ease * 0.12;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
      ctx.globalAlpha = i === 0 ? 1 : 0.12 + (6 - i) * 0.02;
      ctx.drawImage(ease > 0.5 ? state.gb : state.ga, 0, 0, w, h);
      if (ease > 0.2) { ctx.globalAlpha = (ease - 0.2) * 0.3; ctx.drawImage(state.gb, 0, 0, w, h); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const flash = Math.sin(ease * Math.PI) * 0.35;
    ctx.fillStyle = rgba('#ffffff', flash); ctx.fillRect(0, 0, w, h);
  });
}
