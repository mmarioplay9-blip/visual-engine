import config from './config.js';
import { mountGL } from './ve-runtime.js';

export const defaults = config;

/** Plasma líquido con interferencia de ondas y paleta de dos temperaturas; shader procedural sin texturas. */
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
}`;

export function mount(canvas, params = {}) {
  return mountGL(canvas, { ...defaults, ...params }, FRAG);
}
