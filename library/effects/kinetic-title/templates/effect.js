// Revelado enmascarado con Web Animations API. Sin dependencias.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rows = [...document.querySelectorAll('[data-row] em')];
const rules = [...document.querySelectorAll('.rule')];
const stack = document.querySelector('.stack');
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

const EASE = 'cubic-bezier(.16,1,.3,1)';

function reveal() {
  if (reduce) {
    rows.forEach((el) => (el.style.transform = 'none'));
    rules.forEach((el) => (el.style.transform = 'scaleX(1)'));
    return;
  }
  rows.forEach((el, i) => {
    el.animate(
      [
        { transform: 'translateY(108%) rotate(2.5deg)', opacity: 0 },
        { transform: 'translateY(0%) rotate(0deg)', opacity: 1 },
      ],
      { duration: 1250, delay: 120 + i * 110, easing: EASE, fill: 'both' },
    );
  });
  rules.forEach((el, i) => {
    el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 900,
      delay: 420 + i * 120,
      easing: EASE,
      fill: 'both',
    });
  });
}

// Parallax muy leve: sólo con puntero fino, para no marear en táctil.
if (!reduce && matchMedia('(pointer: fine)').matches) {
  addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
  });
  const tick = () => {
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    stack.style.transform = `translate3d(${pointer.x * -9}px, ${pointer.y * -5}px, 0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

reveal();
window.__veReady = true;
