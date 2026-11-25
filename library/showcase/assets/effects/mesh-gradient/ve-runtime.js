/**
 * Runtime mínimo y compartido por los efectos de Visual Engine.
 * Sin dependencias: Canvas 2D o WebGL1. Cada mount devuelve una función de
 * limpieza y respeta prefers-reduced-motion. Licencia MIT (propio).
 */

export function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function hexToRgb(hex) {
  const h = String(hex || '#ffffff').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  return [parseInt(full.slice(0, 2), 16) / 255, parseInt(full.slice(2, 4), 16) / 255, parseInt(full.slice(4, 6), 16) / 255];
}

export function rgba(hex, alpha = 1) {
  if (!hex || hex === 'transparent' || hex === 'rgba(0,0,0,0)') return 'rgba(0,0,0,0)';
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${clamp(alpha)})`;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor 2D determinista y barato, suficiente para fondos y distorsión. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (ix, iy) => {
    const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

export function fbm(x, y, octaves = 4, seed = 0) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2(x * freq, y * freq, seed + i * 13);
    freq *= 2;
    amp *= 0.5;
  }
  return value;
}

function setupCanvas(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || canvas.clientWidth || 640));
    const h = Math.max(1, Math.round(rect.height || canvas.clientHeight || 360));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    return { w, h, dpr };
  };
  let size = fit();
  return {
    dpr: size.dpr,
    get size() {
      return size;
    },
    fit() {
      size = fit();
      return size;
    },
  };
}

/**
 * Monta un efecto de Canvas 2D.
 * draw({ ctx, w, h, t, dt, params, pointer, reduced, state })
 */
export function mountCanvas(canvas, params, draw, options = {}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = options.reduced ?? media.matches;
  const onChange = () => {
    reduced = options.reduced ?? media.matches;
  };
  media.addEventListener?.('change', onChange);
  const pointer = { x: 0.62, y: 0.42, active: false, down: false };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = clamp((e.clientX - r.left) / Math.max(1, r.width));
    pointer.y = clamp((e.clientY - r.top) / Math.max(1, r.height));
    pointer.active = true;
  };
  const onLeave = () => {
    pointer.active = false;
  };
  const onDown = () => {
    pointer.down = true;
  };
  const onUp = () => {
    pointer.down = false;
  };
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerleave', onLeave, { passive: true });
  canvas.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });

  const s = setupCanvas(canvas);
  const resize = () => {
    s.fit();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const state = options.state ?? {};
  let raf = 0;
  let start = performance.now();
  let prev = start;
  const frame = (now) => {
    const dt = Math.min(48, now - prev) / 1000;
    prev = now;
    const t = reduced ? 1.15 : (now - start) / 1000;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.clearRect(0, 0, s.size.w, s.size.h);
    draw({ ctx, w: s.size.w, h: s.size.h, t, dt, params, pointer, reduced, state });
    raf = requestAnimationFrame(frame);
  };
  if (reduced) {
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    draw({ ctx, w: s.size.w, h: s.size.h, t: 1.15, dt: 0.016, params, pointer, reduced, state });
  } else {
    raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf && !reduced) {
      prev = performance.now();
      start = prev;
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    media.removeEventListener?.('change', onChange);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
  };
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/**
 * Monta un fragment shader WebGL1 a pantalla completa.
 * El shader recibe vUv, uRes, uTime, uPointer y los parámetros como uNombre.
 */
export function mountGL(canvas, params, frag, options = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) return () => {};
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = options.reduced ?? media.matches;
  const onChange = () => {
    reduced = options.reduced ?? media.matches;
  };
  media.addEventListener?.('change', onChange);
  const pointer = { x: 0.62, y: 0.42, active: false, down: false };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = clamp((e.clientX - r.left) / Math.max(1, r.width));
    pointer.y = clamp((e.clientY - r.top) / Math.max(1, r.height));
    pointer.active = true;
  };
  const onDown = () => { pointer.down = true; };
  const onUp = () => { pointer.down = false; };
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader: ${log}`);
    }
    return sh;
  };
  let program;
  try {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link');
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  } catch (e) {
    console.error(String(e));
    return () => {};
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  const names = ['uTime', 'uRes', 'uPointer'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  for (const key of Object.keys(params)) {
    if (typeof params[key] === 'number' || typeof params[key] === 'boolean' || (typeof params[key] === 'string' && params[key].startsWith('#'))) {
      names.push(`u${cap(key)}`);
    }
  }
  for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round((r.width || 640) * dpr));
    canvas.height = Math.max(1, Math.round((r.height || 360) * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let raf = 0;
  const start = performance.now();
  const frame = (now) => {
    const t = reduced ? 1.15 : (now - start) / 1000;
    gl.uniform1f(uniforms.uTime, t);
    gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
    gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
    for (const [key, value] of Object.entries(params)) {
      const u = uniforms[`u${cap(key)}`];
      if (u === undefined || u === null) continue;
      if (typeof value === 'number') gl.uniform1f(u, value);
      else if (typeof value === 'boolean') gl.uniform1i(u, value ? 1 : 0);
      else if (typeof value === 'string' && value.startsWith('#')) gl.uniform3fv(u, hexToRgb(value));
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  if (reduced) frame(start + 1150);
  else raf = requestAnimationFrame(frame);
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf && !reduced) raf = requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    media.removeEventListener?.('change', onChange);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}
