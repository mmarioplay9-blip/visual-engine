/**
 * Activación inteligente 0.6.
 *
 * Detecta si una solicitud necesita criterio visual. No obliga a ningún agente
 * a activarse: devuelve la señal, la confianza y el mecanismo real de cada uno.
 */

export type ActivationCategory =
  | 'ui-design'
  | 'app-web'
  | 'image-video'
  | 'vfx'
  | 'animation'
  | 'game'
  | 'motion'
  | '3d'
  | 'quality';

export interface ActivationSignal {
  category: ActivationCategory;
  label: string;
  match: string;
  weight: number;
}

export interface ActivationResult {
  version: '1.0';
  activate: boolean;
  confidence: number;
  categories: ActivationSignal[];
  reasons: string[];
  negatives: string[];
  guidance: string;
  /** Nunca se presenta como activación garantizada en el agente. */
  enforcement: 'advisory';
}

const RULES: { category: ActivationCategory; label: string; pattern: RegExp; weight: number }[] = [
  { category: 'ui-design', label: 'Diseño de interfaces', pattern: /\b(ui|ux|interfaz|interface|dashboard|panel|design system|sistema de dise[ñn]o|accesibilidad visual)\b/i, weight: 0.9 },
  { category: 'app-web', label: 'Aplicaciones y webs', pattern: /\b(landing|p[aá]gina web|website|web app|aplicaci[oó]n web|frontend|portfolio|portafolio|e-?commerce|tienda online)\b/i, weight: 0.8 },
  { category: 'image-video', label: 'Reproducción de imágenes y vídeos', pattern: /\b(reproducir|recreate|reconstruir|replica|igual a la (imagen|foto|referencia)|a partir de (esta|la) (imagen|foto)|reference image)\b/i, weight: 0.9 },
  { category: 'vfx', label: 'Efectos visuales', pattern: /\b(efectos? visuales?|vfx|glow|bloom|part[ií]culas?|shader|postprocesado|chromatic aberration|blur)\b/i, weight: 0.8 },
  { category: 'animation', label: 'Animaciones', pattern: /\b(animaci[oó]n|animar|animaciones|transici[oó]n|transiciones|microinteracci[oó]n|keyframes?|easing)\b/i, weight: 0.8 },
  { category: 'game', label: 'Videojuegos', pattern: /\b(videojuego|juego|game|hud|men[uú] de juego|inventario|barra de vida|reticle|unity|godot|unreal)\b/i, weight: 0.9 },
  { category: 'motion', label: 'Motion graphics', pattern: /\b(motion graphics?|motion design|reel|kinetic type|tipograf[ií]a animada|storyboard animado|after effects)\b/i, weight: 0.9 },
  { category: '3d', label: 'Gr[aá]ficos 3D', pattern: /\b(3d|three\.?js|webgl|escena 3d|modelo 3d|shader|raytracing|blender|gltf)\b/i, weight: 0.85 },
  { category: 'quality', label: 'Mejora de calidad visual', pattern: /\b(se vea (mejor|profesional|premium)|mejorar (el )?(dise[ñn]o|aspecto|calidad visual)|no se ve bien|look and feel|pulir (la )?interfaz)\b/i, weight: 0.85 },
];

const HARD_NEGATIVES: { label: string; pattern: RegExp }[] = [
  { label: 'Backend o base de datos sin interfaz', pattern: /\b(api rest|endpoint|consulta sql|migraci[oó]n de base de datos|schema prisma|backend service)\b/i },
  { label: 'Infraestructura o despliegue', pattern: /\b(kubernetes|terraform|docker compose|ci\/cd|pipeline de despliegue|nginx)\b/i },
  { label: 'Documentación o texto sin diseño', pattern: /\b(documenta|redacta|traduce|resume el texto|changelog)\b/i },
  { label: 'Pruebas unitarias o refactor sin UI', pattern: /\b(unit test|prueba unitaria|refactoriza el m[oó]dulo|corrige el typo)\b/i },
  { label: 'Datos o ML sin visualización', pattern: /\b(entrena|dataset|modelo de ml|etl|estad[ií]stica descriptiva)\b/i },
];

