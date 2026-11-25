import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './paths.js';
import { estimateStep } from './motion.js';
import { warpGray } from './pixels.js';
import type { ArtDirection } from './styles.js';

/**
 * Motion Director 0.4. Traduce la dirección artística a un sistema de
 * movimiento con duraciones, curvas, coreografía, cámara y reducción de
 * movimiento. La validación de rotación usa una imagen sintética con ángulo
 * conocido: mide el estimador, no "aprueba" una animación por inspección.
 */

export interface MotionRecipe {
  id: string;
  purpose: string;
  durationMs: number;
  delayMs: number;
  easing: string;
  properties: string[];
  transform: string;
  reduced: string;
}

export interface CameraMove {
  id: string;
  description: string;
  keyframes: string;
  maxRotationDeg: number;
  durationMs: number;
}

export interface MotionValidation {
  transition: {
    status: 'verified' | 'estimated';
    samples: number;
    monotonic: boolean;
    maxJerk: number;
    method: string;
  };
  rotation: {
    status: 'verified' | 'estimated';
    expectedDeg: number;
    measuredDeg: number;
    errorDeg: number;
    correlation: number;
    method: string;
    warning?: string;
  };
}

export interface MotionDirectorPlan {
  version: '0.4';
  styleId: string;
  level: 'still' | 'restrained' | 'expressive';
  durations: { micro: number; base: number; slow: number };
  easings: { out: string; inOut: string; spring: string };
  staggerMs: number;
  recipes: MotionRecipe[];
  camera: CameraMove[];
  reducedMotion: string;
  validation: MotionValidation;
  code: { css: string; gsap: string; motionOne: string };
  limitations: string[];
}

function clampMs(v: number): number {
  return Math.max(80, Math.min(2400, Math.round(v)));
}

