import fs from 'node:fs';
import path from 'node:path';
import { analyzeFile, type VisualProfile } from './analysis.js';
import { opInspect } from './advanced.js';
import { luminance, round } from './util.js';

/**
 * Protocolo Reference First y plan de 8 pasos.
 *
 * El agente no empieza por un estilo: primero mide y describe la referencia, y
 * sólo después decide. El plan enumera las herramientas mínimas de cada paso,
 * el criterio de terminado y el presupuesto de correcciones. No impone una
 * estética ni rellena datos que no se hayan medido.
 */

export type ToolGroup = 'analysis' | 'direction' | 'build' | 'verify' | 'agents';

export const TOOL_GROUPS: Record<string, ToolGroup> = {
  visual_doctor: 'verify',
  visual_analyze: 'analysis',
  visual_extract_frames: 'analysis',
  visual_capture: 'verify',
  visual_compare: 'analysis',
  visual_review: 'analysis',
  visual_effects_list: 'direction',
  visual_effect_get: 'direction',
  visual_effect_apply: 'build',
  visual_adapters: 'build',
  visual_scaffold: 'build',
  visual_deps_plan: 'agents',
  visual_install_deps: 'agents',
  visual_timeline: 'analysis',
  visual_camera: 'analysis',
  visual_inspect: 'analysis',
  visual_effects_detect: 'analysis',
  visual_spec: 'analysis',
  visual_recommend: 'direction',
  visual_temporal: 'analysis',
  visual_vision: 'analysis',
  visual_iterate: 'build',
  visual_backup: 'build',
  visual_compose: 'build',
  visual_reference_effects: 'build',
  visual_benchmark: 'verify',
  visual_art_direction: 'direction',
  visual_reference_design: 'direction',
  visual_motion_director: 'direction',
  visual_showcase: 'direction',
  visual_context: 'direction',
  visual_debug: 'analysis',
  visual_critic: 'analysis',
  visual_fidelity: 'analysis',
  visual_gate: 'verify',
  visual_smart_effects: 'direction',
  visual_loop: 'build',
  visual_loops: 'build',
  visual_agents: 'agents',
  visual_install: 'agents',
  visual_profile: 'agents',
  visual_activation: 'agents',
  visual_security: 'verify',
  visual_usage: 'agents',
  visual_plan: 'direction',
};

export const GROUP_INTENT: Record<ToolGroup, string> = {
  analysis: 'medir y entender antes de decidir',
  direction: 'intención, identidad y especificación',
  build: 'implementar y corregir con reversión',
  verify: 'comprobar el resultado real',
  agents: 'instalar, perfilar y auditar',
};

/** Las siete cosas que hay que preservar de una referencia. */
export const PRESERVE = [
  'composición y distribución',
  'identidad visual',
  'colores y materiales',
  'tipografía y jerarquía',
  'efectos existentes',
  'animaciones y movimiento',
  'proporciones y profundidad',
] as const;

export interface PaletteRole {
  hex: string;
  share: number;
  role: 'fondo' | 'superficie' | 'texto' | 'acento' | 'neutro';
  contrastWithBackground: number | null;
}

export interface ReferenceBrief {
  version: '1.0';
  createdAt: string;
  intent: string;
  reference: {
    path: string;
    kind: VisualProfile['kind'];
    width: number;
    height: number;
    aspect: number;
    duration: number;
  } | null;
  preserve: typeof PRESERVE;
  measured: {
    palette: PaletteRole[];
    luma: number;
    contrast: number;
    saturation: number;
    colorfulness: number;
    edgeDensity: number;
    darkRatio: number;
    quadrants: [number, number, number, number] | null;
    motion: number;
    cuts: number[];
    pace: number;
  } | null;
  typography: {
    status: 'estimated' | 'unavailable';
    scaleRatios: number[];
    note: string;
  };
  effects: { verified: string[]; estimated: string[]; note: string };
  nonNegotiables: string[];
  warnings: string[];
  limits: string[];
}

function relative(file: string): string {
  return path.relative(process.cwd(), file) || path.basename(file);
}

function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return round((hi + 0.05) / (lo + 0.05), 2);
}

