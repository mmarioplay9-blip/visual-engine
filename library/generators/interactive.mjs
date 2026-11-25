import { COMMON, num, text } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'cursor-spotlight',
    name: 'Cursor Spotlight',
    category: 'interactivos',
    summary: 'Foco de luz que sigue al puntero, con partículas atraídas y caída suave; iluminación interactiva real.',
    tags: ['interactivo', 'puntero', 'foco', 'particulas', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const px = (pointer.active ? pointer.x : 0.55 + Math.sin(t * 0.4) * 0.08) * w;
    const py = (pointer.active ? pointer.y : 0.45 + Math.cos(t * 0.33) * 0.06) * h;
    if (!state.parts) {
      const rnd = mulberry32(81);
      state.parts = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), s: 0.4 + rnd() }));
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const q of state.parts) {
      const dx = px - q.x * w, dy = py - q.y * h;
      const d = Math.hypot(dx, dy);
      const pull = pointer.active ? Math.min(26, 900 / Math.max(30, d)) : 0;
      const x = q.x * w + (dx / Math.max(1, d)) * pull;
      const y = q.y * h + (dy / Math.max(1, d)) * pull;
      ctx.fillStyle = rgba(q.s > 0.7 ? p.accent2 : p.accent, 0.15 + q.s * 0.5);
      ctx.beginPath(); ctx.arc(x, y, 0.7 + q.s * 2, 0, Math.PI * 2); ctx.fill();
    }
    const spot = ctx.createRadialGradient(px, py, 0, px, py, Math.min(w, h) * 0.45);
    spot.addColorStop(0, rgba(p.accent, 0.26)); spot.addColorStop(0.25, rgba(p.accent, 0.1)); spot.addColorStop(1, rgba(p.bg, 0.94));
    ctx.fillStyle = spot; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba(p.accent, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 18 + Math.sin(t * 2) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rgba('#dffcff', 0.7);
    ctx.font = '500 11px ui-monospace, monospace';
    ctx.fillText('x ' + Math.round(px) + '  y ' + Math.round(py), px + 26, py + 4);
    `,
    params: base([num('radius', 0.45, 'Radio del foco', 0.15, 0.8, 0.05)]),
  },
  {
    id: 'magnetic-button',
    name: 'Magnetic Button',
    category: 'interactivos',
    summary: 'Botón que se inclina y desplaza hacia el puntero con retorno elástico y halo de energía.',
    tags: ['interactivo', 'boton', 'magnetico', 'microinteraccion', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const bw = Math.min(280, w * 0.42), bh = 62;
    const cx = w * 0.5, cy = h * 0.5;
    const mx = pointer.active ? (pointer.x - 0.5) * 60 : Math.sin(t * 0.8) * 22;
    const my = pointer.active ? (pointer.y - 0.5) * 30 : Math.cos(t * 0.6) * 8;
    const x = cx - bw / 2 + mx * 0.45, y = cy - bh / 2 + my * 0.35;
    const rot = (mx / 60) * 0.06;
    ctx.save();
    ctx.translate(x + bw / 2, y + bh / 2); ctx.rotate(rot); ctx.translate(-bw / 2, -bh / 2);
    ctx.shadowColor = rgba(p.accent, 0.45); ctx.shadowBlur = 30;
    ctx.fillStyle = rgba(p.accent, 0.16);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, bw, bh, 20); else ctx.rect(0, 0, bw, bh);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba('#e9ffff', 0.6); ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0.5, 0.5, bw - 1, bh - 1, 20); else ctx.rect(0, 0, bw, bh);
    ctx.stroke();
    ctx.fillStyle = '#f2ffff';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.label, bw / 2, bh / 2);
    ctx.restore();
    ctx.strokeStyle = rgba(p.accent, 0.18); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx + mx * 0.3, cy + my * 0.2, 100 + Math.sin(t * 1.4) * 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + mx * 0.2, cy + my * 0.15, 140 + Math.sin(t * 0.9) * 8, 0, Math.PI * 2); ctx.stroke();
    `,
    params: base([text('label', 'Explorar el sistema', 'Texto del botón')]),
  },
  {
    id: 'tilt-card-3d',
    name: 'Tilt Card 3D',
    category: 'interactivos',
    summary: 'Tarjeta con inclinación 3D, brillo especular y paralaje interno; respuesta física al puntero.',
    tags: ['interactivo', '3d', 'tarjeta', 'tilt', 'interfaz'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const px = pointer.active ? pointer.x : 0.62 + Math.sin(t * 0.3) * 0.08;
    const py = pointer.active ? pointer.y : 0.4 + Math.cos(t * 0.27) * 0.06;
    const cw = Math.min(w * 0.62, 520), ch = Math.min(h * 0.58, 320);
    const cx = w / 2, cy = h / 2;
    const rx = (py - 0.5) * 0.22, ry = (px - 0.5) * 0.36;
    ctx.save();
    ctx.translate(cx, cy); ctx.transform(1, rx, ry, 1, 0, 0);
    const sheen = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
    sheen.addColorStop(0, 'rgba(20,30,44,0.96)'); sheen.addColorStop(1, 'rgba(7,11,18,0.96)');
    ctx.fillStyle = sheen;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 24;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 24); else ctx.rect(-cw / 2, -ch / 2, cw, ch);
    ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = rgba(p.accent, 0.45); ctx.lineWidth = 1;
    ctx.stroke();
    const gx = -cw / 2 + px * cw, gy = -ch / 2 + py * ch;
    const spec = ctx.createRadialGradient(gx, gy, 0, gx, gy, cw * 0.6);
    spec.addColorStop(0, 'rgba(255,255,255,0.18)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.fillStyle = rgba(p.accent, 0.12);
    ctx.fillRect(-cw / 2 + 34, -ch / 2 + 60, 40, 2);
    ctx.fillStyle = '#f2f8ff';
    ctx.font = '650 ' + Math.round(Math.min(28, cw * 0.06)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, -cw / 2 + 34, -ch / 2 + 108);
    ctx.fillStyle = 'rgba(210,230,245,0.5)';
    ctx.font = '400 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('la luz sigue la geometría', -cw / 2 + 35, -ch / 2 + 134);
    ctx.restore();
    `,
    params: base([text('title', 'PROFUNDIDAD', 'Título de la tarjeta')]),
  },
  {
    id: 'drag-orbit',
    name: 'Drag Orbit',
    category: 'interactivos',
    summary: 'Esfera de partículas orbitable arrastrando; inercia, paralaje y estela de rotación.',
    tags: ['interactivo', 'arrastre', 'orbita', '3d', 'particulas'],
    draw: `
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
    `,
    params: base([num('count', 420, 'Cantidad de puntos (referencia visual)', 120, 600)]),
  },
];
