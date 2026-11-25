import fs from 'node:fs';
import path from 'node:path';
import { getEffect, listEffects } from './library.js';
import { ensureDir, PACKAGE_ROOT } from './paths.js';
import { clamp, hexToRgb, round } from './util.js';

/**
 * Art Director 0.4: dirección artística basada en decisiones explícitas.
 * No es una paleta con nombre: cada perfil define composición, tipografía,
 * materiales, movimiento y efectos compatibles. Los tokens se emiten en DTCG.
 */

export type StyleId =
  | 'minimal-premium'
  | 'cinematic'
  | 'futuristic'
  | 'sci-fi'
  | 'cyberpunk'
  | 'glassmorphism'
  | 'neumorphism'
  | 'editorial'
  | 'brutalism'
  | 'game-ui'
  | 'professional-app'
  | 'financial-dashboard'
  | 'immersive-3d'
  | 'motion-graphics'
  | 'organic-natural';

export type ProjectType =
  | 'landing'
  | 'dashboard'
  | 'app'
  | 'game-hud'
  | 'game-menu'
  | 'editorial'
  | 'motion'
  | 'scene3d'
  | 'mobile'
  | 'poster';

export type Density = 'airy' | 'balanced' | 'compact';
export type MotionLevel = 'still' | 'restrained' | 'expressive';

export interface Palette {
  bg: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  focus: string;
}

export interface TypeSystem {
  display: string;
  body: string;
  mono: string;
  displayWeight: number;
  bodyWeight: number;
  scaleRatio: number;
  bodyPx: number;
  lineHeight: number;
  displayLineHeight: number;
  tracking: string;
  displayTracking: string;
  measure: number;
}

export interface LayoutSystem {
  maxWidth: number;
  gutter: number;
  spacing: number;
  radius: number;
  borderWidth: number;
  columns: number;
  shadow: string;
}

export interface MaterialSystem {
  surface: 'flat' | 'soft' | 'glass' | 'metal' | 'paper' | 'plastic';
  grain: number;
  glassBlur: number;
  gradient: string;
  texture: string;
}

export interface MotionSystem {
  level: MotionLevel;
  fastMs: number;
  baseMs: number;
  slowMs: number;
  easeOut: string;
  easeInOut: string;
  spring: string;
  staggerMs: number;
  camera: string;
}

export interface CompositionRules {
  focal: string;
  alignment: 'left' | 'center' | 'asymmetric';
  negativeSpace: number;
  density: Density;
  contrast: 'soft' | 'balanced' | 'high';
  headlineChars: number;
  imageRatio: string;
  notes: string[];
}

export interface EffectChoice {
  id: string;
  role: string;
  reason: string;
}

export interface StyleProfile {
  id: StyleId;
  name: string;
  description: string;
  keywords: string[];
  mode: 'dark' | 'light';
  colors: Palette;
  typography: TypeSystem;
  layout: LayoutSystem;
  materials: MaterialSystem;
  motion: MotionSystem;
  composition: CompositionRules;
  effects: { id: string; role: string }[];
  signature: string[];
  avoid: string[];
}

export interface ArtPreferences {
  accent?: string;
  accent2?: string;
  density?: Density;
  motion?: MotionLevel;
  mode?: 'dark' | 'light';
  effects?: string[];
  font?: 'sans' | 'display' | 'serif' | 'mono';
}

export interface DesignAuditDimension {
  id: string;
  score: number;
  evidence: string;
}

export interface DesignAudit {
  structuralScore: number;
  dimensions: DesignAuditDimension[];
  contrastPairs: { fg: string; bg: string; ratio: number; pass: boolean }[];
  warnings: string[];
  note: string;
}

export interface ArtDirection {
  version: '0.4';
  id: string;
  brief: string;
  projectType: ProjectType;
  style: StyleProfile;
  palette: Palette;
  typography: TypeSystem & {
    sizes: Record<string, number>;
    responsive: Record<string, string>;
    families: { display: string; body: string; mono: string };
  };
  layout: LayoutSystem;
  materials: MaterialSystem;
  motion: MotionSystem;
  composition: CompositionRules;
  effects: EffectChoice[];
  components: string[];
  tokenSet: Record<string, { $value: string | number; $type: string; $description?: string }>;
  rationale: string[];
  warnings: string[];
  fonts: { id: string; family: string; file: string; license: string }[];
  audit: DesignAudit;
}

const FONTS = {
  sans: { id: 'inter', family: 'VE Inter', file: 'Inter_opsz,wght_.ttf', license: 'OFL-1.1' },
  display: { id: 'space-grotesk', family: 'VE Space Grotesk', file: 'SpaceGrotesk_wght_.ttf', license: 'OFL-1.1' },
  serif: { id: 'source-serif-4', family: 'VE Source Serif 4', file: 'SourceSerif4_opsz,wght_.ttf', license: 'OFL-1.1' },
  mono: { id: 'jetbrains-mono', family: 'VE JetBrains Mono', file: 'JetBrainsMono_wght_.ttf', license: 'OFL-1.1' },
};

const family = (id: string): string => {
  if (id === 'display') return FONTS.display.family;
  if (id === 'serif') return FONTS.serif.family;
  if (id === 'mono') return FONTS.mono.family;
  return FONTS.sans.family;
};

const darkBase: Palette = {
  bg: '#070b12', surface: '#0d1420', elevated: '#121c2b', text: '#eef6ff', muted: '#9aa8ba',
  accent: '#12e0c8', accent2: '#ffb454', border: '#243247', success: '#4ade80', warning: '#fbbf24',
  danger: '#fb7185', focus: '#7dd3fc',
};

const darkType: TypeSystem = {
  display: 'display', body: 'sans', mono: 'mono', displayWeight: 650, bodyWeight: 430,
  scaleRatio: 1.28, bodyPx: 16, lineHeight: 1.55, displayLineHeight: 0.98,
  tracking: '-0.01em', displayTracking: '-0.045em', measure: 62,
};
const darkLayout: LayoutSystem = {
  maxWidth: 1240, gutter: 24, spacing: 8, radius: 18, borderWidth: 1, columns: 12,
  shadow: '0 30px 80px -40px rgba(0,0,0,.8)',
};
const darkMaterials: MaterialSystem = {
  surface: 'soft', grain: 0.03, glassBlur: 12,
  gradient: 'linear-gradient(145deg, rgba(255,255,255,.08), transparent 58%)',
  texture: 'none',
};
const darkMotion: MotionSystem = {
  level: 'restrained', fastMs: 140, baseMs: 360, slowMs: 900,
  easeOut: 'cubic-bezier(.16,1,.3,1)', easeInOut: 'cubic-bezier(.65,0,.35,1)',
  spring: 'cubic-bezier(.34,1.56,.64,1)', staggerMs: 60,
  camera: 'dolly-in 1.04, paneo lateral máximo 2 %, sin rotación',
};
const darkComposition: CompositionRules = {
  focal: 'arriba-izquierda', alignment: 'left', negativeSpace: 0.42, density: 'balanced',
  contrast: 'balanced', headlineChars: 34, imageRatio: '16:9',
  notes: ['Un foco por pantalla', 'Máximo tres tamaños tipográficos visibles'],
};

interface StyleOverrides {
  mode?: 'dark' | 'light';
  colors?: Partial<Palette>;
  typography?: Partial<TypeSystem>;
  layout?: Partial<LayoutSystem>;
  materials?: Partial<MaterialSystem>;
  motion?: Partial<MotionSystem>;
  composition?: Partial<CompositionRules>;
  effects?: { id: string; role: string }[];
  signature?: string[];
  avoid?: string[];
}

function make(
  id: StyleId, name: string, description: string, keywords: string[],
  overrides: StyleOverrides,
): StyleProfile {
  return {
    id, name, description, keywords,
    mode: overrides.mode ?? 'dark',
    colors: { ...darkBase, ...(overrides.colors ?? {}) },
    typography: { ...darkType, ...(overrides.typography ?? {}) },
    layout: { ...darkLayout, ...(overrides.layout ?? {}) },
    materials: { ...darkMaterials, ...(overrides.materials ?? {}) },
    motion: { ...darkMotion, ...(overrides.motion ?? {}) },
    composition: { ...darkComposition, ...(overrides.composition ?? {}) },
    effects: overrides.effects ?? [{ id: 'mesh-gradient', role: 'fondo' }],
    signature: overrides.signature ?? [],
    avoid: overrides.avoid ?? [],
  };
}

const lightBase: Partial<Palette> = {
  bg: '#f6f2ea', surface: '#fffdf8', elevated: '#ece6da', text: '#171512', muted: '#5f5a52',
  border: '#d6cdbf', accent: '#9b3d2e', accent2: '#1f5b4d', focus: '#1d4ed8',
  success: '#2f6b4f', warning: '#8a5a12', danger: '#a52a3b',
};

