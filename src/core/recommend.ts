import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { round } from './util.js';

/**
 * Recomendaciones de implementación por efecto. El código se genera con los
 * parámetros medidos y, para JavaScript, se valida con `node --check`.
 * No se recomienda nada de pago ni dependencias que no aporten.
 */

export interface CodeSnippet {
  language: 'js' | 'css' | 'glsl';
  filename: string;
  code: string;
}

export interface EffectRecommendation {
  id: string;
  label: string;
  tech: string;
  why: string;
  performance: string;
  install: string[];
  snippets: CodeSnippet[];
  checked: boolean;
  checkOutput?: string;
}

function num(params: Record<string, number | string>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === 'number' ? v : fallback;
}

function glow(params: Record<string, number | string>): EffectRecommendation {
  const intensity = num(params, 'intensidad', 0.5);
  const radius = Math.round(num(params, 'radioPx', 24));
  return {
    id: 'glow',
    label: 'glow',
    tech: 'CSS + GSAP',
    why: 'El halo se reproduce con sombras y una capa desenfocada; no hace falta postproceso.',
    performance: 'Sombras grandes repintan; limita el área y anima sólo opacidad/transform. DPR ≤ 2.',
    install: ['gsap'],
    snippets: [
      {
        language: 'css',
        filename: 'glow.css',
        code: `.ve-glow {
  color: #eaf3ff;
  text-shadow: 0 0 ${radius}px rgba(18, 224, 200, ${round(intensity * 0.55)}), 0 0 ${radius * 3}px rgba(18, 224, 200, ${round(intensity * 0.25)});
  will-change: opacity;
}
@media (prefers-reduced-motion: reduce) {
  .ve-glow { animation: none; }
}`,
      },
      {
        language: 'js',
        filename: 'glow.mjs',
        code: `import { gsap } from 'gsap';

const el = document.querySelector('[data-ve-glow]');
if (!el) throw new Error('Falta el elemento [data-ve-glow]');

gsap.to(el, {
  opacity: 0.72,
  duration: 1.8,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
});`,
      },
    ],
    checked: false,
  };
}

function bloom(params: Record<string, number | string>): EffectRecommendation {
  const strength = num(params, 'intensidad', 0.6);
  return {
    id: 'bloom',
    label: 'bloom',
    tech: 'Three.js (EffectComposer)',
    why: 'El bloom real necesita un pase de postproceso; un filtro CSS no separa umbral ni radio.',
    performance: 'Dos pases a media resolución; no lo uses en móviles de gama baja sin medir fps.',
    install: ['three'],
    snippets: [
      {
        language: 'js',
        filename: 'bloom.mjs',
        code: `import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;
scene.add(new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 128, 16), new THREE.MeshBasicMaterial({ color: 0x12e0c8 })));

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), ${round(strength, 2)}, 0.6, 0.2));

renderer.setAnimationLoop(() => composer.render());`,
      },
    ],
    checked: false,
  };
}

function particles(params: Record<string, number | string>): EffectRecommendation {
  const count = Math.max(8, Math.min(600, Math.round(num(params, 'cantidad', 60))));
  const size = Math.max(0.5, num(params, 'tamanoMedioPx', 4));
  return {
    id: 'particles',
    label: 'partículas',
    tech: 'Canvas 2D (sin dependencias)',
    why: 'Para motas pequeñas, Canvas 2D es más barato que WebGL y suficiente.',
    performance: `Limita a ${count} partículas, pausa con document.hidden y respeta prefers-reduced-motion.`,
    install: [],
    snippets: [
      {
        language: 'js',
        filename: 'particles.mjs',
        code: `const canvas = document.createElement('canvas');
canvas.dataset.veParticles = '';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D no disponible');

const dpr = Math.min(2, window.devicePixelRatio || 1);
const particles = Array.from({ length: ${count} }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: ${round(size * 0.4, 2)} + Math.random() * ${round(size, 2)},
  vx: (Math.random() - 0.5) * 0.0008,
  vy: -0.0004 - Math.random() * 0.0006,
  a: 0.15 + Math.random() * 0.45,
}));

function resize() {
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
}
resize();
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min(48, now - last);
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.x = (p.x + p.vx * dt + 1) % 1;
    p.y = (p.y + p.vy * dt + 1) % 1;
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r * dpr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(18, 224, 200, ' + p.a + ')';
    ctx.fill();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) last = performance.now();
});`,
      },
    ],
    checked: false,
  };
}

