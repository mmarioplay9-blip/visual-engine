import { COMMON, color, num, text } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'typewriter-cursor',
    name: 'Typewriter Cursor',
    category: 'tipografia',
    summary: 'Texto que se escribe carácter a carácter con cursor parpadeante, salto de línea y pausa; ritmo controlable.',
    tags: ['tipografia', 'maquina', 'cursor', 'texto', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const chars = Array.from(p.title);
    const speed = Math.max(1, p.cps);
    const shown = Math.min(chars.length, Math.floor((t * speed * p.speed) % (chars.length + 18)));
    const font = Math.min(w * 0.07, h * 0.16);
    ctx.font = '600 ' + Math.round(font) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = p.accent2;
    const kicker = p.kicker;
    ctx.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(kicker, w * 0.08, h * 0.24);
    ctx.fillStyle = '#eef7ff';
    ctx.font = '600 ' + Math.round(font) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const maxW = w * 0.84;
    const lines = [];
    let current = '';
    for (const ch of chars.slice(0, shown)) {
      if (ctx.measureText(current + ch).width > maxW) { lines.push(current); current = ch; }
      else current += ch;
    }
    lines.push(current);
    const lineH = font * 1.16;
    const startY = h * 0.5 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, w * 0.08, startY + i * lineH);
      if (i === lines.length - 1 && Math.floor(t * 2.2) % 2 === 0) {
        const tw = ctx.measureText(line).width;
        ctx.fillStyle = p.accent;
        ctx.fillRect(w * 0.08 + tw + 5, startY + i * lineH - font * 0.8, Math.max(2, font * 0.08), font);
        ctx.fillStyle = '#eef7ff';
      }
    });
    `,
    params: base([text('title', 'La precisión también se ve.', 'Texto a escribir'), text('kicker', '> visual_engine --explain', 'Línea superior'), num('cps', 18, 'Caracteres por segundo', 2, 60)]),
  },
  {
    id: 'split-reveal',
    name: 'Split Reveal',
    category: 'tipografia',
    summary: 'Letras que suben desde una máscara con escalonado y easing; entrada tipográfica limpia y repetible.',
    tags: ['tipografia', 'entrada', 'mascara', 'stagger', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const chars = Array.from(p.title);
    const fontSize = Math.min(w * 0.15, h * 0.24);
    ctx.font = '800 ' + Math.round(fontSize) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = (w - total) / 2;
    const cyc = (t * 0.22 * p.speed) % 1;
    const baseY = h * 0.52;
    for (let i = 0; i < chars.length; i++) {
      const local = clamp((cyc * 1.8 - i * 0.045) / 0.55);
      const e = 1 - Math.pow(1 - local, 3);
      const y = baseY + (1 - e) * fontSize * 0.95;
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 2, baseY - fontSize * 0.62, widths[i] + 4, fontSize * 0.92); ctx.clip();
      ctx.fillStyle = i === chars.length - 1 ? p.accent : '#f2f8ff';
      ctx.fillText(chars[i], x, y);
      ctx.restore();
      x += widths[i];
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = rgba(p.accent, 0.55);
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(p.kicker, w * 0.5 - ctx.measureText(p.kicker).width / 2, h * 0.7);
    `,
    params: base([text('title', 'FORMAS', 'Texto principal'), text('kicker', 'revelado por máscara · sin plugins', 'Pie')]),
  },
  {
    id: 'variable-weight',
    name: 'Variable Weight',
    category: 'tipografia',
    summary: 'Titular que respira con peso, ancho y altura variables por letra; movimiento tipográfico, no un fade.',
    tags: ['tipografia', 'variable', 'peso', 'onda', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const chars = Array.from(p.title);
    const size = Math.min(w * 0.13, h * 0.2);
    const total = chars.length;
    let x = w * 0.08;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < total; i++) {
      const phase = Math.sin(t * 1.6 * p.speed - i * 0.42);
      const weight = Math.round(300 + (phase * 0.5 + 0.5) * 600);
      const scale = 1 + phase * 0.045 * p.range;
      const fs = size * scale;
      ctx.font = weight + ' ' + Math.round(fs) + 'px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = i % 3 === 0 ? p.accent : '#f1f7ff';
      ctx.fillText(chars[i], x, h * 0.5 + Math.sin(t * 1.1 - i * 0.3) * 4);
      x += ctx.measureText(chars[i]).width + size * 0.01;
      if (x > w * 0.9) break;
    }
    ctx.fillStyle = rgba(p.accent2, 0.65);
    ctx.font = '500 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('peso variable · onda individual', w * 0.08, h * 0.72);
    ctx.textBaseline = 'alphabetic';
    `,
    params: base([text('title', 'INTENCIÓN', 'Texto animado'), num('range', 1, 'Rango de la variación', 0, 2, 0.05)]),
  },
  {
    id: 'scramble-decode',
    name: 'Scramble Decode',
    category: 'tipografia',
    summary: 'Código que se resuelve en texto legible con caracteres aleatorios y bloques de color; efecto de descifrado.',
    tags: ['tipografia', 'scramble', 'decode', 'texto', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@';
    const target = p.title;
    const chars = Array.from(target);
    const cyc = (t * 0.2 * p.speed) % 1;
    const resolved = Math.floor(clamp((cyc - 0.1) / 0.55) * chars.length);
    const font = Math.min(w * 0.11, h * 0.18);
    ctx.font = '700 ' + Math.round(font) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    let text = '';
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === ' ') { text += ' '; continue; }
      text += i < resolved ? chars[i] : glyphs[Math.floor(noise2(i * 4.1, Math.floor(t * 18), 6) * glyphs.length)];
    }
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = rgba(p.accent, 0.1);
    ctx.fillRect(w * 0.5 - tw / 2 - 24, h * 0.5 - font * 0.7, tw + 48, font * 1.4);
    ctx.fillStyle = '#f4faff';
    ctx.fillText(text, w * 0.5 - tw / 2, h * 0.5);
    ctx.fillStyle = p.accent;
    ctx.fillRect(w * 0.5 - tw / 2, h * 0.5 + font * 0.58, tw * clamp((cyc - 0.1) / 0.55), 2);
    ctx.textBaseline = 'alphabetic';
    `,
    params: base([text('title', 'VISUAL ENGINE', 'Texto a descifrar')]),
  },
];