export const STYLE_PROFILES: StyleProfile[] = [
  make('minimal-premium', 'Minimalismo premium', 'Contenido escaso, tensión por escala y espacio; el lujo está en lo que se omite.', ['minimalista', 'lujo', 'premium', 'limpio', 'elegante', 'arquitectura'], {
    mode: 'light', colors: lightBase,
    typography: { display: 'display', body: 'sans', displayWeight: 500, bodyWeight: 430, scaleRatio: 1.34, bodyPx: 16, tracking: '-0.015em', displayTracking: '-0.055em', measure: 54 },
    layout: { maxWidth: 1180, gutter: 40, spacing: 10, radius: 4, borderWidth: 1, columns: 12, shadow: 'none' },
    materials: { surface: 'flat', grain: 0.012, glassBlur: 0, gradient: 'none', texture: 'none' },
    motion: { level: 'restrained', fastMs: 180, baseMs: 480, slowMs: 1100, staggerMs: 70, camera: 'drift vertical 1.5 %, sin zoom' },
    composition: { focal: 'centro-izquierda', alignment: 'left', negativeSpace: 0.62, density: 'airy', contrast: 'high', headlineChars: 26, notes: ['Una idea por viewport', 'Líneas de 1 px, nunca cajas pesadas'] },
    effects: [{ id: 'mesh-gradient', role: 'atmósfera casi imperceptible' }, { id: 'dust-motes', role: 'textura espacial' }],
    signature: ['Titular de 2–4 palabras', 'Regla horizontal fina', 'Mucho aire perimetral', 'Un único acento cálido'],
    avoid: ['Gradientes arcoíris', 'Sombras difusas grandes', 'Más de dos familias'],
  }),
  make('cinematic', 'Cinematográfico', 'Luz directional, contraste profundo y ritmo de plano; la interfaz se comporta como una película.', ['cine', 'cinematográfico', 'film', 'película', 'drama', 'documental'], {
    colors: { bg: '#070707', surface: '#11100e', elevated: '#1a1713', text: '#f5efe3', muted: '#b9ac97', accent: '#e8b86b', accent2: '#5fc6bd', border: '#3a3025' },
    typography: { display: 'serif', body: 'sans', displayWeight: 500, scaleRatio: 1.36, bodyPx: 16, displayLineHeight: 1.02, displayTracking: '-0.035em', measure: 58 },
    layout: { maxWidth: 1280, gutter: 32, spacing: 9, radius: 2, shadow: '0 40px 120px -50px rgba(0,0,0,.95)' },
    materials: { surface: 'metal', grain: 0.07, glassBlur: 0, gradient: 'linear-gradient(180deg, rgba(232,184,107,.08), transparent 42%)', texture: 'grano 35 mm' },
    motion: { level: 'expressive', fastMs: 220, baseMs: 620, slowMs: 1400, staggerMs: 120, camera: 'travelling lateral 2 %, zoom 1.06, sin rotación' },
    composition: { focal: 'centro', alignment: 'center', negativeSpace: 0.5, density: 'airy', contrast: 'high', headlineChars: 30, imageRatio: '2.39:1', notes: ['Banda de imagen con letterbox', 'Titular sobre el eje de luz'] },
    effects: [{ id: 'anamorphic-bloom', role: 'luz de lente' }, { id: 'dust-motes', role: 'partículas en el haz' }],
    signature: ['Letterbox 2.39:1', 'Titular serif de alto contraste', 'Acento latón', 'Grano y viñeta medidos'],
    avoid: ['Colores pastel', 'Bordes redondeados grandes', 'HUD saturado'],
  }),
  make('futuristic', 'Futurista', 'Sistemas abiertos, retícula visible y tecnología que no grita; preciso, aéreo y rápido.', ['futurista', 'futuro', 'tecnología', 'tech', 'innovación', 'aeroespacial'], {
    colors: { bg: '#050b12', surface: '#0a1520', elevated: '#0f1f2e', text: '#e9fbff', muted: '#8ea9b8', accent: '#5ff2d6', accent2: '#7aa2ff', border: '#17364a' },
    typography: { display: 'display', body: 'sans', mono: 'mono', displayWeight: 600, scaleRatio: 1.3, bodyPx: 15, displayTracking: '-0.05em', measure: 60 },
    layout: { maxWidth: 1320, gutter: 28, spacing: 8, radius: 10, shadow: '0 24px 70px -40px rgba(0,0,0,.9)' },
    materials: { surface: 'glass', glassBlur: 14, grain: 0.02, gradient: 'linear-gradient(120deg, rgba(95,242,214,.12), transparent 50%)', texture: 'retícula 24 px' },
    motion: { level: 'restrained', baseMs: 420, slowMs: 1100, camera: 'orbita suave 2°, drift 2 %' },
    composition: { focal: 'izquierda + panel derecho', alignment: 'asymmetric', negativeSpace: 0.38, density: 'balanced', headlineChars: 38, notes: ['Retícula visible sólo donde ayuda', 'Datos monoespaciados'] },
    effects: [{ id: 'circuit-lines', role: 'retícula de sistema' }, { id: 'telemetry-grid', role: 'telemetría de fondo' }],
    signature: ['Retícula de 24 px', 'Cifras tabulares', 'Acento cian-lima', 'Esquinas de 10 px'],
    avoid: ['Neón magenta', 'Texturas orgánicas', 'Sombras duras'],
  }),
  make('sci-fi', 'Ciencia ficción', 'Consola de misión: capas de información, tipografía técnica y una paleta de instrumento.', ['sci-fi', 'ciencia ficción', 'espacio', 'nave', 'consola', 'misión'], {
    colors: { bg: '#05090c', surface: '#0b1215', elevated: '#122027', text: '#f1f7ed', muted: '#91a69c', accent: '#b8f36b', accent2: '#ff8b4a', border: '#22383a' },
    typography: { display: 'mono', body: 'sans', mono: 'mono', displayWeight: 700, scaleRatio: 1.26, bodyPx: 14, tracking: '0.02em', displayTracking: '-0.02em', measure: 64 },
    layout: { maxWidth: 1400, gutter: 20, spacing: 6, radius: 2, shadow: '0 0 0 1px rgba(184,243,107,.12)' },
    materials: { surface: 'metal', grain: 0.04, glassBlur: 0, gradient: 'linear-gradient(180deg, rgba(184,243,107,.06), transparent)', texture: 'scanlines 3 px' },
    motion: { level: 'restrained', baseMs: 380, slowMs: 1200, staggerMs: 40, camera: 'paneo orbital 3°, sin zoom' },
    composition: { focal: 'centro de mando', alignment: 'asymmetric', negativeSpace: 0.3, density: 'compact', headlineChars: 42, imageRatio: '21:9', notes: ['Jerarquía por densidad, no por tamaño', 'Separadores de 1 px'] },
    effects: [{ id: 'wireframe-globe', role: 'globo wireframe' }, { id: 'radar-sweep', role: 'barrido de radar' }],
    signature: ['Etiquetas en mayúsculas mono', 'Barras de estado', 'Verde fósforo y ámbar', 'Esquinas vivas'],
    avoid: ['Serif', 'Blanco puro dominante', 'Radios grandes'],
  }),
  make('cyberpunk', 'Cyberpunk', 'Tensión urbana, señal rota y contraste violento; el error forma parte del lenguaje.', ['cyberpunk', 'neón', 'distopía', 'urbano', 'punk', 'nocturno'], {
    colors: { bg: '#08060d', surface: '#120d1b', elevated: '#1b1026', text: '#fff4fb', muted: '#b7a1bd', accent: '#ff2e88', accent2: '#f4ff3f', border: '#3a1e48' },
    typography: { display: 'display', body: 'mono', mono: 'mono', displayWeight: 750, scaleRatio: 1.33, bodyPx: 14, tracking: '0.01em', displayTracking: '-0.04em', measure: 64 },
    layout: { maxWidth: 1360, gutter: 18, spacing: 6, radius: 0, borderWidth: 2, shadow: '8px 8px 0 #2a0b34' },
    materials: { surface: 'plastic', grain: 0.09, glassBlur: 4, gradient: 'linear-gradient(135deg, rgba(255,46,136,.2), transparent 48%)', texture: 'ruido + scanlines' },
    motion: { level: 'expressive', baseMs: 260, slowMs: 700, staggerMs: 24, spring: 'cubic-bezier(.2,1.8,.4,1)', camera: 'golpe lateral 4 %, rotación 0.6° con retorno' },
    composition: { focal: 'diagonal', alignment: 'asymmetric', negativeSpace: 0.24, density: 'compact', contrast: 'high', headlineChars: 32, notes: ['Capas cortadas por bandas', 'El glitch aparece en transición, no permanente'] },
    effects: [{ id: 'glitch-slices', role: 'error de señal' }, { id: 'neon-rim', role: 'borde luminoso' }],
    signature: ['Bordes de 2 px', 'Sombra desplazada', 'Tipografía condensada', 'Etiquetas de sistema'],
    avoid: ['Minimalismo vacío', 'Pasteles', 'Glassmorphism genérico'],
  }),
  make('glassmorphism', 'Glassmorphism', 'Profundidad por capas translúcidas; el vidrio debe revelar jerarquía, no ocultarla.', ['glass', 'vidrio', 'translúcido', 'blur', 'cristal', 'suave'], {
    colors: { bg: '#0a1120', surface: 'rgba(20,32,52,.56)', elevated: 'rgba(35,50,76,.7)', text: '#f4f8ff', muted: '#b2c0d6', accent: '#9ee7ff', accent2: '#c8a8ff', border: 'rgba(255,255,255,.16)' },
    typography: { scaleRatio: 1.27, displayWeight: 550, bodyWeight: 420, bodyPx: 16, displayTracking: '-0.04em' },
    layout: { maxWidth: 1240, gutter: 28, radius: 24, shadow: '0 30px 80px -30px rgba(0,0,0,.65)' },
    materials: { surface: 'glass', glassBlur: 22, grain: 0.015, gradient: 'linear-gradient(145deg, rgba(255,255,255,.18), transparent 60%)', texture: 'blur real' },
    motion: { level: 'restrained', baseMs: 460, slowMs: 1000, camera: 'parallax de puntero 2 %, sin rotación' },
    composition: { focal: 'tarjeta central flotante', alignment: 'center', negativeSpace: 0.48, density: 'balanced', headlineChars: 34, notes: ['Máximo dos niveles de vidrio', 'Borde luminoso de 1 px'] },
    effects: [{ id: 'glass-refraction', role: 'refracción de fondo' }, { id: 'bokeh-drift', role: 'profundidad desenfocada' }],
    signature: ['Superficies translúcidas', 'Borde blanco al 16 %', 'Radio 24 px', 'Luz fría'],
    avoid: ['Vidrio sobre texto pequeño', 'Blur excesivo sin contraste', 'Más de tres capas'],
  }),
  make('neumorphism', 'Neumorphism', 'Relieve suave y táctil; sólo funciona con una sola fuente de luz y contraste controlado.', ['neumorphism', 'relieve', 'suave', 'táctil', 'soft ui'], {
    mode: 'light', colors: { bg: '#e8edf2', surface: '#e8edf2', elevated: '#f4f8fb', text: '#24303c', muted: '#5c6b79', accent: '#2e6f8e', accent2: '#9b6b3f', border: '#c9d3dc', focus: '#245e9e' },
    typography: { display: 'sans', body: 'sans', displayWeight: 550, scaleRatio: 1.22, bodyPx: 16, displayTracking: '-0.03em' },
    layout: { maxWidth: 1180, gutter: 26, radius: 26, shadow: '12px 12px 28px #c7d0d9, -12px -12px 28px #ffffff' },
    materials: { surface: 'soft', grain: 0, glassBlur: 0, gradient: 'linear-gradient(145deg, #f7fafc, #dfe6ec)', texture: 'none' },
    motion: { level: 'restrained', baseMs: 380, fastMs: 180, camera: 'sin cámara' },
    composition: { focal: 'centro', alignment: 'center', negativeSpace: 0.46, density: 'airy', contrast: 'soft', headlineChars: 28, notes: ['Una luz superior izquierda', 'Contraste de texto ≥ 7:1'] },
    effects: [{ id: 'wave-contours', role: 'relieve de fondo' }, { id: 'caustic-light', role: 'luz suave' }],
    signature: ['Doble sombra', 'Radio 26 px', 'Superficie única', 'Acento azul acero'],
    avoid: ['Sombras múltiples', 'Contraste bajo en texto', 'Brutalismo'],
  }),
  make('editorial', 'Diseño editorial', 'Jerarquía periodística, retícula asimétrica y tensión entre serif y sans.', ['editorial', 'revista', 'periódico', 'magazine', 'tipografía', 'cultural'], {
    mode: 'light', colors: { ...lightBase, bg: '#f3eee2', surface: '#faf6ec', elevated: '#e7dfcf', text: '#17140f', muted: '#5c554a', accent: '#a62f24', accent2: '#1f4f46', border: '#cfc4b0' },
    typography: { display: 'serif', body: 'sans', displayWeight: 600, bodyWeight: 420, scaleRatio: 1.42, bodyPx: 17, lineHeight: 1.6, displayLineHeight: 0.94, displayTracking: '-0.045em', measure: 58 },
    layout: { maxWidth: 1300, gutter: 36, spacing: 10, radius: 0, borderWidth: 1, shadow: 'none' },
    materials: { surface: 'paper', grain: 0.05, glassBlur: 0, gradient: 'none', texture: 'papel 120 g' },
    motion: { level: 'restrained', baseMs: 440, slowMs: 950, staggerMs: 45, camera: 'sin cámara; entrada por líneas' },
    composition: { focal: 'titular izquierdo', alignment: 'asymmetric', negativeSpace: 0.4, density: 'balanced', contrast: 'high', headlineChars: 38, imageRatio: '4:5', notes: ['Reglas horizontales como puntuación', 'Un solo acento rojo'] },
    effects: [{ id: 'ink-diffusion', role: 'tinta sobre papel' }],
    signature: ['Serif de 72–160 px', 'Filetes negros', 'Columna estrecha de datos', 'Rojo de imprenta'],
    avoid: ['Sombras', 'Gradientes llamativos', 'Texto justificado sin control'],
  }),
  make('brutalism', 'Brutalismo', 'Estructura expuesta, tipografía sin disculpas y contraste de bloque.', ['brutal', 'brutalism', 'crudo', 'raw', 'concreto', 'experimental'], {
    mode: 'light', colors: { bg: '#f2f0e8', surface: '#ffffff', elevated: '#d9ff43', text: '#0b0b0b', muted: '#4b4b4b', accent: '#ff3d00', accent2: '#1e3aff', border: '#0b0b0b', focus: '#1e3aff' },
    typography: { display: 'mono', body: 'sans', mono: 'mono', displayWeight: 800, bodyWeight: 500, scaleRatio: 1.5, bodyPx: 16, displayLineHeight: 0.9, displayTracking: '-0.07em', measure: 48 },
    layout: { maxWidth: 1440, gutter: 14, spacing: 7, radius: 0, borderWidth: 3, shadow: '10px 10px 0 #0b0b0b' },
    materials: { surface: 'flat', grain: 0.01, glassBlur: 0, gradient: 'none', texture: 'papel sin tratar' },
    motion: { level: 'expressive', baseMs: 180, slowMs: 520, staggerMs: 0, spring: 'steps(3, end)', camera: 'sin cámara' },
    composition: { focal: 'bloques apilados', alignment: 'left', negativeSpace: 0.2, density: 'compact', contrast: 'high', headlineChars: 22, notes: ['Bordes negros de 3 px', 'Sin radios', 'El amarillo es superficie, no adorno'] },
    effects: [{ id: 'dot-matrix', role: 'trama de impresión' }],
    signature: ['Bordes 3 px', 'Sombra sólida', 'Amarillo ácido', 'Tipografía mono grande'],
    avoid: ['Redondeos', 'Glass', 'Sombras difusas'],
  }),
  make('game-ui', 'Interfaces de videojuego', 'HUD diegético, jerarquía instantánea y datos que se leen en movimiento.', ['juego', 'game', 'videojuego', 'hud', 'rpg', 'shooter'], {
    colors: { bg: '#061016', surface: '#0b1a22', elevated: '#102832', text: '#eafbff', muted: '#90b1ba', accent: '#63ffb5', accent2: '#ffcf5a', border: '#1d4a56' },
    typography: { display: 'display', body: 'sans', mono: 'mono', displayWeight: 750, scaleRatio: 1.32, bodyPx: 15, displayTracking: '-0.035em', measure: 52 },
    layout: { maxWidth: 1500, gutter: 18, spacing: 6, radius: 6, borderWidth: 1, shadow: '0 0 40px rgba(99,255,181,.08)' },
    materials: { surface: 'metal', grain: 0.03, glassBlur: 0, gradient: 'linear-gradient(180deg, rgba(99,255,181,.1), transparent)', texture: 'triángulos de advertencia' },
    motion: { level: 'expressive', fastMs: 90, baseMs: 220, slowMs: 600, staggerMs: 24, camera: 'golpe lateral 1.5 %, retorno 0.4 s' },
    composition: { focal: 'centro de acción', alignment: 'center', negativeSpace: 0.22, density: 'compact', contrast: 'high', headlineChars: 24, notes: ['Datos de estado siempre visibles', 'Energía y vida nunca sólo por color'] },
    effects: [{ id: 'target-reticle', role: 'retícula de objetivo' }, { id: 'telemetry-grid', role: 'telemetría del HUD' }],
    signature: ['Esquinas de 6 px', 'Barras segmentadas', 'Verde señal', 'Etiquetas de tecla'],
    avoid: ['Texto menor de 12 px', 'Decoración sin estado', 'Contraste bajo'],
  }),
  make('professional-app', 'Aplicaciones profesionales', 'Densidad controlada, familiaridad y foco en la tarea; la interfaz desaparece.', ['profesional', 'app', 'productividad', 'herramienta', 'saas', 'empresa'], {
    mode: 'light', colors: { ...lightBase, bg: '#f4f6f9', surface: '#ffffff', elevated: '#eef2f7', text: '#17202e', muted: '#59677a', accent: '#2457d6', accent2: '#0f766e', border: '#d9e0e9', focus: '#1742a8' },
    typography: { display: 'sans', body: 'sans', displayWeight: 620, bodyWeight: 430, scaleRatio: 1.2, bodyPx: 14, lineHeight: 1.45, displayTracking: '-0.025em', measure: 60 },
    layout: { maxWidth: 1440, gutter: 20, spacing: 6, radius: 8, shadow: '0 16px 40px -32px rgba(23,32,46,.45)' },
    materials: { surface: 'flat', grain: 0, glassBlur: 0, gradient: 'none', texture: 'ninguna' },
    motion: { level: 'restrained', baseMs: 260, fastMs: 120, slowMs: 600, staggerMs: 30, camera: 'sin cámara' },
    composition: { focal: 'contenido principal', alignment: 'left', negativeSpace: 0.28, density: 'compact', contrast: 'balanced', headlineChars: 46, notes: ['La acción primaria compite con una sola cosa', 'Estados vacíos útiles'] },
    effects: [{ id: 'mesh-gradient', role: 'fondo de marca sutil' }],
    signature: ['Radio 8 px', 'Borde 1 px', 'Azul de acción', 'Densidad 32 px'],
    avoid: ['Efectos animados en el área de trabajo', 'Tipografía decorativa', 'Sombras profundas'],
  }),
  make('financial-dashboard', 'Dashboards financieros', 'Datos primero, color con significado y números que se comparan verticalmente.', ['financiero', 'finanzas', 'dashboard', 'trading', 'datos', 'inversión'], {
    colors: { bg: '#071019', surface: '#0b1722', elevated: '#10212f', text: '#f1f7fb', muted: '#96acbb', accent: '#36d6a4', accent2: '#ff6b6b', border: '#1d3342', success: '#36d6a4', warning: '#f7c948', danger: '#ff6b6b' },
    typography: { display: 'sans', body: 'sans', mono: 'mono', displayWeight: 600, scaleRatio: 1.2, bodyPx: 14, tracking: '0.005em', displayTracking: '-0.025em', measure: 70 },
    layout: { maxWidth: 1560, gutter: 16, spacing: 4, radius: 6, shadow: 'none' },
    materials: { surface: 'flat', grain: 0, glassBlur: 0, gradient: 'none', texture: 'retícula de gráfico' },
    motion: { level: 'still', fastMs: 100, baseMs: 180, slowMs: 320, staggerMs: 0, camera: 'ninguna' },
    composition: { focal: 'serie temporal', alignment: 'left', negativeSpace: 0.18, density: 'compact', contrast: 'high', headlineChars: 54, notes: ['Rojo y verde siempre con signo', 'Cifras tabulares', 'Sin animación que oculte el dato'] },
    effects: [{ id: 'circuit-lines', role: 'trama de datos' }],
    signature: ['Mono tabular', 'Densidad 4 px', 'Verde/rojo semánticos', 'Gráficos sin decoración'],
    avoid: ['Gradientes en el área de datos', 'Animaciones de carga infinitas', 'Colores no semánticos'],
  }),
  make('immersive-3d', 'Diseño 3D inmersivo', 'Espacio, profundidad y capas; la cámara es parte de la composición.', ['3d', 'inmersivo', 'espacial', 'profundidad', 'realidad virtual', 'webgl'], {
    colors: { bg: '#05060f', surface: '#0d1224', elevated: '#141c36', text: '#f3f5ff', muted: '#a5b0d0', accent: '#8b7bff', accent2: '#4ee1d0', border: '#27335a' },
    typography: { display: 'display', body: 'sans', displayWeight: 600, scaleRatio: 1.35, bodyPx: 16, displayTracking: '-0.05em' },
    layout: { maxWidth: 1360, gutter: 30, spacing: 8, radius: 20, shadow: '0 40px 100px -40px rgba(0,0,0,.85)' },
    materials: { surface: 'glass', glassBlur: 16, grain: 0.025, gradient: 'radial-gradient(circle at 70% 20%, rgba(139,123,255,.22), transparent 45%)', texture: 'profundidad volumétrica' },
    motion: { level: 'expressive', baseMs: 520, slowMs: 1400, camera: 'órbita 6°, dolly-in 1.08, parallax 3 capas' },
    composition: { focal: 'objeto central desplazado', alignment: 'center', negativeSpace: 0.45, density: 'airy', contrast: 'balanced', headlineChars: 30, imageRatio: '1:1', notes: ['Máximo tres planos de profundidad', 'La cámara respeta reduced-motion'] },
    effects: [{ id: 'cube-field', role: 'campo 3D' }, { id: 'starfield-warp', role: 'profundidad estelar' }],
    signature: ['Violeta profundo', 'Tarjetas flotantes', 'Sombras de contacto', 'Cámara orbital'],
    avoid: ['UI plana sin profundidad', 'Exceso de blur', 'Texto sobre zona de alto detalle'],
  }),
  make('motion-graphics', 'Motion graphics', 'Tiempo, ritmo y tipografía en movimiento; cada frame tiene una función.', ['motion', 'animación', 'kinético', 'vídeo', 'after effects', 'título'], {
    colors: { bg: '#090909', surface: '#141414', elevated: '#1e1e1e', text: '#ffffff', muted: '#b6b6b6', accent: '#ff6b35', accent2: '#7cf5ff', border: '#333333' },
    typography: { display: 'display', body: 'sans', mono: 'mono', displayWeight: 800, scaleRatio: 1.45, bodyPx: 16, displayLineHeight: 0.88, displayTracking: '-0.065em', measure: 42 },
    layout: { maxWidth: 1400, gutter: 24, spacing: 8, radius: 0, shadow: 'none' },
    materials: { surface: 'flat', grain: 0.05, glassBlur: 0, gradient: 'linear-gradient(90deg, #ff6b35, transparent 35%)', texture: 'grano de película' },
    motion: { level: 'expressive', fastMs: 150, baseMs: 500, slowMs: 1200, staggerMs: 80, camera: 'zoom 1.12, rotación 1.2° en transición' },
    composition: { focal: 'titular a sangre', alignment: 'asymmetric', negativeSpace: 0.3, density: 'balanced', contrast: 'high', headlineChars: 20, notes: ['Corte en el pico de movimiento', 'Nunca animar todo a la vez'] },
    effects: [{ id: 'volumetric-rays', role: 'haz de luz' }, { id: 'split-reveal', role: 'revelado tipográfico' }],
    signature: ['Tipografía 100–240 px', 'Naranja de señal', 'Cortes secos', 'Timeline visible'],
    avoid: ['Efectos sin ritmo', 'Fondos recargados', 'Transiciones genéricas'],
  }),
  make('organic-natural', 'Interfaces naturales y orgánicas', 'Formas blandas, materiales cálidos y ritmo humano; tecnología que se siente materia.', ['orgánico', 'natural', 'bienestar', 'salud', 'sostenible', 'artesanal'], {
    mode: 'light', colors: { ...lightBase, bg: '#f1eadc', surface: '#fbf6eb', elevated: '#e4d8c3', text: '#21352b', muted: '#5c6b5b', accent: '#31705a', accent2: '#b45f3f', border: '#d1c2a9', focus: '#245b8a' },
    typography: { display: 'serif', body: 'sans', displayWeight: 520, bodyWeight: 420, scaleRatio: 1.3, bodyPx: 17, lineHeight: 1.62, displayLineHeight: 1.02, displayTracking: '-0.035em', measure: 60 },
    layout: { maxWidth: 1200, gutter: 30, spacing: 9, radius: 32, shadow: '0 28px 60px -42px rgba(63,54,38,.5)' },
    materials: { surface: 'paper', grain: 0.04, glassBlur: 2, gradient: 'radial-gradient(circle at 20% 10%, rgba(180,95,63,.12), transparent 44%)', texture: 'fibra de papel' },
    motion: { level: 'restrained', baseMs: 620, slowMs: 1300, easeOut: 'cubic-bezier(.22,.61,.36,1)', camera: 'respiración 1.01, sin rotación' },
    composition: { focal: 'diagonal orgánica', alignment: 'asymmetric', negativeSpace: 0.5, density: 'airy', contrast: 'soft', headlineChars: 32, imageRatio: '3:4', notes: ['Curvas grandes, una sola por bloque', 'Nada de ángulos rectos duros'] },
    effects: [{ id: 'caustic-light', role: 'luz de agua' }, { id: 'ink-diffusion', role: 'tinta orgánica' }],
    signature: ['Radio 32 px', 'Verde bosque', 'Terracota', 'Texturas de papel'],
    avoid: ['Neón', 'Bordes duros', 'Densidad financiera'],
  }),
];

