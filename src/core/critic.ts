import type { VisualProfile } from './analysis.js';
import type { DomSnapshot, DebugElement } from './debugger.js';
import type { QualityEvaluation } from './quality.js';
import type { ArtDirection, StyleId, ProjectType } from './styles.js';
import type { VisualSpec } from './spec.js';
import { clamp, round } from './util.js';

/**
 * Visual Critic 0.5.
 *
 * Cada hallazgo nace de una medida disponible (perfil, DOM, curva de movimiento,
 * contraste, FPS o especificación). No se rellena una categoría sin evidencia:
 * si falta el dato, el hallazgo no se emite y la limitación se declara.
 */

export type FindingCategory =
  | 'functionality'
  | 'flat-generic'
  | 'depth'
  | 'motion'
  | 'effects'
  | 'composition'
  | 'hierarchy'
  | 'typography'
  | 'coherence'
  | 'lighting'
  | 'materials'
  | 'transitions'
  | 'accessibility'
  | 'performance'
  | 'intent';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Confidence = number;

export interface FindingEvidence {
  source: 'profile' | 'dom' | 'quality' | 'motion' | 'spec' | 'runtime' | 'art-direction';
  metric: string;
  value: number | string;
  threshold?: number | string;
  note?: string;
}

export interface FindingLocation {
  selector?: string;
  region?: DebugElement['region'];
  box?: { x: number; y: number; width: number; height: number };
  frame?: number;
  timeMs?: number;
  file?: string;
  line?: number;
  layer?: string;
  component?: string;
}

export interface FindingFix {
  kind: 'css' | 'dom' | 'typography' | 'effect' | 'motion' | 'content' | 'performance' | 'manual';
  summary: string;
  target?: string;
  property?: string;
  from?: string;
  to?: string;
  recipe?: string;
  command?: string;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  title: string;
  severity: Severity;
  confidence: Confidence;
  evidence: FindingEvidence[];
  location: FindingLocation;
  fix: FindingFix;
  status: 'measured' | 'estimated';
}

export interface CriticRequest {
  brief: string;
  style?: string;
  projectType?: ProjectType;
  audience?: string;
  allowDecorativeEffects?: boolean;
  reducedMotionRequired?: boolean;
}

export interface MotionCritiqueInput {
  /** jerk máximo de una transición medida; si existe, se usa. */
  maxJerk?: number;
  /** rotación esperada/medida en grados. */
  rotation?: { expectedDeg: number; measuredDeg: number; errorDeg: number; status: string };
  transitionStatus?: string;
  /** porcentaje de animaciones con easing lineal o duración <= 120 ms. */
  rigidRatio?: number;
}

export interface PerformanceCritiqueInput {
  fps?: number;
  p95FrameMs?: number;
  loadMs?: number;
  longTasks?: number;
}

export interface CriticInput {
  request: CriticRequest;
  reference?: VisualProfile;
  candidate?: VisualProfile;
  quality?: QualityEvaluation;
  art?: ArtDirection;
  spec?: VisualSpec;
  dom?: DomSnapshot;
  usedEffects?: { id: string; role?: string }[];
  expectedEffects?: { id: string; confidence?: number; status?: string }[];
  motion?: MotionCritiqueInput;
  performance?: PerformanceCritiqueInput;
  runtime?: { consoleErrors?: string[]; pageErrors?: string[]; requestFailures?: string[]; functionalFailures?: string[] };
  thresholds?: Partial<CriticThresholds>;
}

export interface CriticThresholds {
  minFidelity: number;
  minComposition: number;
  minHierarchy: number;
  minTypography: number;
  minDepth: number;
  minLighting: number;
  minCoherence: number;
  minPerformance: number;
  maxContrastViolations: number;
  minBodyPx: number;
  minTypeSteps: number;
  minHierarchyRatio: number;
}