function paletteRoles(profile: VisualProfile): PaletteRole[] {
  const entries = profile.palette.slice(0, 8);
  if (!entries.length) return [];
  const withLuma = entries.map((e) => ({ ...e, luma: luminance(...e.rgb) }));
  const background = withLuma.reduce((a, b) => (b.share > a.share ? b : a));
  const bgLuma = background.luma;
  const hasDarkText = withLuma.some((e) => e !== background && Math.abs(e.luma - bgLuma) > 0.3 && e.luma < bgLuma);
  return withLuma
    .map((e) => {
      let role: PaletteRole['role'] = 'neutro';
      if (e === background) role = 'fondo';
      else if (e.luma < bgLuma && hasDarkText && e.luma < 0.35) role = 'texto';
      else if (e.share >= 0.12) role = 'superficie';
      const chroma = (Math.max(...e.rgb) - Math.min(...e.rgb)) / Math.max(1, Math.max(...e.rgb));
      if (chroma >= 0.25 && e.share >= 0.03 && e !== background) role = 'acento';
      return {
        hex: e.hex,
        share: round(e.share, 3),
        role,
        contrastWithBackground: e === background ? null : contrastRatio(e.luma, bgLuma),
      };
    })
    .sort((a, b) => b.share - a.share);
}

function typographyOf(textLines: { heightRatio: number; status?: string }[]): ReferenceBrief['typography'] {
  const sizes = textLines.map((t) => t.heightRatio).filter((h) => h > 0).sort((a, b) => b - a);
  if (sizes.length < 2) {
    return {
      status: 'unavailable',
      scaleRatios: [],
      note: 'Sin dos niveles de texto medibles: no se afirma una escala tipográfica. Describe la jerarquía mirando la referencia.',
    };
  }
  const base = sizes[sizes.length - 1];
  const unique = [...new Set(sizes.map((s) => round(s / base, 2)))].slice(0, 6);
  return {
    status: 'estimated',
    scaleRatios: unique,
    note: 'Alturas relativas medidas en la imagen. No identifica familia, peso ni interletrado: eso se conserva por inspección, no se inventa.',
  };
}

export interface BriefInput {
  intent: string;
  reference?: string;
  outDir?: string;
}

export async function createReferenceBrief(input: BriefInput): Promise<ReferenceBrief> {
  const intent = (input.intent ?? '').trim() || 'Sin intención declarada; pídela antes de diseñar.';
  const warnings: string[] = [];
  let profile: VisualProfile | null = null;
  let textLines: { heightRatio: number }[] = [];

  if (input.reference) {
    const file = path.resolve(input.reference);
    if (!fs.existsSync(file)) throw new Error(`No existe la referencia: ${file}`);
    profile = await analyzeFile(file);
    try {
      const inspected = await opInspect({ path: file, frames: 1 });
      textLines = inspected.content.textLines ?? [];
    } catch (e) {
      warnings.push(`No se pudo inspeccionar la composición: ${(e as Error).message}`);
    }
  } else {
    warnings.push('Sin archivo de referencia: sólo se registra la intención. No se inventan colores, composición ni tipografía.');
  }

  const measured = profile
    ? {
        palette: paletteRoles(profile),
        luma: profile.aggregate.luma,
        contrast: profile.aggregate.contrast,
        saturation: profile.aggregate.saturation,
        colorfulness: profile.aggregate.colorfulness,
        edgeDensity: profile.aggregate.edgeDensity,
        darkRatio: profile.aggregate.darkRatio,
        quadrants: profile.frames[0]?.quadrants ?? null,
        motion: profile.motion,
        cuts: profile.cuts,
        pace: profile.pace,
      }
    : null;

  const nonNegotiables = profile
    ? [
        `Conserva la distribución de masa por cuadrantes (${measured!.quadrants?.map((q) => Math.round(q * 100)).join('/')} %).`,
        `Conserva la luminancia (${measured!.luma}) y el contraste (${measured!.contrast}); no inviertas a oscuro si la referencia es clara.`,
        `Conserva la paleta medida: ${measured!.palette.slice(0, 4).map((p) => `${p.hex} (${p.role})`).join(', ')}.`,
        `Conserva la proporción ${profile.width}×${profile.height} (${profile.aspect}).`,
        'Conserva los efectos y el movimiento que existan; no añadas partículas, glow, glassmorphism ni degradados neón si no están.',
        'La intención del usuario y la referencia mandan sobre cualquier estilo predefinido.',
      ]
    : [
        'La intención del usuario manda; si falta la referencia, pídela antes de fijar estética.',
        'No impongas una estética (oscura, futurista, partículas, glow, glassmorphism) sin evidencia en la petición.',
      ];

  const brief: ReferenceBrief = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    intent,
    reference: profile
      ? {
          path: relative(profile.source),
          kind: profile.kind,
          width: profile.width,
          height: profile.height,
          aspect: profile.aspect,
          duration: profile.kind === 'video' ? profile.duration : 0,
        }
      : null,
    preserve: PRESERVE,
    measured,
    typography: typographyOf(textLines),
    effects: {
      verified: [],
      estimated: [],
      note: 'Los efectos de esta referencia se confirman con `ve detect` (vídeo) o por inspección visual. No se afirman sin evidencia.',
    },
    nonNegotiables,
    warnings,
    limits: [
      'El perfil mide color, luz y composición; no entiende marcas, materiales ni intención.',
      'La tipografía sólo se aproxima por alturas relativas: no hay identificación de familia.',
      'Los efectos listados como estimated son correspondencias, no plugins exactos.',
    ],
  };

  if (input.outDir) writeBrief(brief, input.outDir);
  return brief;
}