export const STYLE_IDS = STYLE_PROFILES.map((s) => s.id);
export const PROJECT_TYPES: ProjectType[] = ['landing', 'dashboard', 'app', 'game-hud', 'game-menu', 'editorial', 'motion', 'scene3d', 'mobile', 'poster'];

const PROJECT_DEFAULTS: Record<ProjectType, StyleId> = {
  landing: 'minimal-premium', dashboard: 'financial-dashboard', app: 'professional-app',
  'game-hud': 'game-ui', 'game-menu': 'cyberpunk', editorial: 'editorial',
  motion: 'motion-graphics', scene3d: 'immersive-3d', mobile: 'organic-natural', poster: 'cinematic',
};

const PROJECT_COMPONENTS: Record<ProjectType, string[]> = {
  landing: ['NavBar', 'Hero', 'PrimaryCTA', 'ProofStrip', 'FeatureGrid', 'Footer'],
  dashboard: ['AppShell', 'Sidebar', 'TopBar', 'MetricCard', 'TimeSeries', 'DataTable', 'StatusLegend'],
  app: ['Rail', 'Workspace', 'CommandBar', 'Inspector', 'EmptyState', 'Toast'],
  'game-hud': ['HUDFrame', 'VitalBar', 'AmmoCounter', 'ObjectivePanel', 'Minimap', 'AbilityBar'],
  'game-menu': ['TitleScreen', 'CharacterPanel', 'InventoryGrid', 'MissionCard', 'ControlHints'],
  editorial: ['Masthead', 'IssueLine', 'FeatureHeadline', 'Standfirst', 'ArticleGrid', 'PullQuote', 'Caption'],
  motion: ['TypeStage', 'TimelineMarkers', 'SceneLabel', 'SafeArea', 'Progress'],
  scene3d: ['SpatialCanvas', 'OverlayTitle', 'DepthLegend', 'Hotspot', 'ResetView'],
  mobile: ['PhoneFrame', 'TabBar', 'HeroCard', 'ActionRow', 'StatPill'],
  poster: ['PosterFrame', 'Kicker', 'DisplayTitle', 'Rule', 'Credits'],
};

