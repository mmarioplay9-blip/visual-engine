import { COMMON, color, num } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'dust-motes',
    name: 'Dust Motes',
    category: 'particulas',
    summary: 'Motas de polvo con deriva sinusoidal, profundidad simulada y halos suaves; atmósfera de interior cinematográfico.',
    tags: ['particulas', 'polvo', 'atmosfera', 'bokeh', 'canvas'],
    draw: `
    const n = Math.round(clamp(p.count, 20, 240));
    if (!state.motes || state.motes.length !== n) {
      const rnd = mulberry32(7);
      state.motes = Array.from({ length: n }, () => ({
        x: rnd(), y: rnd(), z: 0.25 + rnd() * 0.75,
        a: rnd() * Math.PI * 2, v: 0.4 + rnd() * 0.8,
      }));
    }
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, p.bg); bg.addColorStop(1, rgba(p.accent, 0.08));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const m of state.motes) {
      const x = (m.x + Math.sin(t * 0.13 * m.v + m.a) * 0.06 + t * 0.003 * m.v + 1) % 1;
      const y = (m.y - t * 0.007 * m.v + Math.cos(t * 0.11 + m.a) * 0.02 + 1) % 1;
      const r = (1.2 + m.z * p.size) * (0.8 + Math.sin(t * 0.7 + m.a) * 0.2);
      const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * 4);
      const col = m.z > 0.72 ? p.accent2 : p.accent;
      g.addColorStop(0, rgba(col, 0.5 * m.z));
      g.addColorStop(0.35, rgba(col, 0.16 * m.z));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x * w, y * h, r * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('count', 110, 'Número de motas', 20, 240), num('size', 2.4, 'Tamaño base en px', 0.5, 8, 0.1)]),
  },
  {
    id: 'starfield-warp',
    name: 'Starfield Warp',
    category: 'particulas',
    summary: 'Estrellas en fuga radial con estelas de velocidad y núcleo luminoso; salto al hiperespacio controlable.',
    tags: ['particulas', 'estrellas', 'warp', 'espacio', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    if (!state.stars) {
      const rnd = mulberry32(31);
      state.stars = Array.from({ length: 360 }, () => ({ a: rnd() * Math.PI * 2, r: rnd(), z: 0.2 + rnd() }));
    }
    ctx.globalCompositeOperation = 'lighter';
    const k = p.speed * 0.16;
    for (const s of state.stars) {
      const r = (s.r + t * k * s.z) % 1;
      const r2 = Math.max(0, r - 0.018 * s.z - (pointer.down ? 0.05 : 0));
      const x1 = cx + Math.cos(s.a) * r * w * 0.65;
      const y1 = cy + Math.sin(s.a) * r * h * 0.65;
      const x2 = cx + Math.cos(s.a) * r2 * w * 0.65;
      const y2 = cy + Math.sin(s.a) * r2 * h * 0.65;
      ctx.strokeStyle = rgba(s.z > 0.75 ? p.accent2 : p.accent, 0.15 + r * 0.7);
      ctx.lineWidth = 0.6 + r * 2.2;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.3);
    core.addColorStop(0, rgba(p.accent, 0.3)); core.addColorStop(0.12, rgba(p.accent, 0.1)); core.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('count', 360, 'Cantidad de estrellas (referencia visual)', 120, 700)]),
  },
  {
    id: 'ember-sparks',
    name: 'Ember Sparks',
    category: 'particulas',
    summary: 'Brasas ascendentes con parpadeo térmico, estelas y cambio de naranja a blanco; atmósfera de fragua.',
    tags: ['particulas', 'fuego', 'brasas', 'calor', 'canvas'],
    draw: `
    const g = ctx.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h * 1.1, h * 0.9);
    g.addColorStop(0, rgba(p.accent2, 0.22)); g.addColorStop(0.55, rgba(p.bg, 0.9)); g.addColorStop(1, p.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (!state.sparks) {
      const rnd = mulberry32(52);
      state.sparks = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), v: 0.3 + rnd(), s: 0.4 + rnd(), w: rnd() * 6.28 }));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const s of state.sparks) {
      const life = (s.y - t * 0.045 * s.v * p.speed + 2) % 1;
      const x = (s.x + Math.sin(t * 0.8 + s.w) * 0.035 + Math.cos(t * 0.31 + s.w * 2) * 0.02) * w;
      const y = life * h;
      const heat = clamp(1 - life * 1.25);
      const col = heat > 0.58 ? p.accent2 : heat > 0.28 ? '#ff7a3d' : p.accent;
      const r = (1 + s.s * 3) * (0.4 + heat);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      rg.addColorStop(0, rgba('#fff2d0', 0.85 * heat));
      rg.addColorStop(0.22, rgba(col, 0.65 * heat));
      rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.16 * heat);
      ctx.lineWidth = Math.max(0.5, r * 0.45);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 3, y + 12 * heat, x - 1, y + 26 * heat); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('count', 90, 'Cantidad de brasas (referencia visual)', 20, 160)]),
  },
  {
    id: 'rain-veil',
    name: 'Rain Veil',
    category: 'particulas',
    summary: 'Lluvia fina con inclinación, estelas variables y ondas al pie; capa de clima sin texturas externas.',
    tags: ['particulas', 'lluvia', 'clima', 'agua', 'canvas'],
    draw: `
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.bg); sky.addColorStop(1, rgba(p.accent, 0.13));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    if (!state.drops) {
      const rnd = mulberry32(91);
      state.drops = Array.from({ length: 240 }, () => ({ x: rnd(), y: rnd(), v: 0.7 + rnd() * 1.6, l: 0.01 + rnd() * 0.05, a: 0.15 + rnd() * 0.5 }));
    }
    const slant = 0.08 + (pointer.x - 0.5) * 0.12;
    ctx.lineCap = 'round';
    for (const d of state.drops) {
      const y = (d.y + t * 0.28 * d.v * p.speed) % 1.05;
      const x = (d.x - y * slant + 2) % 1;
      ctx.strokeStyle = rgba(p.accent, d.a * 0.55);
      ctx.lineWidth = 0.5 + d.v * 0.7;
      ctx.beginPath();
      ctx.moveTo(x * w, y * h);
      ctx.lineTo((x + slant * d.l * 6) * w, (y - d.l) * h);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(p.accent2, 0.14);
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = (i / 9 + Math.sin(t * 0.7 + i) * 0.01) * w;
      const y = h * (0.92 + Math.sin(t * 1.1 + i) * 0.005);
      ctx.beginPath(); ctx.ellipse(x, y, 18 + i * 2, 3 + (i % 3), 0, 0, Math.PI * 2); ctx.stroke();
    }
    `,
    params: base([num('density', 240, 'Densidad de gotas (referencia visual)', 60, 420)]),
  },
  {
    id: 'bokeh-drift',
    name: 'Bokeh Drift',
    category: 'particulas',
    summary: 'Discos desenfocados de gran formato que se cruzan con mezcla aditiva; profundidad de campo abstracta.',
    tags: ['particulas', 'bokeh', 'desenfoque', 'profundidad', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    if (!state.bokeh) {
      const rnd = mulberry32(113);
      state.bokeh = Array.from({ length: 28 }, () => ({ x: rnd(), y: rnd(), r: 0.04 + rnd() * 0.16, v: 0.1 + rnd() * 0.5, hue: rnd() }));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.bokeh) {
      const x = (b.x + Math.sin(t * 0.08 * b.v + b.r * 20) * 0.12 + 1) % 1;
      const y = (b.y - t * 0.012 * b.v + 1) % 1;
      const rad = b.r * Math.min(w, h) * (1 + Math.sin(t * 0.3 + b.x * 9) * 0.06);
      const g = ctx.createRadialGradient(x * w, y * h, rad * 0.1, x * w, y * h, rad);
      const col = b.hue > 0.68 ? p.accent2 : p.accent;
      g.addColorStop(0, rgba(col, 0.16));
      g.addColorStop(0.55, rgba(col, 0.08));
      g.addColorStop(0.82, rgba(col, 0.12));
      g.addColorStop(0.9, rgba(col, 0.03));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x * w, y * h, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('count', 28, 'Cantidad de discos (referencia visual)', 8, 48)]),
  },
];
