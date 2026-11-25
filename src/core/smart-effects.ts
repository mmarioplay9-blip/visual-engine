import { getEffect, listEffects, type EffectRecipe } from './library.js';
import { getStyle, inferStyle, resolveProjectType, type ProjectType, type StyleId, type StyleProfile } from './styles.js';

/**
 * Smart Effects Selection 0.5.
 *
 * Selecciona por función, no por catálogo. Un estilo sobrio puede terminar con
 * cero o un efecto; uno expresivo no recibe automáticamente todos los efectos.
 * Nunca devuelve los 58 al contexto: sólo la selección y sus alternativas.
 */

export interface EffectSignal {
  id?: string;
  category?: string;
  confidence?: number;
}

export interface SmartEffectsInput {
  brief: string;
  style?: string;
  projectType?: string;
  maxEffects?: number;
  intensity?: 'restrained' | 'balanced' | 'expressive';
  referenceSignals?: EffectSignal[];
  allowDecorative?: boolean;
}

export interface ScoredEffect {
  id: string;
  name: string;
  category: string;
  role: string;
  score: number;
  reasons: string[];
  performance: string;
  params: string[];
  source: EffectRecipe;
}

export interface SmartEffectsResult {
  version: '0.5';
  style: { id: StyleId; name: string };
  projectType: ProjectType;
  budget: { requested: number; effective: number; stylesMax: number };
  selected: Omit<ScoredEffect, 'source'>[];
  alternatives: Omit<ScoredEffect, 'source'>[];
  rejected: { id: string; reason: string }[];
  rationale: string[];
  antiPatterns: string[];
  tokenEstimate: number;
  limitations: string[];
}

const MINIMAL: StyleId[] = ['minimal-premium', 'editorial', 'professional-app', 'financial-dashboard', 'neumorphism'];
const DECORATIVE = /particle|glow|blur|bokeh|starfield|glitch|neon|volumetric|ray|grain|dust|caustic|bloom|refraction|warp/i;
const PROJECT_CATEGORIES: Record<ProjectType, string[]> = {
  landing: ['hero', 'fondos', 'iluminacion'],
  dashboard: ['hud', 'fondos'],
  app: ['materiales', 'fondos'],
  'game-hud': ['hud', 'interfaz'],
  'game-menu': ['interfaz', 'materiales'],
  editorial: ['tipografia', 'materiales'],
  motion: ['tipografia', 'transiciones', 'iluminacion'],
  scene3d: ['3d', 'particulas', 'fondos'],
  mobile: ['materiales', 'fondos'],
  poster: ['tipografia', 'iluminacion'],
};

function tokens(text: string): string[] {
  return [...new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((t) => t.length >= 3))];
}

function roleFor(effect: EffectRecipe, style: StyleProfile): string {
  return style.effects.find((e) => e.id === effect.id)?.role ?? effect.category;
}

/**
 * Puntúa los 58 efectos internamente, pero devuelve sólo una selección corta.
 * El resultado se puede pasar directamente al agente sin cargar la biblioteca.
 */
