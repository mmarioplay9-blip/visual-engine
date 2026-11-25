import fs from 'node:fs';
import path from 'node:path';
import type { VisualSpec } from './spec.js';
import { buildArtDirection, artDirectionCss, designMarkdown, renderDesignSystem, getStyle, type ArtDirection } from './styles.js';
import { buildMotionDirector, motionDirectorMarkdown, renderMotionLab, type MotionDirectorPlan } from './motion-director.js';
import { specToComposition } from './refeffects.js';
import { ensureDir } from './paths.js';
import { hexToRgb } from './util.js';

/**
 * Reference-to-Design 0.4: convierte una especificación medida en sistema de
 * diseño, tokens, arquitectura de componentes y código. Cada dato lleva su
 * procedencia: medido en píxeles/OCR, o estimado por proporción/hipótesis.
 * Nunca se afirma haber identificado una fuente real a partir de una imagen.
 */

export type EvidenceStatus = 'verified' | 'estimated';

export interface EvidenceItem {
  value: string;
  status: EvidenceStatus;
  evidence: string;
}

export interface ReferenceDesign {
  version: '0.4';
  source: string;
  brief: string;
  styleId: string;
  styleConfidence: number;
  artDirection: ArtDirection;
  confirmed: EvidenceItem[];
  estimated: EvidenceItem[];
  palette: { role: string; hex: string; share: number; source: EvidenceStatus }[];
  typography: {
    measuredLines: VisualSpec['typography']['lines'];
    approximation: { display: string; body: string; mono: string; note: string };
    scale: Record<string, number>;
  };
  layout: {
    composition: VisualSpec['composition'];
    columns: number;
    gutter: number;
    maxWidth: number;
    distribution: string[];
  };
  layers: { name: string; cellShare: number; sharpness: number; status: EvidenceStatus }[];
  materials: string[];
  components: string[];
  timeline: { scenes: VisualSpec['scenes']; transitions: VisualSpec['camera'] extends null ? never[] : NonNullable<VisualSpec['camera']>['transitions']; note: string };
  motion: MotionDirectorPlan;
  effects: { detected: string; mappedTo: string; status: EvidenceStatus; confidence: number; note: string }[];
  implementation: { tokens: string; css: string; html: string; command: string };
  warnings: string[];
  limitations: string[];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx ? (mx - mn) / mx : 0;
}

