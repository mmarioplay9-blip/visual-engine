import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';


export const defaults = config;

/** Tipografía cromada con degradado multi-parada, línea de horizonte y barrido especular; sin imágenes. */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {

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
  });
}
