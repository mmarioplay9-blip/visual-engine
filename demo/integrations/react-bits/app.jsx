import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * AuroraText — implementación propia (MIT).
 * Sigue el patrón de componentes copiables de React Bits, sin copiar su código.
 */
function AuroraText({ text = 'VISUAL ENGINE', accent = '#12e0c8' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = [...el.querySelectorAll('span')];
    const animation = matchMedia('(prefers-reduced-motion: reduce)').matches;
    chars.forEach((c, i) => {
      if (animation) {
        c.style.opacity = '1';
        return;
      }
      c.animate(
        [
          { transform: 'translateY(.7em)', opacity: 0, filter: 'blur(10px)' },
          { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' },
        ],
        { duration: 850, delay: i * 30, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
      );
      c.animate(
        [
          { backgroundPosition: '0% 50%' },
          { backgroundPosition: '100% 50%' },
          { backgroundPosition: '0% 50%' },
        ],
        { duration: 5200 + i * 80, iterations: Infinity, easing: 'ease-in-out' },
      );
    });
  }, []);
  return (
    <span ref={ref} style={{ display: 'inline-flex', gap: '.01em' }}>
      {[...text].map((ch, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            backgroundImage: `linear-gradient(100deg,#f7fbff 0%,${accent} 42%,#7bd8ff 70%,#f7fbff 100%)`,
            backgroundSize: '220% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {ch === ' ' ? '\u00a0' : ch}
        </span>
      ))}
    </span>
  );
}

function App() {
  return (
    <main style={{ padding: '7vw', maxWidth: 1100 }}>
      <div style={{ font: '600 11px ui-monospace, monospace', letterSpacing: '.16em', color: '#ffb454' }}>
        REACT BITS · COMPONENTE PROPIO
      </div>
      <h1 style={{ fontSize: 'clamp(42px,8vw,96px)', lineHeight: .94, letterSpacing: '-.05em', margin: '16px 0 22px' }}>
        <AuroraText text="Texto con luz." />
      </h1>
      <p style={{ maxWidth: '44ch', color: '#a9c2d2', lineHeight: 1.6, font: '15px ui-sans-serif, system-ui, sans-serif' }}>
        Componente React copiable, con animación Web Animations y degradado aurora. Sin registro ni CDN:
        React y el componente se sirven desde este proyecto.
      </p>
      <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
        {['MIT', 'React 19', 'sin club'].map((x) => (
          <span key={x} style={{ border: '1px solid #284552', borderRadius: 999, padding: '7px 11px', font: '11px ui-monospace, monospace', color: '#bfe9e4' }}>{x}</span>
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
window.__veReady = true;
window.__veReactBits = { mounted: true };