function mixHex(a: string, b: string, amount: number): string {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function contrastOf(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function inferProjectType(spec: VisualSpec): string {
  const aspect = spec.canvas.width / Math.max(1, spec.canvas.height);
  if (aspect < 0.8) return 'mobile';
  if (spec.canvas.duration > 1 && spec.camera) return 'motion';
  if (spec.composition && spec.composition.negativeSpace > 0.5) return 'landing';
  return 'landing';
}

export function buildReferenceDesign(spec: VisualSpec, opts: { style?: string; brief?: string } = {}): ReferenceDesign {
  const src = spec.source.split(/[\\/]/).pop() ?? 'referencia';
  const brief = opts.brief ?? `Sistema visual derivado de ${src}`;
  const sorted = [...spec.palette].sort((a, b) => b.share - a.share);
  const roleBg = sorted.find((p) => p.role.includes('fondo'));
  // El rol "fondo" puede ser un negro minoritario en un cartel claro. Si su
  // área es pequeña, el fondo real es el color dominante, no el más oscuro.
  const bg = roleBg && roleBg.share >= 0.15 ? roleBg.hex : (sorted[0]?.hex ?? '#070b12');
  const text = [...sorted]
    .filter((p) => p.hex !== bg && p.share > 0.02)
    .sort((a, b) => contrastOf(b.hex, bg) - contrastOf(a.hex, bg))[0]?.hex
    ?? (luminance(bg) > 0.5 ? '#111111' : '#ffffff');
  const accent = [...sorted].sort((a, b) => (luminance(b.hex) > 0.16 ? saturation(b.hex) * b.share : 0) - (luminance(a.hex) > 0.16 ? saturation(a.hex) * a.share : 0))[0]?.hex ?? '#12e0c8';
  const style = opts.style ? getStyle(opts.style) : getStyle(luminance(bg) > 0.45 ? 'editorial' : spec.camera ? 'motion-graphics' : 'cinematic');
  const ad = buildArtDirection({
    brief, style: style.id, projectType: inferProjectType(spec),
    preferences: { accent, accent2: sorted.find((p) => p.hex !== accent && p.hex !== bg)?.hex },
  });
  // La paleta medida manda sobre el perfil; el perfil aporta reglas, no colores inventados.
  ad.palette = { ...ad.palette, bg, text: text === bg ? ad.palette.text : text, accent };
  if (luminance(bg) > 0.5) {
    ad.palette.surface = mixHex(bg, ad.palette.text, 0.08);
    ad.palette.elevated = mixHex(bg, ad.palette.text, 0.13);
    ad.palette.border = mixHex(bg, ad.palette.text, 0.24);
    ad.palette.muted = mixHex(ad.palette.text, bg, 0.25);
  }
  for (const key of ['bg', 'surface', 'elevated', 'text', 'muted', 'accent', 'border'] as const) {
    ad.tokenSet[`color.${key}`] = { $value: ad.palette[key], $type: 'color' };
  }
  ad.tokenSet['color.accentInk'] = { $value: contrastOf(ad.palette.text, accent) > contrastOf(bg, accent) ? ad.palette.text : bg, $type: 'color' };
  const composition = spec.composition;
  const distribution = composition
    ? [
        `equilibrio horizontal ${(composition.balanceHorizontal * 100).toFixed(0)} %`,
        `simetría vertical ${(composition.symmetryVertical * 100).toFixed(0)} %`,
        `espacio negativo ${(composition.negativeSpace * 100).toFixed(0)} %`,
        `horizonte ${composition.horizonY === null ? 'no dominante' : `${(composition.horizonY * 100).toFixed(0)} %`}`,
      ]
    : ['sin medición de composición; la distribución es una propuesta'];
  const lines = spec.typography.lines;
  const verifiedText = spec.text?.available && spec.text.lines.length > 0;
  const confirmed: EvidenceItem[] = [
    { value: `lienzo ${spec.canvas.width}×${spec.canvas.height}`, status: 'verified', evidence: 'metadatos del archivo' },
    { value: `${spec.palette.length} colores dominantes con proporción`, status: 'verified', evidence: 'histograma RGB cuantizado' },
    ...(verifiedText ? [{ value: `texto: ${spec.text!.content.slice(0, 80)}`, status: 'verified' as const, evidence: `Tesseract, ${spec.text!.lines.length} línea(s)` }] : []),
    ...(composition ? [{ value: 'composición, equilibrio y espacio negativo', status: 'verified' as const, evidence: 'medición de píxeles' }] : []),
    ...(spec.camera && spec.camera.verifiedPairs !== '0/0' ? [{ value: `movimiento ${spec.camera.direction}`, status: 'verified' as const, evidence: `pares verificados ${spec.camera.verifiedPairs}` }] : []),
  ];
  const estimated: EvidenceItem[] = [
    { value: `familia tipográfica ${ad.typography.families.display} / ${ad.typography.families.body}`, status: 'estimated', evidence: 'proporción y contraste de las regiones de texto; no se identifica la fuente real' },
    { value: `escala ${ad.typography.scaleRatio}`, status: 'estimated', evidence: 'derivada de las alturas medidas; requiere ajuste de copy' },
    { value: 'arquitectura de componentes', status: 'estimated', evidence: 'propuesta funcional a partir del tipo de proyecto y la distribución' },
    { value: 'materiales', status: 'estimated', evidence: 'señales de luz/textura, no un material físico identificado' },
    { value: `estilo ${style.name}`, status: 'estimated', evidence: 'inferencia por paleta, contraste y movimiento' },
  ];
  const tiers = lines.map((l, i) => ({ value: `${l.role} ${l.heightPx}px (${l.status})`, status: l.status, evidence: l.status === 'verified' ? 'OCR sobre fotograma' : 'región de luminancia' }));
  const built = specToComposition(spec);
  const motion = buildMotionDirector(ad);
  const effects = built.mapping.map((m) => ({ detected: m.detected, mappedTo: m.mappedTo, status: m.status, confidence: m.confidence, note: m.note }));
  const implementation = {
    tokens: JSON.stringify(ad.tokenSet, null, 2),
    css: artDirectionCss(ad, './fonts'),
    html: `<main class="ve-container" data-style="${ad.style.id}">\n  <p class="ve-eyebrow">${(spec.source.split(/[\\/]/).pop() ?? 'referencia').replace(/[<>&]/g, '')}</p>\n  <h1 class="ve-display">Titular medido</h1>\n  <p class="ve-lead">Copy pendiente de sustituir; la tipografía es una aproximación declarada.</p>\n  <div class="ve-grid">\n    ${ad.components.slice(0, 4).map((c) => `<section class="ve-card">${c}</section>`).join('\n    ')}\n  </div>\n</main>`,
    command: `ve refdesign ${spec.source} --out ./sistema && ve compose ${built.composition.id}.json --out ./render`,
  };
  const warnings = [...built.warnings, ...ad.warnings];
  if (!verifiedText) warnings.push('No hay texto OCR verificado: el copy no se inventa y el sistema usa placeholders.');
  return {
    version: '0.4', source: spec.source, brief, styleId: style.id, styleConfidence: verifiedText ? 0.62 : 0.48,
    artDirection: ad, confirmed: [...confirmed, ...tiers.filter((t) => t.status === 'verified')],
    estimated: [...estimated, ...tiers.filter((t) => t.status === 'estimated')],
    palette: spec.palette.map((p) => ({ role: p.role, hex: p.hex, share: p.share, source: 'verified' })),
    typography: {
      measuredLines: lines,
      approximation: {
        display: ad.typography.families.display, body: ad.typography.families.body, mono: ad.typography.families.mono,
        note: 'Aproximación por proporción, no identificación de la fuente original.',
      },
      scale: ad.typography.sizes,
    },
    layout: {
      composition, columns: ad.layout.columns, gutter: ad.layout.gutter, maxWidth: ad.layout.maxWidth,
      distribution,
    },
    layers: spec.layers.map((l) => ({ ...l, status: 'estimated' as const })),
    materials: [ad.materials.surface, ad.materials.texture, ad.materials.gradient],
    components: ad.components,
    timeline: {
      scenes: spec.scenes,
      transitions: spec.camera?.transitions ?? [],
      note: spec.scenes.length ? 'Escenas y transiciones medidas en la referencia.' : 'Referencia estática o sin escenas medidas; el timeline no se inventa.',
    },
    motion, effects, implementation, warnings,
    limitations: [
      'La fuente tipográfica no se identifica: sólo se aproxima familia y escala.',
      'La arquitectura de componentes es una propuesta; no se deduce del píxel.',
      'Las asignaciones de efectos son hipótesis con confianza, no identificaciones exactas.',
      'El copy verificado por OCR puede contener errores de reconocimiento.',
      'La evaluación artística humana es independiente de las métricas y de la auditoría estructural.',
    ],
  };
}

export function renderReferenceDesign(design: ReferenceDesign, outDir: string): { dir: string; files: string[]; html: string; json: string; markdown: string } {
  const dir = ensureDir(outDir);
  const ds = renderDesignSystem(design.artDirection, path.join(dir, 'design-system'));
  const lab = renderMotionLab(design.artDirection, path.join(dir, 'motion'));
  const json = path.join(dir, 'design.json');
  const md = path.join(dir, 'DESIGN.md');
  fs.writeFileSync(json, JSON.stringify(design, null, 2) + '\n', 'utf8');
  const text = `# Reference-to-Design · ${path.basename(design.source)}

${design.artDirection.audit.note}

## Confirmado por medición

${design.confirmed.map((c) => `- ${c.value} — ${c.evidence}`).join('\n')}

## Estimado / hipótesis

${design.estimated.map((c) => `- ${c.value} — ${c.evidence}`).join('\n')}

## Identidad

Estilo **${design.styleId}** (confianza ${(design.styleConfidence * 100).toFixed(0)} %). ${design.artDirection.style.description}

## Paleta con roles

${design.palette.map((p) => `- ${p.role}: \`${p.hex}\` (${(p.share * 100).toFixed(0)} %, ${p.source})`).join('\n')}

## Tipografía

${design.typography.measuredLines.map((l) => `- ${l.role}: ${l.heightPx}px, confianza ${(l.confidence * 100).toFixed(0)} %, ${l.text ?? 'sin texto'}`).join('\n') || '- Sin líneas medidas.'}

Aproximación: **${design.typography.approximation.display}** + **${design.typography.approximation.body}**. ${design.typography.approximation.note}

## Layout

${design.layout.distribution.map((d) => `- ${d}`).join('\n')}

## Componentes

${design.components.map((c) => `- ${c}`).join('\n')}

## Motion

${design.motion.recipes.map((r) => `- ${r.id}: ${r.durationMs} ms, ${r.purpose}`).join('\n')}

## Efectos

${design.effects.map((e) => `- ${e.detected} → ${e.mappedTo} (${e.status}, ${(e.confidence * 100).toFixed(0)} %): ${e.note}`).join('\n')}

## Implementación

\`\`\`bash
${design.implementation.command}
\`\`\`

${design.implementation.html}

## Límites

${design.limitations.map((l) => `- ${l}`).join('\n')}

${motionDirectorMarkdown(design.artDirection, design.motion)}
`;
  fs.writeFileSync(md, text, 'utf8');
  return { dir, files: [ds.html, ds.css, ds.tokens, ds.design, lab.html, json, md], html: ds.html, json, markdown: md };
}
