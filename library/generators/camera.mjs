import { COMMON, num } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'parallax-layers',
    name: 'Parallax Layers',
    category: 'camara',
    summary: 'Paisaje en cuatro profundidades que se desplazan a velocidades distintas con el puntero y el tiempo.',
    tags: ['camara', 'parallax', 'profundidad', 'paisaje', 'canvas'],
    draw: `
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
    `,
    params: base([num('depth', 0.8, 'Intensidad del paralaje', 0, 1.5, 0.05)]),
  },
  {
    id: 'dolly-zoom',
    name: 'Dolly Zoom',
    category: 'camara',
    summary: 'Contra-zoom de vértigo: el fondo se comprime mientras el marco crece; efecto Hitchcock en 2D.',
    tags: ['camara', 'dolly', 'zoom', 'vertigo', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cyc = (t * 0.18 * p.speed) % 1;
    const k = cyc < 0.5 ? cyc * 2 : (1 - cyc) * 2;
    const cx = w * 0.5, cy = h * 0.5;
    const rings = 16;
    for (let i = rings; i >= 0; i--) {
      const depth = i / rings;
      const scale = 0.18 + depth * 0.92 + k * 0.35 * depth;
      const rw = w * scale, rh = h * scale * 0.72;
      ctx.strokeStyle = rgba(i % 4 === 0 ? p.accent2 : p.accent, 0.12 + depth * 0.25);
      ctx.lineWidth = 0.8 + depth * 1.4;
      ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);
      if (i % 4 === 0) {
        ctx.fillStyle = rgba(p.accent, 0.018 + depth * 0.02);
        ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
      }
    }
    ctx.strokeStyle = rgba(p.accent, 0.4); ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * w * 0.03, cy); ctx.lineTo(cx + i * w * 0.14, 0); ctx.stroke();
    }
    ctx.fillStyle = rgba(p.accent, 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, 3 + k * 4, 0, Math.PI * 2); ctx.fill();
    `,
    params: base([num('intensity', 0.8, 'Intensidad del contra-zoom', 0.2, 1.5, 0.05)]),
  },
  {
    id: 'handheld-shake',
    name: 'Handheld Shake',
    category: 'camara',
    summary: 'Cámara en mano con microsacudidas, encuadre de monitor y timecode; textura de rodaje real.',
    tags: ['camara', 'shake', 'rodaje', 'encuadre', 'canvas'],
    draw: `
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
    `,
    params: base([num('amount', 0.7, 'Cantidad de sacudida', 0, 2, 0.05)]),
  },
  {
    id: 'focus-pull',
    name: 'Focus Pull',
    category: 'camara',
    summary: 'Cambio de foco entre fondo y primer plano con bokeh que se abre y cierra; profundidad de campo explícita.',
    tags: ['camara', 'foco', 'bokeh', 'profundidad', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const focus = 0.5 + 0.5 * Math.sin(t * 0.8 * p.speed);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const x = w * (0.55 + Math.sin(i * 2.3) * 0.36);
      const y = h * (0.45 + Math.cos(i * 1.7) * 0.32);
      const r = (18 + (i % 5) * 10) * (0.5 + focus * 0.9);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(i % 3 === 0 ? p.accent2 : p.accent, 0.18)); g.addColorStop(0.7, rgba(p.accent, 0.06)); g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'blur(' + ((1 - focus) * 7).toFixed(1) + 'px)';
    const cw = Math.min(w * 0.5, 420), ch = Math.min(h * 0.36, 200);
    const x = w * 0.08, y = h * 0.56;
    ctx.fillStyle = 'rgba(8,14,22,0.88)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 18); else ctx.rect(x, y, cw, ch);
    ctx.fill();
    ctx.strokeStyle = rgba(p.accent, 0.6); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#f4fbff';
    ctx.font = '700 ' + Math.round(Math.min(30, cw * 0.08)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 24, y + 54);
    ctx.fillStyle = 'rgba(220,240,250,0.6)';
    ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('foco ' + (focus * 100).toFixed(0) + '% · primer plano', x + 25, y + 78);
    ctx.filter = 'none';
    ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const fy = y + ch * (0.55 + i * 0.1);
      ctx.beginPath(); ctx.moveTo(x + 24, fy); ctx.lineTo(x + 24 + (cw - 48) * (0.3 + i * 0.15), fy); ctx.stroke();
    }
    `,
    params: base([num('intensity', 0.8, 'Recorrido de foco', 0.2, 1.4, 0.05)]),
  },
];
