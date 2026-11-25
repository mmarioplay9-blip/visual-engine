import { COMMON, num } from './kit.mjs';

const base = (extra = []) => [...COMMON, ...extra];

const header = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uBg;
uniform vec3 uAccent;
uniform vec3 uAccent2;
`;

export const effects = [
  {
    id: 'plasma-flow',
    name: 'Plasma Flow',
    category: 'shaders',
    summary: 'Plasma líquido con interferencia de ondas y paleta de dos temperaturas; shader procedural sin texturas.',
    tags: ['shader', 'webgl', 'glsl', 'plasma', 'procedural'],
    glsl: `${header}
uniform float uSpeed;
uniform float uIntensity;
uniform float uScale;
void main() {
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / max(1.0, uRes.y), 1.0);
  float t = uTime * max(0.0, uSpeed);
  vec2 q = uv * (0.7 + uScale * 2.2);
  float v = sin(q.x * 3.0 + t)
          + sin(q.y * 4.0 - t * 0.7)
          + sin((q.x + q.y) * 2.0 + t * 0.5)
          + sin(length(q) * 5.0 - t * 1.1);
  v *= 0.25;
  float band = 0.5 + 0.5 * sin(v * 6.283 + t * 0.3);
  vec3 col = mix(uBg, uAccent, smoothstep(0.08, 0.95, band) * uIntensity);
  float hot = pow(max(0.0, sin(v * 9.0 + t * 1.4)), 12.0);
  col += uAccent2 * hot * 0.45 * uIntensity;
  col += uAccent * 0.06 * smoothstep(1.0, 0.0, length(uv));
  gl_FragColor = vec4(col, 1.0);
}`,
    params: base([num('scale', 0.45, 'Escala del patrón', 0.1, 1.5, 0.05), num('intensity', 0.8, 'Intensidad cromática', 0.1, 1.3, 0.05)]),
  },
  {
    id: 'voronoi-cells',
    name: 'Voronoi Cells',
    category: 'shaders',
    summary: 'Células de Voronoi animadas con bordes luminosos y puntos de semilla; shader de coste fijo 3×3.',
    tags: ['shader', 'webgl', 'voronoi', 'celdas', 'procedural'],
    glsl: `${header}
uniform float uSpeed;
uniform float uScale;
uniform float uIntensity;
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
void main() {
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / max(1.0, uRes.y), 1.0);
  vec2 p = uv * (3.0 + uScale * 10.0);
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 best = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(ip + g);
      o = 0.5 + 0.5 * sin(uTime * uSpeed + 6.2831 * o);
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; best = ip + g; }
      else if (d < f2) { f2 = d; }
    }
  }
  float edge = 1.0 - smoothstep(0.0, 0.09, f2 - f1);
  float cell = fract(sin(dot(best, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 col = mix(uBg, uAccent, 0.04 + cell * 0.12);
  col += uAccent * edge * 0.8 * uIntensity;
  col += uAccent2 * pow(cell, 8.0) * 0.12;
  gl_FragColor = vec4(col, 1.0);
}`,
    params: base([num('scale', 0.5, 'Densidad de células', 0.05, 1.5, 0.05), num('intensity', 0.8, 'Brillo de bordes', 0.1, 1.4, 0.05)]),
  },
  {
    id: 'fractal-tunnel',
    name: 'Fractal Tunnel',
    category: 'shaders',
    summary: 'Túnel polar con ruido fractal, anillos de profundidad y deriva lateral; vuelo continuo en WebGL.',
    tags: ['shader', 'webgl', 'tunel', 'fractal', 'profundidad'],
    glsl: `${header}
uniform float uSpeed;
uniform float uIntensity;
uniform float uTwist;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / max(1.0, uRes.y), 1.0);
  float r = length(uv) + 0.02;
  float a = atan(uv.y, uv.x);
  float z = 1.0 / r + uTime * uSpeed * 0.8;
  vec2 p = vec2(a / 3.14159 + uTwist, z * 0.25);
  float n = fbm(p * 3.0 + uTime * 0.05);
  float rings = 0.5 + 0.5 * sin(z * 2.2 + n * 4.0);
  vec3 col = mix(uBg, uAccent, smoothstep(0.2, 1.0, rings) * (0.3 + 0.7 * uIntensity));
  col += uAccent2 * pow(rings, 8.0) * 0.35;
  col *= smoothstep(0.0, 0.25, r);
  col += uAccent * 0.18 * smoothstep(0.18, 0.0, r);
  gl_FragColor = vec4(col, 1.0);
}`,
    params: base([num('twist', 0, 'Torsión del túnel', -1, 1, 0.05), num('intensity', 0.85, 'Intensidad de anillos', 0.2, 1.3, 0.05)]),
  },
  {
    id: 'heat-haze',
    name: 'Heat Haze',
    category: 'shaders',
    summary: 'Distorsión térmica sobre bandas de luz con ruido temporal; sensación de aire caliente sin postproceso externo.',
    tags: ['shader', 'webgl', 'calor', 'distorsion', 'aire'],
    glsl: `${header}
