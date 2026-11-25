import config from './config.js';
import { mountGL } from './ve-runtime.js';

export const defaults = config;

/** Células de Voronoi animadas con bordes luminosos y puntos de semilla; shader de coste fijo 3×3. */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uBg;
uniform vec3 uAccent;
uniform vec3 uAccent2;

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
}`;

export function mount(canvas, params = {}) {
  return mountGL(canvas, { ...defaults, ...params }, FRAG);
}
