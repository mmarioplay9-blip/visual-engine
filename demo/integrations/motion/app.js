import { animate, stagger } from 'motion';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = [...document.querySelectorAll('[data-item]')];
const cards = [...document.querySelectorAll('[data-card]')];
const bars = [...document.querySelectorAll('.bar')];
const controls = [];
if (reduce) {
  items.forEach((el) => { el.style.opacity = 1; });
  cards.forEach((el) => { el.style.opacity = 1; });
  bars.forEach((el) => { el.style.width = '100%'; });
} else {
  controls.push(animate(items, { opacity: [0, 1], y: [18, 0] }, { duration: 0.8, delay: stagger(0.08) }));
  controls.push(animate(cards, { opacity: [0, 1], y: [26, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.9, delay: stagger(0.09, { startDelay: 0.35 }) }));
  controls.push(animate(bars, { width: ['0%', '100%'] }, { duration: 1.3, delay: stagger(0.12, { startDelay: 0.7 }), easing: 'ease-out' }));
}
window.__veReady = true;
window.__veMotion = { controls: controls.length, reduced: reduce };
addEventListener('pagehide', () => controls.forEach((c) => c.stop?.()));