export function briefToMarkdown(brief: ReferenceBrief): string {
  const lines: string[] = [];
  lines.push('# Reference First — brief medido', '');
  lines.push(`**Intención del usuario:** ${brief.intent}`, '');
  if (brief.reference) {
    const r = brief.reference;
    lines.push(`**Referencia:** \`${r.path}\` · ${r.width}×${r.height} · proporción ${r.aspect}${r.kind === 'video' ? ` · ${r.duration}s` : ''}`, '');
  }
  lines.push('## Lo que hay que preservar', '');
  for (const item of brief.preserve) lines.push(`- ${item}`);
  lines.push('', '## Reglas no negociables', '');
  for (const rule of brief.nonNegotiables) lines.push(`- ${rule}`);
  if (brief.measured) {
    lines.push('', '## Medición', '');
    lines.push('| Color | Rol | Proporción | Contraste con fondo |', '| --- | --- | ---: | ---: |');
    for (const p of brief.measured.palette) {
      lines.push(`| \`${p.hex}\` | ${p.role} | ${(p.share * 100).toFixed(1)}% | ${p.contrastWithBackground ?? '—'} |`);
    }
    lines.push('', `Luminancia ${brief.measured.luma} · contraste ${brief.measured.contrast} · saturación ${brief.measured.saturation} · detalle ${brief.measured.edgeDensity} · oscuro ${brief.measured.darkRatio}.`);
    if (brief.reference?.kind === 'video') {
      lines.push(`Movimiento ${brief.measured.motion} · cortes ${brief.measured.cuts.join(', ') || 'ninguno'} · ritmo ${brief.measured.pace}/min.`);
    }
  }
  lines.push('', '## Tipografía', '', `Estado: **${brief.typography.status}**. ${brief.typography.note}`, '');
  if (brief.typography.scaleRatios.length) lines.push(`Escala relativa medida: ${brief.typography.scaleRatios.join(' · ')}`);
  lines.push('', '## Límites', '');
  for (const l of brief.limits) lines.push(`- ${l}`);
  return lines.join('\n');
}

export function writeBrief(brief: ReferenceBrief, outDir: string): { json: string; markdown: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'reference-first.json');
  const markdown = path.join(outDir, 'reference-first.md');
  fs.writeFileSync(json, JSON.stringify(brief, null, 2) + '\n');
  fs.writeFileSync(markdown, briefToMarkdown(brief) + '\n');
  return { json, markdown };
}

export interface WorkflowStep {
  id: string;
  label: string;
  tools: string[];
  done: string;
  status: 'pending' | 'done' | 'blocked';
}

