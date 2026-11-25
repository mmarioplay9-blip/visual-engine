import fs from 'node:fs';
import path from 'node:path';
import type { VisualProfile } from './analysis.js';
import type { CameraAnalysis } from './motion.js';
import type { ContentAnalysis } from './inspect.js';
import type { EffectDetection, EffectReport } from './effects.js';
import type { VideoTimeline } from './timeline.js';
import { recommendEffect } from './recommend.js';
import { clamp, hexToRgb, round } from './util.js';

/**
 * Especificación visual estructurada: describe qué hay que construir para
 * reproducir la referencia. Cada campo proviene de una medición previa; los
 * campos estimados lo declaran. No es una descripción "artística" inventada.
 */

export interface VisualSpec {
  version: '0.2';
  source: string;
  createdAt: string;
  canvas: { width: number; height: number; aspect: number; fps: number; duration: number };
  palette: { hex: string; share: number; role: string }[];
  composition: ContentAnalysis['composition'] | null;
  typography: {
    lines: { heightRatio: number; heightPx: number; role: string; confidence: number; status: 'estimated' }[];
    note: string;
  };
  scenes: { index: number; start: number; end: number; duration: number; luma: number; motion: number; label: string }[];
  layers: { name: string; cellShare: number; sharpness: number; status: string }[];
  camera: {
    direction: string;
    shiftX: number;
    shiftY: number;
    speed: number;
    zoom: number;
    rotationDeg: number;
    acceleration: number;
    shake: number;
    verifiedPairs: string;
    transitions: { t: number; type: string; status: string }[];
  } | null;
  effects: {
    id: string;
    label: string;
    status: 'verified' | 'estimated';
    confidence: number;
    params: Record<string, number | string>;
    technology: string;
    hint: string;
  }[];
  implementation: { stack: string[]; steps: string[] };
  verification: {
    metrics: string[];
    targets: Record<string, string>;
    temporalScoreTarget: number;
  };
  limitations: string[];
}

export interface SpecInput {
  profile: VisualProfile;
  timeline?: VideoTimeline;
  camera?: CameraAnalysis;
  content?: ContentAnalysis;
  effects?: EffectReport;
}

function saturationOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

function lumOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function paletteRoles(profile: VisualProfile): VisualSpec['palette'] {
  const colors = profile.palette.slice(0, 8);
  if (!colors.length) return [];
  const bg = [...colors].sort((a, b) => lumOf(a.hex) - lumOf(b.hex))[0];
  const text = [...colors].sort((a, b) => lumOf(b.hex) - lumOf(a.hex))[0];
  const accent = [...colors].sort((a, b) => saturationOf(b.hex) * b.share - saturationOf(a.hex) * a.share)[0];
  return colors.map((c) => ({
    hex: c.hex,
    share: c.share,
    role: c.hex === accent.hex ? 'acento' : c.hex === bg.hex ? 'fondo/base' : c.hex === text.hex ? 'texto/luz' : 'apoyo',
  }));
}

function effectParams(e: EffectDetection): Record<string, number | string> {
  const ev = e.evidence;
  const num = (k: string, fallback: number) => (typeof ev[k] === 'number' ? (ev[k] as number) : fallback);
  switch (e.id) {
    case 'glow':
    case 'bloom':
      return { intensidad: round(clamp(num('haloRatio', 1.4) / 2.5), 2), radioPx: round(num('haloFalloff', 0.6) * 40), haloMedido: num('haloRatio', 0) };
    case 'particles':
      return { cantidad: num('smallComponents', 20), tamanoMedioPx: round(num('medianArea', 6)) };
    case 'blur':
      return { suavidad: round(clamp(1 - num('laplacianVariance', 45) / 90), 2), bokeh: num('bokeh', 0) };
    case 'parallax':
      return { separacionPx: round(num('rowShiftSpread', 2)), direccion: 'capas opuestas' };
    case 'glitch':
      return { desplazamientoCanalesPx: num('channelShiftPx', 2), filasSaltadas: num('jumpRows', 0), frecuencia: 'en picos, no continuo' };
    case 'lighting':
      return { vineta: round(1 - num('cornerCenterRatio', 0.9)), foco: 'radial', movimiento: 'lento' };
    case 'reflections':
      return { ejeY: num('axis', 0.7), simetria: num('mirrorCorrelation', 0.6) };
    case 'distortion':
      return { amplitudPx: round(num('rowResidual', 1.5)), frecuencia: 'baja', aplicar: 'shader o SVG' };
    case 'grain':
      return { intensidad: round(clamp(num('temporalNoise', 3) / 12), 2), animado: 1 };
    default:
      return {};
  }
}

