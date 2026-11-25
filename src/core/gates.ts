import type { CriticReport } from './critic.js';
import type { DomSnapshot } from './debugger.js';
import type { FidelityReport } from './fidelity.js';
import type { QualityEvaluation } from './quality.js';
import { round } from './util.js';

/**
 * Quality Gates 0.5.
 *
 * Una puntuación alta no aprueba una entrega con un defecto crítico. Los gates
 * son configurables, explican cada comprobación y dejan la aprobación artística
 * como una decisión humana separada.
 */

export interface GateConfig {
  minQuality: number;
  minFidelity: number;
  minComposition: number;
  minTypography: number;
  minPerformance: number;
  maxCriticalFindings: number;
  maxHighFindings: number;
  maxContrastViolations: number;
  maxRegression: number;
  requireNoRuntimeErrors: boolean;
  requireHumanArtApproval: boolean;
}

export const DEFAULT_GATES: GateConfig = {
  minQuality: 72,
  minFidelity: 70,
  minComposition: 62,
  minTypography: 62,
  minPerformance: 55,
  maxCriticalFindings: 0,
  maxHighFindings: 0,
  maxContrastViolations: 0,
  maxRegression: 2,
  requireNoRuntimeErrors: true,
  requireHumanArtApproval: false,
};

export type GateStatus = 'pass' | 'fail' | 'pending' | 'not-measured';

export interface GateCheck {
  id: string;
  label: string;
  status: GateStatus;
  actual: number | string | null;
  threshold: number | string;
  blocking: boolean;
  detail: string;
}

export interface HumanApproval {
  required: boolean;
  approved: boolean;
  reviewer?: string;
  note?: string;
}

export interface GateInput {
  quality?: QualityEvaluation;
  fidelity?: FidelityReport;
  critic?: CriticReport;
  dom?: DomSnapshot;
  performance?: { fps?: number; loadMs?: number; p95FrameMs?: number };
  previous?: { quality?: number; fidelity?: number };
  humanApproval?: { approved?: boolean; reviewer?: string; note?: string };
  config?: Partial<GateConfig>;
}

export interface GateResult {
  version: '0.5';
  pass: boolean;
  decision: 'accept' | 'reject' | 'pending-human';
  checks: GateCheck[];
  blockers: GateCheck[];
  warnings: string[];
  humanApproval: HumanApproval;
  summary: string;
}

function check(id: string, label: string, actual: number | string | null, threshold: number | string, ok: boolean, detail: string, blocking = true): GateCheck {
  return { id, label, status: ok ? 'pass' : 'fail', actual, threshold, blocking, detail };
}

function qdim(q: QualityEvaluation | undefined, id: string): number | null {
  const d = q?.dimensions.find((x) => x.id === id);
  return d && d.available && d.score !== null ? d.score : null;
}

