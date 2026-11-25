import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './paths.js';
import { text } from './run.js';

export interface AdapterInfo {
  id: string;
  title: string;
  license: string;
  freeTier: string;
  npm: string[];
  capabilities: string[];
  notes: string[];
}

/** Adaptadores de integración de las siete herramientas visuales. */
export const ADAPTERS: AdapterInfo[] = [
  {
    id: 'gsap',
    title: 'GSAP · timelines y secuencias',
    license: 'GSAP standard (uso gratuito; Club GSAP de pago no incluido)',
    freeTier: 'Núcleo, ScrollTrigger, Flip y MotionPath son gratuitos.',
    npm: ['gsap'],
    capabilities: ['web-animation', 'timeline', 'svg'],
    notes: [
      'No usar SplitText ni ScrollSmoother (Club). El scaffold separa caracteres a mano.',
      'Registrar plugins sólo si se usan: `gsap.registerPlugin(ScrollTrigger)`.',
      'Limpiar con `tl.kill()` y `ScrollTrigger.getAll().forEach(t => t.kill())` al desmontar.',
    ],
  },
  {
    id: 'three',
    title: 'Three.js · 3D, shaders y partículas',
    license: 'MIT',
    freeTier: 'Completo y gratuito.',
    npm: ['three'],
    capabilities: ['webgl-3d', 'shaders', 'particles'],
    notes: [
      'Limitar pixelRatio a 2 para no quemar GPU en pantallas 4K.',
      'Liberar geometrías, materiales y renderer al desmontar.',
      'Un solo renderer por página; pausar el loop con `document.hidden`.',
    ],
  },
  {
    id: 'motion',
    title: 'Motion · animación declarativa',
    license: 'MIT',
    freeTier: 'Completo y gratuito.',
    npm: ['motion'],
    capabilities: ['web-animation', 'springs', 'gestures'],
    notes: [
      'En React: `import { motion, AnimatePresence } from "motion/react"`.',
      'En JS puro: `import { animate, stagger } from "motion"`.',
      'Respeta `prefers-reduced-motion` en animaciones grandes.',
    ],
  },
  {
    id: 'remotion',
    title: 'Remotion · vídeo con React',
    license: 'Remotion License: gratis para individuos y equipos pequeños; no es MIT',
    freeTier: 'Uso local sin coste dentro del umbral de la licencia.',
    npm: ['remotion', '@remotion/cli', 'react', 'react-dom'],
    capabilities: ['programmatic-render', 'video', 'captions'],
    notes: [
      'El render necesita Chromium propio de Remotion; el primer render lo descarga.',
      'Composición determinista: nada de Math.random sin semilla (usa `random()` de remotion).',
      'Verifica el umbral de empresa de la licencia antes de uso comercial.',
    ],
  },
  {
    id: 'react-bits',
    title: 'React Bits · componentes listos',
    license: 'MIT / CC-BY-4.0 (atribución en los componentes CC-BY)',
    freeTier: 'Copia libre de componentes; sin registro.',
    npm: [],
    capabilities: ['react-components', 'text-effects', 'backgrounds'],
    notes: [
      'Son componentes copiables: no hay paquete npm ni CDN oficial fiable.',
      'El scaffold genera una implementación propia inspirada en el patrón; no copia código de terceros.',
      'Si copias un componente CC-BY, conserva el crédito del autor original en el archivo.',
    ],
  },
  {
    id: 'playwright',
    title: 'Playwright · captura y pruebas visuales',
    license: 'Apache-2.0',
    freeTier: 'Completo; los navegadores pesan ~130 MB cada uno.',
    npm: ['playwright'],
    capabilities: ['browser-capture', 'visual-testing'],
    notes: [
      'Instalar navegadores con `npx playwright install chromium`.',
      'Fijar `viewport`, `deviceScaleFactor` y `colorScheme` para capturas comparables.',
      'Esperar a `window.__veReady === true` antes de capturar si hay animación de entrada.',
    ],
  },
  {
    id: 'ffmpeg',
    title: 'FFmpeg · fotogramas y codificación',
    license: 'LGPL/GPL según build (el binario del sistema manda)',
    freeTier: 'Gratuito.',
    npm: [],
    capabilities: ['video-processing', 'frames', 'encoding'],
    notes: [
      'Invocar con `spawn` y argumentos en array: nunca construir una shell con rutas del usuario.',
      'Reutilizar `-ss` antes de `-i` para seeks rápidos.',
      'Salida `yuv420p` y dimensiones pares para máxima compatibilidad.',
    ],
  },
];