/** Señales de petición explícita de no usar herramientas visuales. */
const OPT_OUT = /\b(sin visual engine|no uses visual engine|no hace falta an[aá]lisis visual|solo texto)\b/i;

export function detectActivation(request: string): ActivationResult {
  const text = request.trim();
  if (OPT_OUT.test(text)) {
    return {
      version: '1.0', activate: false, confidence: 0, categories: [], reasons: ['La solicitud excluye Visual Engine explícitamente.'],
      negatives: [], guidance: 'No cargues la skill ni las herramientas visuales.', enforcement: 'advisory',
    };
  }
  const categories: ActivationSignal[] = [];
  for (const rule of RULES) {
    const m = text.match(rule.pattern);
    if (m) categories.push({ category: rule.category, label: rule.label, match: m[0], weight: rule.weight });
  }
  const negatives = HARD_NEGATIVES.filter((n) => n.pattern.test(text)).map((n) => n.label);
  const reasons = categories.map((c) => `${c.label}: «${c.match}».`);
  if (negatives.length) reasons.push(`Señal en contra: ${negatives.join('; ')}.`);
  const positive = categories.reduce((acc, c) => acc + c.weight, 0);
  const penalty = negatives.length ? 0.9 : 0;
  const confidence = Math.max(0, Math.min(1, 1 - Math.exp(-positive / 1.2) - penalty));
  const activate = categories.length > 0 && negatives.length === 0 && confidence >= 0.45;
  return {
    version: '1.0',
    activate,
    confidence: Math.round(confidence * 100) / 100,
    categories,
    reasons: reasons.length ? reasons : ['Sin señales visuales: no se activa.'],
    negatives,
    guidance: activate
      ? 'Carga la skill visual-engine y el perfil adecuado; pide contexto antes del catálogo.'
      : 'No cargues la skill visual: la tarea no necesita criterio visual.',
    enforcement: 'advisory',
  };
}

/** Mecanismo real por agente; no se promete activación automática donde no existe. */
export function activationSupport(agent: string): { agent: string; mode: string; note: string } {
  const table: Record<string, { mode: string; note: string }> = {
    codex: { mode: 'conditional', note: 'AGENTS.md + skill; el modelo decide, no hay hook de activación.' },
    claude: { mode: 'automatic', note: 'Skill con description: Claude Code la invoca por coincidencia semántica.' },
    cursor: { mode: 'conditional', note: 'Regla .mdc con description; se adjunta cuando coincide.' },
    gemini: { mode: 'conditional', note: 'GEMINI.md como contexto; sin hook de activación.' },
    freebuff: { mode: 'automatic', note: 'Skill descubierta por descripción en .agents/skills.' },
    opencode: { mode: 'conditional', note: 'AGENTS.md + MCP disponible; sin hook de activación.' },
    maex: { mode: 'manual', note: 'Sin verificación de activación en esta máquina.' },
    ollama: { mode: 'manual', note: 'El anfitrión inyecta el prompt; Ollama no activa herramientas.' },
    'generic-mcp': { mode: 'manual', note: 'Depende del cliente MCP.' },
  };
  const found = table[agent];
  if (!found) throw new Error(`Agente desconocido: ${agent}`);
  return { agent, ...found };
}

/** Texto breve que se añade a las instrucciones; evita cargar el catálogo. */
export function activationGuidance(profile: string): string {
  return [
    'Actívate sólo si la solicitud pide UI, web, vídeo, efectos, animación, juego, motion, 3D o mejora visual.',
    'Antes de responder, pide `ve context "<tarea>" --profile ' + profile + '` y no pegues los 58 efectos.',
    'Si la tarea es backend, datos o documentación sin diseño, no cargues esta skill.',
    'La activación es una recomendación: respeta el mecanismo real del agente anfitrión.',
  ].join(' ');
}