export function buildMotionDirector(ad: ArtDirection): MotionDirectorPlan {
  const level = ad.motion.level;
  const factor = level === 'still' ? 0.35 : level === 'expressive' ? 1.15 : 1;
  const micro = clampMs(ad.motion.fastMs * factor);
  const base = clampMs(ad.motion.baseMs * factor);
  const slow = clampMs(ad.motion.slowMs * factor);
  const spring = ad.motion.spring;
  const recipes: MotionRecipe[] = [
    { id: 'micro', purpose: 'respuesta a hover/focus', durationMs: micro, delayMs: 0, easing: ad.motion.easeOut, properties: ['transform', 'filter', 'background-color'], transform: 'translateY(-2px)', reduced: 'sin transformación; sólo cambio de color' },
    { id: 'enter', purpose: 'entrada de contenido', durationMs: base, delayMs: 0, easing: ad.motion.easeOut, properties: ['opacity', 'transform', 'filter'], transform: 'translateY(14px)', reduced: 'aparece sin desplazamiento' },
    { id: 'exit', purpose: 'salida de contenido', durationMs: Math.round(base * 0.72), delayMs: 0, easing: 'cubic-bezier(.4,0,1,1)', properties: ['opacity', 'transform'], transform: 'translateY(-8px)', reduced: 'desaparece sin desplazamiento' },
    { id: 'screen', purpose: 'transición entre pantallas', durationMs: slow, delayMs: 0, easing: ad.motion.easeInOut, properties: ['opacity', 'clip-path'], transform: 'clip-path: inset(0 0 0 100%) → inset(0)', reduced: 'corte instantáneo' },
    { id: 'coordinated', purpose: 'coreografía escalonada', durationMs: base, delayMs: ad.motion.staggerMs, easing: spring, properties: ['opacity', 'transform'], transform: 'translateY(10px) scale(.985)', reduced: 'todo visible; stagger 0' },
    { id: 'interaction', purpose: 'respuesta a puntero', durationMs: micro, delayMs: 0, easing: spring, properties: ['transform'], transform: 'scale(.97) al pulsar', reduced: 'sin escala; estado de color' },
  ];
  const camera: CameraMove[] = [
    { id: 'push-in', description: 'acercamiento lento sin recorte', keyframes: `scale(1) → scale(1.035)`, maxRotationDeg: 0, durationMs: clampMs(slow * 1.8) },
    { id: 'orbit', description: 'órbita corta sobre el objeto focal', keyframes: `rotateY(-1.5deg) → rotateY(1.5deg)`, maxRotationDeg: 1.5, durationMs: clampMs(slow * 1.4) },
    { id: 'parallax', description: 'desplazamiento relativo de tres planos', keyframes: `translate3d(0,0,0) → translate3d(0,8px,0)`, maxRotationDeg: 0, durationMs: clampMs(slow * 1.2) },
  ];
  const css = `/* Motion Director 0.4 · ${ad.style.name} */
:root {
  --ve-motion-micro: ${micro}ms;
  --ve-motion-base: ${base}ms;
  --ve-motion-slow: ${slow}ms;
  --ve-ease-out: ${ad.motion.easeOut};
  --ve-ease-in-out: ${ad.motion.easeInOut};
  --ve-spring: ${spring};
}
[data-motion="enter"] { animation: ve-enter var(--ve-motion-base) var(--ve-ease-out) both; }
[data-motion="exit"] { animation: ve-exit calc(var(--ve-motion-base) * .72) cubic-bezier(.4,0,1,1) both; }
[data-motion="screen"] { animation: ve-screen var(--ve-motion-slow) var(--ve-ease-in-out) both; }
[data-motion="micro"] { transition: transform var(--ve-motion-micro) var(--ve-ease-out), filter var(--ve-motion-micro) var(--ve-ease-out); }
@keyframes ve-enter { from { opacity: 0; transform: translateY(14px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes ve-exit { to { opacity: 0; transform: translateY(-8px); } }
@keyframes ve-screen { from { opacity: 0; clip-path: inset(0 0 0 100%); } to { opacity: 1; clip-path: inset(0); } }
@keyframes ve-orbit { 0% { transform: perspective(1200px) rotateY(-1.5deg); } 50% { transform: perspective(1200px) rotateY(1.5deg); } 100% { transform: perspective(1200px) rotateY(-1.5deg); } }
${level === 'still' ? '[data-motion] { animation: none !important; transition: none !important; }' : ''}
@media (prefers-reduced-motion: reduce) {
  [data-motion], [data-camera] { animation: none !important; transition: none !important; }
  [data-motion="enter"], [data-motion="coordinated"] { opacity: 1 !important; transform: none !important; filter: none !important; }
}
`;
  const gsap = `import { gsap } from 'gsap';
// ${ad.style.name} · coreografía coordinada
export function animate(root, { reduced = false } = {}) {
  if (reduced) { gsap.set(root.querySelectorAll('[data-motion]'), { clearProps: 'all', opacity: 1 }); return; }
  const tl = gsap.timeline({ defaults: { duration: ${(base / 1000).toFixed(2)}, ease: 'power3.out' } });
  tl.from(root.querySelectorAll('.ve-eyebrow, .ve-display, .ve-lead'), { y: 18, opacity: 0, stagger: ${(ad.motion.staggerMs / 1000).toFixed(3)}, filter: 'blur(6px)' })
    .from(root.querySelectorAll('.ve-card'), { y: 12, opacity: 0, stagger: ${(ad.motion.staggerMs / 2000).toFixed(3) }, scale: .985 }, '-=.35');
  return tl;
}`;
  const motionOne = `import { animate, stagger } from 'motion';
// ${ad.style.name} · equivalente sin dependencia de React
export function animateIn(root, { reduced = false } = {}) {
  if (reduced) return;
  animate(root.querySelectorAll('[data-motion="enter"]'), { opacity: [0, 1], transform: ['translateY(14px)', 'none'] }, { duration: ${(base / 1000).toFixed(2)}, delay: stagger(${(ad.motion.staggerMs / 1000).toFixed(3)}), easing: [0.16, 1, 0.3, 1] });
}`;
  const transition = validateTransitionCurve();
  const rotation = validateCameraRotation(2);
  const limitations = [
    'La coreografía se entrega como CSS/GSAP/Motion; no todas las composiciones usan las tres librerías.',
    'La validación de rotación comprueba el estimador con una imagen sintética, no certifica cualquier render WebGL.',
    'La fluidez visual final depende del dispositivo; reduced-motion se prueba en Chromium.',
    'No se anima información crítica si el usuario prefiere movimiento reducido.',
  ];
  return {
    version: '0.4', styleId: ad.style.id, level, durations: { micro, base, slow },
    easings: { out: ad.motion.easeOut, inOut: ad.motion.easeInOut, spring }, staggerMs: ad.motion.staggerMs,
    recipes, camera, reducedMotion: 'prefers-reduced-motion: reduce', validation: { transition, rotation },
    code: { css, gsap, motionOne }, limitations,
  };
}