export interface ScaffoldFile {
  path: string;
  content: string;
}

export interface Scaffold {
  id: string;
  title: string;
  outDir: string;
  files: string[];
  install: string[];
  entry: string | null;
  notes: string[];
  checked: { file: string; ok: boolean; output: string }[];
}

const GSAP_JS = `import { gsap } from 'gsap';

/**
 * Secuencia de entrada del héroe. Sin plugins de Club.
 * Devuelve una función de limpieza para desmontar sin fugas.
 */
export function playHero(root, { delay = 0, duration = 1.2 } = {}) {
  const chars = root.querySelectorAll('[data-split] > span');
  const layers = root.querySelectorAll('[data-layer]');
  const tl = gsap.timeline({ delay });

  gsap.set(chars, { yPercent: 120, opacity: 0, rotate: 4 });
  tl.to(chars, {
    yPercent: 0,
    opacity: 1,
    rotate: 0,
    duration: 0.9,
    ease: 'expo.out',
    stagger: { each: 0.025, from: 'start' },
  }, 0)
    .from(layers, {
      opacity: 0,
      y: 24,
      filter: 'blur(12px)',
      duration,
      ease: 'power3.out',
      stagger: 0.09,
    }, 0.15);

  return () => tl.kill();
}
`;

const GSAP_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>GSAP · héroe</title>
<style>
  :root { color-scheme: dark; --bg:#070b12; --ink:#eaf3ff; --accent:#12e0c8; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:
    radial-gradient(120% 80% at 20% 0%, #123 0%, var(--bg) 55%); color:var(--ink);
    font: 600 clamp(28px, 6vw, 68px)/1.02 ui-sans-serif, system-ui, sans-serif; letter-spacing:-0.03em; }
  .hero { padding: 8vh 7vw; }
  h1 { margin:0 0 18px; }
  [data-split] { display:inline-flex; overflow:hidden; }
  [data-split] > span { display:inline-block; will-change: transform; }
  p { margin:0; font-weight:400; font-size:clamp(14px,1.6vw,18px); opacity:.72; max-width:46ch; }
  .rule { height:1px; background:linear-gradient(90deg, var(--accent), transparent); margin:22px 0; width:min(420px,60vw); }
</style>
</head>
<body>
  <main class="hero">
    <h1><span data-split data-text="Diseño con intención"></span></h1>
    <div class="rule"></div>
    <p data-layer>Movimiento medido, no decorativo. Cada elemento entra con una razón y sale cuando deja de aportar.</p>
  </main>
  <script type="importmap">{ "imports": { "gsap": "/node_modules/gsap/index.js" } }</script>
  <script type="module">
    import { playHero } from './hero-timeline.js';
    // divide el texto en caracteres sin SplitText
    document.querySelectorAll('[data-split]').forEach((el) => {
      const text = el.dataset.text || el.textContent || '';
      el.textContent = '';
      for (const ch of text) {
        const s = document.createElement('span');
        s.textContent = ch === ' ' ? '\\u00a0' : ch;
        el.appendChild(s);
      }
    });
    playHero(document.querySelector('.hero'));
    document.documentElement.dataset.veReady = 'true';
    window.__veReady = true;
  </script>
</body>
</html>
`;

const THREE_JS = `import * as THREE from 'three';

/**
 * Nebulosa de partículas con shader propio. Sin texturas externas.
 * Respeta reducción de movimiento y libera todos los recursos.
 */
export function createNebula(container, { count = 4000, accent = '#12e0c8' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 5;

  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 1.4 + Math.random() * 1.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(accent) },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: \`
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        p.x += sin(uTime * 0.35 + aSeed * 6.2831) * 0.12;
        p.y += cos(uTime * 0.28 + aSeed * 6.2831) * 0.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + aSeed * 4.0) * uPixelRatio * (6.0 / -mv.z);
      }
    \`,
    fragmentShader: \`
      uniform vec3 uColor;
      uniform float uTime;
      varying float vSeed;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float core = smoothstep(0.5, 0.0, d);
        float pulse = 0.55 + 0.45 * sin(uTime * 2.0 + vSeed * 20.0);
        vec3 warm = vec3(1.0, 0.72, 0.36);
        vec3 col = mix(uColor, warm, smoothstep(0.75, 1.0, vSeed));
        gl_FragColor = vec4(col, core * pulse * 0.85);
      }
    \`,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const render = () => {
    material.uniforms.uTime.value = reduce ? 2.4 : clock.getElapsedTime();
    points.rotation.y += reduce ? 0 : 0.0016;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(render);
  };
  render();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
`;

const MOTION_JS = `import { animate, stagger, spring } from 'motion';

/** Entrada escalonada con springs. Compatible con motion/react si se adapta el import. */
export function revealCards(root) {
  const cards = [...root.querySelectorAll('[data-card]')];
  if (!cards.length) return () => {};

  const controls = cards.map((card, i) =>
    animate(
      card,
      { opacity: [0, 1], transform: ['translateY(28px) scale(.96)', 'translateY(0) scale(1)'], filter: ['blur(10px)', 'blur(0px)'] },
      { duration: 0.9, delay: i * 0.08, easing: spring({ stiffness: 140, damping: 18 }) },
    ),
  );
  return () => controls.forEach((c) => c.stop());
}
`;

const REMOTION_SCENE = `import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const VisualScene = ({ title = 'Visual Engine', accent = '#12e0c8' }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const exit = interpolate(frame, [durationInFrames - 24, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
  const glow = 0.55 + Math.sin(frame / 14) * 0.25;

  return (
    <AbsoluteFill style={{ backgroundColor: '#070b12', color: '#eaf3ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <AbsoluteFill style={{ background: \`radial-gradient(60% 50% at 50% 45%, \${accent}22, transparent 70%)\` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: exit }}>
        <div style={{ transform: \`translateY(\${(1 - enter) * 40}px)\`, textAlign: 'center' }}>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: '-0.04em' }}>{title}</div>
          <div style={{ marginTop: 18, height: 2, width: 320, background: accent, opacity: glow, borderRadius: 2 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
`;

const REMOTION_ROOT = `import React from 'react';
import { Composition } from 'remotion';
import { VisualScene } from './VisualScene';

export const RemotionRoot = () => (
  <Composition id="VisualScene" component={VisualScene} durationInFrames={150} fps={30} width={1080} height={1920} defaultProps={{ title: 'Visual Engine', accent: '#12e0c8' }} />
);
`;

const REMOTION_INDEX = `import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);
`;

const REACT_BITS = `import React, { useEffect, useRef } from 'react';

/**
 * AuroraText — implementación propia (MIT, Visual Engine).
 * Patrón inspirado en la familia de efectos de texto de React Bits;
 * no contiene código copiado de terceros ni assets externos.
 */
export function AuroraText({ text = 'Visual Engine', accent = '#12e0c8', className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = [...el.querySelectorAll('span')];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      chars.forEach((c) => { c.style.transform = 'none'; c.style.opacity = '1'; });
      return;
    }
    chars.forEach((c, i) => {
      c.animate(
        [
          { transform: 'translateY(0.6em)', opacity: 0, filter: 'blur(8px)' },
          { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' },
        ],
        { duration: 700, delay: i * 28, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
      );
      c.animate(
        [
          { backgroundPosition: '0% 50%' },
          { backgroundPosition: '100% 50%' },
          { backgroundPosition: '0% 50%' },
        ],
        { duration: 5200 + i * 90, iterations: Infinity, easing: 'ease-in-out' },
      );
    });
  }, []);

  return (
    <span ref={ref} className={className} style={{ display: 'inline-flex', gap: '0.02em' }}>
      {[...text].map((ch, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            backgroundImage: \`linear-gradient(100deg, #f7fbff 0%, \${accent} 42%, #7bd8ff 70%, #f7fbff 100%)\`,
            backgroundSize: '220% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {ch === ' ' ? '\\u00a0' : ch}
        </span>
      ))}
    </span>
  );
}
`;

const PLAYWRIGHT_TEST = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const TARGET = process.env.VE_TARGET || 'http://127.0.0.1:4173/';
const OUT = process.env.VE_OUT || 'visual-out';

test('la escena carga, no es plana y no lanza errores', async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(TARGET, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const file = path.join(OUT, 'shot.png');
  await page.screenshot({ path: file });
  const pixels = fs.statSync(file).size;
  await browser.close();

  assert.equal(errors.length, 0, 'errores de consola: ' + errors.join(' | '));
  assert.ok(pixels > 20_000, 'la captura parece vacía o plana');
});
`;

const FFMPEG_FRAMES = `import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

/**
 * Extrae fotogramas de un vídeo sin dependencias: argumentos en array, nunca shell.
 * Uso: node scripts/frames.mjs entrada.mp4 salida/ 12
 */
const [input, outDir = 'frames', count = '12'] = process.argv.slice(2);
if (!input) {
  console.error('Uso: node scripts/frames.mjs <video> [salida] [num]');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const ff = spawn('ffmpeg', ['-v', 'error', '-i', input, '-vf', \`fps=\${Number(count) / 3}\`, '-frames:v', count, \`\${outDir}/frame-%03d.png\`], { stdio: 'inherit' });
ff.on('close', (code) => process.exit(code ?? 0));
`;

const FFMPEG_ENCODE = `import { spawn } from 'node:child_process';

/**
 * Codifica una secuencia de PNG a MP4 H.264/yuv420p compatible con cualquier reproductor.
 * Uso: node scripts/encode.mjs frames/ salida.mp4 30
 */
const [dir = 'frames', out = 'out.mp4', fps = '30'] = process.argv.slice(2);
const ff = spawn('ffmpeg', [
  '-v', 'error', '-y',
  '-framerate', fps,
  '-i', \`\${dir}/frame-%03d.png\`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  out,
], { stdio: 'inherit' });
ff.on('close', (code) => process.exit(code ?? 0));
`;

const PREVIEW_HTML = (imports: string, body: string, module: string) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Visual Engine · scaffold</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: #070b12; color: #eaf3ff; font-family: ui-sans-serif, system-ui, sans-serif; }
  #stage { position: fixed; inset: 0; }
  .card { position: absolute; left: 6vw; bottom: 8vh; padding: 22px 26px; border-radius: 18px;
    border: 1px solid rgba(255,255,255,.12); background: rgba(10,16,26,.55); backdrop-filter: blur(18px); max-width: 46ch; }
  .card h1 { margin: 0 0 8px; font-size: clamp(22px, 3vw, 34px); letter-spacing: -.03em; }
  .card p { margin: 0; opacity: .7; font-size: 15px; line-height: 1.5; }
  [data-card] { opacity: 0; }
</style>
</head>
<body>
  <div id="stage"></div>
  ${body}
  <script type="importmap">{ "imports": ${imports} }</script>
  <script type="module">${module}</script>
</body>
</html>`;

function scaffoldGsap(outDir: string): ScaffoldFile[] {
  return [
    { path: 'hero-timeline.js', content: GSAP_JS },
    { path: 'preview.html', content: GSAP_HTML },
    {
      path: 'README.md',
      content: `# GSAP\n\nSirve el proyecto desde la raíz (para resolver \`/node_modules/gsap/index.js\`):\n\n\`\`\`bash\nnpx serve .\n# abre /visual/gsap/preview.html\n\`\`\`\n\nSin plugins de Club. Verifica el resultado con \`ve capture\`.\n`,
    },
  ].map((f) => ({ ...f, path: path.join(outDir, f.path) }));
  void outDir;
}

function scaffoldThree(outDir: string): ScaffoldFile[] {
  const preview = PREVIEW_HTML(
    '{ "three": "/node_modules/three/build/three.module.js" }',
    '<div class="card" data-card><h1>Nebulosa</h1><p>Partículas con shader propio, mezcla aditiva y pulso orgánico. Sin texturas externas.</p></div>',
    `import { createNebula } from './nebula.js';
const stage = document.getElementById('stage');
const dispose = createNebula(stage, { accent: '#12e0c8' });
document.querySelectorAll('[data-card]').forEach((el, i) => {
  el.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }],
    { duration: 900, delay: 250 + i * 90, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
});
window.addEventListener('beforeunload', dispose);
window.__veReady = true;`,
  );
  return [
    { path: path.join(outDir, 'nebula.js'), content: THREE_JS },
    { path: path.join(outDir, 'preview.html'), content: preview },
    {
      path: path.join(outDir, 'README.md'),
      content: '# Three.js\n\n`nebula.js` exporta `createNebula(container, opciones)` y devuelve la función de limpieza.\n\nServir desde la raíz del proyecto para que el importmap resuelva `/node_modules/three/build/three.module.js`.\n',
    },
  ];
}

function scaffoldMotion(outDir: string): ScaffoldFile[] {
  return [
    { path: path.join(outDir, 'reveal.js'), content: MOTION_JS },
    {
      path: path.join(outDir, 'README.md'),
      content: '# Motion\n\n`reveal.js` usa `animate`/`spring` de `motion`. En React cambia el import a `motion/react` y usa `<motion.div />`.\n\nRequiere bundler o importmap que resuelva `motion`.\n',
    },
  ];
}

function scaffoldRemotion(outDir: string): ScaffoldFile[] {
  return [
    { path: path.join(outDir, 'index.ts'), content: REMOTION_INDEX },
    { path: path.join(outDir, 'Root.tsx'), content: REMOTION_ROOT },
    { path: path.join(outDir, 'VisualScene.tsx'), content: REMOTION_SCENE },
    {
      path: path.join(outDir, 'README.md'),
      content: '# Remotion\n\nCopia estos archivos a `src/` de un proyecto Remotion 4 y ejecuta:\n\n```bash\nnpm i remotion @remotion/cli react react-dom\nnpx remotion studio\nnpx remotion render VisualScene out.mp4\n```\n\nLicencia Remotion: no es MIT. Comprueba el umbral de empresa antes de uso comercial.\n',
    },
  ];
}

function scaffoldReactBits(outDir: string): ScaffoldFile[] {
  return [
    { path: path.join(outDir, 'AuroraText.jsx'), content: REACT_BITS },
    {
      path: path.join(outDir, 'README.md'),
      content: '# React Bits\n\nComponente propio (MIT) con el patrón de texto aurora. No copia código de React Bits.\n\nSi usas un componente original de React Bits con licencia CC-BY, conserva la atribución del autor.\n',
    },
  ];
}

function scaffoldPlaywright(outDir: string): ScaffoldFile[] {
  return [
    { path: path.join(outDir, 'visual.test.mjs'), content: PLAYWRIGHT_TEST },
    {
      path: path.join(outDir, 'README.md'),
      content: '# Playwright\n\n```bash\nnpm i -D playwright\nnpx playwright install chromium\nnode --test visual/playwright/visual.test.mjs\n```\n\nAjusta `VE_TARGET` a la URL servida de tu proyecto.\n',
    },
  ];
}

function scaffoldFfmpeg(outDir: string): ScaffoldFile[] {
  return [
    { path: path.join(outDir, 'frames.mjs'), content: FFMPEG_FRAMES },
    { path: path.join(outDir, 'encode.mjs'), content: FFMPEG_ENCODE },
    {
      path: path.join(outDir, 'README.md'),
      content: '# FFmpeg\n\n```bash\nnode scripts/frames.mjs video.mp4 frames 12\nnode scripts/encode.mjs frames out.mp4 30\n```\n\nSin dependencias npm; usa el ffmpeg del sistema.\n',
    },
  ];
}

const BUILDERS: Record<string, (outDir: string) => ScaffoldFile[]> = {
  gsap: scaffoldGsap,
  three: scaffoldThree,
  motion: scaffoldMotion,
  remotion: scaffoldRemotion,
  'react-bits': scaffoldReactBits,
  playwright: scaffoldPlaywright,
  ffmpeg: scaffoldFfmpeg,
};

export function adapterInfo(id: string): AdapterInfo {
  const a = ADAPTERS.find((x) => x.id === id);
  if (!a) throw new Error(`Adaptador desconocido: ${id}. Disponibles: ${ADAPTERS.map((x) => x.id).join(', ')}`);
  return a;
}

/**
 * Genera los archivos del adaptador, los escribe y comprueba la sintaxis de los
 * archivos JavaScript de forma real con `node --check` (los .tsx/.jsx no se comprueban).
 */
export async function scaffoldAdapter(
  id: string,
  opts: { outDir: string; write?: boolean },
): Promise<Scaffold> {
  const info = adapterInfo(id);
  const build = BUILDERS[id];
  if (!build) throw new Error(`El adaptador ${id} no tiene scaffold`);
  const outDir = path.resolve(opts.outDir);
  const files = build(outDir);
  if (opts.write !== false) {
    for (const f of files) {
      ensureDir(path.dirname(f.path));
      if (fs.existsSync(f.path)) throw new Error(`No se sobrescribe: ${f.path}`);
      fs.writeFileSync(f.path, f.content, 'utf8');
    }
  }
  const checked: Scaffold['checked'] = [];
  for (const f of files) {
    if (!/\.(m?js)$/.test(f.path)) continue;
    const tmp = f.path + '.check.mjs';
    const target = opts.write === false ? path.join(outDir, path.basename(f.path)) : f.path;
    const r = await text(process.execPath, ['--check', target], { timeoutMs: 20_000 });
    checked.push({ file: target, ok: r.ok, output: (r.stderr || r.stdout).slice(0, 300) });
    if (opts.write === false) fs.rmSync(tmp, { force: true });
  }
  const entry = files.find((f) => f.path.endsWith('.html'));
  return {
    id,
    title: info.title,
    outDir,
    files: files.map((f) => f.path),
    install: info.npm,
    entry: entry?.path ?? null,
    notes: info.notes,
    checked,
  };
}