export const DEFAULT_CRITIC_THRESHOLDS: CriticThresholds = {
  minFidelity: 65,
  minComposition: 62,
  minHierarchy: 62,
  minTypography: 62,
  minDepth: 55,
  minLighting: 58,
  minCoherence: 58,
  minPerformance: 55,
  maxContrastViolations: 0,
  minBodyPx: 12,
  minTypeSteps: 3,
  minHierarchyRatio: 1.8,
};

const MINIMAL_STYLES: StyleId[] = ['minimal-premium', 'editorial', 'professional-app', 'financial-dashboard', 'neumorphism'];
const HEAVY_KEYWORDS = ['particle', 'partículas', 'glow', 'blur', 'bokeh', 'starfield', 'cube-field', 'volumetric', 'neon', 'glitch'];

function dim(q: QualityEvaluation | undefined, id: string): number | null {
  const d = q?.dimensions.find((x) => x.id === id);
  return d && d.available && d.score !== null ? d.score : null;
}

function severityFor(value: number | null, high: number, medium: number): Severity | null {
  if (value === null) return null;
  if (value < high) return 'high';
  if (value < medium) return 'medium';
  return null;
}

function regionFromBox(el: DebugElement): FindingLocation {
  return { selector: el.selector, region: el.region, box: el.box };
}

function styleIsMinimal(art?: ArtDirection, request?: CriticRequest): boolean {
  const id = art?.style.id ?? (request?.style as StyleId | undefined);
  return !!id && MINIMAL_STYLES.includes(id);
}

function typographyElement(dom?: DomSnapshot): DebugElement | undefined {
  if (!dom) return undefined;
  return dom.elements.find((e) => e.tag === 'h1')
    ?? dom.elements.find((e) => e.tag === 'h2')
    ?? dom.elements.find((e) => e.tag === 'p');
}

function worstContrastElement(dom: DomSnapshot): DebugElement | undefined {
  const text = dom.elements.filter((e) => e.contrast !== null && e.text.length > 0);
  return text.sort((a, b) => (a.contrast ?? 99) - (b.contrast ?? 99))[0];
}

function actionForCategory(category: FindingCategory): string {
  const map: Record<FindingCategory, string> = {
    functionality: 'Corrige el error de ejecución antes de valorar el diseño; una captura rota no es una referencia válida.',
    'flat-generic': 'Añade una decisión de identidad medible (escala, material o profundidad) sin decorar por decorar.',
    depth: 'Crea dos o tres planos reales: superficie, contenido y foco; usa contraste, sombra de contacto y escala.',
    motion: 'Sustituye el movimiento lineal por una curva con aceleración y desaceleración; reduce la distancia.',
    effects: 'Añade sólo el efecto que falta por función, con presupuesto y sin tapar el contenido.',
    composition: 'Reequilibra la masa y reduce la competencia entre focos; conserva un punto de entrada.',
    hierarchy: 'Refuerza un único foco: tamaño, peso o contraste; baja el resto un nivel.',
    typography: 'Ajusta la escala modular, el cuerpo mínimo y el interlineado antes de cambiar la familia.',
    coherence: 'Reduce la paleta y reutiliza tokens; elimina acentos y materiales que no pertenecen al sistema.',
    lighting: 'Unifica la dirección de luz y el contraste; evita sombras contradictorias.',
    materials: 'Haz explícito el material: borde, sombra, rugosidad o transparencia; no lo simules con ruido aleatorio.',
    transitions: 'Define duración, easing y coordinación; evita transiciones de 0 ms o lineales.',
    accessibility: 'Sube el contraste del texto o cambia el fondo; no ocultes el foco.',
    performance: 'Reduce el coste del efecto dominante, el DPR o la resolución de la capa, y vuelve a medir.',
    intent: 'Alinea la decisión con el brief: si el estilo pedido es sobrio, elimina el efecto que lo contradice.',
  };
  return map[category];
}

