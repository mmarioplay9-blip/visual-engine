import config from './config.js';
import { mountGL } from './ve-runtime.js';

export const defaults = config;

/** Distorsión térmica sobre bandas de luz con ruido temporal; sensación de aire caliente sin postproceso externo. */
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
}`;

export function mount(canvas, params = {}) {
  return mountGL(canvas, { ...defaults, ...params }, FRAG);
}
