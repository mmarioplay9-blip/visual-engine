// Demo de extremo a extremo: Three.js para la estructura 3D y GSAP para la
// secuencia de tres actos que imita el ritmo de la referencia (corte cada 1 s).
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  WebGLRenderer,
} from 'three';

const canvas = document.querySelector('#stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = getComputedStyle(document.documentElement);

const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
const scene = new Scene();
const camera = new PerspectiveCamera(46, 1, 0.1, 60);
camera.position.set(0, 0.15, 6);

const COUNT = 2200;
const pos = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  const r = 1 + Math.pow(Math.random(), 1.8) * 3.1;
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(2 * Math.random() - 1);
  pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
  pos[i * 3 + 1] = r * Math.cos(ph) * 0.9;
  pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) * 0.8;
  seeds[i] = Math.random();
}

const geometry = new BufferGeometry();
geometry.setAttribute('position', new BufferAttribute(pos, 3));
geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

const material = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uAccent: { value: new Color(css.getPropertyValue('--accent').trim() || '#12e0c8') },
    uWarm: { value: new Color(css.getPropertyValue('--accent-2').trim() || '#ffb454') },
    uDpr: { value: renderer.getPixelRatio() },
  },
  vertexShader: `
    attribute float aSeed;
    uniform float uTime;
    uniform float uDpr;
    varying float vSeed;
    varying float vDepth;
    void main() {
      vSeed = aSeed;
      vec3 p = position;
      float t = uTime * 0.3 + aSeed * 6.2831;
      p.x += sin(t) * 0.14;
      p.y += cos(t * 1.2) * 0.12;
      p.z += sin(t * 0.8) * 0.14;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.1 + aSeed * 3.2) * uDpr * (7.0 / max(0.6, -mv.z));
    }
  `,
  fragmentShader: `
    uniform vec3 uAccent;
    uniform vec3 uWarm;
    uniform float uTime;
    varying float vSeed;
    varying float vDepth;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;
      float core = smoothstep(0.5, 0.04, d);
      float pulse = 0.68 + 0.32 * sin(uTime * 1.8 + vSeed * 22.0);
      vec3 col = mix(uAccent, uWarm, smoothstep(0.74, 1.0, vSeed));
      float fade = smoothstep(8.5, 2.5, vDepth);
      gl_FragColor = vec4(col, core * pulse * (0.44 + 0.56 * fade));
    }
  `,
});
const points = new Points(geometry, material);
scene.add(points);

const ringGeo = new TorusGeometry(2.5, 0.008, 8, 240);
const ringMat = new MeshBasicMaterial({ color: new Color('#12e0c8'), transparent: true, opacity: 0.4, blending: AdditiveBlending });
const ring = new Mesh(ringGeo, ringMat);
ring.rotation.set(1.25, 0.25, 0.15);
scene.add(ring);

const ring2 = new Mesh(new TorusGeometry(3.15, 0.005, 8, 240), new MeshBasicMaterial({ color: new Color('#ffb454'), transparent: true, opacity: 0.22, blending: AdditiveBlending }));
ring2.rotation.set(0.6, -0.5, -0.3);
scene.add(ring2);

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
  pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
});

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = { t: 0 };
let raf = 0;
function frame() {
  clock.t += reduce ? 0 : 0.016;
  material.uniforms.uTime.value = clock.t;
  pointer.x += (pointer.tx - pointer.x) * 0.04;
  pointer.y += (pointer.ty - pointer.y) * 0.04;
  points.rotation.y = clock.t * 0.07 + pointer.x * 0.2;
  points.rotation.x = pointer.y * 0.1;
  ring.rotation.z = 0.15 + clock.t * 0.02;
  ring2.rotation.z = -0.3 - clock.t * 0.014;
  camera.position.x = pointer.x * 0.35 + Math.sin(clock.t * 0.32) * 0.45;
  camera.position.y = 0.15 + pointer.y * 0.25 + Math.cos(clock.t * 0.24) * 0.22;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
}
frame();

// ---- Secuencia de tres actos (1 s por acto, igual que la referencia) ----
const gsap = window.gsap;
const title = document.querySelector('[data-split]');
const words = (title.textContent ?? '').trim().split(/\s+/);
title.textContent = '';
const letters = [];
for (const word of words) {
  const holder = document.createElement('span');
  holder.className = 'w';
  for (const ch of word) {
    const s = document.createElement('span');
    s.className = 'c';
    s.textContent = ch;
    holder.appendChild(s);
    letters.push(s);
  }
  title.appendChild(holder);
  title.appendChild(document.createTextNode(' '));
  holder.dataset.word = word;
}
// La última palabra se marca en color de acento.
const wordHolders = [...title.querySelectorAll('.w')];
wordHolders.at(-1)?.classList.add('lit');

const ACTS = [
  { accent: '#12e0c8', warm: '#ffb454', name: 'AURORA', ring: '#12e0c8', ring2: '#ffb454' },
  { accent: '#ffb454', warm: '#12e0c8', name: 'PRISMA', ring: '#ffb454', ring2: '#3a6cff' },
  { accent: '#7be9ff', warm: '#12e0c8', name: 'NÚCLEO', ring: '#eaf3ff', ring2: '#12e0c8' },
];
const actNodes = [...document.querySelectorAll('.act')];
const status = document.querySelector('#status');
const timeNode = document.querySelector('#time');

function setAct(index) {
  const act = ACTS[index % ACTS.length];
  const root = document.documentElement.style;
  root.setProperty('--accent', act.accent);
  root.setProperty('--accent-2', act.warm);
  material.uniforms.uAccent.value = new Color(act.accent);
  material.uniforms.uWarm.value = new Color(act.warm);
  ringMat.color = new Color(act.ring);
  ring2.material.color = new Color(act.ring2);
  actNodes.forEach((n, i) => n.classList.toggle('on', i === index % 3));
  status.textContent = `ACT 0${(index % 3) + 1} · ${act.name}`;
  if (window.gsap) {
    gsap.fromTo('.pulse', { opacity: 0 }, { opacity: 0.3, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: true });
    gsap.fromTo('.ring-wrap', { scale: 1.06 }, { scale: 1, duration: 1.1, ease: 'power3.out', overwrite: 'auto' });
  }
}

if (gsap) {
  gsap.set(letters, { yPercent: 118, rotate: 3 });
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .to('[data-fade]', { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.1)
    .to(letters, { yPercent: 0, rotate: 0, duration: 0.95, stagger: 0.02 }, 0.15)
    .fromTo('.brand', { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.8 }, 0.05)
    .fromTo('.chip', { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.8 }, 0.12);

  gsap.set('[data-fade]', { opacity: 0, y: 16 });

  let act = 0;
  setAct(0);
  const loop = gsap.timeline({ repeat: -1, delay: 0.4 });
  ACTS.forEach((_, i) => {
    loop.call(() => {
      act = i;
      setAct(i);
      timeNode.textContent = `00:0${i}`;
      gsap.fromTo(points.rotation, { z: 0 }, { z: 0.16, duration: 1, ease: 'sine.inOut', yoyo: true });
    });
    loop.to({}, { duration: 1 });
  });
} else {
  setAct(0);
}

setInterval(() => {
  const d = new Date();
  timeNode.textContent = `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}, 1000);

addEventListener('beforeunload', () => {
  cancelAnimationFrame(raf);
  geometry.dispose();
  material.dispose();
  ringGeo.dispose();
  ringMat.dispose();
  renderer.dispose();
});

setTimeout(() => {
  window.__veReady = true;
}, 450);