const PROJECT_EFFECT_CATEGORIES: Record<ProjectType, string[]> = {
  landing: ['hero', 'fondos', 'iluminacion'], dashboard: ['hud', 'fondos'], app: ['materiales', 'fondos'],
  'game-hud': ['hud', 'interfaz'], 'game-menu': ['interfaz', 'materiales'], editorial: ['tipografia', 'materiales'],
  motion: ['tipografia', 'transiciones', 'iluminacion'], scene3d: ['3d', 'particulas', 'fondos'],
  mobile: ['materiales', 'fondos'], poster: ['tipografia', 'iluminacion'],
};

export function getStyle(id: string): StyleProfile {
  const found = STYLE_PROFILES.find((s) => s.id === id);
  if (!found) throw new Error(`Estilo desconocido: ${id}. Disponibles: ${STYLE_IDS.join(', ')}`);
  return found;
}

export function inferStyle(brief: string, projectType?: ProjectType): StyleProfile {
  const text = brief.toLowerCase();
  let best = projectType ? getStyle(PROJECT_DEFAULTS[projectType]) : STYLE_PROFILES[0];
  let bestScore = 0;
  for (const style of STYLE_PROFILES) {
    let score = style.keywords.reduce((n, k) => n + (text.includes(k.toLowerCase()) ? 3 : 0), 0);
    if (text.includes(style.name.toLowerCase())) score += 5;
    if (score > bestScore) {
      best = style;
      bestScore = score;
    }
  }
  return best;
}

