import { COMMON, num } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'mesh-gradient',
    name: 'Mesh Gradient',
    category: 'fondos',
    summary: 'Malla de gradientes que respira con cuatro focos de color y grano fino; fondo premium sin imágenes.',
    tags: ['fondo', 'gradiente', 'mesh', 'premium', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const blobs = [
      [0.22 + Math.sin(t * 0.17) * 0.08, 0.28 + Math.cos(t * 0.13) * 0.07, 0.55, p.accent],
      [0.76 + Math.cos(t * 0.11) * 0.07, 0.24 + Math.sin(t * 0.19) * 0.06, 0.5, p.accent2],
      [0.58 + Math.sin(t * 0.09 + 2) * 0.1, 0.8 + Math.cos(t * 0.12) * 0.05, 0.62, p.accent],
      [0.1 + Math.cos(t * 0.07) * 0.05, 0.86 + Math.sin(t * 0.15) * 0.05, 0.4, p.accent2],
    ];
    for (const [x, y, r, col] of blobs) {
      const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h));
      g.addColorStop(0, rgba(col, 0.34)); g.addColorStop(0.4, rgba(col, 0.09)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
    const rnd = mulberry32(61);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.01 + rnd() * 0.025) + ')';
      ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
    }
    `,
    params: base([num('grain', 1600, 'Cantidad de grano (referencia visual)', 0, 3000)]),
  },
  {
    id: 'dot-matrix',
    name: 'Dot Matrix',
    category: 'fondos',
    summary: 'Matriz de puntos con ondas de luminancia, halos y desplazamiento diagonal; textura técnica serena.',
    tags: ['fondo', 'puntos', 'matriz', 'onda', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const gap = Math.max(10, p.gap);
    const cols = Math.ceil(w / gap) + 2, rows = Math.ceil(h / gap) + 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = x / cols, v = y / rows;
        const wave = 0.5 + 0.5 * Math.sin((u * 6 + v * 4 + t * 0.5 * p.speed) * Math.PI);
        const halo = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 1.8);
        const a = 0.06 + wave * halo * 0.55;
        const r = 0.6 + wave * 1.9;
        ctx.fillStyle = rgba(wave > 0.82 ? p.accent2 : p.accent, a);
        ctx.beginPath(); ctx.arc(x * gap, y * gap + Math.sin(t * 0.4 + x * 0.2) * 2, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    `,
    params: base([num('gap', 22, 'Separación de puntos', 10, 48)]),
  },
  {
    id: 'circuit-lines',
    name: 'Circuit Lines',
    category: 'fondos',
    summary: 'Trazas ortogonales que crecen por la retícula con pulsos de energía y nodos; fondo de sistema vivo.',
    tags: ['fondo', 'circuito', 'lineas', 'tecnologia', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const grid = Math.max(24, p.gap);
    ctx.strokeStyle = rgba(p.accent, 0.08); ctx.lineWidth = 1;
    for (let x = 0; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (!state.paths) {
      const rnd = mulberry32(71);
      state.paths = Array.from({ length: 26 }, () => {
        const pts = [[Math.floor(rnd() * (w / grid)) * grid, Math.floor(rnd() * (h / grid)) * grid]];
        for (let i = 0; i < 4; i++) {
          const last = pts[pts.length - 1];
          const horiz = i % 2 === 0;
          pts.push(horiz ? [last[0] + (rnd() > 0.5 ? 1 : -1) * grid * (2 + Math.floor(rnd() * 5)), last[1]] : [last[0], last[1] + (rnd() > 0.5 ? 1 : -1) * grid * (2 + Math.floor(rnd() * 4))]);
        }
        return pts;
      });
    }
    for (let i = 0; i < state.paths.length; i++) {
      const pts = state.paths[i];
      ctx.strokeStyle = rgba(i % 4 === 0 ? p.accent2 : p.accent, 0.18 + (i % 3) * 0.07);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
      const total = Math.max(1, pts.length - 1);
      const k = (t * 0.18 * (0.5 + (i % 5) * 0.2) + i * 0.13) % 1;
      const rawSeg = Number.isFinite(k) ? Math.floor(k * total) : 0;
      const seg = Math.max(0, Math.min(total - 1, rawSeg));
      const local = Math.max(0, Math.min(1, k * total - seg));
      const p0 = pts[seg] ?? pts[0];
      const p1 = pts[seg + 1] ?? p0;
      const x = p0[0] + (p1[0] - p0[0]) * local;
      const y = p0[1] + (p1[1] - p0[1]) * local;
      ctx.fillStyle = rgba(p.accent, 0.9);
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(p.accent, 0.15);
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    }
    `,
    params: base([num('gap', 32, 'Tamaño de la retícula', 20, 64)]),
  },
  {
    id: 'wave-contours',
    name: 'Wave Contours',
    category: 'fondos',
    summary: 'Curvas de nivel topográficas desplazadas por ruido; terreno abstracto con lectura de profundidad.',
    tags: ['fondo', 'contornos', 'topografia', 'ruido', 'canvas'],
    draw: `
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, p.bg); g.addColorStop(1, rgba(p.accent, 0.12));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const lines = Math.round(p.lines);
    for (let i = 0; i < lines; i++) {
      const baseY = (i / lines) * h;
      const amp = (9 + Math.sin(i * 0.7) * 6) * (1 + p.depth * 0.8);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const n = fbm(x * 0.005 + t * 0.06, i * 0.23 - t * 0.02, 3, 4);
        const y = baseY + (n - 0.5) * amp * 3 + Math.sin(x * 0.01 + t * 0.4 + i) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(i % 6 === 0 ? p.accent2 : p.accent, 0.1 + (i / lines) * 0.3);
      ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.7;
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(w * 0.65, h * 0.35, 0, w * 0.65, h * 0.35, w * 0.5);
    glow.addColorStop(0, rgba(p.accent2, 0.12)); glow.addColorStop(1, rgba(p.accent2, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    `,
    params: base([num('lines', 44, 'Número de curvas', 12, 90), num('depth', 0.6, 'Amplitud del terreno', 0, 1.5, 0.05)]),
  },
];
