// El banner es CSS/SVG: sólo se añade la señal de preparación y un pequeño
// desplazamiento de las chispas ligado al puntero (sin RAF propio).
const banner = document.querySelector('.banner');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce && matchMedia('(pointer: fine)').matches && banner) {
  banner.addEventListener('pointermove', (e) => {
    const rect = banner.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    banner.style.setProperty('--tilt-x', `${(y * -1.2).toFixed(2)}deg`);
    banner.style.setProperty('--tilt-y', `${(x * 1.6).toFixed(2)}deg`);
    banner.style.transform = 'perspective(1200px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y))';
  });
  banner.addEventListener('pointerleave', () => {
    banner.style.transform = '';
  });
}

window.__veReady = true;
