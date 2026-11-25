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

const stage = document.querySelector('#stage');
const css = getComputedStyle(document.body);
const accent = css.getPropertyValue('--accent').trim() || '#12e0c8';
const accent2 = css.getPropertyValue('--accent-2').trim() || '#ffb454';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
stage.appendChild(renderer.domElement);

const scene = new Scene();
const camera = new PerspectiveCamera(48, 1, 0.1, 120);
camera.position.set(0, 0.2, 6.2);

const COUNT = 3000;
const positions = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  const radius = 1.1 + Math.pow(Math.random(), 1.7) * 3.4;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const flat = 0.55 + Math.random() * 0.5;
  positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = radius * Math.cos(phi) * flat * 0.75;
  positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  seeds[i] = Math.random();
}

const geometry = new BufferGeometry();
geometry.setAttribute('position', new BufferAttribute(positions, 3));
geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

const material = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uAccent: { value: new Color(accent) },
    uWarm: { value: new Color(accent2) },
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
      float t = uTime * 0.22 + aSeed * 6.2831;
      p.x += sin(t) * 0.16;
      p.y += cos(t * 1.3) * 0.13;
      p.z += sin(t * 0.7) * 0.16;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.2 + aSeed * 3.4) * uDpr * (7.0 / max(0.6, -mv.z));
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
      float core = smoothstep(0.5, 0.02, d);
      float pulse = 0.62 + 0.38 * sin(uTime * 1.7 + vSeed * 24.0);
      vec3 col = mix(uAccent, uWarm, smoothstep(0.72, 1.0, vSeed));
      float fade = smoothstep(9.0, 3.0, vDepth);
      gl_FragColor = vec4(col, core * pulse * (0.35 + 0.65 * fade));
    }
  `,
});
const points = new Points(geometry, material);
scene.add(points);

const ringGeometry = new TorusGeometry(2.9, 0.006, 8, 220);
const ringMaterial = new MeshBasicMaterial({ color: new Color(accent), transparent: true, opacity: 0.32, blending: AdditiveBlending });
const ring = new Mesh(ringGeometry, ringMaterial);
ring.rotation.set(1.15, 0.2, 0.3);
scene.add(ring);

const ring2 = new Mesh(new TorusGeometry(3.5, 0.004, 8, 240), new MeshBasicMaterial({ color: new Color(accent2), transparent: true, opacity: 0.18, blending: AdditiveBlending }));
ring2.rotation.set(0.72, -0.4, -0.2);
scene.add(ring2);

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
  pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
});

function resize() {
  const w = stage.clientWidth || innerWidth;
  const h = stage.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const start = performance.now();
let raf = 0;
const render = () => {
  const elapsed = (performance.now() - start) / 1000;
  const t = reduce ? 3.2 : elapsed;
  material.uniforms.uTime.value = t;
  pointer.x += (pointer.tx - pointer.x) * 0.035;
  pointer.y += (pointer.ty - pointer.y) * 0.035;
  points.rotation.y = t * 0.055 + pointer.x * 0.18;
  points.rotation.x = pointer.y * 0.12;
  ring.rotation.z = 0.3 + t * 0.03;
  ring2.rotation.z = -0.2 - t * 0.02;
  camera.position.x = pointer.x * 0.5;
  camera.position.y = 0.2 + pointer.y * 0.35;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  raf = requestAnimationFrame(render);
};
render();

addEventListener('beforeunload', () => {
  cancelAnimationFrame(raf);
  geometry.dispose();
  material.dispose();
  ringGeometry.dispose();
  ringMaterial.dispose();
  renderer.dispose();
});

window.__veReady = true;
