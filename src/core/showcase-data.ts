export type ShowcaseArchetype =
  | 'landing' | 'dashboard' | 'app' | 'hud' | 'game-menu'
  | 'editorial' | 'motion' | 'scene3d' | 'mobile' | 'poster';

export interface ShowcaseSpec {
  id: string;
  title: string;
  style: string;
  projectType: string;
  archetype: ShowcaseArchetype;
  brief: string;
  kicker: string;
  headline: string;
  lead: string;
  primary: string;
  secondary: string;
  nav: string[];
  metrics: { label: string; value: string; delta?: string }[];
  tags: string[];
  effects: [string, string];
  series?: number[];
}

export const SHOWCASE_SPECS: ShowcaseSpec[] = [
  {
    id: 'lumen', title: 'Lumen', style: 'minimal-premium', projectType: 'landing', archetype: 'landing',
    brief: 'Landing de estudio de arquitectura con luz natural y materialidad',
    kicker: 'Estudio de arquitectura · 2026', headline: 'La luz construye el espacio.',
    lead: 'Diseñamos viviendas donde la materia, la sombra y el tiempo forman una sola estructura.',
    primary: 'Ver proyectos', secondary: 'Agendar visita', nav: ['Estudio', 'Proyectos', 'Proceso', 'Contacto'],
    metrics: [{ label: 'Proyectos', value: '38' }, { label: 'Años', value: '12' }, { label: 'Premios', value: '06' }],
    tags: ['Vivienda', 'Interiorismo', 'Paisaje'], effects: ['mesh-gradient', 'dust-motes'], series: [28, 42, 36, 58, 52, 70, 64],
  },
  {
    id: 'nocturne', title: 'Nocturne', style: 'cinematic', projectType: 'landing', archetype: 'landing',
    brief: 'Sitio de estreno de un documental nocturno con grano y scope 2.39',
    kicker: 'Un documental de Ana Vidal', headline: 'La ciudad después del último tren.',
    lead: 'Cinco noches, cuatro barrios y las voces que sostienen la madrugada. Estreno en salas seleccionadas.',
    primary: 'Ver trailer', secondary: 'Funciones', nav: ['Película', 'Sesiones', 'Prensa', 'Entradas'],
    metrics: [{ label: 'Duración', value: '94 min' }, { label: 'Formato', value: '2.39:1' }, { label: 'Año', value: '2026' }],
    tags: ['Documental', 'Estreno', 'Sesión especial'], effects: ['anamorphic-bloom', 'dissolve-grain'], series: [10, 18, 14, 36, 28, 48, 62],
  },
  {
    id: 'orbital', title: 'Orbital', style: 'futuristic', projectType: 'dashboard', archetype: 'dashboard',
    brief: 'Panel de operaciones para una red de infraestructura orbital',
    kicker: 'Orbital Network · Control', headline: 'Red estable. Ventana abierta.',
    lead: 'Telemetría de 48 nodos, latencia agregada y estado de la constelación.',
    primary: 'Abrir consola', secondary: 'Descargar informe', nav: ['Red', 'Nodos', 'Alertas', 'Configuración'],
    metrics: [{ label: 'Nodos activos', value: '47/48', delta: '+2' }, { label: 'Latencia P95', value: '38 ms', delta: '-6' }, { label: 'Paquetes', value: '99,98 %' }, { label: 'Ventana', value: '04:12' }],
    tags: ['LIVE', 'Órbita baja', 'Sector 7'], effects: ['circuit-lines', 'radar-sweep'], series: [34, 30, 42, 39, 55, 48, 66, 60, 72, 68, 78, 74],
  },
  {
    id: 'aegis', title: 'Aegis', style: 'sci-fi', projectType: 'landing', archetype: 'hud',
    brief: 'Interfaz de misión para un simulador de exploración profunda',
    kicker: 'Misión AEGIS · Día 214', headline: 'Más allá del límite cartografiado.',
    lead: 'Sistema de navegación, soporte vital y análisis de muestras en una sola vista.',
    primary: 'Iniciar inmersión', secondary: 'Registro de misión', nav: ['Puente', 'Sonda', 'Laboratorio', 'Tripulación'],
    metrics: [{ label: 'Oxígeno', value: '86 %' }, { label: 'Blindaje', value: '74 %' }, { label: 'Señal', value: '12,4 ua' }, { label: 'Deriva', value: '0,03°' }],
    tags: ['Sonda K-9', 'Análisis activo', 'Sin retorno'], effects: ['wireframe-globe', 'telemetry-grid'], series: [22, 28, 25, 40, 44, 38, 56, 62, 58, 70],
  },
  {
    id: 'neon-district', title: 'Neon District', style: 'cyberpunk', projectType: 'landing', archetype: 'game-menu',
    brief: 'Menú de videojuego de acción en una metrópolis lluviosa',
    kicker: 'Temporada 04 · Distrito 9', headline: 'La ciudad no duerme. Tú tampoco.',
    lead: 'Elige tu ruta, personaliza el implante y entra en el contrato antes de que cierre la ventana.',
    primary: 'Entrar al distrito', secondary: 'Continuar partida', nav: ['Campaña', 'Contratos', 'Personaje', 'Ajustes'],
    metrics: [{ label: 'Nivel', value: '27' }, { label: 'Créditos', value: '18.420' }, { label: 'Reputación', value: 'A-' }],
    tags: ['Contrato activo', 'Riesgo alto', 'Recompensa 4.800'], effects: ['glitch-slices', 'neon-rim'], series: [60, 44, 72, 38, 56, 80, 46],
  },
  {
    id: 'aether', title: 'Aether', style: 'glassmorphism', projectType: 'landing', archetype: 'landing',
    brief: 'Landing de espacio de trabajo para equipos distribuidos',
    kicker: 'Aether Workspace', headline: 'Todo el equipo. Un solo plano.',
    lead: 'Documentos, decisiones y contexto compartido en una superficie que se adapta a cómo trabaja tu equipo.',
    primary: 'Crear espacio', secondary: 'Ver demo', nav: ['Producto', 'Equipos', 'Precios', 'Entrar'],
    metrics: [{ label: 'Equipos', value: '12k' }, { label: 'Países', value: '41' }, { label: 'Uptime', value: '99,99 %' }],
    tags: ['Sincronización', 'Contexto', 'Sin fricción'], effects: ['glass-refraction', 'bokeh-drift'], series: [30, 38, 34, 46, 42, 58, 54],
  },
  {
    id: 'quiet-form', title: 'Quiet Form', style: 'neumorphism', projectType: 'landing', archetype: 'app',
    brief: 'Aplicación de seguimiento de hábitos con superficies suaves',
    kicker: 'Bienestar · Semana 32', headline: 'Un sistema tranquilo para días exigentes.',
    lead: 'Registra sueño, movimiento y foco sin convertir el cuidado personal en otra tarea.',
    primary: 'Registrar hoy', secondary: 'Ver tendencia', nav: ['Hoy', 'Rutinas', 'Progreso', 'Ajustes'],
    metrics: [{ label: 'Sueño', value: '7 h 42' }, { label: 'Movimiento', value: '48 min' }, { label: 'Foco', value: '3 bloques' }],
    tags: ['Sueño', 'Movimiento', 'Foco'], effects: ['wave-contours', 'caustic-light'], series: [40, 52, 46, 64, 58, 66, 62],
  },
  {
    id: 'folio', title: 'Folio', style: 'editorial', projectType: 'landing', archetype: 'editorial',
    brief: 'Revista independiente de crítica cultural con retícula editorial',
    kicker: 'Folio · Número 18 · Otoño', headline: 'Lo que queda cuando apagamos la pantalla.',
    lead: 'Un ensayo visual sobre la atención, el aburrimiento y las formas de mirar.',
    primary: 'Leer número', secondary: 'Suscribirse', nav: ['En portada', 'Ensayo', 'Archivo', 'Tienda'],
    metrics: [{ label: 'Páginas', value: '132' }, { label: 'Tirada', value: '2.000' }, { label: 'Papel', value: 'Munken' }],
    tags: ['Ensayo', 'Fotografía', 'Entrevista'], effects: ['ink-diffusion', 'dot-matrix'], series: [24, 36, 32, 48, 44, 60, 56],
  },
  {
    id: 'raw-grid', title: 'Raw Grid', style: 'brutalism', projectType: 'landing', archetype: 'mobile',
    brief: 'Aplicación móvil de archivo visual con tipografía cruda',
    kicker: 'RAW / GRID / 2026', headline: 'ARCHIVO SIN CURADURÍA.',
    lead: 'Imágenes, notas y ruido. Busca por fecha, color o accidente.',
    primary: 'Abrir archivo', secondary: 'Importar', nav: ['Todo', 'Color', 'Texto', 'Ruido'],
    metrics: [{ label: 'Elementos', value: '3.284' }, { label: 'Etiquetas', value: '91' }, { label: 'Peso', value: '12 MB' }],
    tags: ['SIN FILTRO', 'LOCAL', 'ABIERTO'], effects: ['dot-matrix', 'glitch-slices'], series: [70, 48, 80, 34, 62, 76, 40],
  },
  {
    id: 'vanguard', title: 'Vanguard', style: 'game-ui', projectType: 'landing', archetype: 'hud',
    brief: 'HUD de escuadrón para un shooter táctico competitivo',
    kicker: 'Ronda 07 · Defensa', headline: 'Mantén la línea.',
    lead: 'Estado de escuadrón, economía y objetivos en tiempo real.',
    primary: 'Desplegar', secondary: 'Cambiar clase', nav: ['Escuadrón', 'Mapa', 'Equipo', 'Rendimiento'],
    metrics: [{ label: 'Vidas', value: '3/4' }, { label: 'Economía', value: '4.250' }, { label: 'Objetivo', value: 'B' }, { label: 'Tiempo', value: '01:12' }],
    tags: ['Alpha', 'Bravo', 'Charlie'], effects: ['target-reticle', 'telemetry-grid'], series: [50, 58, 44, 66, 60, 72, 68],
  },
  {
    id: 'relay', title: 'Relay', style: 'professional-app', projectType: 'landing', archetype: 'app',
    brief: 'Consola de soporte para equipos de operaciones',
    kicker: 'Relay · Bandeja compartida', headline: 'Menos traspasos. Más resolución.',
    lead: 'Prioriza conversaciones, comparte contexto y cierra el bucle con el cliente.',
    primary: 'Abrir bandeja', secondary: 'Ver métricas', nav: ['Bandeja', 'Clientes', 'Macros', 'Calidad'],
    metrics: [{ label: 'Abiertos', value: '18' }, { label: 'T. respuesta', value: '2m 14s' }, { label: 'CSAT', value: '94 %' }],
    tags: ['Alta prioridad', 'Cuenta clave', 'SLA 4h'], effects: ['circuit-lines', 'wave-contours'], series: [44, 38, 52, 48, 60, 56, 68, 64],
  },
  {
    id: 'meridian', title: 'Meridian', style: 'financial-dashboard', projectType: 'landing', archetype: 'dashboard',
    brief: 'Terminal de cartera para inversión sistemática',
    kicker: 'Meridian · Cartera global', headline: 'Exposición bajo control.',
    lead: 'Riesgo, atribución y liquidez con una lectura consistente del mercado.',
    primary: 'Ver posiciones', secondary: 'Exportar', nav: ['Resumen', 'Riesgo', 'Órdenes', 'Informes'],
    metrics: [{ label: 'Valor', value: '€ 8,42 M', delta: '+1,8 %' }, { label: 'Volatilidad', value: '11,2 %', delta: '-0,4' }, { label: 'Sharpe', value: '1,76' }, { label: 'Caja', value: '6,3 %' }],
    tags: ['Renta variable', 'Divisa', 'Renta fija'], effects: ['circuit-lines', 'waveform-monitor'], series: [42, 46, 44, 54, 50, 62, 58, 70, 66, 74, 72, 80],
  },
  {
    id: 'deep-field', title: 'Deep Field', style: 'immersive-3d', projectType: 'landing', archetype: 'scene3d',
    brief: 'Experiencia inmersiva de divulgación astronómica',
    kicker: 'Campo profundo · Coord. 04:22', headline: 'Mira lo que el tiempo dejó atrás.',
    lead: 'Un recorrido espacial por galaxias cuya luz comenzó su viaje antes de que existiera la Tierra.',
    primary: 'Iniciar recorrido', secondary: 'Mapa celeste', nav: ['Recorrido', 'Objetos', 'Escala', 'Fuentes'],
    metrics: [{ label: 'Distancia', value: '13,4 Gal' }, { label: 'Corrimiento', value: 'z 8,2' }, { label: 'Años luz', value: '13.100 M' }],
    tags: ['JWST', 'Infrarrojo', 'Escala log'], effects: ['cube-field', 'starfield-warp'], series: [26, 34, 30, 52, 46, 64, 58],
  },
  {
    id: 'frame-24', title: 'Frame 24', style: 'motion-graphics', projectType: 'landing', archetype: 'motion',
    brief: 'Reel de estudio de motion graphics con timeline visible',
    kicker: 'Frame 24 · Reel 2026', headline: 'El ritmo también es diseño.',
    lead: 'Sistemas de movimiento para marcas que necesitan algo más que una transición.',
    primary: 'Reproducir reel', secondary: 'Casos', nav: ['Reel', 'Trabajo', 'Estudio', 'Contacto'],
    metrics: [{ label: 'Duración', value: '01:24' }, { label: 'FPS', value: '60' }, { label: 'Piezas', value: '12' }],
    tags: ['Dirección', 'Animación', 'Sonido'], effects: ['volumetric-rays', 'bokeh-drift'], series: [18, 26, 22, 46, 38, 58, 50, 66],
  },
  {
    id: 'terra', title: 'Terra', style: 'organic-natural', projectType: 'landing', archetype: 'mobile',
    brief: 'Aplicación de temporada de cultivo y trazabilidad local',
    kicker: 'Terra · Temporada de otoño', headline: 'Comprende tu suelo.',
    lead: 'Humedad, materia orgánica y calendario de siembra en lectura directa desde el campo.',
    primary: 'Registrar parcela', secondary: 'Ver calendario', nav: ['Parcela', 'Suelo', 'Cosecha', 'Comunidad'],
    metrics: [{ label: 'Humedad', value: '42 %' }, { label: 'Materia orgánica', value: '3,8 %' }, { label: 'pH', value: '6,4' }],
    tags: ['Parcela Norte', 'Sin riego', 'Local'], effects: ['caustic-light', 'ink-diffusion'], series: [36, 42, 38, 50, 46, 56, 52],
  },
  {
    id: 'atlas', title: 'Atlas', style: 'glassmorphism', projectType: 'landing', archetype: 'app',
    brief: 'Editor colaborativo de mapas de producto',
    kicker: 'Atlas · Proyecto Onboarding', headline: 'El mapa cambia. El contexto se queda.',
    lead: 'Conecta flujos, decisiones y evidencia en un lienzo compartido.',
    primary: 'Abrir mapa', secondary: 'Compartir', nav: ['Mapa', 'Insights', 'Historial', 'Equipo'],
    metrics: [{ label: 'Flujos', value: '24' }, { label: 'Fuentes', value: '8' }, { label: 'Cambios', value: '126' }],
    tags: ['Onboarding', 'Research', 'En revisión'], effects: ['mesh-gradient', 'glass-refraction'], series: [30, 36, 34, 44, 40, 52, 48],
  },
  {
    id: 'signal', title: 'Signal', style: 'sci-fi', projectType: 'landing', archetype: 'dashboard',
    brief: 'Sala de señales para monitorización de sensores remotos',
    kicker: 'Signal Desk · Array Norte', headline: 'La señal aparece en el ruido.',
    lead: 'Espectrogramas, detección de anomalías y trazabilidad de cada captura.',
    primary: 'Abrir monitor', secondary: 'Calibrar', nav: ['Monitor', 'Sensores', 'Anomalías', 'Registro'],
    metrics: [{ label: 'Canales', value: '32' }, { label: 'SNR', value: '18,6 dB' }, { label: 'Anomalías', value: '03' }, { label: 'Buffer', value: '72 %' }],
    tags: ['Banda L', 'Array 3', 'Sin filtrar'], effects: ['radar-sweep', 'waveform-monitor'], series: [28, 50, 36, 58, 44, 66, 38, 72, 54, 78],
  },
  {
    id: 'mono', title: 'Mono', style: 'brutalism', projectType: 'landing', archetype: 'poster',
    brief: 'Cartel tipográfico para un festival de diseño independiente',
    kicker: 'MONO / FEST / 14—16 NOV', headline: 'SIN ADORNOS.',
    lead: 'Tres días de talleres, crítica y trabajo abierto. Sin patrocinios. Sin escenario principal.',
    primary: 'Reservar plaza', secondary: 'Programa', nav: ['Programa', 'Talleres', 'Sede', 'Entradas'],
    metrics: [{ label: 'Días', value: '03' }, { label: 'Talleres', value: '12' }, { label: 'Aforo', value: '180' }],
    tags: ['DISEÑO', 'CRÍTICA', 'ABIERTO'], effects: ['ink-diffusion', 'dissolve-grain'], series: [50, 50, 50, 50, 50, 50, 50],
  },
  {
    id: 'pulse', title: 'Pulse', style: 'motion-graphics', projectType: 'landing', archetype: 'app',
    brief: 'Reproductor de música con análisis de frecuencia y movimiento',
    kicker: 'Pulse · Sesión en vivo', headline: 'Escucha la estructura.',
    lead: 'Un reproductor que muestra energía, textura y dinámica sin tapar la música.',
    primary: 'Reproducir', secondary: 'Ver cola', nav: ['Ahora', 'Cola', 'Biblioteca', 'Salas'],
    metrics: [{ label: 'BPM', value: '124' }, { label: 'Tonalidad', value: 'Fm' }, { label: 'Duración', value: '06:18' }],
    tags: ['Sesión 04', 'Estéreo', 'Sin pérdida'], effects: ['waveform-monitor', 'starfield-warp'], series: [30, 52, 44, 70, 38, 62, 46, 76, 42, 58],
  },
  {
    id: 'forge', title: 'Forge', style: 'futuristic', projectType: 'landing', archetype: 'game-menu',
    brief: 'Menú de estrategia para un juego de construcción de facciones',
    kicker: 'Forge · Facción Hierro', headline: 'Construye lo que sobrevive.',
    lead: 'Asigna recursos, firma pactos y prepara la próxima expansión.',
    primary: 'Continuar', secondary: 'Nueva facción', nav: ['Campaña', 'Facción', 'Mapa', 'Archivo'],
    metrics: [{ label: 'Recursos', value: '2.840' }, { label: 'Territorios', value: '07' }, { label: 'Pactos', value: '02' }],
    tags: ['Hierro', 'Expansión', 'Turno 42'], effects: ['terrain-grid', 'ember-sparks'], series: [48, 52, 46, 60, 54, 66, 62],
  },
];
