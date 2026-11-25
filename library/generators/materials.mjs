import { COMMON, color, num, text } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'glass-refraction',
    name: 'Glass Refraction',
    category: 'materiales',
    summary: 'Panel de cristal que refracta bandas de color del fondo, con borde luminoso y sombra de contacto.',
    tags: ['material', 'cristal', 'refraccion', 'glass', 'interfaz'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const x = ((i / 7 + t * 0.02 * p.speed) % 1) * w;
      const g = ctx.createLinearGradient(x, 0, x + w * 0.25, h);
      g.addColorStop(0, rgba(i % 2 ? p.accent : p.accent2, 0.35)); g.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = g; ctx.fillRect(x, 0, w * 0.22, h);
    }
    const cw = Math.min(w * 0.64, 560), ch = Math.min(h * 0.54, 330);
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 22;
    ctx.fillStyle = 'rgba(8,14,22,0.38)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, p.radius); else ctx.rect(x, y, cw, ch);
    ctx.fill(); ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, p.radius); else ctx.rect(x, y, cw, ch);
    ctx.clip();
    for (let i = 0; i < 16; i++) {
      const yy = y + (i / 16) * ch + Math.sin(t * 0.7 + i) * 4;
      ctx.fillStyle = rgba(i % 3 === 0 ? p.accent2 : p.accent, 0.05 + (i % 4) * 0.015);
      ctx.fillRect(x, yy, cw, 2 + (i % 3));
    }
    const sheen = ctx.createLinearGradient(x - cw, y, x + cw * 1.6, y + ch);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.42, 'rgba(255,255,255,0.16)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    sheen.addColorStop(0.58, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen; ctx.fillRect(x, y, cw, ch);
    ctx.restore();
    ctx.strokeStyle = rgba('#eaffff', 0.55); ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + 0.5, cw - 1, ch - 1, p.radius); else ctx.rect(x, y, cw, ch);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,250,255,0.82)';
    ctx.font = '600 ' + Math.round(Math.min(30, cw * 0.06)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 28, y + 54);
    ctx.fillStyle = 'rgba(220,240,250,0.45)';
    ctx.font = '400 ' + Math.round(Math.min(14, cw * 0.03)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('refracción · borde · sombra', x + 29, y + 79);
    `,
    params: base([num('radius', 24, 'Radio de las esquinas', 2, 48), text('title', 'CRISTAL', 'Texto del panel')]),
  },
  {
    id: 'chrome-text',
    name: 'Chrome Text',
    category: 'materiales',
    summary: 'Tipografía cromada con degradado multi-parada, línea de horizonte y barrido especular; sin imágenes.',
    tags: ['material', 'cromo', 'tipografia', 'metal', 'canvas'],
    draw: `
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, p.bg); bg.addColorStop(0.55, '#111923'); bg.addColorStop(1, p.bg);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const label = p.title;
    const size = Math.min(w * 0.19, h * 0.34);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 ' + Math.round(size) + 'px ui-sans-serif, system-ui, sans-serif';
    const textW = ctx.measureText(label).width;
    const cx = w / 2, cy = h * 0.46;
    const chrome = ctx.createLinearGradient(0, cy - size * 0.6, 0, cy + size * 0.6);
    chrome.addColorStop(0, '#f8ffff');
    chrome.addColorStop(0.18, '#8ea6b7');
    chrome.addColorStop(0.36, '#1a2630');
    chrome.addColorStop(0.5, '#d9f7ff');
    chrome.addColorStop(0.62, '#395263');
    chrome.addColorStop(0.8, '#a9c0cf');
    chrome.addColorStop(1, '#f4ffff');
    ctx.fillStyle = chrome;
    ctx.shadowColor = rgba(p.accent, 0.35); ctx.shadowBlur = 30;
    ctx.fillText(label, cx, cy);
    ctx.shadowBlur = 0;
    const sweep = ((t * 0.12 * p.speed) % 1) * (textW + 220) - 110;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - textW / 2 + sweep, cy - size, 44, size * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(label, cx, cy);
    ctx.restore();
    ctx.strokeStyle = rgba(p.accent, 0.28); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - textW * 0.6, cy + size * 0.62); ctx.lineTo(cx + textW * 0.6, cy + size * 0.62); ctx.stroke();
    ctx.fillStyle = 'rgba(235,248,255,0.4)';
    ctx.font = '500 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('METAL · ' + p.subtitle, cx, cy + size * 0.84);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    `,
    params: base([text('title', 'CHROME', 'Texto principal'), text('subtitle', 'superficie pulida', 'Texto secundario')]),
  },
  {
    id: 'frosted-panel',
    name: 'Frosted Panel',
    category: 'materiales',
    summary: 'Panel esmerilado con dispersión de luz, micrograno y capas translúcidas; profundidad sin backdrop-filter.',
    tags: ['material', 'vidrio', 'esmerilado', 'panel', 'interfaz'],
    draw: `
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, p.bg); bg.addColorStop(0.5, rgba(p.accent, 0.22)); bg.addColorStop(1, rgba(p.accent2, 0.16));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97 + t * 12 * p.speed) % (w + 120)) - 60;
      ctx.fillStyle = rgba(i % 2 ? p.accent2 : p.accent, 0.06);
      ctx.beginPath(); ctx.arc(x, h * (0.2 + (i % 5) * 0.16), 50 + (i % 4) * 22, 0, Math.PI * 2); ctx.fill();
    }
    const cw = Math.min(w * 0.7, 620), ch = Math.min(h * 0.58, 360);
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
    ctx.fillStyle = 'rgba(18,26,36,0.42)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 26); else ctx.rect(x, y, cw, ch);
    ctx.fill(); ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 26); else ctx.rect(x, y, cw, ch);
    ctx.clip();
    const rnd = mulberry32(5);
    for (let i = 0; i < 900; i++) {
      const px = x + rnd() * cw, py = y + rnd() * ch;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.015 + rnd() * 0.045) + ')';
      ctx.fillRect(px, py, 1.2, 1.2);
    }
    const glow = ctx.createRadialGradient(x + cw * 0.25, y + ch * 0.2, 0, x + cw * 0.25, y + ch * 0.2, cw * 0.7);
    glow.addColorStop(0, 'rgba(255,255,255,0.2)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(x, y, cw, ch);
    ctx.restore();
    ctx.strokeStyle = 'rgba(235,250,255,0.32)'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 0.5, y + 0.5, cw - 1, ch - 1, 26); else ctx.rect(x, y, cw, ch);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,250,255,0.86)';
    ctx.font = '600 ' + Math.round(Math.min(26, cw * 0.05)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 30, y + 56);
    ctx.fillStyle = 'rgba(225,242,250,0.45)';
    ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('dispersión + micrograno · sin textura externa', x + 31, y + 80);
    `,
    params: base([text('title', 'SUPERFICIE ESMERILADA', 'Título del panel')]),
  },
  {
    id: 'holographic-foil',
    name: 'Holographic Foil',
    category: 'materiales',
    summary: 'Lámina holográfica con franjas de difracción, motas de brillo y relieve que responde al puntero.',
    tags: ['material', 'holografico', 'foil', 'iridiscente', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const px = pointer.active ? pointer.x : 0.55;
    const py = pointer.active ? pointer.y : 0.4;
    const cw = Math.min(w * 0.72, 640), ch = Math.min(h * 0.6, 360);
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 20); else ctx.rect(x, y, cw, ch);
    ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      const hue = (k * 260 + t * 22 * p.speed + px * 80) % 360;
      g.addColorStop(k, 'hsla(' + hue + ', 75%, ' + (45 + Math.sin(k * 9 + py * 5) * 18) + '%, 0.9)');
    }
    ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 22; i++) {
      const yy = y + ((i / 22) * ch + Math.sin(t * 0.5 + i * 1.7) * 18 + ch) % ch;
      const gg = ctx.createLinearGradient(x, yy, x + cw, yy + 40);
      gg.addColorStop(0, 'rgba(255,255,255,0)');
      gg.addColorStop(0.45, 'rgba(255,255,255,0.2)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(x, yy, cw, 2 + (i % 3));
    }
    const rnd = mulberry32(44);
    for (let i = 0; i < 140; i++) {
      const sx = x + rnd() * cw, sy = y + rnd() * ch;
      const a = 0.12 + rnd() * 0.35;
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.fillRect(sx, sy, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    const sheen = ctx.createRadialGradient(x + cw * px, y + ch * py, 0, x + cw * px, y + ch * py, cw * 0.5);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen; ctx.fillRect(x, y, cw, ch);
    ctx.restore();
    ctx.fillStyle = 'rgba(8,12,18,0.72)';
    ctx.font = '700 ' + Math.round(Math.min(34, cw * 0.07)) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.title, x + 28, y + ch - 34);
    `,
    params: base([text('title', 'HOLO / 03', 'Título sobre la lámina')]),
  },
];
