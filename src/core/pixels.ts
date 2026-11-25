/**
 * Primitivas de imagen en JS puro. Se usan para medir movimiento, composición,
 * formas y efectos sin añadir OpenCV ni dependencias nativas: todo es
 * determinista y funciona con los búferes RGB que ya entrega FFmpeg.
 */

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  area: number;
  fill: number;
}

export interface ShiftResult {
  dx: number;
  dy: number;
  score: number;
  /** diferencia con el segundo mejor desplazamiento; mide unicidad del pico */
  margin: number;
}

export function grayFromRgb(rgb: Buffer, width: number, height: number): Float32Array {
  const g = new Float32Array(width * height);
  for (let i = 0; i < g.length; i++) {
    const o = i * 3;
    g[i] = 0.2126 * rgb[o] + 0.7152 * rgb[o + 1] + 0.0722 * rgb[o + 2];
  }
  return g;
}

/** Desenfoque de caja separable con bordes replicados. */
export function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) return Float32Array.from(src);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const win = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        sum += src[y * width + xx];
      }
      tmp[y * width + x] = sum / win;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(height - 1, Math.max(0, y + k));
        sum += tmp[yy * width + x];
      }
      out[y * width + x] = sum / win;
    }
  }
  return out;
}

export function sobel(gray: Float32Array, width: number, height: number): { mag: Float32Array; angle: Float32Array } {
  const mag = new Float32Array(width * height);
  const angle = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1] +
        gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      mag[i] = Math.hypot(gx, gy);
      angle[i] = Math.atan2(gy, gx);
    }
  }
  return { mag, angle };
}

/** Varianza del laplaciano. Alta = textura nítida; baja = desenfoque. */
export function laplacianVariance(
  gray: Float32Array,
  width: number,
  height: number,
  region: { x0: number; y0: number; x1: number; y1: number } = { x0: 0, y0: 0, x1: width, y1: height },
): number {
  const vals: number[] = [];
  for (let y = Math.max(1, region.y0); y < Math.min(height - 1, region.y1); y++) {
    for (let x = Math.max(1, region.x0); x < Math.min(width - 1, region.x1); x++) {
      const i = y * width + x;
      vals.push(-4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width]);
    }
  }
  if (vals.length < 4) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
}