export function buildVisualSpec(input: SpecInput): VisualSpec {
  const { profile, timeline, camera, content, effects } = input;
  const stack = new Set<string>();
  const specEffects = (effects?.effects ?? []).map((e) => {
    const rec = recommendEffect(e.id, effectParams(e));
    stack.add(rec.tech);
    return {
      id: e.id,
      label: e.label,
      status: e.status,
      confidence: e.confidence,
      params: effectParams(e),
      technology: rec.tech,
      hint: e.hint,
    };
  });

  const typographyLines = (content?.textLines ?? []).map((t) => ({
    heightRatio: t.heightRatio,
    heightPx: Math.round(t.heightRatio * profile.height),
    role: t.heightRatio > 0.08 ? 'titular' : t.heightRatio > 0.035 ? 'apoyo' : 'etiqueta',
    confidence: t.confidence,
    status: 'estimated' as const,
  }));

  const scenes = timeline
    ? timeline.scenes.map((s) => ({
        index: s.index,
        start: s.start,
        end: s.end,
        duration: s.duration,
        luma: s.avgLuma,
        motion: s.motion,
        label: s.label,
      }))
    : [{ index: 0, start: 0, end: profile.duration, duration: profile.duration, luma: profile.aggregate.luma, motion: profile.motion, label: 'plano único' }];

  const steps: string[] = [
    `Lienzo ${profile.width}×${profile.height} (${profile.aspect.toFixed(2)}:1)${profile.fps ? ` a ${profile.fps} fps` : ''}.`,
    `Fondo ${paletteRoles(profile).find((c) => c.role === 'fondo/base')?.hex ?? '#000000'}; acento ${paletteRoles(profile).find((c) => c.role === 'acento')?.hex ?? '#ffffff'}.`,
  ];
  if (content?.composition) {
    steps.push(
      `Composición: equilibrio ${(content.composition.balanceHorizontal * 100).toFixed(0)}% horizontal, ${(content.composition.symmetryHorizontal * 100).toFixed(0)}% de simetría, espacio negativo ${(content.composition.negativeSpace * 100).toFixed(0)}%.`,
    );
  }
  if (typographyLines.length) steps.push(`Jerarquía: titular a ${Math.max(...typographyLines.map((t) => t.heightPx))} px de alto (estimado por regiones).`);
  if (camera) steps.push(`Movimiento: ${camera.summary.direction}; zoom ${camera.summary.zoom}; rotación ${camera.summary.rotationDeg}°.`);
  for (const e of specEffects) steps.push(`Efecto ${e.label}: ${e.hint}`);
  if (!specEffects.length) steps.push('Sin efectos detectados: construir sólo estructura, luz y tipografía.');

  return {
    version: '0.2',
    source: profile.source,
    createdAt: new Date().toISOString(),
    canvas: {
      width: profile.width,
      height: profile.height,
      aspect: profile.aspect,
      fps: profile.fps,
      duration: profile.duration,
    },
    palette: paletteRoles(profile),
    composition: content?.composition ?? null,
    typography: {
      lines: typographyLines,
      note: 'Alturas estimadas por regiones de texto; sin OCR no se conoce el contenido literal.',
    },
    scenes,
    layers: content?.depth.layers.map((l) => ({ ...l, status: 'estimated' })) ?? [],
    camera: camera
      ? {
          direction: camera.summary.direction,
          shiftX: camera.summary.shiftX,
          shiftY: camera.summary.shiftY,
          speed: camera.summary.speed,
          zoom: camera.summary.zoom,
          rotationDeg: camera.summary.rotationDeg,
          acceleration: camera.summary.acceleration,
          shake: camera.summary.shake,
          verifiedPairs: `${camera.summary.verifiedPairs}/${camera.summary.totalPairs}`,
          transitions: camera.transitions.map((t) => ({ t: t.t, type: t.type, status: t.status })),
        }
      : null,
    effects: specEffects,
    implementation: {
      stack: [...stack],
      steps,
    },
    verification: {
      metrics: ['ΔE de paleta', 'luminancia', 'contraste', 'densidad de bordes', 'movimiento', 'cortes', 'composición', 'similitud temporal'],
      targets: {
        paleta: `ΔE medio ≤ 12 (medido: referencia / resultado)`,
        luminancia: `diferencia ≤ 5 puntos porcentuales`,
        contraste: `diferencia ≤ 4 puntos porcentuales`,
        movimiento: `diferencia ≤ 0.02 (escala 0..1)`,
        composicion: 'equilibrio y simetría dentro de 20 puntos',
        temporal: 'puntuación temporal ≥ 75/100',
      },
      temporalScoreTarget: 75,
    },
    limitations: [
      'Sin OCR: las regiones de texto no se leen, sólo se localizan.',
      'Sin modelo de objetos: las regiones salientes no tienen etiqueta semántica.',
      'La profundidad y el parallax son proxies geométricos, no mapas métricos.',
      'La detección de efectos mide señales (halo, nitidez, desplazamiento) y propone una etiqueta.',
    ],
  };
}