function blur(params: Record<string, number | string>): EffectRecommendation {
  const softness = num(params, 'suavidad', 0.5);
  return {
    id: 'blur',
    label: 'desenfoque',
    tech: 'CSS (backdrop-filter)',
    why: 'Si el desenfoque es de fondo, backdrop-filter evita renderizar una segunda escena.',
    performance: 'backdrop-filter es caro a pantalla completa; aplícalo a paneles pequeños y mide fps.',
    install: [],
    snippets: [
      {
        language: 'css',
        filename: 'blur.css',
        code: `.ve-blurred {
  backdrop-filter: blur(${Math.round(2 + softness * 18)}px) saturate(${round(1 + softness * 0.4, 2)});
  -webkit-backdrop-filter: blur(${Math.round(2 + softness * 18)}px) saturate(${round(1 + softness * 0.4, 2)});
  background: rgba(5, 7, 13, 0.35);
}
/* Desenfoque de imagen de fondo sin costo de backdrop:
   filter: blur(8px); transform: scale(1.05); */`,
      },
    ],
    checked: false,
  };
}

function parallax(params: Record<string, number | string>): EffectRecommendation {
  const separation = num(params, 'separacionPx', 3);
  return {
    id: 'parallax',
    label: 'parallax',
    tech: 'GSAP + CSS transforms',
    why: 'Tres capas con velocidades distintas bastan; no requiere WebGL.',
    performance: 'Anima sólo transform; usa will-change en las capas y desactívalo con reduced-motion.',
    install: ['gsap'],
    snippets: [
      {
        language: 'js',
        filename: 'parallax.mjs',
        code: `import { gsap } from 'gsap';

const layers = [...document.querySelectorAll('[data-ve-depth]')];
if (layers.length < 2) throw new Error('Se necesitan al menos dos capas [data-ve-depth]');

const onMove = (event) => {
  const x = event.clientX / window.innerWidth - 0.5;
  const y = event.clientY / window.innerHeight - 0.5;
  layers.forEach((layer, index) => {
    const depth = (index + 1) / layers.length;
    gsap.to(layer, { x: -x * depth * ${round(separation * 6, 1)}, y: -y * depth * ${round(separation * 4, 1)}, duration: 0.6, ease: 'power2.out' });
  });
};
window.addEventListener('pointermove', onMove, { passive: true });
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.removeEventListener('pointermove', onMove);`,
      },
    ],
    checked: false,
  };
}

function glitch(params: Record<string, number | string>): EffectRecommendation {
  const offset = Math.max(1, Math.round(num(params, 'desplazamientoCanalesPx', 2)));
  return {
    id: 'glitch',
    label: 'glitch',
    tech: 'CSS clip-path + JS intermitente',
    why: 'El glitch funciona por interrupciones cortas; continuo se lee como error.',
    performance: 'Evita animar filtros a pantalla completa; usa pasos y duraciones cortas.',
    install: [],
    snippets: [
      {
        language: 'css',
        filename: 'glitch.css',
        code: `.ve-glitch { position: relative; }
.ve-glitch::before,
.ve-glitch::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.ve-glitch::before { color: #ff2d55; transform: translateX(-${offset}px); mix-blend-mode: screen; }
.ve-glitch::after { color: #12e0c8; transform: translateX(${offset}px); mix-blend-mode: screen; }
.ve-glitch.is-active::before { animation: ve-slice 180ms steps(2) 1; }
.ve-glitch.is-active::after { animation: ve-slice 220ms steps(2) 1 reverse; }
@keyframes ve-slice {
  0% { clip-path: inset(10% 0 60% 0); }
  50% { clip-path: inset(55% 0 15% 0); }
  100% { clip-path: inset(25% 0 40% 0); }
}`,
      },
      {
        language: 'js',
        filename: 'glitch.mjs',
        code: `const targets = [...document.querySelectorAll('.ve-glitch')];
if (!targets.length) throw new Error('Falta .ve-glitch');

function burst() {
  targets.forEach((el) => el.classList.add('is-active'));
  setTimeout(() => targets.forEach((el) => el.classList.remove('is-active')), 240);
  setTimeout(burst, 1600 + Math.random() * 2600);
}
setTimeout(burst, 900);`,
      },
    ],
    checked: false,
  };
}

function lighting(params: Record<string, number | string>): EffectRecommendation {
  const vignette = num(params, 'vineta', 0.2);
  return {
    id: 'lighting',
    label: 'iluminación',
    tech: 'CSS (degradado radial)',
    why: 'Un foco radial y una viñeta se resuelven con gradientes, sin shaders.',
    performance: 'Los degradados son baratos si no se animan a pantalla completa; anima opacidad de una capa.',
    install: [],
    snippets: [
      {
        language: 'css',
        filename: 'lighting.css',
        code: `.ve-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 62% 38%, rgba(18, 224, 200, 0.22), transparent 46%),
    radial-gradient(circle at 50% 50%, transparent 52%, rgba(0, 0, 0, ${round(vignette, 2)}) 100%);
}
.ve-light::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 40%, rgba(255, 180, 84, 0.12), transparent 30%);
  animation: ve-light-drift 9s ease-in-out infinite alternate;
}
@keyframes ve-light-drift { to { transform: translate3d(8%, -4%, 0); } }
@media (prefers-reduced-motion: reduce) { .ve-light::after { animation: none; } }`,
      },
    ],
    checked: false,
  };
}