/** Correlación normalizada de Pearson sobre la zona de solape. */
export function correlateAt(
  a: Float32Array,
  b: Float32Array,
  width: number,
  height: number,
  dx: number,
  dy: number,
): number {
  const x0 = Math.max(0, -dx);
  const x1 = Math.min(width, width - dx);
  const y0 = Math.max(0, -dy);
  const y1 = Math.min(height, height - dy);
  const n = (x1 - x0) * (y1 - y0);
  if (n < 64) return 0;
  let sa = 0;
  let sb = 0;
  for (let y = y0; y < y1; y++) {
    const ra = y * width;
    const rb = (y + dy) * width + dx;
    for (let x = x0; x < x1; x++) {
      sa += a[ra + x];
      sb += b[rb + x];
    }
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0;
  let va = 0;
  let vb = 0;
  for (let y = y0; y < y1; y++) {
    const ra = y * width;
    const rb = (y + dy) * width + dx;
    for (let x = x0; x < x1; x++) {
      const da = a[ra + x] - ma;
      const db = b[rb + x] - mb;
      num += da * db;
      va += da * da;
      vb += db * db;
    }
  }
  if (va < 1e-6 || vb < 1e-6) return 0;
  return num / Math.sqrt(va * vb);
}

/**
 * Busca el desplazamiento (dx, dy) que maximiza la correlación entre `a` y `b`.
 * Convención: b[y+dy, x+dx] ≈ a[y,x], de modo que dx>0 indica que el contenido
 * se movió hacia la derecha entre a y b.
 */
export function bestShift(
  a: Float32Array,
  b: Float32Array,
  width: number,
  height: number,
  maxShift = 12,
  step = 1,
): ShiftResult {
  let best: ShiftResult = { dx: 0, dy: 0, score: -2, margin: 0 };
  let second = -2;
  const offsets: number[] = [];
  for (let d = -maxShift; d <= maxShift; d += step) offsets.push(d);
  if (!offsets.includes(0)) offsets.push(0);
  for (const dy of offsets) {
    for (const dx of offsets) {
      const s = correlateAt(a, b, width, height, dx, dy);
      if (s > best.score) {
        second = best.score;
        best = { dx, dy, score: s, margin: 0 };
      } else if (s > second && (Math.abs(dx - best.dx) > 1 || Math.abs(dy - best.dy) > 1)) {
        second = s;
      }
    }
  }
  return { ...best, margin: Math.max(0, best.score - second) };
}

/** Reescala/rota/desplaza `src` hacia el sistema de coordenadas de salida. */
export function warpGray(
  src: Float32Array,
  width: number,
  height: number,
  opts: { scale?: number; rotationDeg?: number; tx?: number; ty?: number },
): Float32Array {
  const s = opts.scale ?? 1;
  const rad = ((opts.rotationDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tx = opts.tx ?? 0;
  const ty = opts.ty ?? 0;
  const cx = width / 2;
  const cy = height / 2;
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ox = x - cx;
      const oy = y - cy;
      // Transformación inversa: rotar -theta y deshacer la escala.
      const sx = cx + (cos * ox + sin * oy) / s + tx;
      const sy = cy + (-sin * ox + cos * oy) / s + ty;
      out[y * width + x] = sampleBilinear(src, width, height, sx, sy);
    }
  }
  return out;
}

export function sampleBilinear(src: Float32Array, width: number, height: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return 0;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = src[y0 * width + x0];
  const b = src[y0 * width + x1];
  const c = src[y1 * width + x0];
  const d = src[y1 * width + x1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/** Etiquetado de componentes conexas (8-vecindad) sobre una máscara binaria. */
export function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  opts: { minArea?: number; maxArea?: number } = {},
): Box[] {
  const minArea = opts.minArea ?? 4;
  const maxArea = opts.maxArea ?? width * height;
  const seen = new Uint8Array(mask.length);
  const boxes: Box[] = [];
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    let area = 0;
    let x0 = width;
    let y0 = height;
    let x1 = 0;
    let y1 = 0;
    let sx = 0;
    let sy = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width;
      const y = (p / width) | 0;
      area++;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (mask[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    if (area >= minArea && area <= maxArea) {
      boxes.push({
        x0,
        y0,
        x1,
        y1,
        cx: sx / area,
        cy: sy / area,
        area,
        fill: area / Math.max(1, (x1 - x0 + 1) * (y1 - y0 + 1)),
      });
    }
  }
  return boxes;
}

/** Correlación entre la mitad superior y la inferior espejada, alrededor de `axisY`. */
export function mirrorCorrelation(gray: Float32Array, width: number, height: number, axisY: number): number {
  const half = Math.min(Math.round(axisY), height - Math.round(axisY));
  if (half < 8) return 0;
  const a = new Float32Array(width * half);
  const b = new Float32Array(width * half);
  const axis = Math.round(axisY);
  for (let y = 0; y < half; y++) {
    const srcY = axis - 1 - y;
    const dstY = axis + y;
    if (srcY < 0 || dstY >= height) break;
    for (let x = 0; x < width; x++) {
      a[y * width + x] = gray[srcY * width + x];
      b[y * width + x] = gray[dstY * width + x];
    }
  }
  return correlateAt(a, b, width, half, 0, 0);
}

/** Desplazamiento horizontal por franja: detecta parallax, wipes y distorsiones. */
export function rowShifts(
  a: Float32Array,
  b: Float32Array,
  width: number,
  height: number,
  bands = 8,
  maxShift = 6,
): number[] {
  const out: number[] = [];
  const bandHeight = Math.floor(height / bands);
  for (let i = 0; i < bands; i++) {
    const y0 = i * bandHeight;
    const h = Math.min(bandHeight, height - y0);
    if (h < 4) {
      out.push(0);
      continue;
    }
    const sa = a.subarray(y0 * width, (y0 + h) * width);
    const sb = b.subarray(y0 * width, (y0 + h) * width);
    out.push(bestShift(sa, sb, width, h, maxShift, 1).dx);
  }
  return out;
}
