import config from './config.js';
import { mountGL } from './ve-runtime.js';

export const defaults = config;

/** Túnel polar con ruido fractal, anillos de profundidad y deriva lateral; vuelo continuo en WebGL. */
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
}`;

export function mount(canvas, params = {}) {
  return mountGL(canvas, { ...defaults, ...params }, FRAG);
}
