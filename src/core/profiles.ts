/**
 * Perfiles de funcionamiento 0.6.
 *
 * Seleccionan capacidades y presupuestos, nunca una estética. `aesthetic` es
 * siempre `none`: el estilo lo aporta el brief, la referencia y el Art Director.
 */

export type ProfileId = 'lite' | 'professional' | 'cinematic';

export interface Profile {
  id: ProfileId;
  title: string;
  purpose: string;
  tools: string[];
  maxTools: number;
  maxRecipes: number;
  maxDocs: number;
  tokenBudget: number;
  maxIterations: number;
  maxMinutes: number;
  stages: string[];
  aesthetic: 'none';
  limits: string[];
}

export const PROFILES: Record<ProfileId, Profile> = {
  lite: {
    id: 'lite',
    title: 'Lite · análisis rápido',
    purpose: 'Comprobar si el resultado está roto, plano o por debajo de un umbral mínimo.',
    tools: ['visual_context', 'visual_capture', 'visual_critic', 'visual_gate'],
    maxTools: 4,
    maxRecipes: 1,
    maxDocs: 0,
    tokenBudget: 1500,
    maxIterations: 1,
    maxMinutes: 3,
    stages: ['context', 'capture', 'critic', 'gate'],
    aesthetic: 'none',
    limits: ['Sin fidelidad ni depuración DOM: no localiza selectores.', 'Una sola pasada; no mide referencias de vídeo.'],
  },
  professional: {
    id: 'professional',
    title: 'Professional · dirección y revisión',
    purpose: 'Crear una pieza completa con dirección artística, depuración y gates.',
    tools: [
      'visual_context', 'visual_doctor', 'visual_art_direction', 'visual_smart_effects',
      'visual_capture', 'visual_debug', 'visual_critic', 'visual_fidelity', 'visual_gate',
    ],
    maxTools: 7,
    maxRecipes: 3,
    maxDocs: 2,
    tokenBudget: 6000,
    maxIterations: 2,
    maxMinutes: 15,
    stages: ['context', 'art', 'capture', 'debug', 'critic', 'fidelity', 'gate', 'loop'],
    aesthetic: 'none',
    limits: ['La fidelidad estructural usa proxies declarados.', 'La aprobación artística sigue siendo humana.'],
  },
  cinematic: {
    id: 'cinematic',
    title: 'Cinematic · temporal, 3D y shaders',
    purpose: 'Motion graphics, vídeo, escenas WebGL y revisión intensiva con comparación temporal.',
    tools: [
      'visual_context', 'visual_doctor', 'visual_art_direction', 'visual_motion_director',
      'visual_reference_design', 'visual_smart_effects', 'visual_compose', 'visual_temporal',
      'visual_camera', 'visual_capture', 'visual_debug', 'visual_critic', 'visual_fidelity',
      'visual_gate', 'visual_loop',
    ],
    maxTools: 10,
    maxRecipes: 4,
    maxDocs: 2,
    tokenBudget: 15000,
    maxIterations: 3,
    maxMinutes: 30,
    stages: ['context', 'art', 'motion', 'reference', 'compose', 'capture', 'debug', 'critic', 'fidelity', 'temporal', 'gate', 'loop'],
    aesthetic: 'none',
    limits: [
      'Temporal exige dos vídeos; no evalúa una página estática.',
      'La rotación WebGL se valida en la escena medida, no en cualquier shader.',
      'El presupuesto es un límite local; no hay telemetría del proveedor.',
    ],
  },
};

export function profileIds(): ProfileId[] {
  return Object.keys(PROFILES) as ProfileId[];
}

export function getProfile(id?: string): Profile {
  const key = (id ?? 'professional') as ProfileId;
  const p = PROFILES[key];
  if (!p) throw new Error(`Perfil desconocido: ${id}. Disponibles: ${profileIds().join(', ')}`);
  return p;
}

export function describeProfile(p: Profile): string[] {
  return [
    `${p.title} (${p.id})`,
    p.purpose,
    `Herramientas: ${p.tools.length} declaradas; se cargan como máximo ${p.maxTools}.`,
    `Recetas máx. ${p.maxRecipes}; documentos máx. ${p.maxDocs}; presupuesto ${p.tokenBudget} tokens (límite local).`,
    `Loop: ${p.maxIterations} iteración(es), ${p.maxMinutes} min.`,
    `Etapas: ${p.stages.join(' → ')}.`,
    'Estética: ninguna impuesta; el estilo lo deciden brief, referencia y Art Director.',
    ...p.limits.map((l) => `Límite: ${l}`),
  ];
}