export function resolveProjectType(brief: string, requested?: string): ProjectType {
  if (requested && PROJECT_TYPES.includes(requested as ProjectType)) return requested as ProjectType;
  const t = brief.toLowerCase();
  if (/dashboard|panel de control|anal[ií]tica|finanz|trading/.test(t)) return 'dashboard';
  if (/videojuego|juego|hud|rpg|shooter|inventario/.test(t)) return /hud/.test(t) ? 'game-hud' : 'game-menu';
  if (/editorial|revista|per[ií]odico|magazine/.test(t)) return 'editorial';
  if (/motion|animaci[oó]n|t[ií]tulo|kin[eé]tic/.test(t)) return 'motion';
  if (/3d|inmersiv|espacial|webgl/.test(t)) return 'scene3d';
  if (/m[oó]vil|mobile|app ios|android/.test(t)) return 'mobile';
  if (/poster|cartel|affiche/.test(t)) return 'poster';
  if (/app|aplicaci[oó]n|herramienta|editor/.test(t)) return 'app';
  return 'landing';
}

function relLum(color: string): number {
  const rgb = /^#/.test(color) ? hexToRgb(color) : [255, 255, 255];
  const c = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  return round((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
}

function mix(hex: string, toward: string, amount: number): string {
  const a = hexToRgb(hex), b = hexToRgb(toward);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function ensureContrast(fg: string, bg: string, target = 4.5): string {
  if (!/^#/.test(fg) || !/^#/.test(bg)) return fg;
  const toward = relLum(bg) > 0.4 ? '#000000' : '#ffffff';
  let out = fg;
  for (let i = 0; i < 20 && contrastRatio(out, bg) < target; i++) out = mix(out, toward, 0.1);
  return out;
}

function scaleSizes(base: number, ratio: number): Record<string, number> {
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    caption: r(base * 0.75), small: r(base * 0.875), body: r(base), lead: r(base * 1.25),
    h3: r(base * ratio), h2: r(base * ratio ** 2), h1: r(base * ratio ** 3), display: r(base * ratio ** 4),
    hero: r(base * ratio ** 5),
  };
}

function responsiveSize(px: number, maxVw = 7): string {
  const min = Math.max(12, Math.round(px * 0.72));
  return `clamp(${min}px, ${round((px / 1280) * 100, 2)}vw, ${Math.round(px)}px)`;
}

function effectFor(id: string, role: string, projectType: ProjectType, reason: string): EffectChoice {
  const recipe = getEffect(id);
  return { id, role: role || recipe.category, reason: `${reason} (${recipe.category}; ${recipe.license}).` };
}

export function selectEffects(style: StyleProfile, projectType: ProjectType, preferences: ArtPreferences = {}): EffectChoice[] {
  const available = new Set(listEffects().map((e) => e.id));
  const preferred = [...new Set([...(preferences.effects ?? []), ...style.effects.map((e) => e.id)])].filter((id) => available.has(id));
  const max = projectType === 'dashboard' || projectType === 'app' ? 2 : projectType === 'landing' || projectType === 'scene3d' || projectType === 'motion' ? 3 : 2;
  const chosen: EffectChoice[] = [];
  for (const id of preferred) {
    if (chosen.length >= max) break;
    const declared = style.effects.find((e) => e.id === id);
    chosen.push(effectFor(id, declared?.role ?? '', projectType, preferences.effects?.includes(id) ? 'Solicitado explícitamente' : `Compatible con ${style.name}`));
  }
  if (chosen.length < 2) {
    const categories = PROJECT_EFFECT_CATEGORIES[projectType];
    for (const recipe of listEffects()) {
      if (chosen.length >= Math.min(2, max)) break;
      if (!categories.includes(recipe.category) || chosen.some((c) => c.id === recipe.id)) continue;
      chosen.push(effectFor(recipe.id, recipe.category, projectType, `Categoría adecuada para ${projectType}`));
    }
  }
  if (!chosen.length) throw new Error('No hay efectos compatibles disponibles.');
  return chosen;
}

export function buildArtDirection(input: {
  brief: string;
  style?: string;
  projectType?: string;
  preferences?: ArtPreferences;
  seed?: number;
}): ArtDirection {
  const brief = input.brief.trim();
  if (!brief) throw new Error('El brief no puede estar vacío.');
  const projectType = resolveProjectType(brief, input.projectType);
  const style = input.style ? getStyle(input.style) : inferStyle(brief, projectType);
  const prefs = input.preferences ?? {};
  const density = prefs.density ?? style.composition.density;
  const motionLevel = prefs.motion ?? style.motion.level;
  const colors: Palette = {
    ...style.colors,
    ...(prefs.mode && prefs.mode !== style.mode ? { bg: prefs.mode === 'light' ? '#f6f2ea' : '#070b12', surface: prefs.mode === 'light' ? '#fffdf8' : '#0d1420', elevated: prefs.mode === 'light' ? '#ece6da' : '#121c2b', text: prefs.mode === 'light' ? '#171512' : '#eef6ff', muted: prefs.mode === 'light' ? '#5f5a52' : '#9aa8ba', border: prefs.mode === 'light' ? '#d6cdbf' : '#243247' } : {}),
    ...(prefs.accent && /^#[0-9a-f]{6}$/i.test(prefs.accent) ? { accent: prefs.accent } : {}),
    ...(prefs.accent2 && /^#[0-9a-f]{6}$/i.test(prefs.accent2) ? { accent2: prefs.accent2 } : {}),
  };
  colors.muted = ensureContrast(colors.muted, colors.bg, 4.5);
  colors.text = ensureContrast(colors.text, colors.bg, 7);
  colors.focus = ensureContrast(colors.focus, colors.bg, 3);
  const accentInk = contrastRatio(colors.text, colors.accent) >= 4.5 ? colors.text : contrastRatio('#04100f', colors.accent) >= 4.5 ? '#04100f' : colors.bg;
  const typography = {
    ...style.typography,
    ...(prefs.font ? { display: prefs.font, body: prefs.font === 'serif' || prefs.font === 'mono' ? prefs.font : style.typography.body } : {}),
    sizes: scaleSizes(projectType === 'dashboard' ? Math.min(14, style.typography.bodyPx) : style.typography.bodyPx, style.typography.scaleRatio),
  };
  const responsive = Object.fromEntries(Object.entries(typography.sizes).map(([k, v]) => [k, responsiveSize(v)]));
  const layout: LayoutSystem = {
    ...style.layout,
    ...(density === 'airy' ? { gutter: Math.round(style.layout.gutter * 1.25), spacing: style.layout.spacing + 2 } : {}),
    ...(density === 'compact' ? { gutter: Math.max(12, Math.round(style.layout.gutter * 0.75)), spacing: Math.max(4, style.layout.spacing - 2) } : {}),
    ...(projectType === 'dashboard' ? { maxWidth: Math.max(1360, style.layout.maxWidth), columns: 12 } : {}),
  };
  const motion: MotionSystem = {
    ...style.motion,
    level: motionLevel,
    ...(motionLevel === 'still' ? { fastMs: 80, baseMs: 140, slowMs: 220, staggerMs: 0 } : {}),
    ...(motionLevel === 'expressive' ? { baseMs: Math.max(300, style.motion.baseMs), staggerMs: Math.max(50, style.motion.staggerMs) } : {}),
  };
  const effects = selectEffects(style, projectType, prefs);
  const rationale = [
    `Proyecto ${projectType}: ${PROJECT_COMPONENTS[projectType].slice(0, 3).join(', ')} antes de decorar.`,
    `Estilo ${style.name}: ${style.description}`,
    `Tipografía ${typography.display} + ${typography.body}${typography.mono !== typography.body ? ` + ${typography.mono}` : ''}; escala ${typography.scaleRatio}.`,
    `Densidad ${density}; espacio base ${layout.spacing} px y radio ${layout.radius} px.`,
    `Movimiento ${motion.level}; transiciones de ${motion.fastMs}/${motion.baseMs}/${motion.slowMs} ms.`,
    `Efectos elegidos por función: ${effects.map((e) => `${e.id} (${e.role})`).join(', ')}.`,
    `Contraste de texto sobre fondo: ${contrastRatio(colors.text, colors.bg)}:1.`,
  ];
  const warnings: string[] = [];
  if (effects.length > 2 && (projectType === 'dashboard' || projectType === 'app')) warnings.push('Se limitaron efectos para no competir con la tarea principal.');
  if (motion.level === 'expressive') warnings.push('Movimiento expresivo: verifica prefers-reduced-motion y no bloquees la lectura.');
  if (prefs.mode && prefs.mode !== style.mode) warnings.push('El modo solicitado se aproxima con una paleta neutra; no se ha rediseñado el perfil completo.');
  if (style.id === 'glassmorphism' || style.id === 'neumorphism') warnings.push('Los materiales requieren contraste explícito; no uses texto pequeño sobre superficies translúcidas sin auditar.');

  const audit = auditArtDirection({ style, colors, typography: { ...style.typography, ...typography, sizes: typography.sizes }, layout, motion, effects, projectType, accentInk });
  const tokenSet: ArtDirection['tokenSet'] = {};
  for (const [k, v] of Object.entries({ ...colors, accentInk })) tokenSet[`color.${k}`] = { $value: v, $type: 'color' };
  for (const [k, v] of Object.entries(typography.sizes)) tokenSet[`font.size.${k}`] = { $value: v, $type: 'dimension' };
  tokenSet['font.display'] = { $value: family(typography.display), $type: 'fontFamily' };
  tokenSet['font.body'] = { $value: family(typography.body), $type: 'fontFamily' };
  tokenSet['font.mono'] = { $value: family(typography.mono), $type: 'fontFamily' };
  tokenSet['font.scaleRatio'] = { $value: typography.scaleRatio, $type: 'number' };
  tokenSet['space.base'] = { $value: layout.spacing, $type: 'dimension' };
  tokenSet['space.gutter'] = { $value: layout.gutter, $type: 'dimension' };
  tokenSet['radius.card'] = { $value: layout.radius, $type: 'dimension' };
  tokenSet['border.width'] = { $value: layout.borderWidth, $type: 'dimension' };
  tokenSet['motion.fast'] = { $value: `${motion.fastMs}ms`, $type: 'duration' };
  tokenSet['motion.base'] = { $value: `${motion.baseMs}ms`, $type: 'duration' };
  tokenSet['motion.slow'] = { $value: `${motion.slowMs}ms`, $type: 'duration' };
  tokenSet['motion.easeOut'] = { $value: motion.easeOut, $type: 'cubicBezier' };
  tokenSet['motion.stagger'] = { $value: `${motion.staggerMs}ms`, $type: 'duration' };

  const fonts = [...new Set([typography.display, typography.body, typography.mono])]
    .map((k) => FONTS[k as keyof typeof FONTS] ?? FONTS.sans)
    .filter((f, i, a) => a.findIndex((x) => x.id === f.id) === i);

  const id = `${style.id}-${projectType}-${Math.abs(hash(brief + (input.seed ?? 0))).toString(36).slice(0, 5)}`;
  return {
    version: '0.4', id, brief, projectType, style, palette: colors,
    typography: { ...style.typography, ...typography, responsive, families: { display: family(typography.display), body: family(typography.body), mono: family(typography.mono) } },
    layout, materials: style.materials, motion, composition: { ...style.composition, density },
    effects, components: PROJECT_COMPONENTS[projectType], tokenSet, rationale, warnings, fonts, audit,
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

function compositeOver(color: string, base: string): string {
  if (/^#/.test(color) || !/^rgba?\(/.test(color)) return color;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return color;
  const parts = m[1].split(',').map((x) => Number(x.trim()));
  const alpha = parts[3] ?? 1;
  if (alpha >= 1) return `#${parts.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  const under = /^#/.test(base) ? hexToRgb(base) : [0, 0, 0];
  const mixed = parts.slice(0, 3).map((v, i) => Math.round(v * alpha + under[i] * (1 - alpha)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function auditArtDirection(input: {
  style: StyleProfile; colors: Palette; typography: TypeSystem & { sizes: Record<string, number> };
  layout: LayoutSystem; motion: MotionSystem; effects: EffectChoice[]; projectType: ProjectType; accentInk: string;
}): DesignAudit {
  const surfaceOnBg = compositeOver(input.colors.surface, input.colors.bg);
  const pairs = [
    { fg: input.colors.text, bg: input.colors.bg, target: 7 },
    { fg: input.colors.text, bg: surfaceOnBg, target: 7 },
    { fg: input.colors.muted, bg: input.colors.bg, target: 4.5 },
    { fg: input.accentInk, bg: input.colors.accent, target: 4.5 },
  ].map((p) => ({ fg: p.fg, bg: p.bg, ratio: contrastRatio(p.fg, p.bg), pass: contrastRatio(p.fg, p.bg) >= p.target }));
  const warnings: string[] = [];
  if (pairs.some((p) => !p.pass)) warnings.push('Hay un par de contraste por debajo del objetivo; no se usa como texto pequeño.');
  const sizes = Object.values(input.typography.sizes);
  const scaleOk = sizes.length >= 7 && sizes.every((n, i) => i === 0 || n > sizes[i - 1]);
  const bodyOk = input.typography.sizes.body >= 14;
  const effectOk = input.effects.length >= 1 && input.effects.length <= 3;
  const reduced = input.motion.level !== 'expressive' || input.motion.baseMs >= 200;
  const contrastOk = pairs.every((p) => p.pass);
  const dimensions: DesignAuditDimension[] = [
    { id: 'contrast', score: contrastOk ? 100 : 45, evidence: pairs.map((p) => `${p.ratio}:1 ${p.pass ? 'OK' : 'BAJO'}`).join('; ') },
    { id: 'type-scale', score: scaleOk && bodyOk ? 100 : 55, evidence: `${sizes.length} pasos, cuerpo ${input.typography.sizes.body}px, ratio ${input.typography.scaleRatio}` },
    { id: 'spacing', score: input.layout.spacing >= 4 && input.layout.spacing <= 12 ? 100 : 70, evidence: `base ${input.layout.spacing}px, gutter ${input.layout.gutter}px` },
    { id: 'hierarchy', score: Math.min(100, 45 + (input.typography.scaleRatio - 1) * 110), evidence: `ratio ${input.typography.scaleRatio}, display ${input.typography.sizes.display}px` },
    { id: 'restraint', score: effectOk ? 100 : 50, evidence: `${input.effects.length} efecto(s) para ${input.projectType}` },
    { id: 'motion-accessibility', score: reduced ? 100 : 55, evidence: `${input.motion.level}; base ${input.motion.baseMs}ms; stagger ${input.motion.staggerMs}ms` },
    { id: 'identity', score: input.style.signature.length >= 3 ? 100 : 60, evidence: `${input.style.signature.length} reglas de firma; ${input.style.avoid.length} anti-patrones` },
  ];
  const structuralScore = round(dimensions.reduce((a, d) => a + d.score, 0) / dimensions.length, 1);
  return {
    structuralScore, dimensions, contrastPairs: pairs, warnings,
    note: 'Auditoría estructural, no juicio artístico. Comprueba contraste, escala, ritmo, mesura y accesibilidad; la evaluación humana es independiente.',
  };
}

export function fontFaceCss(fontPath = './fonts'): string {
  return Object.values(FONTS).map((f) => `@font-face {
  font-family: '${f.family}';
  src: url('${fontPath}/${f.file}') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`).join('\n');
}

export function artDirectionCss(ad: ArtDirection, fontPath = './fonts'): string {
  const c = ad.palette, t = ad.typography, l = ad.layout, m = ad.motion;
  const accentInk = ad.tokenSet['color.accentInk']?.$value ?? c.bg;
  return `${fontFaceCss(fontPath)}
:root {
  --ve-bg: ${c.bg}; --ve-surface: ${c.surface}; --ve-elevated: ${c.elevated};
  --ve-text: ${c.text}; --ve-muted: ${c.muted}; --ve-accent: ${c.accent}; --ve-accent2: ${c.accent2};
  --ve-border: ${c.border}; --ve-success: ${c.success}; --ve-warning: ${c.warning}; --ve-danger: ${c.danger};
  --ve-focus: ${c.focus}; --ve-accent-ink: ${accentInk};
  --ve-display: '${t.families.display}', ui-sans-serif, system-ui, sans-serif;
  --ve-body: '${t.families.body}', ui-sans-serif, system-ui, sans-serif;
  --ve-mono: '${t.families.mono}', ui-monospace, monospace;
  --ve-display-weight: ${t.displayWeight}; --ve-body-weight: ${t.bodyWeight};
  --ve-body-size: ${t.sizes.body}px; --ve-lead-size: ${t.sizes.lead}px;
  --ve-h3: ${t.sizes.h3}px; --ve-h2: ${t.sizes.h2}px; --ve-h1: ${t.sizes.h1}px;
  --ve-display-size: ${t.sizes.display}px; --ve-hero-size: ${t.sizes.hero}px;
  --ve-line: ${t.lineHeight}; --ve-display-line: ${t.displayLineHeight}; --ve-tracking: ${t.tracking};
  --ve-display-tracking: ${t.displayTracking}; --ve-measure: ${t.measure}ch;
  --ve-space: ${l.spacing}px; --ve-gutter: ${l.gutter}px; --ve-max: ${l.maxWidth}px;
  --ve-radius: ${l.radius}px; --ve-border-width: ${l.borderWidth}px; --ve-shadow: ${l.shadow};
  --ve-fast: ${m.fastMs}ms; --ve-base: ${m.baseMs}ms; --ve-slow: ${m.slowMs}ms;
  --ve-ease-out: ${m.easeOut}; --ve-ease-in-out: ${m.easeInOut}; --ve-spring: ${m.spring};
  --ve-stagger: ${m.staggerMs}ms;
  color-scheme: ${ad.style.mode};
}
* { box-sizing: border-box; }
html { background: var(--ve-bg); }
body { margin: 0; background: var(--ve-bg); color: var(--ve-text); font-family: var(--ve-body); font-size: var(--ve-body-size); line-height: var(--ve-line); -webkit-font-smoothing: antialiased; }
a { color: inherit; }
button, input, select, textarea { font: inherit; }
:focus-visible { outline: 2px solid var(--ve-focus); outline-offset: 3px; }
.ve-container { width: min(calc(100% - var(--ve-gutter) * 2), var(--ve-max)); margin-inline: auto; }
.ve-eyebrow { margin: 0; font-family: var(--ve-mono); font-size: .72rem; line-height: 1.2; letter-spacing: .14em; text-transform: uppercase; color: var(--ve-muted); }
.ve-display { margin: 0; font-family: var(--ve-display); font-size: var(--ve-h1); font-weight: var(--ve-display-weight); line-height: var(--ve-display-line); letter-spacing: var(--ve-display-tracking); text-wrap: balance; }
.ve-lead { margin: 0; max-width: var(--ve-measure); font-size: var(--ve-lead-size); line-height: 1.55; color: var(--ve-muted); }
.ve-card { background: var(--ve-surface); border: var(--ve-border-width) solid var(--ve-border); border-radius: var(--ve-radius); box-shadow: var(--ve-shadow); padding: calc(var(--ve-space) * 3); }
.ve-button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 calc(var(--ve-space) * 2.4); border: var(--ve-border-width) solid transparent; border-radius: var(--ve-radius); background: var(--ve-accent); color: var(--ve-accent-ink); font-weight: 650; text-decoration: none; cursor: pointer; transition: transform var(--ve-fast) var(--ve-ease-out), filter var(--ve-fast) var(--ve-ease-out); }
.ve-button:hover { transform: translateY(-2px); filter: brightness(1.06); }
.ve-button--ghost { background: transparent; color: var(--ve-text); border-color: var(--ve-border); }
.ve-grid { display: grid; grid-template-columns: repeat(${l.columns}, minmax(0, 1fr)); gap: calc(var(--ve-space) * 2); }
.ve-mono { font-family: var(--ve-mono); font-variant-numeric: tabular-nums; }
.ve-rule { border: 0; border-top: var(--ve-border-width) solid var(--ve-border); margin: calc(var(--ve-space) * 3) 0; }
@media (max-width: 760px) { :root { --ve-gutter: ${Math.max(14, Math.round(l.gutter * 0.6))}px; } .ve-grid { grid-template-columns: 1fr; } .ve-display { font-size: clamp(32px, 10vw, ${t.sizes.h1}px); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }
${ad.style.id === 'glassmorphism' ? `.ve-card { backdrop-filter: blur(${ad.materials.glassBlur}px); background: ${ad.palette.surface}; }` : ''}
${ad.style.id === 'brutalism' ? `.ve-card, .ve-button { border-radius: 0; box-shadow: var(--ve-shadow); } .ve-button { text-transform: uppercase; }` : ''}
${ad.style.id === 'editorial' ? `.ve-display { font-size: clamp(48px, 9vw, 152px); } .ve-lead { font-size: clamp(18px, 1.5vw, 22px); }` : ''}
${ad.style.id === 'motion-graphics' ? `.ve-display { font-size: clamp(52px, 11vw, 210px); text-transform: uppercase; }` : ''}
`;
}

export function designMarkdown(ad: ArtDirection): string {
  const c = ad.palette;
  return `# ${ad.style.name} · sistema de diseño

Brief: ${ad.brief}

Proyecto: **${ad.projectType}**. Estilo: **${ad.style.id}**. Modo: **${ad.style.mode}**.
Puntuación estructural: **${ad.audit.structuralScore}/100** (no es una nota artística).

## Identidad y reglas

${ad.style.description}

${ad.style.signature.map((s) => `- ${s}`).join('\n')}

Anti-patrones: ${ad.style.avoid.join(', ')}.

## Paleta semántica

| Rol | Valor | Uso |
| --- | --- | --- |
| background | \`${c.bg}\` | lienzo |
| surface | \`${c.surface}\` | tarjetas y paneles |
| text | \`${c.text}\` | contenido principal |
| muted | \`${c.muted}\` | metadatos |
| accent | \`${c.accent}\` | acción y foco |
| accent2 | \`${c.accent2}\` | apoyo semántico |
| border | \`${c.border}\` | separación |
| success / warning / danger | \`${c.success}\` / \`${c.warning}\` / \`${c.danger}\` | estado |

Contraste texto/fondo: **${contrastRatio(c.text, c.bg)}:1**. Acento con tinta: **${contrastRatio(String(ad.tokenSet['color.accentInk']?.$value), c.accent)}:1**.

## Tipografía

- Display: **${ad.typography.families.display}** a ${ad.typography.displayWeight}, tracking ${ad.typography.displayTracking}.
- Cuerpo: **${ad.typography.families.body}** a ${ad.typography.bodyWeight}, línea ${ad.typography.lineHeight}, medida ${ad.typography.measure}ch.
- Mono: **${ad.typography.families.mono}** para cifras y estados.
- Escala modular ${ad.typography.scaleRatio}: ${Object.entries(ad.typography.sizes).map(([k, v]) => `${k} ${v}px`).join(' · ')}.
- Responsive: ${Object.entries(ad.typography.responsive).map(([k, v]) => `${k}: ${v}`).join('; ')}.

Fuentes locales bajo SIL Open Font License 1.1. No se descargan en tiempo de ejecución.

## Composición y layout

- Foco: ${ad.composition.focal}; alineación ${ad.composition.alignment}; espacio negativo ${Math.round(ad.composition.negativeSpace * 100)} %.
- Retícula ${ad.layout.columns} columnas, ancho ${ad.layout.maxWidth}px, gutter ${ad.layout.gutter}px, unidad ${ad.layout.spacing}px.
- Radio ${ad.layout.radius}px, borde ${ad.layout.borderWidth}px.
- Reglas: ${ad.composition.notes.join('; ')}.

## Materiales

Tipo **${ad.materials.surface}**; grano ${Math.round(ad.materials.grain * 100)} %; blur ${ad.materials.glassBlur}px. Gradiente: ${ad.materials.gradient}. Textura: ${ad.materials.texture}.

## Movimiento

Nivel **${ad.motion.level}**. Duraciones ${ad.motion.fastMs}/${ad.motion.baseMs}/${ad.motion.slowMs} ms; salida ${ad.motion.easeOut}; spring ${ad.motion.spring}; stagger ${ad.motion.staggerMs} ms. Cámara: ${ad.motion.camera}. Reduced-motion desactiva animaciones no esenciales.

## Efectos compatibles

${ad.effects.map((e) => `- \`${e.id}\` — ${e.role}. ${e.reason}`).join('\n')}

## Componentes

${ad.components.map((x) => `- ${x}`).join('\n')}

## Decisiones

${ad.rationale.map((x) => `- ${x}`).join('\n')}

## Auditoría estructural

${ad.audit.dimensions.map((d) => `- **${d.id}**: ${d.score}/100 — ${d.evidence}`).join('\n')}

${ad.audit.note}

## Límites

${[...ad.warnings, 'La elección artística final requiere revisión humana; esta ficha no la sustituye.', 'El perfil no identifica fuentes de una imagen: aproxima familias y proporciones.'].map((w) => `- ${w}`).join('\n')}
`;
}

function demoHtml(ad: ArtDirection): string {
  const c = ad.palette;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ad.style.name} · Art Director</title><link rel="stylesheet" href="./design-system.css"></head>
<body data-style="${ad.style.id}">
<header class="ve-container" style="display:flex;justify-content:space-between;align-items:center;padding-block:24px;border-bottom:var(--ve-border-width) solid var(--ve-border)">
  <strong style="font-family:var(--ve-display);letter-spacing:var(--ve-display-tracking)">VE / ${ad.style.name}</strong>
  <span class="ve-eyebrow">art director 0.4 · ${ad.projectType}</span>
</header>
<main class="ve-container" style="padding-block:clamp(48px,9vw,120px)">
  <p class="ve-eyebrow">${ad.style.keywords.slice(0,3).join(' · ')}</p>
  <h1 class="ve-display" style="max-width:${ad.composition.headlineChars}ch;margin-top:18px">${ad.brief.replace(/[<>&]/g,'')}</h1>
  <p class="ve-lead" style="margin-top:24px">${ad.style.description}</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:32px">
    <a class="ve-button" href="#sistema">Abrir sistema</a>
    <a class="ve-button ve-button--ghost" href="#tokens">Ver tokens</a>
  </div>
  <section id="sistema" class="ve-grid" style="margin-top:clamp(48px,8vw,100px)">
    <article class="ve-card" style="grid-column:span 7"><p class="ve-eyebrow">Jerarquía</p><h2 style="font-family:var(--ve-display);font-size:var(--ve-h3);margin:.4em 0">Una decisión, un foco.</h2><p class="ve-lead">Escala ${ad.typography.scaleRatio}; cuerpo ${ad.typography.sizes.body}px; medida ${ad.typography.measure}ch.</p></article>
    <aside class="ve-card" style="grid-column:span 5"><p class="ve-eyebrow">Estado</p><p class="ve-mono" style="font-size:var(--ve-h2);margin:.2em 0">${ad.audit.structuralScore}<small style="font-size:.35em">/100</small></p><p style="color:var(--ve-muted);margin:0">Auditoría estructural</p></aside>
  </section>
  <section id="tokens" style="margin-top:clamp(48px,8vw,100px)">
    <hr class="ve-rule"><p class="ve-eyebrow">Paleta semántica</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-top:16px">
      ${Object.entries({ bg: c.bg, surface: c.surface, accent: c.accent, accent2: c.accent2, text: c.text, muted: c.muted }).map(([k,v]) => `<div><div style="height:64px;border:1px solid var(--ve-border);border-radius:var(--ve-radius);background:${v}"></div><p class="ve-eyebrow" style="margin-top:8px">${k}<br>${v}</p></div>`).join('')}
    </div>
  </section>
</main>
</body></html>`;
}

export interface RenderedDesignSystem {
  dir: string;
  html: string;
  css: string;
  tokens: string;
  components: string;
  design: string;
  files: string[];
}

export function renderDesignSystem(ad: ArtDirection, outDir: string): RenderedDesignSystem {
  const dir = ensureDir(outDir);
  const fontsDir = ensureDir(path.join(dir, 'fonts'));
  for (const font of ad.fonts) {
    const src = path.join(PACKAGE_ROOT, 'library', 'fonts', font.file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(fontsDir, font.file));
  }
  for (const license of fs.readdirSync(path.join(PACKAGE_ROOT, 'library', 'fonts')).filter((f) => f.startsWith('OFL-'))) {
    fs.copyFileSync(path.join(PACKAGE_ROOT, 'library', 'fonts', license), path.join(fontsDir, license));
  }
  const css = artDirectionCss(ad, './fonts');
  const files = [
    path.join(dir, 'index.html'), path.join(dir, 'design-system.css'), path.join(dir, 'tokens.json'),
    path.join(dir, 'components.html'), path.join(dir, 'DESIGN.md'),
  ];
  fs.writeFileSync(files[0], demoHtml(ad), 'utf8');
  fs.writeFileSync(files[1], css, 'utf8');
  fs.writeFileSync(files[2], JSON.stringify(ad.tokenSet, null, 2) + '\n', 'utf8');
  fs.writeFileSync(files[3], demoHtml(ad).replace('Abrir sistema', 'Componentes').replace('Ver tokens', 'Descargar tokens'), 'utf8');
  fs.writeFileSync(files[4], designMarkdown(ad), 'utf8');
  return { dir, html: files[0], css: files[1], tokens: files[2], components: files[3], design: files[4], files };
}