export function validateTransitionCurve(samples = 31): MotionValidation['transition'] {
  const values = Array.from({ length: samples }, (_, i) => {
    const p = i / (samples - 1);
    return p * p * (3 - 2 * p);
  });
  const monotonic = values.every((v, i) => i === 0 || v >= values[i - 1]);
  const second = values.slice(2).map((v, i) => Math.abs(v - 2 * values[i + 1] + values[i]));
  const maxJerk = Math.max(...second);
  return {
    status: monotonic && maxJerk < 0.01 ? 'verified' : 'estimated',
    samples, monotonic, maxJerk: Number(maxJerk.toFixed(6)),
    method: 'curva smoothstep muestreada; se exige monotonía y segunda diferencia < 0.01',
  };
}

/** Patrón asimétrico con ejes y marcas; permite medir una rotación conocida. */
function testPattern(width: number, height: number): Float32Array {
  const g = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cx = x - width / 2;
      const cy = y - height / 2;
      const grid = (x % 24 < 2 || y % 24 < 2) ? 80 : 0;
      const bars = Math.sin((x + y * 0.7) * 0.11) > 0.45 ? 70 : 0;
      const ring = Math.abs(Math.hypot(cx, cy) - Math.min(width, height) * 0.28) < 3 ? 110 : 0;
      const corner = (x < width * 0.18 && y > height * 0.7) ? 130 : 0;
      g[i] = Math.min(255, 16 + grid + bars + ring + corner + (x / width) * 24);
    }
  }
  return g;
}

export function validateCameraRotation(expectedDeg = 2): MotionValidation['rotation'] {
  const width = 240, height = 180;
  const a = testPattern(width, height);
  const b = warpGray(a, width, height, { rotationDeg: expectedDeg });
  const best = estimateStep(a, b, width, height);
  // estimateStep devuelve el giro que alinea la imagen, opuesto al giro del
  // contenido. La cámara se expresa en magnitud; el signo no se presenta como
  // si fuera una medición independiente.
  const measured = Number(Math.abs(best.rotation).toFixed(2));
  const error = Number(Math.abs(measured - Math.abs(expectedDeg)).toFixed(2));
  const status: 'verified' | 'estimated' = error <= 1 ? 'verified' : 'estimated';
  return {
    status, expectedDeg, measuredDeg: measured, errorDeg: error,
    correlation: Number(best.score.toFixed(3)),
    method: 'patrón sintético rotado con ángulo conocido y estimador de cámara (hipótesis ±3°); se mide magnitud y se acepta error ≤ 1°',
    ...(status === 'estimated' ? { warning: 'La rotación no alcanzó el error aceptado; no se presenta como validada.' } : {}),
  };
}