export function specToMarkdown(spec: VisualSpec): string {
  const lines: string[] = [];
  lines.push(`# Especificación visual — ${path.basename(spec.source)}`);
  lines.push('');
  lines.push(`Generada: ${spec.createdAt} · Visual Engine ${spec.version}`);
  lines.push('');
  lines.push(`Lienzo: **${spec.canvas.width}×${spec.canvas.height}** (${spec.canvas.aspect.toFixed(2)}:1)${spec.canvas.fps ? `, ${spec.canvas.fps} fps` : ''}${spec.canvas.duration ? `, ${spec.canvas.duration.toFixed(2)} s` : ''}.`);
  lines.push('');
  lines.push('## Paleta y roles');
  lines.push('');
  lines.push('| Color | Superficie | Rol |');
  lines.push('| --- | --- | --- |');
  for (const c of spec.palette) lines.push(`| \`${c.hex}\` | ${(c.share * 100).toFixed(0)}% | ${c.role} |`);
  lines.push('');
  lines.push('## Escenas');
  lines.push('');
  lines.push('| # | Inicio | Fin | Duración | Luma | Movimiento | Tipo |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of spec.scenes) {
    lines.push(`| ${s.index + 1} | ${s.start.toFixed(2)}s | ${s.end.toFixed(2)}s | ${s.duration.toFixed(2)}s | ${(s.luma * 100).toFixed(0)}% | ${(s.motion * 100).toFixed(1)}% | ${s.label} |`);
  }
  lines.push('');
  if (spec.composition) {
    lines.push('## Composición medida');
    lines.push('');
    lines.push(`- Tercios: ${(spec.composition.thirds * 100).toFixed(0)}% · equilibrio H/V: ${(spec.composition.balanceHorizontal * 100).toFixed(0)}%/${(spec.composition.balanceVertical * 100).toFixed(0)}%`);
    lines.push(`- Simetría H/V: ${(spec.composition.symmetryHorizontal * 100).toFixed(0)}%/${(spec.composition.symmetryVertical * 100).toFixed(0)}% · espacio negativo: ${(spec.composition.negativeSpace * 100).toFixed(0)}%`);
    lines.push(`- Horizonte: ${spec.composition.horizonY !== null ? `${(spec.composition.horizonY * 100).toFixed(0)}% del alto` : 'no dominante'} · ángulo dominante ${spec.composition.dominantAngleDeg}°`);
    lines.push('');
  }
  if (spec.typography.lines.length) {
    lines.push('## Jerarquía tipográfica (estimada)');
    lines.push('');
    lines.push('| Rol | Alto | Confianza |');
    lines.push('| --- | --- | --- |');
    for (const t of spec.typography.lines) lines.push(`| ${t.role} | ${t.heightPx}px (${(t.heightRatio * 100).toFixed(1)}%) | ${(t.confidence * 100).toFixed(0)}% |`);
    lines.push('');
    lines.push(spec.typography.note);
    lines.push('');
  }
  if (spec.camera) {
    lines.push('## Cámara y transiciones');
    lines.push('');
    lines.push(`- ${spec.camera.direction}; desplazamiento ${(spec.camera.shiftX * 100).toFixed(2)}% / ${(spec.camera.shiftY * 100).toFixed(2)}% por paso.`);
    lines.push(`- Velocidad ${(spec.camera.speed * 100).toFixed(2)}%/s · zoom ${spec.camera.zoom} · rotación ${spec.camera.rotationDeg}° · aceleración ${(spec.camera.acceleration * 100).toFixed(2)}%/s².`);
    lines.push(`- Pares verificados: ${spec.camera.verifiedPairs}. Transiciones: ${spec.camera.transitions.length ? spec.camera.transitions.map((t) => `${t.type}@${t.t.toFixed(2)}s (${t.status})`).join(', ') : 'ninguna'}.`);
    lines.push('');
  }
  if (spec.layers.length) {
    lines.push('## Capas de profundidad (estimadas)');
    lines.push('');
    for (const l of spec.layers) lines.push(`- ${l.name}: ${(l.cellShare * 100).toFixed(0)}% de la imagen, nitidez ${l.sharpness}.`);
    lines.push('');
  }
  lines.push('## Efectos detectados');
  lines.push('');
  if (!spec.effects.length) {
    lines.push('Ninguno por encima del umbral. Construir estructura, luz y tipografía sin añadir efectos.');
  } else {
    lines.push('| Efecto | Estado | Confianza | Tecnología | Parámetros |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const e of spec.effects) {
      lines.push(`| ${e.label} | ${e.status} | ${(e.confidence * 100).toFixed(0)}% | ${e.technology} | ${Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join(', ')} |`);
    }
    lines.push('');
    for (const e of spec.effects) lines.push(`- **${e.label}**: ${e.hint}`);
  }
  lines.push('');
  lines.push('## Implementación');
  lines.push('');
  lines.push(`Stack: ${spec.implementation.stack.join(', ') || 'CSS/JS sin dependencias'}.`);
  lines.push('');
  spec.implementation.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push('');
  lines.push('## Verificación');
  lines.push('');
  for (const m of spec.verification.metrics) lines.push(`- ${m}`);
  lines.push('');
  for (const [k, v] of Object.entries(spec.verification.targets)) lines.push(`- **${k}**: ${v}`);
  lines.push('');
  lines.push('## Límites de esta especificación');
  lines.push('');
  for (const l of spec.limitations) lines.push(`- ${l}`);
  lines.push('');
  return lines.join('\n');
}

export function saveVisualSpec(spec: VisualSpec, outDir: string): { json: string; md: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'spec.json');
  const md = path.join(outDir, 'spec.md');
  fs.writeFileSync(json, JSON.stringify(spec, null, 2), 'utf8');
  fs.writeFileSync(md, specToMarkdown(spec), 'utf8');
  return { json, md };
}