export interface WorkflowPlan {
  version: '1.0';
  task: string;
  phase: string | null;
  steps: WorkflowStep[];
  budget: { corrections: number; rule: string };
  rules: string[];
  groups: { group: ToolGroup; intent: string; tools: string[] }[];
  doneDefinition: string;
}

export function buildPlan(input: { task: string; phase?: string }): WorkflowPlan {
  const steps: WorkflowStep[] = [
    { id: 'analizar', label: 'Analizar la petición y la referencia', tools: ['visual_analyze', 'visual_inspect', 'visual_timeline'], done: 'Perfil medido y brief Reference First escrito; intención explícita.', status: 'pending' },
    { id: 'comprender', label: 'Comprender qué se preserva', tools: ['visual_plan', 'visual_context'], done: 'Las siete dimensiones están descritas con evidencia o marcadas como estimadas.', status: 'pending' },
    { id: 'disenar', label: 'Diseñar antes de codificar', tools: ['visual_reference_design', 'visual_art_direction', 'visual_smart_effects'], done: 'Identidad, escala, materiales y efectos justificados por la referencia.', status: 'pending' },
    { id: 'implementar', label: 'Implementar', tools: ['visual_effect_apply', 'visual_compose', 'visual_scaffold'], done: 'El código se ejecuta y respeta la composición y la paleta medidas.', status: 'pending' },
    { id: 'renderizar', label: 'Renderizar y capturar', tools: ['visual_capture'], done: 'Captura real a la resolución objetivo, sin errores de consola.', status: 'pending' },
    { id: 'inspeccionar', label: 'Inspeccionar', tools: ['visual_debug', 'visual_critic', 'visual_fidelity'], done: 'Hallazgos con evidencia y ubicación; dimensiones débiles identificadas.', status: 'pending' },
    { id: 'corregir', label: 'Corregir', tools: ['visual_loop', 'visual_iterate'], done: 'Cada corrección se mide; si empeora, se revierte.', status: 'pending' },
    { id: 'verificar', label: 'Verificar y declarar', tools: ['visual_gate', 'visual_review', 'visual_temporal'], done: 'Gate ejecutado; defectos pendientes declarados con su gravedad.', status: 'pending' },
  ];
  const phase = input.phase?.toLowerCase();
  const phaseIndex = phase ? steps.findIndex((s) => s.id === phase) : -1;
  if (phaseIndex > 0) steps.forEach((s, i) => { if (i < phaseIndex) s.status = 'done'; });
  if (phaseIndex >= 0) steps[phaseIndex].status = 'pending';

  const groups = (Object.keys(GROUP_INTENT) as ToolGroup[]).map((group) => ({
    group,
    intent: GROUP_INTENT[group],
    tools: Object.entries(TOOL_GROUPS).filter(([, g]) => g === group).map(([name]) => name),
  }));

  return {
    version: '1.0',
    task: input.task,
    phase: phaseIndex >= 0 ? steps[phaseIndex].id : null,
    steps,
    budget: { corrections: 2, rule: 'Máximo 2 correcciones medidas por presupuesto; si el defecto persiste, se declara en vez de maquillarlo.' },
    rules: [
      'La referencia y la intención del usuario van antes que cualquier estilo, plantilla o preferencia del agente.',
      'No se añaden efectos, partículas, glow ni glassmorphism que la referencia no sostenga.',
      'Una tarea no termina porque el código funcione: termina cuando la captura y el gate se ejecutaron.',
      'Si un control visual falla, se corrige dentro del presupuesto o se declara el defecto pendiente.',
      'No cargues las 45 herramientas ni los 58 efectos: usa el grupo y la herramienta que toca en cada paso.',
    ],
    groups,
    doneDefinition: 'Código ejecutándose + captura real + crítica/gate ejecutados + defectos pendientes declarados. Sin captura no hay verificación.',
  };
}

export function describePlan(plan: WorkflowPlan): string[] {
  return [
    `Plan para: ${plan.task}`,
    ...plan.steps.map((s, i) => `${i + 1}. ${s.label} [${s.status}] → ${s.done}`),
    `Presupuesto: ${plan.budget.corrections} correcciones. ${plan.budget.rule}`,
    `Terminado: ${plan.doneDefinition}`,
    ...plan.rules.map((r) => `Regla: ${r}`),
  ];
}
