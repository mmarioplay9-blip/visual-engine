import { COMMON, color, num } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'anamorphic-bloom',
    name: 'Anamorphic Bloom',
    category: 'iluminacion',
    summary: 'Núcleo incandescente con destello horizontal anamórfico y halos escalonados; postproceso óptico de cine.',
    tags: ['iluminacion', 'bloom', 'anamorfico', 'lente', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * (0.5 + Math.sin(t * 0.21 * p.speed) * 0.08);
    const cy = h * 0.47;
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.22);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.08, rgba(p.accent, 0.8));
    core.addColorStop(0.32, rgba(p.accent, 0.22));
    core.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const y = cy + (i - 1) * 2;
      const g = ctx.createLinearGradient(0, y, w, y);
      g.addColorStop(0, rgba(p.accent, 0));
      g.addColorStop(0.3, rgba(p.accent, 0.06));
      g.addColorStop(0.5, rgba('#dffcff', 0.75));
      g.addColorStop(0.7, rgba(p.accent, 0.06));
      g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, y - (2 + i * 2), w, 4 + i * 4);
    }
    const streak = ctx.createLinearGradient(cx, 0, cx, h);
    streak.addColorStop(0, rgba(p.accent, 0));
    streak.addColorStop(0.5, rgba(p.accent, 0.22));
    streak.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = streak; ctx.fillRect(cx - 1.5, 0, 3, h);
    ctx.fillStyle = rgba('#ffffff', 0.8);
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('intensity', 0.7, 'Intensidad del bloom', 0.1, 1, 0.05)]),
  },
  {
    id: 'volumetric-rays',
    name: 'Volumetric Rays',
    category: 'iluminacion',
    summary: 'Haces volumétricos desde una fuente fuera de cuadro, con polvo y desvanecimiento atmosférico.',
    tags: ['iluminacion', 'rayos', 'volumetrico', 'atmosfera', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const sx = w * (0.18 + Math.sin(t * 0.09 * p.speed) * 0.04);
    const sy = -h * 0.15;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const a = -0.35 + (i / 22) * 1.5 + Math.sin(t * 0.18 + i * 1.7) * 0.018;
      const len = h * (1.4 + (i % 5) * 0.18);
      const spread = 0.012 + (i % 4) * 0.012;
      const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
      g.addColorStop(0, rgba(i % 5 === 0 ? p.accent2 : p.accent, 0.2));
      g.addColorStop(0.35, rgba(p.accent, 0.07));
      g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - spread) * len, sy + Math.sin(a - spread) * len);
      ctx.lineTo(sx + Math.cos(a + spread) * len, sy + Math.sin(a + spread) * len);
      ctx.closePath(); ctx.fill();
    }
    const haze = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 1.2);
    haze.addColorStop(0, rgba(p.accent, 0.12)); haze.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('intensity', 0.8, 'Potencia de los haces', 0.2, 1.4, 0.05), num('rays', 22, 'Número de haces (referencia visual)', 6, 40)]),
  },
  {
    id: 'neon-rim',
    name: 'Neon Rim Light',
    category: 'iluminacion',
    summary: 'Borde de neón pulsante sobre una tarjeta oscura, con dos temperaturas y caída de luz realista.',
    tags: ['iluminacion', 'neon', 'borde', 'interfaz', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const pulse = 0.55 + Math.sin(t * 2.1 * p.speed) * 0.25;
    const cardW = Math.min(w * 0.68, 520), cardH = Math.min(h * 0.5, 280);
    const x = (w - cardW) / 2, y = (h - cardH) / 2;
    ctx.fillStyle = rgba('#0b111b', 0.86);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cardW, cardH, 22); else ctx.rect(x, y, cardW, cardH);
    ctx.fill();
    const rim = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
    rim.addColorStop(0, p.accent); rim.addColorStop(0.55, rgba(p.accent, 0.25)); rim.addColorStop(1, p.accent2);
    ctx.strokeStyle = rim; ctx.lineWidth = 1.4 + pulse * 2; ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.shadowColor = p.accent; ctx.shadowBlur = 18 + pulse * 22;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cardW, cardH, 22); else ctx.rect(x, y, cardW, cardH);
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(p.accent, 0.08);
    ctx.fillRect(x + 24, y + cardH - 76, cardW - 48, 1);
    ctx.font = '600 ' + Math.round(Math.min(34, cardW * 0.06)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#eef7ff';
    ctx.fillText('SUPERFICIE', x + 26, y + 52);
    ctx.font = '400 ' + Math.round(Math.min(15, cardW * 0.028)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = rgba('#cfe4f4', 0.6);
    ctx.fillText('luz de borde · dos temperaturas', x + 27, y + 77);
    `,
    params: base([num('intensity', 0.7, 'Intensidad del borde', 0.2, 1.2, 0.05), num('radius', 22, 'Radio de la tarjeta', 4, 48, 1)]),
  },
  {
    id: 'caustic-light',
    name: 'Caustic Light',
    category: 'iluminacion',
    summary: 'Cáusticas de agua proyectadas por dos campos de ondas; luz orgánica que se mueve sin textura externa.',
    tags: ['iluminacion', 'causticas', 'agua', 'luz', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const cols = 26, rows = 16;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = x / cols, v = y / rows;
        const field = Math.sin((u * 9 + t * 0.35) * Math.PI) * Math.cos((v * 7 - t * 0.28) * Math.PI)
          + Math.sin((u * 5 - v * 6 + t * 0.2) * Math.PI) * 0.7;
        const k = Math.max(0, field - 0.35);
        if (k <= 0) continue;
        const px = u * w, py = v * h;
        const r = (16 + k * 34) * (w / 900);
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, rgba(p.accent, 0.22 * k));
        g.addColorStop(0.5, rgba(p.accent, 0.07 * k));
        g.addColorStop(1, rgba(p.accent, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    const band = ctx.createLinearGradient(0, 0, w, h);
    band.addColorStop(0, rgba(p.accent2, 0)); band.addColorStop(0.5, rgba(p.accent2, 0.05)); band.addColorStop(1, rgba(p.accent2, 0));
    ctx.fillStyle = band; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('intensity', 0.8, 'Brillo de las cáusticas', 0.2, 1.4, 0.05)]),
  },
  {
    id: 'lens-flare',
    name: 'Lens Flare',
    category: 'iluminacion',
    summary: 'Fuente de luz con fantasmas ópticos alineados, anillo de difracción y velo; simulación de cristal real.',
    tags: ['iluminacion', 'lente', 'flare', 'optica', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * (0.3 + (pointer.active ? pointer.x : 0.65) * 0.4);
    const cy = h * (0.28 + (pointer.active ? pointer.y : 0.4) * 0.35);
    const dx = w * 0.5 - cx, dy = h * 0.5 - cy;
    ctx.globalCompositeOperation = 'lighter';
    const veil = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    veil.addColorStop(0, rgba(p.accent2, 0.25)); veil.addColorStop(0.2, rgba(p.accent, 0.07)); veil.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = veil; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const k = -0.4 + i * 0.28;
      const x = cx + dx * k, y = cy + dy * k;
      const r = (8 + i * 9) * (1 + Math.sin(t * 0.5 + i) * 0.04);
      ctx.strokeStyle = rgba(i % 3 === 0 ? p.accent2 : p.accent, 0.22);
      ctx.lineWidth = 1 + (i % 2);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rgba(p.accent, 0.03); ctx.fill();
    }
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    halo.addColorStop(0, 'rgba(255,255,255,0.95)');
    halo.addColorStop(0.12, rgba(p.accent2, 0.55));
    halo.addColorStop(0.4, rgba(p.accent2, 0.12));
    halo.addColorStop(1, rgba(p.accent2, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(p.accent, 0.18); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    `,
    params: base([num('intensity', 0.7, 'Intensidad del destello', 0.2, 1.3, 0.05)]),
  },
];