export function selectSmartEffects(input: SmartEffectsInput): SmartEffectsResult {
  const projectType = resolveProjectType(input.brief, input.projectType);
  const style = input.style ? getStyle(input.style) : inferStyle(input.brief, projectType);
  const minimal = MINIMAL.includes(style.id);
  const stylesMax = minimal ? 1 : projectType === 'app' || projectType === 'dashboard' ? 2 : 3;
  const requested = Math.max(0, Math.min(input.maxEffects ?? stylesMax, 3));
  const effective = Math.min(requested, stylesMax);
  const briefTokens = tokens(input.brief);
  const signals = input.referenceSignals ?? [];
  const categories = PROJECT_CATEGORIES[projectType];
  const all = listEffects();
  const scored: ScoredEffect[] = all.map((effect) => {
    const reasons: string[] = [];
    let score = 0;
    if (style.effects.some((e) => e.id === effect.id)) {
      score += 8;
      reasons.push(`Firma de ${style.name}`);
    }
    const signal = signals.find((s) => s.id === effect.id || (s.category && s.category === effect.category));
    if (signal) {
      score += 5 + Math.round((signal.confidence ?? 0.5) * 4);
      reasons.push(`Señal de referencia (${signal.id ?? signal.category}, ${Math.round((signal.confidence ?? 0.5) * 100)}%)`);
    }
    const tagMatches = effect.tags.filter((tag) => briefTokens.some((t) => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase())));
    if (tagMatches.length) {
      score += Math.min(5, tagMatches.length * 2);
      reasons.push(`Contexto: ${tagMatches.slice(0, 3).join(', ')}`);
    }
    if (categories.includes(effect.category)) {
      score += 2;
      reasons.push(`Categoría propia de ${projectType}`);
    }
    const avoid = style.avoid.some((a) => effect.id.includes(a) || a.includes(effect.id) || (DECORATIVE.test(effect.id) && /decoraci|efecto|neon|glow|partícula|particula/i.test(a)));
    if (avoid) {
      score -= 9;
      reasons.push('Anti-patrón del estilo');
    }
    if (minimal && DECORATIVE.test(effect.id)) {
      score -= input.allowDecorative ? 3 : 7;
      reasons.push('Contención: el estilo pide pocos recursos');
    }
    if (minimal && /flat|paper|ink|dot|line|grid|mesh|caustic/i.test(effect.id)) {
      score += 2;
      reasons.push('Material compatible con contención');
    }
    if (input.intensity === 'restrained' && DECORATIVE.test(effect.id)) score -= 2;
    if (input.intensity === 'expressive' && style.id === 'motion-graphics' && /reveal|split|glitch|ray|bloom/i.test(effect.id)) score += 2;
    return {
      id: effect.id,
      name: effect.name,
      category: effect.category,
      role: roleFor(effect, style),
      score,
      reasons: reasons.length ? reasons : ['Compatible por categoría, sin señal fuerte'],
      performance: effect.performance,
      params: effect.params.map((p) => p.name),
      source: effect,
    };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const selected: ScoredEffect[] = [];
  const categoryCount = new Map<string, number>();
  for (const effect of scored) {
    if (selected.length >= effective) break;
    if (effect.score <= 0) continue;
    const count = categoryCount.get(effect.category) ?? 0;
    if (count >= 2 && effect.category !== 'tipografia') continue;
    selected.push(effect);
    categoryCount.set(effect.category, count + 1);
  }
  // Si el estilo es sobrio y nada supera el umbral, devolver vacío es una decisión válida.
  const alternatives = scored.filter((e) => !selected.some((s) => s.id === e.id) && e.score > 0).slice(0, 4);
  const rejected = scored.filter((e) => !selected.some((s) => s.id === e.id) && !alternatives.some((a) => a.id === e.id)).slice(0, 6)
    .map((e) => ({ id: e.id, reason: e.reasons.includes('Anti-patrón del estilo') ? 'Anti-patrón del estilo' : DECORATIVE.test(e.id) && minimal ? 'Decoración innecesaria para un estilo sobrio' : 'Presupuesto o señal insuficiente' }));
  const rationale = [
    `Estilo ${style.name}; proyecto ${projectType}.`,
    `Presupuesto ${effective} efecto(s), derivado de ${minimal ? 'contención del estilo' : 'tipo de proyecto'}.`,
    selected.length ? `Selección por función: ${selected.map((e) => `${e.id} (${e.role})`).join(', ')}.` : 'Ningún efecto supera el umbral: entrega sin decoración y vuelve a medir si falta profundidad.',
    `No se envían los ${all.length} efectos: sólo ${selected.length} seleccionados y ${alternatives.length} alternativas.`,
  ];
  const antiPatterns = [
    ...(minimal ? ['No añadas partículas, glow o blur para “dar profundidad” sin una función.'] : []),
    'No añadas más de un efecto de la misma categoría salvo que tengan roles distintos.',
    'No uses un efecto para ocultar un problema de jerarquía o contraste.',
  ];
  const compact = {
    selected: selected.map(({ source: _s, ...rest }) => rest),
    alternatives: alternatives.map(({ source: _s, ...rest }) => rest),
    rejected,
    rationale,
    antiPatterns,
  };
  return {
    version: '0.5',
    style: { id: style.id, name: style.name },
    projectType,
    budget: { requested, effective, stylesMax },
    selected: compact.selected,
    alternatives: compact.alternatives,
    rejected,
    rationale,
    antiPatterns,
    tokenEstimate: Math.ceil(JSON.stringify(compact).length / 4),
    limitations: [
      'La señal de referencia se basa en etiquetas y confianza, no en segmentación semántica.',
      'La selección no sustituye la medición del resultado; el efecto puede no mejorar la jerarquía.',
    ],
  };
}

/** Recupera una receta compacta para el contexto del agente. */
export function compactRecipe(id: string) {
  const e = getEffect(id);
  return {
    id: e.id, name: e.name, category: e.category, summary: e.summary,
    role: e.category, engines: e.engines, performance: e.performance,
    params: e.params.map((p) => ({ name: p.name, type: p.type, default: p.default, description: p.description })),
    entry: e.entry,
    files: e.files.map((f) => ({ path: f.path, lines: f.content.split('\n').length })),
  };
}

export function describeSmartEffects(r: SmartEffectsResult): string[] {
  return [
    `Selección ${r.selected.length}/${r.budget.effective} para ${r.style.name} (${r.projectType}).`,
    ...r.selected.map((e) => `  ${e.id} · ${e.role} · ${e.score} puntos · ${e.reasons.join('; ')}`),
    ...r.rationale.map((x) => `  ${x}`),
    ...r.antiPatterns.map((x) => `  Regla: ${x}`),
    `Tokens estimados del informe: ${r.tokenEstimate}.`,
  ];
}