uniform float uSpeed;
uniform float uIntensity;
uniform float uAmount;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 uv = vUv;
  float t = uTime * uSpeed;
  vec2 warp = vec2(noise(uv * vec2(9.0, 3.0) + vec2(0.0, t)), noise(uv * vec2(7.0, 4.0) + vec2(3.0, -t))) - 0.5;
  vec2 p = uv + warp * (0.015 + uAmount * 0.08);
  float bands = 0.5 + 0.5 * sin(p.y * 38.0 + t * 2.0 + sin(p.x * 12.0) * 1.5);
  float glow = pow(bands, 5.0) * 0.45;
  vec3 col = mix(uBg, uAccent, 0.08 + glow * uIntensity);
  col += uAccent2 * smoothstep(0.75, 1.0, bands) * 0.35;
  col *= 0.85 + 0.15 * smoothstep(0.0, 0.5, p.y);
  gl_FragColor = vec4(col, 1.0);
}`,
    params: base([num('amount', 0.4, 'Amplitud de la distorsión', 0, 1, 0.05), num('intensity', 0.7, 'Intensidad de las bandas', 0.2, 1.3, 0.05)]),
  },
  {
    id: 'iridescent-foil',
    name: 'Iridescent Foil',
    category: 'shaders',
    summary: 'Interferencia de película fina sobre relieve procedural: cromo iridiscente con bandas espectrales y grano.',
    tags: ['shader', 'webgl', 'iridiscente', 'material', 'pelicula'],
    glsl: `${header}
uniform float uSpeed;
uniform float uScale;
uniform float uIntensity;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t));
}
void main() {
  vec2 uv = vUv;
  float t = uTime * uSpeed;
  vec2 p = uv * (2.0 + uScale * 6.0);
  float n = noise(p + vec2(t * 0.2, -t * 0.13));
  n += 0.5 * noise(p * 2.1 + 4.0);
  float bands = sin((uv.x + uv.y) * 8.0 + n * 8.0 + t * 1.4);
  vec3 film = spectrum(bands * 0.25 + n * 0.4);
  vec3 col = mix(uBg, film, 0.35 + 0.45 * uIntensity);
  col = mix(col, uAccent, pow(max(0.0, bands), 5.0) * 0.35);
  col += uAccent2 * pow(max(0.0, -bands), 8.0) * 0.3;
  float fleck = noise(uv * uRes * 0.5) * 0.06;
  col += fleck;
  gl_FragColor = vec4(col, 1.0);
}`,
    params: base([num('scale', 0.4, 'Escala del relieve', 0.1, 1.4, 0.05), num('intensity', 0.7, 'Saturación de la película', 0.1, 1.2, 0.05)]),
  },
];