export interface CriticReport {
  version: '0.5';
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  findings: Finding[];
  counts: Record<Severity, number>;
  summary: string;
  agentTask: string;
  limitations: string[];
  measured: {
    quality?: number;
    fidelity?: number;
    composition?: number;
    hierarchy?: number;
    typography?: number;
    depth?: number;
    lighting?: number;
    coherence?: number;
    transitions?: number | null;
    performance?: number | null;
    contrastViolations?: number;
  };
  /** La crítica es estructural; no sustituye la aprobación artística humana. */
  artisticJudgment: false;
}

function finding(
  id: string,
  category: FindingCategory,
  title: string,
  severity: Severity,
  confidence: Confidence,
  evidence: FindingEvidence[],
  location: FindingLocation,
  fix: FindingFix,
  status: Finding['status'] = 'measured',
): Finding {
  return { id, category, title, severity, confidence: round(clamp(confidence), 2), evidence, location, fix, status };
}

export function critique(input: CriticInput): CriticReport {
  const t = { ...DEFAULT_CRITIC_THRESHOLDS, ...(input.thresholds ?? {}) };
  const q = input.quality;
  const dom = input.dom;
  const findings: Finding[] = [];
  const limitations: string[] = [];
  const measured: CriticReport['measured'] = {
    quality: q?.overall,
    fidelity: dim(q, 'fidelity') ?? undefined,
    composition: dim(q, 'composition') ?? undefined,
    hierarchy: dim(q, 'hierarchy') ?? undefined,
    typography: dim(q, 'typography') ?? undefined,
    depth: dim(q, 'depth') ?? undefined,
    lighting: dim(q, 'lighting') ?? undefined,
    coherence: dim(q, 'coherence') ?? undefined,
    transitions: dim(q, 'transitions'),
    performance: dim(q, 'performance'),
  };

  // 1. Funcionamiento: si la página no carga, el resto de la crítica es secundaria.
  const runtimeErrors = [
    ...(input.runtime?.consoleErrors ?? []),
    ...(input.runtime?.pageErrors ?? []),
    ...(input.runtime?.functionalFailures ?? []),
    ...(dom?.consoleErrors ?? []),
    ...(dom?.pageErrors ?? []),
    ...(dom?.requestFailures ?? []),
  ];
  if (runtimeErrors.length) {
    findings.push(finding(
      'runtime-errors', 'functionality', 'La creación tiene errores de ejecución o recursos',
      'critical', 1,
      [{ source: 'runtime', metric: 'errores', value: runtimeErrors.length, threshold: 0, note: runtimeErrors.slice(0, 3).join(' | ') }],
      { selector: dom?.brokenImages[0]?.selector, component: 'runtime' },
      { kind: 'manual', summary: 'Corrige la consola, los recursos 404 y las imágenes rotas antes de entregar.', command: 've debug <target> --target-dir <proyecto>' },
    ));
  }

  // 2. Diseño plano/genérico: sólo si la intención no es deliberadamente sobria.
  const minimal = styleIsMinimal(input.art, input.request);
  const used = input.usedEffects ?? [];
  const depth = dim(q, 'depth');
  const composition = dim(q, 'composition');
  const hierarchy = dim(q, 'hierarchy');
  const typography = dim(q, 'typography');
  if (!minimal && depth !== null && depth < t.minDepth && used.length === 0) {
    findings.push(finding(
      'flat-generic', 'flat-generic', 'Diseño plano para una intención que pide profundidad',
      severityFor(depth, t.minDepth - 5, t.minDepth)!,
      Math.min(0.95, 0.55 + (t.minDepth - depth) / 100),
      [
        { source: 'quality', metric: 'profundidad', value: round(depth, 1), threshold: t.minDepth },
        { source: 'art-direction', metric: 'efectos usados', value: 0, threshold: '≥1 con función' },
      ],
      { selector: dom?.elements.find((e) => e.tag === 'main')?.selector, component: 'hero' },
      { kind: 'effect', summary: 'Añade un plano de profundidad con función: atmósfera, sombra de contacto o parallax leve.', command: 've effects list --category fondos' },
    ));
  }

  const depthSeverity = severityFor(depth, t.minDepth - 5, t.minDepth);
  if (depthSeverity) {
    findings.push(finding(
      'depth-low', 'depth', 'La profundidad visual es insuficiente o no está jerarquizada',
      depthSeverity, 0.8,
      [{ source: 'quality', metric: 'profundidad', value: round(depth!, 1), threshold: t.minDepth, note: 'proxy de cuadrantes y detalle; no es un mapa métrico' }],
      { selector: dom?.elements.find((e) => e.tag === 'main')?.selector, layer: 'fondo/contenido/foco' },
      { kind: 'css', summary: 'Separa fondo, contenido y foco con escala, luminancia y una sombra de contacto coherente.', property: 'box-shadow / filter / transform' },
    ));
  }

  // 3. Composición y jerarquía.
  const compSeverity = severityFor(composition, t.minComposition - 7, t.minComposition);
  if (compSeverity) {
    findings.push(finding(
      'composition-low', 'composition', 'Composición desequilibrada o con focos en competencia',
      compSeverity, 0.85,
      [{ source: 'quality', metric: 'composición', value: round(composition!, 1), threshold: t.minComposition, note: 'balance de masa por cuadrantes' }],
      { region: 'center', component: 'layout' },
      { kind: 'css', summary: 'Reequilibra la masa horizontal/vertical y deja un único punto de entrada.', property: 'grid / align / max-width' },
    ));
  }
  const hierSeverity = severityFor(hierarchy, t.minHierarchy - 7, t.minHierarchy);
  if (hierSeverity) {
    findings.push(finding(
      'hierarchy-low', 'hierarchy', 'Jerarquía visual débil: varios elementos compiten por la atención',
      hierSeverity, 0.8,
      [{ source: 'quality', metric: 'jerarquía', value: round(hierarchy!, 1), threshold: t.minHierarchy }],
      { selector: typographyElement(dom)?.selector, component: 'hero' },
      { kind: 'typography', summary: 'Sube un solo titular y baja el resto; usa tamaño, peso o contraste, no los tres a la vez.', property: 'font-size / font-weight' },
    ));
  }

  // 4. Tipografía real del DOM.
  const typeEl = typographyElement(dom);
  if (dom) {
    const sizes = [...new Set(dom.elements.filter((e) => e.styles.fontSize > 0).map((e) => Math.round(e.styles.fontSize)))].sort((a, b) => a - b);
    const bodySizes = dom.elements.filter((e) => e.tag === 'p' || e.tag === 'li').map((e) => e.styles.fontSize).filter((n) => n > 0);
    const bodyAvg = bodySizes.length ? bodySizes.reduce((a, b) => a + b, 0) / bodySizes.length : 0;
    const ratio = sizes.length ? sizes[sizes.length - 1] / sizes[0] : 1;
    const badSizes = sizes.length < t.minTypeSteps || (bodyAvg > 0 && bodyAvg < t.minBodyPx) || ratio < t.minHierarchyRatio;
    if (badSizes && (!typography || typography < t.minTypography + 15)) {
      const severity: Severity = sizes.length <= 1 || (bodyAvg > 0 && bodyAvg < t.minBodyPx) ? 'high' : 'medium';
      findings.push(finding(
        'typography-structure', 'typography', 'Escala tipográfica insuficiente o cuerpo por debajo del mínimo legible',
        severity, 0.85,
        [
          { source: 'dom', metric: 'pasos tipográficos', value: sizes.length, threshold: t.minTypeSteps },
          { source: 'dom', metric: 'cuerpo medio px', value: round(bodyAvg, 1), threshold: t.minBodyPx },
          { source: 'dom', metric: 'ratio máximo/mínimo', value: round(ratio, 2), threshold: t.minHierarchyRatio },
        ],
        typeEl ? regionFromBox(typeEl) : { component: 'typography' },
        { kind: 'typography', summary: 'Define una escala modular de al menos tres pasos y un cuerpo de 16 px cuando el espacio lo permita.', property: 'font-size / line-height', to: 'clamp(16px, 1.25vw, 20px)' },
      ));
    }
    if (dom.contrast.violations > t.maxContrastViolations) {
      const worst = worstContrastElement(dom);
      findings.push(finding(
        'contrast', 'accessibility', 'Texto por debajo del contraste mínimo en el DOM',
        dom.contrast.violations >= 5 ? 'critical' : 'high', 0.95,
        [
          { source: 'dom', metric: 'incumplimientos', value: dom.contrast.violations, threshold: t.maxContrastViolations },
          { source: 'dom', metric: 'peor contraste', value: `${dom.contrast.worst}:1`, threshold: '4.5:1 (3:1 texto grande)' },
        ],
        worst ? regionFromBox(worst) : { component: 'typography' },
        {
          kind: 'css', summary: `Ajusta color/fondo del texto con peor contraste (${worst?.contrast ?? '—'}:1).`, target: worst?.selector,
          property: 'color / background-color', to: '≥4.5:1 o ≥3:1 si es texto grande',
        },
      ));
    }
    if (dom.buttonsWithoutName.length) {
      findings.push(finding(
        'button-name', 'accessibility', 'Botones sin nombre accesible', 'high', 0.95,
        [{ source: 'dom', metric: 'botones sin nombre', value: dom.buttonsWithoutName.length, threshold: 0 }],
        { selector: dom.buttonsWithoutName[0].selector, component: 'control' },
        { kind: 'dom', summary: 'Añade texto visible o aria-label que describa la acción.', property: 'aria-label' },
      ));
    }
    if (dom.imagesWithoutAlt.length) {
      findings.push(finding(
        'image-alt', 'accessibility', 'Imágenes sin texto alternativo', 'medium', 0.9,
        [{ source: 'dom', metric: 'imágenes sin alt', value: dom.imagesWithoutAlt.length, threshold: 0 }],
        { selector: dom.imagesWithoutAlt[0].selector, component: 'media' },
        { kind: 'dom', summary: 'Añade alt descriptivo o aria-hidden si la imagen es decorativa.', property: 'alt' },
      ));
    }
    if (dom.scroll.overflowX > 1) {
      findings.push(finding(
        'overflow-x', 'composition', 'Desbordamiento horizontal', 'high', 1,
        [{ source: 'dom', metric: 'overflow-x px', value: dom.scroll.overflowX, threshold: 0 }],
        { component: 'layout' },
        { kind: 'css', summary: 'Encuentra el elemento más ancho que el viewport y limita su ancho o su grid.', property: 'max-width / overflow' },
      ));
    }
  } else {
    limitations.push('Sin inspección DOM: no se afirman problemas de tipografía, contraste, botones ni overflow.');
  }

  // 5. Coherencia, iluminación y materiales.
  const coherence = dim(q, 'coherence');
  const cohSeverity = severityFor(coherence, t.minCoherence - 8, t.minCoherence);
  if (cohSeverity) {
    findings.push(finding(
      'coherence-low', 'coherence', 'Incoherencia estética entre la intención y el resultado',
      cohSeverity, 0.75,
      [{ source: 'quality', metric: 'coherencia de matiz', value: round(coherence!, 1), threshold: t.minCoherence }],
      { component: 'palette' },
      { kind: 'css', summary: 'Reduce la paleta a tokens semánticos y elimina acentos que no tengan un rol.', property: 'color tokens' },
    ));
  }
  const lighting = dim(q, 'lighting');
  const lightSeverity = severityFor(lighting, t.minLighting - 7, t.minLighting);
  if (lightSeverity) {
    findings.push(finding(
      'lighting-low', 'lighting', 'Iluminación plana o contradictoria',
      lightSeverity, 0.7,
      [{ source: 'quality', metric: 'iluminación', value: round(lighting!, 1), threshold: t.minLighting }],
      { layer: 'superficies' },
      { kind: 'css', summary: 'Define una dirección de luz principal y una sombra de contacto; evita halos sin fuente.', property: 'box-shadow / gradient' },
    ));
  }
  if (dom) {
    const materialSignals = dom.counts.materials;
    const hasMaterialIntent = input.art && input.art.materials.surface !== 'flat';
    if (hasMaterialIntent && materialSignals < 2) {
      findings.push(finding(
        'materials-missing', 'materials', 'El material declarado no aparece en el render',
        'medium', 0.65,
        [
          { source: 'dom', metric: 'señales de material', value: materialSignals, threshold: 2 },
          { source: 'art-direction', metric: 'material declarado', value: input.art!.materials.surface },
        ],
        { component: 'superficies' },
        { kind: 'css', summary: `Materializa ${input.art!.materials.surface}: borde, sombra, transparencia o rugosidad coherentes.`, property: 'background / box-shadow / border' },
      ));
    }
  }

  // 6. Movimiento y transiciones.
  const animations = dom?.animations ?? [];
  const rigidFromDom = animations.length
    ? animations.filter((a) => /linear/.test(a.easing) || a.duration <= 120).length / animations.length
    : undefined;
  const rigid = input.motion?.rigidRatio ?? rigidFromDom;
  if (rigid !== undefined && rigid > 0.6) {
    findings.push(finding(
      'motion-rigid', 'motion', 'Animaciones rígidas o demasiado rápidas',
      rigid > 0.85 ? 'high' : 'medium', 0.8,
      [{ source: 'motion', metric: 'proporción lineal/≤120 ms', value: round(rigid, 2), threshold: 0.6, note: `${animations.length} animaciones observadas` }],
      { selector: animations.find((a) => /linear/.test(a.easing))?.target ?? undefined, frame: 0 },
      { kind: 'motion', summary: 'Usa una curva con salida suave y 180–500 ms; reserva el spring para interacción directa.', property: 'transition-timing-function' },
    ));
  }
  if (input.motion?.maxJerk !== undefined && input.motion.maxJerk > 0.02) {
    findings.push(finding(
      'transition-jerk', 'transitions', 'La transición tiene un cambio brusco de aceleración',
      input.motion.maxJerk > 0.05 ? 'high' : 'medium', 0.9,
      [{ source: 'motion', metric: 'jerk máximo', value: round(input.motion.maxJerk, 5), threshold: 0.02 }],
      { timeMs: 0, frame: 0 },
      { kind: 'motion', summary: 'Suaviza la curva y reduce la distancia; valida de nuevo con el Motion Director.', command: 've motiondirector --style motion-graphics' },
    ));
  }
  const transitionStatus = input.motion?.transitionStatus;
  if (transitionStatus && transitionStatus !== 'verified') {
    findings.push(finding(
      'transition-unverified', 'transitions', 'La transición no está verificada con una muestra temporal',
      'low', 0.6,
      [{ source: 'motion', metric: 'estado', value: transitionStatus, threshold: 'verified' }],
      { frame: 0, timeMs: 0 },
      { kind: 'motion', summary: 'Captura al menos tres fotogramas durante la transición y mide la curva.', command: 've motiondirector --style cinematic' },
      'estimated',
    ));
  }
  if (dom && dom.animations.length > 0 && dom.counts.transitions === 0) {
    limitations.push('Hay animaciones activas pero ninguna transición CSS declarada; puede ser JS, no se etiqueta como defecto.');
  }

  // 7. Efectos esperados frente a usados.
  const expected = input.expectedEffects?.length
    ? input.expectedEffects
    : (input.spec?.effects ?? []).map((e) => ({ id: e.id, confidence: e.confidence, status: e.status }));
  if (!minimal && expected.length > used.length) {
    const missing = expected.filter((e) => !used.some((u) => u.id === e.id));
    findings.push(finding(
      'effects-missing', 'effects', 'Faltan efectos observados en la referencia',
      'medium', Math.min(0.9, 0.55 + missing.length * 0.1),
      [
        { source: 'spec', metric: 'efectos esperados', value: expected.length, threshold: used.length },
        { source: 'spec', metric: 'ausentes', value: missing.map((m) => m.id).join(', '), note: missing.map((m) => m.status ?? 'estimated').join(', ') },
      ],
      { component: 'efectos' },
      { kind: 'effect', summary: `Evalúa sólo ${missing.slice(0, 2).map((m) => m.id).join(' y ')}; añade si cumplen una función y respetan el presupuesto.`, recipe: missing[0]?.id },
      'estimated',
    ));
  }
  if (minimal && used.some((e) => HEAVY_KEYWORDS.some((k) => e.id.includes(k)))) {
    findings.push(finding(
      'effects-intent', 'intent', 'Efecto decorativo en un estilo que pide contención',
      'high', 0.85,
      [{ source: 'art-direction', metric: 'estilo', value: input.art?.style.id ?? input.request.style ?? 'sobrio' }, { source: 'art-direction', metric: 'efectos', value: used.map((e) => e.id).join(', ') }],
      { component: 'efectos' },
      { kind: 'effect', summary: 'Retira el efecto pesado o demuestra con una medición que mejora jerarquía sin añadir ruido.', command: 've effects list' },
    ));
  }

  // 8. Legibilidad/rendimiento y presupuesto.
  const perf = input.performance;
  if (perf?.fps !== undefined && perf.fps < t.minPerformance) {
    findings.push(finding(
      'performance-fps', 'performance', 'Rendimiento por debajo del umbral',
      perf.fps < 40 ? 'high' : 'medium', 0.9,
      [{ source: 'runtime', metric: 'FPS', value: round(perf.fps, 1), threshold: t.minPerformance }, { source: 'runtime', metric: 'p95 frame ms', value: perf.p95FrameMs ?? 'no medido' }],
      { component: 'render' },
      { kind: 'performance', summary: 'Reduce primero el efecto más caro, luego el DPR; mide de nuevo antes de aceptar.', command: 've benchmark --ms 800' },
    ));
  }
  if (perf?.loadMs !== undefined && perf.loadMs > 4000) {
    findings.push(finding(
      'performance-load', 'performance', 'Carga inicial excesiva', perf.loadMs > 8000 ? 'high' : 'medium', 0.8,
      [{ source: 'runtime', metric: 'carga ms', value: Math.round(perf.loadMs), threshold: 4000 }],
      { component: 'assets' },
      { kind: 'performance', summary: 'Difiere efectos y fuentes no críticas; evita cargar todas las recetas.', command: 've context "<tarea>"' },
    ));
  }

  // 9. Intención y anti-patrones del estilo.
  if (input.art && input.request.style && input.art.style.id !== input.request.style) {
    findings.push(finding(
      'style-mismatch', 'intent', 'El estilo entregado no coincide con el solicitado',
      'high', 1,
      [{ source: 'art-direction', metric: 'solicitado', value: input.request.style }, { source: 'art-direction', metric: 'aplicado', value: input.art.style.id }],
      { component: 'identidad' },
      { kind: 'manual', summary: 'Reconstruye con el perfil solicitado o documenta el cambio con aprobación explícita.' },
    ));
  }
  if (input.art && dom) {
    const avoided = input.art.style.avoid.filter((a) => used.some((e) => a.toLowerCase().includes(e.id.toLowerCase())));
    if (avoided.length) {
      findings.push(finding(
        'style-avoid', 'intent', 'Se usó un recurso que el estilo declara como anti-patrón',
        'medium', 0.8,
        [{ source: 'art-direction', metric: 'anti-patrón', value: avoided.join(', ') }],
        { component: 'identidad' },
        { kind: 'effect', summary: 'Sustituye el recurso por una solución del sistema o justifica la excepción.', command: 've art "<brief>" --style <id>' },
      ));
    }
  }

  // Limitaciones explícitas: no se juzga lo que no se puede medir.
  if (!q) limitations.push('Sin evaluación de calidad: no se emiten umbrales de composición, tipografía o fidelidad.');
  if (!input.reference) limitations.push('Sin referencia visual: no se afirma fidelidad de posición, textura o trayectoria.');
  if (!dom) limitations.push('Sin DOM no se localizan selectores ni propiedades CSS concretas.');
  if (!input.performance) limitations.push('Sin medición de rendimiento no se afirma FPS ni carga.');
  if (!input.motion && (!dom || dom.animations.length === 0)) limitations.push('Sin animaciones observadas no se afirma rigidez temporal.');
  limitations.push('La crítica detecta defectos estructurales; no sustituye la aprobación artística humana.');

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity]++;
  const penalty = counts.critical * 30 + counts.high * 12 + counts.medium * 6 + counts.low * 2;
  const score = round(Math.max(0, 100 - penalty), 1);
  const grade: CriticReport['grade'] = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
  const summary = findings.length
    ? `Crítica ${score}/100 (${grade}): ${counts.critical} crítico(s), ${counts.high} alto(s), ${counts.medium} medio(s), ${counts.low} bajo(s).`
    : `Crítica ${score}/100 (${grade}): no se detectaron defectos con los datos disponibles.`;
  const report: CriticReport = {
    version: '0.5', score, grade, findings, counts, summary,
    agentTask: '',
    limitations, measured, artisticJudgment: false,
  };
  report.agentTask = agentTask(report, input);
  return report;
}