function reflections(params: Record<string, number | string>): EffectRecommendation {
  const axis = num(params, 'ejeY', 0.7);
  return {
    id: 'reflections',
    label: 'reflejos',
    tech: 'CSS transforms + mask',
    why: 'Una copia invertida con degradado de opacidad reproduce el reflejo sin duplicar el DOM real.',
    performance: 'Duplica el coste de pintado de esa zona; úsalo en elementos pequeños.',
    install: [],
    snippets: [
      {
        language: 'css',
        filename: 'reflection.css',
        code: `.ve-reflect {
  position: relative;
}
.ve-reflect::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 40%;
  background: inherit;
  transform: scaleY(-1);
  transform-origin: top;
  opacity: 0.28;
  filter: blur(2px);
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.65), transparent ${Math.round(Math.min(95, axis * 100))}%);
}`,
      },
    ],
    checked: false,
  };
}

function distortion(params: Record<string, number | string>): EffectRecommendation {
  const amplitude = num(params, 'amplitudPx', 2);
  return {
    id: 'distortion',
    label: 'distorsión',
    tech: 'SVG feTurbulence o shader',
    why: 'Para una ondulación suave, un filtro SVG animado es suficiente; el shader queda para 3D.',
    performance: 'feTurbulence animado es costoso; limita el área o usa una textura precalculada.',
    install: [],
    snippets: [
      {
        language: 'css',
        filename: 'distortion.css',
        code: `.ve-distort {
  filter: url(#ve-ripple);
}
/* SVG inline necesario:
<filter id="ve-ripple">
  <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7">
    <animate attributeName="baseFrequency" dur="7s" values="0.008 0.02;0.012 0.03;0.008 0.02" repeatCount="indefinite" />
  </feTurbulence>
  <feDisplacementMap in="SourceGraphic" scale="${round(amplitude * 3, 1)}" />
</filter>
*/`,
      },
    ],
    checked: false,
  };
}

function grain(params: Record<string, number | string>): EffectRecommendation {
  const intensity = num(params, 'intensidad', 0.25);
  return {
    id: 'grain',
    label: 'grano',
    tech: 'CSS + SVG noise',
    why: 'El grano animado en SVG rompe el banding de los degradados sin vídeo adicional.',
    performance: 'Una capa fija con opacidad baja; no recalcules el SVG cada frame.',
    install: [],
    snippets: [
      {
        language: 'css',
        filename: 'grain.css',
        code: `.ve-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: ${round(intensity, 2)};
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  animation: ve-grain-shift 1.2s steps(3) infinite;
}
@keyframes ve-grain-shift {
  0% { transform: translate3d(0, 0, 0); }
  33% { transform: translate3d(-2%, 1%, 0); }
  66% { transform: translate3d(1%, -2%, 0); }
  100% { transform: translate3d(0, 0, 0); }
}`,
      },
    ],
    checked: false,
  };
}

const BUILDERS: Record<string, (p: Record<string, number | string>) => EffectRecommendation> = {
  glow,
  bloom,
  particles,
  blur,
  parallax,
  glitch,
  lighting,
  reflections,
  distortion,
  grain,
};

export function recommendEffect(id: string, params: Record<string, number | string> = {}): EffectRecommendation {
  const builder = BUILDERS[id];
  if (!builder) throw new Error(`Sin recomendación para el efecto "${id}". Disponibles: ${Object.keys(BUILDERS).join(', ')}`);
  return builder(params);
}

/** Valida sintaxis JS real con `node --check` sobre un archivo temporal .mjs. */
export function checkJsSnippet(code: string): { ok: boolean; output: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-snippet-'));
  const file = path.join(dir, 'snippet.mjs');
  fs.writeFileSync(file, code, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe', encoding: 'utf8' });
    return { ok: true, output: '' };
  } catch (e: any) {
    return { ok: false, output: String(e.stderr ?? e.message).slice(0, 500) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Recomendaciones con los snippets JS ya validados. */
export function recommendAndCheck(id: string, params: Record<string, number | string> = {}): EffectRecommendation {
  const rec = recommendEffect(id, params);
  const js = rec.snippets.filter((s) => s.language === 'js');
  if (js.length) {
    const results = js.map((s) => checkJsSnippet(s.code));
    rec.checked = results.every((r) => r.ok);
    rec.checkOutput = results.map((r) => r.output).filter(Boolean).join('\n');
  } else {
    rec.checked = true;
  }
  return rec;
}

export function recommendationCatalog(): string[] {
  return Object.keys(BUILDERS);
}