export function evaluateGates(input: GateInput): GateResult {
  const cfg = { ...DEFAULT_GATES, ...(input.config ?? {}) };
  const checks: GateCheck[] = [];
  const warnings: string[] = [];
  const q = input.quality;
  const f = input.fidelity;
  const c = input.critic;
  const dom = input.dom;

  if (q) {
    checks.push(check('quality', 'Calidad visual global', q.overall, cfg.minQuality, q.overall >= cfg.minQuality, 'Puntuación ponderada de las dimensiones disponibles.'));
  } else {
    checks.push({ id: 'quality', label: 'Calidad visual global', status: 'not-measured', actual: null, threshold: cfg.minQuality, blocking: true, detail: 'Sin evaluación de calidad.' });
  }
  if (f) {
    checks.push(check('fidelity', 'Fidelidad estructural', f.score, cfg.minFidelity, f.score >= cfg.minFidelity, 'No usa la similitud de píxeles como sustituto.'));
  } else {
    checks.push({ id: 'fidelity', label: 'Fidelidad estructural', status: 'not-measured', actual: null, threshold: cfg.minFidelity, blocking: false, detail: 'Sin referencia/especificación comparable.' });
    warnings.push('No se pudo medir fidelidad estructural; el gate no la aprueba, sólo la deja pendiente.');
  }
  const composition = qdim(q, 'composition');
  if (composition !== null) checks.push(check('composition', 'Composición', composition, cfg.minComposition, composition >= cfg.minComposition, 'Balance de masa medido.'));
  const typography = qdim(q, 'typography');
  if (typography !== null) checks.push(check('typography', 'Tipografía y legibilidad', typography, cfg.minTypography, typography >= cfg.minTypography, 'Auditoría DOM + escala.'));
  const performance = input.performance?.fps ?? qdim(q, 'performance');
  if (performance !== null) {
    checks.push(check('performance', 'Rendimiento', performance, cfg.minPerformance, performance >= cfg.minPerformance, input.performance?.fps !== undefined ? 'FPS medidos.' : 'Estabilidad de captura; no son FPS.'));
  } else {
    checks.push({ id: 'performance', label: 'Rendimiento', status: 'not-measured', actual: null, threshold: cfg.minPerformance, blocking: false, detail: 'Sin FPS ni cadencia de captura.' });
    warnings.push('Rendimiento no medido: no se aprueba ni se suspende por FPS.');
  }

  if (c) {
    checks.push(check('critical-findings', 'Defectos críticos', c.counts.critical, cfg.maxCriticalFindings, c.counts.critical <= cfg.maxCriticalFindings, 'Un defecto crítico bloquea aunque la media sea alta.'));
    checks.push(check('high-findings', 'Defectos de gravedad alta', c.counts.high, cfg.maxHighFindings, c.counts.high <= cfg.maxHighFindings, 'Los defectos altos también bloquean por defecto.'));
  } else {
    checks.push({ id: 'critic', label: 'Crítica visual', status: 'not-measured', actual: null, threshold: 'informe', blocking: true, detail: 'Sin Visual Critic no hay evidencia de defectos.' });
  }
  const contrast = dom?.contrast.violations;
  if (contrast !== undefined) {
    checks.push(check('contrast', 'Contraste DOM', contrast, cfg.maxContrastViolations, contrast <= cfg.maxContrastViolations, `Peor contraste ${dom!.contrast.worst}:1; ${dom!.contrast.checked} textos.`));
  } else {
    checks.push({ id: 'contrast', label: 'Contraste DOM', status: 'not-measured', actual: null, threshold: cfg.maxContrastViolations, blocking: false, detail: 'Sin auditoría DOM.' });
    warnings.push('Contraste no medido en DOM.');
  }
  const runtimeErrors = (dom?.consoleErrors.length ?? 0) + (dom?.pageErrors.length ?? 0) + (dom?.requestFailures.length ?? 0) + (dom?.brokenImages.length ?? 0);
  if (dom) {
    checks.push(check('runtime', 'Funcionamiento sin errores', runtimeErrors, 0, !cfg.requireNoRuntimeErrors || runtimeErrors === 0, 'Consola, pageerror, recursos fallidos e imágenes rotas.'));
  } else {
    checks.push({ id: 'runtime', label: 'Funcionamiento sin errores', status: 'not-measured', actual: null, threshold: 0, blocking: cfg.requireNoRuntimeErrors, detail: 'Sin DOM/runtime inspeccionado.' });
  }
  if (input.previous?.quality !== undefined && q) {
    const regression = round(input.previous.quality - q.overall, 1);
    checks.push(check('regression', 'Ausencia de regresión', regression, cfg.maxRegression, regression <= cfg.maxRegression, 'Diferencia respecto a la medición anterior; negativa significa mejora.'));
  }

  const humanApproval: HumanApproval = {
    required: cfg.requireHumanArtApproval,
    approved: input.humanApproval?.approved === true,
    reviewer: input.humanApproval?.reviewer,
    note: input.humanApproval?.note,
  };
  if (humanApproval.required) {
    checks.push({
      id: 'human-art', label: 'Aprobación artística humana', status: humanApproval.approved ? 'pass' : 'pending',
      actual: humanApproval.approved ? 'aprobada' : 'pendiente', threshold: 'aprobación explícita', blocking: true,
      detail: 'La crítica estructural no sustituye el juicio artístico.',
    });
  } else {
    checks.push({
      id: 'human-art', label: 'Aprobación artística humana', status: humanApproval.approved ? 'pass' : 'pending',
      actual: humanApproval.approved ? 'aprobada' : 'pendiente', threshold: 'recomendada', blocking: false,
      detail: 'No bloquea por configuración, pero queda pendiente y se declara.',
    });
    if (!humanApproval.approved) warnings.push('La calidad artística final aún no ha sido aprobada por una persona.');
  }

  const blockers = checks.filter((c) => c.blocking && c.status === 'fail');
  const notMeasured = checks.filter((c) => c.blocking && c.status === 'not-measured');
  const pendingHuman = humanApproval.required && !humanApproval.approved;
  const pass = blockers.length === 0 && notMeasured.length === 0 && !pendingHuman;
  const decision: GateResult['decision'] = blockers.length || notMeasured.length ? 'reject' : pendingHuman ? 'pending-human' : 'accept';
  return {
    version: '0.5', pass, decision, checks, blockers,
    warnings,
    humanApproval,
    summary: decision === 'accept'
      ? `Aceptado: ${checks.filter((c) => c.status === 'pass').length}/${checks.length} gates en verde${humanApproval.approved ? '; arte aprobado por persona' : '; arte pendiente de revisión humana'}.`
      : decision === 'pending-human'
        ? `Estructura aceptada, pero falta la aprobación artística humana explícita (${checks.filter((c) => c.status === 'pass').length}/${checks.length} gates).`
        : `Rechazado: ${blockers.length} bloqueo(s)${notMeasured.length ? ` y ${notMeasured.length} medición(es) obligatoria(s) ausente(s)` : ''}. Una media alta no compensa un defecto crítico.`,
  };
}

export function gateMarkdown(r: GateResult): string {
  return [
    '# Quality Gates 0.5',
    '',
    r.summary,
    '',
    '| Gate | Estado | Valor | Umbral | Bloquea | Detalle |',
    '| --- | --- | ---: | ---: | --- | --- |',
    ...r.checks.map((c) => `| ${c.label} | ${c.status} | ${c.actual ?? '—'} | ${c.threshold} | ${c.blocking ? 'sí' : 'no'} | ${c.detail} |`),
    '',
    ...r.warnings.map((w) => `- Aviso: ${w}`),
    '',
    r.humanApproval.note ? `Nota humana: ${r.humanApproval.note}` : '',
    '',
  ].filter(Boolean).join('\n');
}

export function describeGates(r: GateResult): string[] {
  return [
    r.summary,
    ...r.checks.map((c) => `  ${c.status === 'pass' ? 'OK' : c.status === 'pending' ? 'PENDIENTE' : c.status === 'fail' ? 'FALLA' : 'NO MEDIDO'} ${c.label}: ${c.actual ?? '—'} (${c.threshold})`),
    ...r.warnings.map((w) => `  Aviso: ${w}`),
  ];
}
