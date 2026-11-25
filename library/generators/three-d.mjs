import { COMMON, num, text } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'wireframe-globe',
    name: 'Wireframe Globe',
    category: '3d',
    summary: 'Globo de alambre con rotación 3D, meridianos y paralelos; proyección propia sin dependencias.',
    tags: ['3d', 'globo', 'wireframe', 'proyeccion', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.32;
    const ry = t * 0.22 * p.speed, rx = -0.32;
    const project = (x, y, z) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      const s = 1 / (2.4 - z2 * 0.55);
      return [cx + x1 * R * s, cy + y1 * R * s, z2];
    };
    ctx.globalCompositeOperation = 'lighter';
    for (let lat = -80; lat <= 80; lat += 20) {
      const phi = (lat * Math.PI) / 180;
      ctx.beginPath();
      for (let lon = 0; lon <= 360; lon += 6) {
        const th = (lon * Math.PI) / 180;
        const [x, y, z] = project(Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th));
        if (lon === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(Math.abs(lat) % 40 === 0 ? p.accent2 : p.accent, 0.3);
      ctx.lineWidth = 1; ctx.stroke();
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const th = (lon * Math.PI) / 180;
      ctx.beginPath();
      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (lat * Math.PI) / 180;
        const [x, y] = project(Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th));
        if (lat === -90) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(p.accent, 0.18); ctx.lineWidth = 1; ctx.stroke();
    }
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    glow.addColorStop(0, rgba(p.accent, 0.12)); glow.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#eafcff', 0.4);
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText(p.label, 20, h - 20);
    `,
    params: base([text('label', 'ORBITAL / 3D', 'Etiqueta inferior')]),
  },
  {
    id: 'torus-knot',
    name: 'Torus Knot',
    category: '3d',
    summary: 'Nudo toroidal paramétrico con 720 segmentos, giro 3D y brillo aditivo; geometría matemática pura.',
    tags: ['3d', 'nudo', 'toro', 'parametrico', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5, scale = Math.min(w, h) * 0.23;
    const ry = t * 0.24 * p.speed, rx = 0.4 + Math.sin(t * 0.2) * 0.1;
    const p1 = 2, p2 = 3;
    const project = (x, y, z) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      const s = 1.7 / (2.7 - z2 * 0.7);
      return [cx + x1 * scale * s, cy + y1 * scale * s, z2];
    };
    const pts = [];
    const N = 360;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * Math.PI * 2;
      const q = 2 + Math.cos(p2 * u);
      const x = q * Math.cos(p1 * u), y = q * Math.sin(p1 * u), z = Math.sin(p2 * u) * 1.4;
      pts.push(project(x, y + Math.sin(u * 3) * 0.15, z));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const depth = (a[2] + 1) / 2;
      ctx.strokeStyle = rgba(i % 30 === 0 ? p.accent2 : p.accent, 0.12 + depth * 0.45);
      ctx.lineWidth = 0.7 + depth * 1.8;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#eafcff', 0.35);
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText('p=2  q=3  ·  ' + N + ' segmentos', 20, h - 20);
    `,
    params: base([num('segments', 360, 'Segmentos (referencia visual)', 120, 720)]),
  },
  {
    id: 'cube-field',
    name: 'Cube Field',
    category: '3d',
    summary: 'Campo de cubos 3D con caras translúcidas y orden de profundidad; rejilla espacial en rotación.',
    tags: ['3d', 'cubos', 'campo', 'volumen', 'canvas'],
    draw: `
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
    ctx.fillText('27 cubos · painter\\'s algorithm', 20, h - 20);
    `,
    params: base([num('speed', 1, 'Velocidad de rotación', 0, 3, 0.05)]),
  },
  {
    id: 'terrain-grid',
    name: 'Terrain Grid',
    category: '3d',
    summary: 'Terreno wireframe en perspectiva con ruido fractal y cámara en vuelo; horizonte y niebla por profundidad.',
    tags: ['3d', 'terreno', 'grid', 'paisaje', 'canvas'],
    draw: `
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.bg); sky.addColorStop(0.6, rgba(p.accent, 0.12)); sky.addColorStop(1, p.bg);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    const cols = 26, rows = 22;
    const camZ = t * 0.55 * p.speed;
    const project = (x, y, z) => {
      const dist = z + 2.2;
      const s = 1.8 / Math.max(0.25, dist);
      return [w * 0.5 + x * s * w * 0.55, h * 0.62 - y * s * h * 0.5 + (1 - s) * h * 0.18, s];
    };
    const pts = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) - 0.5) * 9;
        const z = (r / (rows - 1)) * 9 + camZ;
        const hgt = (fbm(x * 0.3 + camZ * 0.12, z * 0.3, 4, 12) - 0.5) * 2.3 + Math.sin(z * 0.9 + x * 0.4) * 0.12;
        row.push(project(x, hgt, z));
      }
      pts.push(row);
    }
    ctx.strokeStyle = rgba(p.accent, 0.2); ctx.lineWidth = 1;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.beginPath(); ctx.moveTo(pts[r][c][0], pts[r][c][1]); ctx.lineTo(pts[r + 1][c][0], pts[r + 1][c][1]); ctx.stroke();
      }
    }
    for (let r = 0; r < rows; r++) {
      ctx.strokeStyle = rgba(p.accent, 0.08 + (r / rows) * 0.22);
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        if (c === 0) ctx.moveTo(pts[r][c][0], pts[r][c][1]); else ctx.lineTo(pts[r][c][0], pts[r][c][1]);
      }
      ctx.stroke();
    }
    ctx.fillStyle = rgba(p.accent2, 0.5);
    for (let c = 0; c < cols; c += 4) {
      if (pts[rows - 2][c][2] > 0.5) { ctx.beginPath(); ctx.arc(pts[rows - 2][c][0], pts[rows - 2][c][1], 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = rgba('#eafcff', 0.32);
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText('TERRAIN · fbm · z ' + camZ.toFixed(1), 20, h - 20);
    `,
    params: base([num('speed', 1, 'Velocidad de vuelo', 0, 3, 0.05), num('density', 26, 'Resolución de la retícula (referencia visual)', 12, 40)]),
  },
];