function agentTask(report: CriticReport, input: CriticInput): string {
  const priority = [...report.findings].sort((a, b) => {
    const rank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return rank[a.severity] - rank[b.severity] || b.confidence - a.confidence;
  }).slice(0, 8);
  const lines = [
    '# Tarea visual priorizada',
    '',
    `Brief: ${input.request.brief}`,
    `Estilo: ${input.request.style ?? input.art?.style.id ?? 'inferido'}`,
    `Crítica: ${report.summary}`,
    '',
    '## Corrige sólo estos defectos medidos',
    '',
  ];
  if (!priority.length) lines.push('No hay defectos medidos. No reescribas el proyecto; solicita revisión artística humana.');
  for (const f of priority) {
    const loc = [f.location.selector, f.location.region, f.location.file ? `${f.location.file}:${f.location.line ?? '?'}` : ''].filter(Boolean).join(' · ');
    lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`);
    lines.push(`- Evidencia: ${f.evidence.map((e) => `${e.metric}=${e.value}${e.threshold !== undefined ? ` (objetivo ${e.threshold})` : ''}`).join('; ')}`);
    lines.push(`- Ubicación: ${loc || 'sin selector; componente ' + (f.location.component ?? 'global')}`);
    lines.push(`- Corrección: ${f.fix.summary}`);
    if (f.fix.target) lines.push(`- Objetivo: ${f.fix.target}`);
    if (f.fix.property) lines.push(`- Propiedad: ${f.fix.property}`);
    if (f.fix.command) lines.push(`- Herramienta: ${f.fix.command}`);
    lines.push(`- Acción base: ${actionForCategory(f.category)}`);
    lines.push('');
  }
  lines.push('## Reglas de la iteración');
  lines.push('');
  lines.push('1. No reescribas todo: aplica el cambio mínimo en la ubicación indicada.');
  lines.push('2. No añadas un efecto si no hay evidencia de que falta y una función que cumplir.');
  lines.push('3. Conserva las decisiones que ya pasan los umbrales.');
  lines.push('4. Vuelve a capturar y compara antes/después; revierte si no mejora.');
  lines.push('5. La aprobación artística final es humana.');
  lines.push('');
  lines.push('## Límites');
  lines.push('');
  for (const l of report.limitations) lines.push(`- ${l}`);
  return lines.join('\n');
}

export function describeCritic(r: CriticReport): string[] {
  return [
    r.summary,
    ...r.findings.slice(0, 8).map((f) => `  [${f.severity}] ${f.title} (${f.location.selector ?? f.location.region ?? f.location.component ?? 'global'}, confianza ${Math.round(f.confidence * 100)}%)`),
    ...r.limitations.map((l) => `  Límite: ${l}`),
  ];
}
