/**
 * Contabilidad de tokens 0.6.
 *
 * Regla dura: una estimación no se presenta como medición. Sólo `reported`
 * viene del proveedor; `estimated` es caracteres/4; `unavailable` no se rellena.
 */

export type UsageKind = 'reported' | 'estimated' | 'unavailable';

export interface UsageBreakdown {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  totalTokens: number | null;
}

export interface UsageRecord {
  version: '1.0';
  kind: UsageKind;
  source: string;
  breakdown: UsageBreakdown;
  method: string;
  limits: string[];
}

export interface UsageInput {
  /** Estadísticas aportadas por el agente/proveedor. */
  reported?: { inputTokens?: number; outputTokens?: number; cachedTokens?: number; source?: string };
  /** Texto enviado/recibido cuando no hay estadísticas. */
  inputText?: string;
  outputText?: string;
}

function positive(n: number | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Estima caracteres/4. Es deliberadamente conservador y se etiqueta como tal. */
export function estimateTokensFromText(text?: string): number | null {
  if (text === undefined) return null;
  return Math.ceil(text.length / 4);
}

export function recordUsage(input: UsageInput): UsageRecord {
  const r = input.reported;
  const hasReported = !!r && (positive(r.inputTokens) !== null || positive(r.outputTokens) !== null);
  if (hasReported) {
    const inputTokens = positive(r!.inputTokens);
    const outputTokens = positive(r!.outputTokens);
    return {
      version: '1.0',
      kind: 'reported',
      source: r!.source ?? 'agente/proveedor',
      breakdown: {
        inputTokens,
        outputTokens,
        cachedTokens: positive(r!.cachedTokens),
        totalTokens: inputTokens !== null || outputTokens !== null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null,
      },
      method: 'Lectura directa de las estadísticas aportadas por el agente o proveedor.',
      limits: ['Sólo cubre lo que el agente declara; no se extrapola a otras llamadas.'],
    };
  }
  const inputTokens = estimateTokensFromText(input.inputText);
  const outputTokens = estimateTokensFromText(input.outputText);
  if (inputTokens === null && outputTokens === null) {
    return {
      version: '1.0',
      kind: 'unavailable',
      source: 'ninguna',
      breakdown: { inputTokens: null, outputTokens: null, cachedTokens: null, totalTokens: null },
      method: 'Sin estadísticas del proveedor y sin texto que estimar.',
      limits: ['No se inventa un consumo.'],
    };
  }
  return {
    version: '1.0',
    kind: 'estimated',
    source: 'caracteres/4',
    breakdown: {
      inputTokens,
      outputTokens,
      cachedTokens: null,
      totalTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
    },
    method: 'Estimación caracteres/4 sobre el texto local. No es telemetría del proveedor.',
    limits: ['Puede desviarse con código, JSON o idiomas no latinos.', 'No es telemetría del proveedor y no se presenta como medición real.'],
  };
}

/** Texto estable para informes; nunca convierte una estimación en medición. */
export function describeUsage(u: UsageRecord): string {
  if (u.kind === 'unavailable') return 'Consumo: no disponible (el agente no aportó estadísticas).';
  const b = u.breakdown;
  return `Consumo ${u.kind === 'reported' ? 'medido' : 'estimado'}: entrada ${b.inputTokens ?? '—'}, salida ${b.outputTokens ?? '—'}, total ${b.totalTokens ?? '—'} tokens. ${u.method}`;
}
