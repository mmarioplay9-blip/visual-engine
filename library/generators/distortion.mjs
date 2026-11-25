import { COMMON, num } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'ripple-glass',
    name: 'Ripple Glass',
    category: 'distorsion',
    summary: 'Refracción ondulante por franjas verticales sobre una escena de color; el puntero desplaza el centro de la onda.',
    tags: ['distorsion', 'refraccion', 'onda', 'cristal', 'canvas'],
    draw: `
    if (!state.base || state.bw !== w || state.bh !== h) {
      const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
      const g = c.getContext('2d');
      g.fillStyle = p.bg; g.fillRect(0, 0, w, h);
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, rgba(p.accent, 0.55)); grad.addColorStop(0.5, rgba('#0a1420', 0.8)); grad.addColorStop(1, rgba(p.accent2, 0.55));
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = rgba(i % 2 ? p.accent2 : p.accent, 0.28); g.lineWidth = 1 + (i % 3);
        g.beginPath(); g.moveTo((i / 9) * w, 0); g.lineTo((i / 9) * w + h * 0.35, h); g.stroke();
      }
      for (let i = 0; i < 6; i++) {
        g.fillStyle = rgba('#ffffff', 0.05 + i * 0.012);
        g.fillRect(0, (i / 6) * h, w, h / 18);
      }
      state.base = c; state.bw = w; state.bh = h;
    }
    const cx = pointer.active ? pointer.x : 0.62;
    const slices = 96;
    const slice = w / slices;
    for (let i = 0; i < slices; i++) {
      const u = i / slices;
      const d = Math.hypot(u - cx, 0.45 - pointer.y);
      const off = Math.sin(u * 34 * Math.PI + t * 1.5 * p.speed + d * 8) * (2 + p.amplitude * 10) * (0.35 + d);
      ctx.drawImage(state.base, i * (state.bw / slices), 0, state.bw / slices, state.bh, i * slice + off, 0, slice + 1, h);
    }
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.06)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0.14)'); sheen.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = sheen; ctx.fillRect(0, 0, w, h);
    `,
    params: base([num('amplitude', 0.5, 'Amplitud de la onda', 0.05, 1.5, 0.05)]),
  },
  {
    id: 'vortex-twist',
    name: 'Vortex Twist',
    category: 'distorsion',
    summary: 'Vórtice de trazos y partículas que se enroscan hacia el centro con torsión variable y estelas de color.',
    tags: ['distorsion', 'vortice', 'fluido', 'torsion', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 150; i++) {
      const seed = i * 12.9898;
      const baseA = (seed % 6.283) + t * 0.22 * p.speed;
      const radius = (0.05 + ((i * 37) % 100) / 100 * 0.62) * Math.min(w, h);
      const twist = p.twist * (1 - radius / (Math.min(w, h) * 0.75));
      const a = baseA + twist * 2.4;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius * 0.72;
      const prevA = a - 0.08;
      const px = cx + Math.cos(prevA) * radius * 0.96;
      const py = cy + Math.sin(prevA) * radius * 0.72 * 0.96;
      ctx.strokeStyle = rgba(i % 7 === 0 ? p.accent2 : p.accent, 0.1 + (i % 9) * 0.03);
      ctx.lineWidth = 0.6 + (i % 4) * 0.6;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(cx + Math.cos(a - 0.04) * radius * 1.08, cy + Math.sin(a - 0.04) * radius * 0.72 * 1.08, x, y); ctx.stroke();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.2);
    core.addColorStop(0, 'rgba(255,255,255,0.9)'); core.addColorStop(0.15, rgba(p.accent, 0.4)); core.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('twist', 0.7, 'Torsión del vórtice', -1.5, 1.5, 0.05)]),
  },
  {
    id: 'ink-diffusion',
    name: 'Ink Diffusion',
    category: 'distorsion',
    summary: 'Manchas de tinta que se expanden con ruido fractal y bordes de color; fluido orgánico calculado en baja resolución.',
    tags: ['distorsion', 'tinta', 'fluido', 'fbm', 'canvas'],
    draw: `
    const lw = 160, lh = 90;
    if (!state.ink || state.ink.width !== lw) {
      const c = document.createElement('canvas'); c.width = lw; c.height = lh; state.ink = c;
      state.inkCtx = c.getContext('2d'); state.img = state.inkCtx.createImageData(lw, lh);
    }
    const img = state.img;
    const [ar, ag, ab] = hexToRgb(p.accent);
    const [br, bgc, bb] = hexToRgb(p.accent2);
    const [gr, gg, gb] = hexToRgb(p.bg);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const u = x / lw, v = y / lh;
        const n = fbm(u * 4 + Math.sin(t * 0.1) * 0.2, v * 4 - t * 0.05, 4, 3);
        const blob = Math.max(0, n - (0.47 - p.spread * 0.18));
        const edge = Math.pow(blob * 4.2, 2.2);
        const idx = (y * lw + x) * 4;
        const mix = clamp(edge * 1.8);
        img.data[idx] = Math.round((gr + (ar - gr) * mix + br * Math.pow(edge, 4)) * 255);
        img.data[idx + 1] = Math.round((gg + (ag - gg) * mix + bgc * Math.pow(edge, 4)) * 255);
        img.data[idx + 2] = Math.round((gb + (ab - gb) * mix + bb * Math.pow(edge, 4)) * 255);
        img.data[idx + 3] = 255;
      }
    }
    state.inkCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(state.ink, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.min(w, h) * 0.45);
    glow.addColorStop(0, rgba(p.accent, 0.1)); glow.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('spread', 0.55, 'Expansión de la tinta', 0.1, 1.2, 0.05)]),
  },
  {
    id: 'displacement-grid',
    name: 'Displacement Grid',
    category: 'distorsion',
    summary: 'Retícula de puntos desplazada por un campo de ruido viajero; ondas de densidad legibles y precisas.',
    tags: ['distorsion', 'retícula', 'particulas', 'campo', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const gap = Math.max(12, p.gap);
    const cols = Math.ceil(w / gap) + 2, rows = Math.ceil(h / gap) + 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = x / cols, v = y / rows;
        const n = fbm(u * 5 + t * 0.12 * p.speed, v * 5 - t * 0.08, 3, 8);
        const dx = Math.sin(n * 8 + t) * gap * 0.8;
        const dy = Math.cos(n * 8 + t * 1.2) * gap * 0.8;
        const r = 0.7 + n * p.dot * 2.4;
        ctx.fillStyle = rgba(n > 0.58 ? p.accent2 : p.accent, 0.12 + n * 0.6);
        ctx.beginPath(); ctx.arc(x * gap + dx, y * gap + dy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    `,
    params: base([num('gap', 26, 'Separación de la retícula', 10, 60), num('dot', 1.4, 'Tamaño de punto', 0.2, 4, 0.1)]),
  },
];
