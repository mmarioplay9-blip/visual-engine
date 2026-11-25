import { COMMON, num, text } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

export const effects = [
  {
    id: 'radar-sweep',
    name: 'Radar Sweep',
    category: 'hud',
    summary: 'Radar circular con barrido cónico, retícula, blips con estela y lectura de rumbo; instrumento coherente.',
    tags: ['hud', 'radar', 'instrumento', 'telemetria', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    const R = Math.min(w, h) * 0.36;
    ctx.strokeStyle = rgba(p.accent, 0.25); ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    const a = (t * 0.9 * p.speed) % (Math.PI * 2);
    const grad = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
    if (grad) {
      grad.addColorStop(0, rgba(p.accent, 0.4)); grad.addColorStop(0.12, rgba(p.accent, 0)); grad.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = rgba(p.accent, 0.9); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    const blips = [[0.8, 1.2], [2.4, 0.55], [4.2, 1.7], [5.4, 0.9]];
    for (const [ba, br] of blips) {
      const x = cx + Math.cos(ba + t * 0.02) * R * br * 0.72;
      const y = cy + Math.sin(ba + t * 0.02) * R * br * 0.72;
      const phase = Math.max(0, Math.sin(a - ba - t * 0.02));
      ctx.fillStyle = rgba(p.accent2, 0.15 + phase * 0.6);
      ctx.beginPath(); ctx.arc(x, y, 2 + phase * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = rgba('#eafcff', 0.8);
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(p.label, cx - R, cy + R + 26);
    ctx.fillText('R ' + Math.round(R) + '  BRG ' + String(Math.round((a * 180) / Math.PI) % 360).padStart(3, '0'), cx - R, cy + R + 44);
    `,
    params: base([text('label', 'SENSOR · SECTOR 7', 'Etiqueta del radar')]),
  },
  {
    id: 'telemetry-grid',
    name: 'Telemetry Grid',
    category: 'hud',
    summary: 'Panel de telemetría con retícula, barras vivas, sparkline y lecturas numéricas coherentes.',
    tags: ['hud', 'telemetria', 'datos', 'grid', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(p.accent, 0.07); ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = rgba('#eaffff', 0.85);
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.fillText('VITAL / TELEMETRÍA', 24, 34);
    ctx.fillStyle = rgba(p.accent, 0.7);
    ctx.fillText('ENLACE ' + (Math.floor(t * 2) % 2 ? 'ESTABLE' : 'ACTIVO'), w - 168, 34);
    const bars = 12;
    for (let i = 0; i < bars; i++) {
      const val = 0.25 + 0.65 * Math.abs(Math.sin(t * 0.9 + i * 0.7) * Math.cos(t * 0.31 + i));
      const x = 24 + i * ((w - 48) / bars);
      const bh = (h * 0.26) * val;
      ctx.fillStyle = rgba(i > 8 ? p.accent2 : p.accent, 0.16 + val * 0.35);
      ctx.fillRect(x, h * 0.62 - bh, (w - 48) / bars - 5, bh);
      ctx.fillStyle = rgba('#dffcff', 0.35);
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(String(Math.round(val * 100)).padStart(2, '0'), x, h * 0.62 + 12);
    }
    ctx.strokeStyle = rgba(p.accent, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = 24 + (i / 120) * (w - 48);
      const y = h * 0.82 + Math.sin(i * 0.18 + t * 2) * 8 + Math.sin(i * 0.05 - t) * 12;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(p.accent, 0.5);
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText('t+ ' + t.toFixed(2) + 's · 60 Hz · local', 24, h - 18);
    `,
    params: base([text('label', 'NÚCLEO / 04', 'Etiqueta del panel')]),
  },
  {
    id: 'target-reticle',
    name: 'Target Reticle',
    category: 'hud',
    summary: 'Retícula de seguimiento con corchetes, círculo de bloqueo, deriva y datos de objetivo en tiempo real.',
    tags: ['hud', 'reticula', 'objetivo', 'mira', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    const cx = w * (0.5 + Math.sin(t * 0.55) * 0.18);
    const cy = h * (0.5 + Math.cos(t * 0.43) * 0.14);
    const R = Math.min(w, h) * 0.16;
    ctx.strokeStyle = rgba(p.accent, 0.7); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const b = R + 22, len = 18;
    ctx.lineWidth = 2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * b, cy + sy * (b - len));
      ctx.lineTo(cx + sx * b, cy + sy * b);
      ctx.lineTo(cx + sx * (b - len), cy + sy * b);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx - R * 0.4, cy); ctx.lineTo(cx + R * 0.4, cy); ctx.moveTo(cx, cy - R * 0.4); ctx.lineTo(cx, cy + R * 0.4); ctx.stroke();
    ctx.fillStyle = rgba(p.accent2, 0.85);
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillText('LOCK', cx + R + 22, cy - R + 4);
    ctx.fillStyle = rgba('#dffcff', 0.65);
    ctx.fillText('X ' + Math.round(cx) + '  Y ' + Math.round(cy), cx + R + 22, cy - R + 20);
    ctx.fillText('CONF ' + (86 + Math.round(Math.sin(t) * 4)) + '%', cx + R + 22, cy - R + 34);
    ctx.strokeStyle = rgba(p.accent, 0.16); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - R - 30); ctx.lineTo(cx, 0); ctx.stroke();
    `,
    params: base([text('label', 'TRACK / 01', 'Etiqueta de seguimiento')]),
  },
  {
    id: 'waveform-monitor',
    name: 'Waveform Monitor',
    category: 'hud',
    summary: 'Osciloscopio con onda compuesta, espectro de barras y lectura de pico; señal viva, no decorativa.',
    tags: ['hud', 'osciloscopio', 'audio', 'onda', 'canvas'],
    draw: `
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(p.accent, 0.08); ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const mid = h * 0.55;
    ctx.strokeStyle = rgba(p.accent, 0.75); ctx.lineWidth = 1.4;
    ctx.beginPath();
    let peak = 0;
    for (let i = 0; i <= 240; i++) {
      const u = i / 240;
      const env = Math.exp(-Math.pow((u - 0.5) * 3, 2));
      const v = (Math.sin(u * 42 + t * 5) * 0.5 + Math.sin(u * 17 - t * 2.1) * 0.3 + Math.sin(u * 91 + t * 8) * 0.18) * env;
      peak = Math.max(peak, Math.abs(v));
      const x = u * w, y = mid + v * h * 0.2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(p.accent2, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    const bars = 48;
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(Math.sin(i * 0.6 + t * 2.4) * Math.cos(i * 0.13 - t * 0.8));
      ctx.fillStyle = rgba(i % 5 === 0 ? p.accent2 : p.accent, 0.15 + v * 0.45);
      ctx.fillRect((i / bars) * w, h * 0.1, w / bars - 2, v * h * 0.22);
    }
    ctx.fillStyle = rgba('#dffcff', 0.8);
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(p.label, 22, 28);
    ctx.fillStyle = rgba(p.accent, 0.7);
    ctx.fillText('PEAK ' + (peak * 100).toFixed(0) + '%', w - 110, 28);
    `,
    params: base([text('label', 'SEÑAL / 440 HZ', 'Etiqueta del monitor')]),
  },
];
