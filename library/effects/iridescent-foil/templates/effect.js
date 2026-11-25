import config from './config.js';
import { mountGL } from './ve-runtime.js';

export const defaults = config;

/** Interferencia de película fina sobre relieve procedural: cromo iridiscente con bandas espectrales y grano. */
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
}`;

export function mount(canvas, params = {}) {
  return mountGL(canvas, { ...defaults, ...params }, FRAG);
}