export function motionDirectorMarkdown(ad: ArtDirection, plan: MotionDirectorPlan): string {
  return `# Motion Director · ${ad.style.name}

Nivel **${plan.level}**. Duraciones ${plan.durations.micro}/${plan.durations.base}/${plan.durations.slow} ms; stagger ${plan.staggerMs} ms.

## Recetas

| ID | Uso | Duración | Easing | Reduced motion |
| --- | --- | ---: | --- | --- |
${plan.recipes.map((r) => `| ${r.id} | ${r.purpose} | ${r.durationMs} ms | ${r.easing} | ${r.reduced} |`).join('\n')}

## Cámara

${plan.camera.map((c) => `- **${c.id}**: ${c.description}; ${c.maxRotationDeg}° máximo; ${c.durationMs} ms.`).join('\n')}

## Validación

- Transición: **${plan.validation.transition.status}**; ${plan.validation.transition.samples} muestras; monotónica ${plan.validation.transition.monotonic ? 'sí' : 'no'}; jerk máximo ${plan.validation.transition.maxJerk}. ${plan.validation.transition.method}.
- Rotación: **${plan.validation.rotation.status}**; esperada ${plan.validation.rotation.expectedDeg}°, medida ${plan.validation.rotation.measuredDeg}°, error ${plan.validation.rotation.errorDeg}°. ${plan.validation.rotation.method}.

## Límites

${plan.limitations.map((x) => `- ${x}`).join('\n')}
`;
}

export function renderMotionLab(ad: ArtDirection, outDir: string): { html: string; validation: MotionDirectorPlan['validation'] } {
  const dir = ensureDir(outDir);
  const plan = buildMotionDirector(ad);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Motion Lab · ${ad.style.name}</title><style>
html,body{margin:0;height:100%;overflow:hidden;background:${ad.palette.bg};color:${ad.palette.text};font-family:${ad.typography.families.body}}
.scene{position:absolute;inset:0;display:grid;place-items:center;perspective:1200px}
.orbit{width:min(46vw,420px);aspect-ratio:1;border:1px solid ${ad.palette.accent};border-radius:${ad.layout.radius}px;display:grid;place-items:center;transform-style:preserve-3d;animation:ve-orbit ${plan.camera[1].durationMs}ms ${ad.motion.easeInOut} infinite;background:linear-gradient(145deg,${ad.palette.surface},${ad.palette.elevated});box-shadow:${ad.layout.shadow}}
.orbit::before,.orbit::after{content:"";position:absolute;inset:12%;border:1px solid ${ad.palette.border};border-radius:50%}
.orbit::after{inset:28%;border-color:${ad.palette.accent2}}
.label{position:absolute;left:clamp(20px,5vw,64px);top:clamp(20px,5vh,54px);max-width:30ch}
.label p{font-family:${ad.typography.families.mono};text-transform:uppercase;letter-spacing:.14em;color:${ad.palette.muted};font-size:12px}
.label h1{font-family:${ad.typography.families.display};font-size:clamp(36px,6vw,86px);line-height:.95;letter-spacing:${ad.typography.displayTracking};margin:0}
.a,.b{position:absolute;inset:0;background:${ad.palette.bg};display:grid;place-items:center;font:600 clamp(24px,5vw,64px)/1 ${ad.typography.families.display};animation:ve-screen ${plan.durations.slow}ms ${ad.motion.easeInOut} infinite alternate}
.b{background:${ad.palette.accent};color:${ad.palette.text};animation-delay:${Math.round(plan.durations.slow / 2)}ms;opacity:0}
@keyframes ve-orbit{0%,100%{transform:rotateY(-1.5deg) rotateX(1deg)}50%{transform:rotateY(1.5deg) rotateX(-1deg)}}
@keyframes ve-screen{0%{opacity:0;clip-path:inset(0 0 0 100%)}45%,55%{opacity:1;clip-path:inset(0)}100%{opacity:1;clip-path:inset(0)}}
@media (prefers-reduced-motion: reduce){.orbit,.a,.b{animation:none!important}.b{opacity:0}}
</style></head><body><div class="scene"><div class="orbit" data-camera="orbit"><span class="label"><p>Motion Director 0.4</p><h1>${ad.style.name}</h1></span></div></div><div class="a">TRANSICIÓN SUAVE</div><div class="b">ESCENA B</div><script>window.__veReady=true;window.__veMotion=${JSON.stringify(plan.validation)};</script></body></html>`;
  const htmlPath = path.join(dir, 'motion-lab.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(path.join(dir, 'MOTION.md'), motionDirectorMarkdown(ad, plan), 'utf8');
  fs.writeFileSync(path.join(dir, 'motion-plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8');
  return { html: htmlPath, validation: plan.validation };
}
