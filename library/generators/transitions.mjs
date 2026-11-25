import { COMMON, color, num } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

const sceneA = `
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
`;

export const helpers = sceneA;

export const effects = [
  {
    id: 'glitch-slices',
    name: 'Glitch Slices',
    category: 'transiciones',
    summary: 'Corte por franjas desplazadas entre dos escenas, con saltos de canal y pausas limpias; no un glitch continuo.',
    tags: ['transicion', 'glitch', 'corte', 'franjas', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cyc = (t * 0.28 * p.speed) % 1;
    const transition = cyc > 0.55 && cyc < 0.82;
    const k = clamp((cyc - 0.55) / 0.27);
    if (!state.ga) {
      state.ga = document.createElement('canvas'); state.gb = document.createElement('canvas');
      state.gactx = state.ga.getContext('2d'); state.gbctx = state.gb.getContext('2d');
    }
    if (state.gw !== w || state.gh !== h) {
      state.ga.width = state.gb.width = Math.round(w); state.ga.height = state.gb.height = Math.round(h);
      state.gw = w; state.gh = h;
    }
    sceneA(state.gactx, w, h, p, t); sceneB(state.gbctx, w, h, p, t);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const y = (i / n) * h;
      const rowH = h / n + 1;
      const shift = transition ? (noise2(i * 3.3, Math.floor(t * 14), 9) - 0.5) * w * 0.16 * (1 - k) : 0;
      const useB = transition && (noise2(i * 8.7, Math.floor(t * 9), 2) * 0.55 + k * 0.65 > 0.55);
      ctx.drawImage(useB ? state.gb : state.ga, 0, y, w, rowH, shift, y, w, rowH);
    }
    if (transition) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba('#ff2d55', 0.16);
      ctx.fillRect(-6, 0, w, h);
      ctx.fillStyle = rgba(p.accent, 0.14);
      ctx.fillRect(6, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    `,
    params: base([num('intensity', 0.8, 'Fuerza del desplazamiento', 0.2, 1.5, 0.05)]),
  },
  {
    id: 'whip-pan',
    name: 'Whip Pan',
    category: 'transiciones',
    summary: 'Barrido lateral con estelas direccionales entre dos escenas; el movimiento tapa el corte en lugar de ocultarlo.',
    tags: ['transicion', 'barrido', 'movimiento', 'cine', 'canvas'],
    draw: `
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
    `,
    params: base([num('intensity', 0.8, 'Fuerza del barrido', 0.2, 1.5, 0.05)]),
  },
  {
    id: 'zoom-blur',
    name: 'Zoom Blur',
    category: 'transiciones',
    summary: 'Transición por zoom radial con anillos repetidos y desenfoque direccional simulado; energía de lente.',
    tags: ['transicion', 'zoom', 'desenfoque', 'cine', 'canvas'],
    draw: `
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
    `,
    params: base([num('intensity', 0.8, 'Fuerza del zoom', 0.2, 1.5, 0.05)]),
  },
  {
    id: 'iris-wipe',
    name: 'Iris Wipe',
    category: 'transiciones',
    summary: 'Apertura de iris circular con borde suave y halo; transición clásica sin fundido plano.',
    tags: ['transicion', 'iris', 'circulo', 'cine', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cyc = (t * 0.23 * p.speed) % 1;
    const k = clamp((cyc - 0.35) / 0.3);
    if (!state.ga) {
      state.ga = document.createElement('canvas'); state.gb = document.createElement('canvas');
      state.gactx = state.ga.getContext('2d'); state.gbctx = state.gb.getContext('2d');
    }
    if (state.gw !== w || state.gh !== h) {
      state.ga.width = state.gb.width = Math.round(w); state.ga.height = state.gb.height = Math.round(h);
      state.gw = w; state.gh = h;
    }
    sceneB(state.gactx, w, h, p, t); sceneA(state.gbctx, w, h, p, t);
    ctx.drawImage(state.ga, 0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.48;
    const radius = Math.max(w, h) * 0.78 * (k * 1.08 - 0.04);
    if (radius > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(state.gb, 0, 0, w, h);
      ctx.restore();
      ctx.strokeStyle = rgba('#ffffff', 0.4 + Math.sin(k * Math.PI) * 0.4);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba(p.accent, 0.25); ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2); ctx.stroke();
    }
    `,
    params: base([num('softness', 0.4, 'Suavidad del borde', 0, 1, 0.05)]),
  },
  {
    id: 'dissolve-grain',
    name: 'Dissolve Grain',
    category: 'transiciones',
    summary: 'Disolución por umbral de grano, calculada en bloques; el ruido controla qué escena sobrevive.',
    tags: ['transicion', 'disolucion', 'grano', 'ruido', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cyc = (t * 0.22 * p.speed) % 1;
    const k = clamp((cyc - 0.3) / 0.36);
    if (!state.ga) {
      state.ga = document.createElement('canvas'); state.gb = document.createElement('canvas');
      state.gactx = state.ga.getContext('2d'); state.gbctx = state.gb.getContext('2d');
    }
    if (state.gw !== w || state.gh !== h) {
      state.ga.width = state.gb.width = Math.round(w); state.ga.height = state.gb.height = Math.round(h);
      state.gw = w; state.gh = h;
    }
    sceneA(state.gactx, w, h, p, t); sceneB(state.gbctx, w, h, p, t);
    const cell = Math.max(3, Math.round(p.grain));
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const n = noise2(x * 0.07, y * 0.07, 13);
        const useB = n < k;
        ctx.drawImage(useB ? state.gb : state.ga, x, y, cell, cell, x, y, cell + 1, cell + 1);
      }
    }
    if (k > 0.1 && k < 0.9) {
      const rnd = mulberry32(Math.floor(t * 30));
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 80; i++) ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
    }
    `,
    params: base([num('grain', 6, 'Tamaño del bloque de disolución', 2, 18)]),
  },
];
