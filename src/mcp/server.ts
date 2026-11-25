import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  opAdapters,
  opAnalyze,
  opApplyEffect,
  opCapture,
  opCompare,
  opDepsPlan,
  opDoctor,
  opExtractFrames,
  opGetEffect,
  opInstallDeps,
  opListEffects,
  opReview,
  opScaffold,
  opVersion,
} from '../core/ops.js';
import { capabilityCatalog } from '../core/deps.js';
import {
  opBackups,
  opCamera,
  opDetectEffects,
  opInspect,
  opIterate,
  opRecommend,
  opRestoreBackup,
  opSpec,
  opTemporal,
  opTimeline,
  opVision,
  opCompose,
  opReferenceEffects,
  opBenchmark,
  opArtDirection,
  opMotionDirector,
  opReferenceDesign,
  opShowcase,
} from '../core/advanced.js';
import {
  opIntelligence,
  opDebug,
  opSmartEffects,
  opContext,
  opGate,
  opLoop,
  opLoops,
  opRestoreLoop,
} from '../core/intelligence-ops.js';

const json = (v: unknown) => JSON.stringify(v, null, 2);

function ok(value: unknown) {
  return { content: [{ type: 'text' as const, text: typeof value === 'string' ? value : json(value) }] };
}

function fail(e: unknown) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }],
    isError: true,
  };
}

const INSTRUCTIONS = `Visual Engine eleva la calidad visual de proyectos creados por agentes.

Ciclo obligatorio cuando el usuario pida calidad visual avanzada:
1. visual_doctor → comprobar herramientas reales antes de prometer nada.
2. visual_analyze → medir la referencia (paleta, luminancia, contraste, movimiento, cortes).
3. Diseñar/ajustar sin genéricos: usa visual_effects_list y visual_effect_apply para partir de una base con intención.
4. visual_capture → capturar el proyecto real (varios fotogramas para animación).
5. visual_review → puntuación de fidelidad, mapa de calor y correcciones priorizadas.
6. Aplicar SOLO las correcciones medidas y repetir la revisión para comparar la puntuación.

Referencias profesionales (0.2):
- visual_timeline → escenas, fotogramas clave y storyboard.
- visual_camera → desplazamiento, zoom, rotación, aceleración y transiciones (verificado/estimado).
- visual_inspect → composición, formas, regiones de texto y profundidad (proxy declarado).
- visual_effects_detect → efectos con evidencia numérica y estado.
- visual_spec → especificación estructurada para reconstruir.
- visual_recommend → tecnología y código verificado por efecto.
- visual_temporal → comparación por tiempo y calidad multidimensional.
- visual_iterate → aplica un cambio del agente, mide y revierte si empeora (requiere confirm).

Composición y biblioteca (0.3):
- visual_effects_list / visual_effect_apply → 58 efectos con código, parámetros e instrucciones.
- visual_compose → valida/renderiza una composición JSON con capas, máscaras, mezclas y timeline.
- visual_reference_effects → convierte una especificación medida en composición y código; cada asignación declara si es verified o estimated.
- visual_benchmark → mide FPS, frame time, heap y carga en Chromium.
- visual_vision con action=setup → detecta VRAM y modelo recomendado; instalar requiere install=true.

Art Director y diseño (0.4):
- visual_art_direction → 15 estilos, tokens DTCG, tipografía, materiales, selección de efectos y CSS.
- visual_reference_design → imagen o especificación → identidad, layout, componentes, motion y código; separa medido de estimado.
- visual_motion_director → recetas de movimiento, cámara, reduced motion y validación de rotación/transición.
- visual_showcase → genera y mide 20 composiciones completas en Chromium.

Visual Intelligence Loop (0.5):
- visual_context → carga sólo las herramientas/recetas necesarias; el informe es compacto.
- visual_debug → selectores, regiones, CSS, capas, animaciones y archivo fuente verificado.
- visual_critic → defectos con evidencia, gravedad, confianza y corrección priorizada.
- visual_fidelity → fidelidad estructural por dimensiones, sin confundirla con píxeles.
- visual_gate → aceptación; un defecto crítico bloquea aunque la media sea alta.
- visual_smart_effects → selección contextual; no añade efectos indiscriminadamente.
- visual_loop → copia, aplica un cambio del agente, mide, conserva o revierte con límites.
- visual_loops → historial y restauración de copias.

Reglas:
- Distingue siempre "verified" de "estimated": el OCR/objetos necesitan Tesseract o un modelo local; si no están, dilo.
- No declares un módulo funcionando sin haber ejecutado la herramienta.
- No añadas efectos que suban el coste sin mejorar la puntuación de fidelidad.
- Respeta licencias: GSAP Club, Remotion (umbral de empresa) y React Bits CC-BY requieren atención.
- Nada de APIs de pago: todo funciona en local.`;

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'visual-engine', version: opVersion().version },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    'visual_doctor',
    {
      title: 'Detectar herramientas visuales',
      description: 'Comprueba de verdad qué herramientas están instaladas (ffmpeg, Playwright con navegadores, GSAP, Three.js, Motion, Remotion) y qué falta para una capacidad.',
      inputSchema: {
        project: z.string().optional().describe('Directorio del proyecto (por defecto, el actual).'),
        capabilities: z.array(z.string()).optional().describe(`Capacidades a planificar. Catálogo: ${capabilityCatalog().map((c) => c.id).join(', ')}`),
      },
    },
    async (args) => {
      try {
        const r = await opDoctor(args);
        return ok({
          projectDir: r.projectDir,
          ready: `${r.ready}/${r.total}`,
          tools: r.tools.map((t) => ({ id: t.id, disponible: t.available, version: t.version || null, origen: t.source, licencia: t.license, nota: t.freeNote, detalle: t.detail })),
          instalar: r.install,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_analyze',
    {
      title: 'Analizar referencia visual',
      description: 'Extrae el perfil medido de una imagen o vídeo: paleta dominante, luminancia, contraste, saturación, colorido, densidad de detalle, movimiento y cortes.',
      inputSchema: {
        paths: z.array(z.string()).min(1).describe('Rutas a imágenes o vídeos de referencia.'),
        samples: z.number().int().min(2).max(40).optional().describe('Fotogramas a muestrear en vídeo (por defecto 8).'),
        outDir: z.string().optional().describe('Carpeta donde guardar los perfiles JSON.'),
      },
    },
    async (args) => {
      try {
        const r = await opAnalyze({ paths: args.paths, samples: args.samples, outDir: args.outDir });
        return ok(r.map((x) => ({ path: x.path, resumen: x.description, perfil: x.profile })));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_extract_frames',
    {
      title: 'Extraer fotogramas',
      description: 'Extrae fotogramas reales de un vídeo con FFmpeg para estudiar movimientos, transiciones y composición.',
      inputSchema: {
        path: z.string().describe('Vídeo o imagen de origen.'),
        outDir: z.string().optional(),
        count: z.number().int().min(1).max(300).optional(),
        fps: z.number().positive().optional(),
        width: z.number().int().min(64).max(4096).optional(),
      },
    },
    async (args) => {
      try {
        const r = await opExtractFrames(args);
        return ok({ outDir: r.outDir, archivos: r.files, media: r.info });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_capture',
    {
      title: 'Capturar el proyecto real',
      description: 'Abre una URL, HTML o carpeta servida en Chromium, captura fotogramas y devuelve el perfil visual medido, los errores de consola y las peticiones fallidas.',
      inputSchema: {
        target: z.string().describe('URL, ruta a HTML o ruta relativa cuando se usa serveDir.'),
        serveDir: z.string().optional().describe('Carpeta a servir en localhost antes de capturar.'),
        width: z.number().int().min(320).max(3840).optional(),
        height: z.number().int().min(240).max(2160).optional(),
        frames: z.number().int().min(1).max(30).optional().describe('Número de capturas para medir animación.'),
        intervalMs: z.number().int().min(50).max(10_000).optional(),
        waitMs: z.number().int().min(0).max(20_000).optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opCapture(args as any);
        return ok({
          url: r.url,
          titulo: r.title,
          ok: r.ok,
          capturas: r.frames,
          erroresConsola: r.consoleErrors,
          erroresRed: r.errors,
          resumen: r.description,
          perfil: r.profile,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_compare',
    {
      title: 'Comparar referencia y resultado',
      description: 'Compara dos archivos (imagen o vídeo) y devuelve puntuación de fidelidad, diferencias por métrica, ΔE de paleta, correcciones priorizadas y, si son imágenes, mapa de calor.',
      inputSchema: {
        reference: z.string().describe('Imagen o vídeo de referencia.'),
        candidate: z.string().describe('Imagen o vídeo del resultado.'),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opCompare(args);
        return ok({
          referencia: r.reference,
          candidato: r.candidate,
          puntuacion: r.comparison.score,
          nota: r.comparison.grade,
          resumen: r.comparison.summary,
          metricas: r.comparison.metrics,
          paleta: r.comparison.palette,
          correcciones: r.comparison.recommendations,
          imagen: r.image,
          mapaDeCalor: r.heatmap,
          avisos: r.warnings,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_review',
    {
      title: 'Revisión visual completa',
      description: 'Ciclo completo: analiza la referencia, sirve y captura el proyecto, compara y escribe informe Markdown/JSON con mapa de calor y correcciones priorizadas.',
      inputSchema: {
        reference: z.string().describe('Imagen o vídeo de referencia.'),
        target: z.string().optional().describe('URL o HTML del proyecto.'),
        targetDir: z.string().optional().describe('Carpeta del proyecto a servir.'),
        width: z.number().int().min(320).max(3840).optional(),
        height: z.number().int().min(240).max(2160).optional(),
        frames: z.number().int().min(1).max(30).optional(),
        intervalMs: z.number().int().min(50).max(10_000).optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opReview(args);
        return ok({
          puntuacion: r.score,
          nota: r.grade,
          resumen: r.comparison.summary,
          correcciones: r.comparison.recommendations,
          metricas: r.comparison.metrics,
          paleta: r.comparison.palette,
          calidad: r.quality,
          imagen: r.image,
          capturas: r.target.frames,
          erroresConsola: r.target.consoleErrors,
          mapaDeCalor: r.heatmap,
          informe: r.report,
          avisos: r.warnings,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_effects_list',
    {
      title: 'Listar biblioteca de efectos',
      description: 'Lista los efectos profesionales reutilizables con motor, dependencias, rendimiento y parámetros.',
      inputSchema: {
        category: z.string().optional(),
        query: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return ok(opListEffects(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_effect_get',
    {
      title: 'Ver un efecto',
      description: 'Devuelve la ficha completa de un efecto: parámetros, archivos, rendimiento y licencia.',
      inputSchema: { id: z.string() },
    },
    async (args) => {
      try {
        return ok(opGetEffect(args.id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_effect_apply',
    {
      title: 'Aplicar un efecto',
      description: 'Escribe un efecto reutilizable listo para servir, con los parámetros indicados. Devuelve la ruta de entrada y los archivos generados.',
      inputSchema: {
        id: z.string(),
        outDir: z.string().describe('Carpeta del proyecto donde escribir el efecto.'),
        params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      },
    },
    async (args) => {
      try {
        return ok(opApplyEffect(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_adapters',
    {
      title: 'Adaptadores de herramientas',
      description: 'Lista los adaptadores integrados (GSAP, Three.js, Motion, Remotion, React Bits, Playwright, FFmpeg) con su licencia y límites gratuitos.',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(opAdapters());
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_scaffold',
    {
      title: 'Generar integración de herramienta',
      description: 'Genera archivos de integración reales para una herramienta y comprueba la sintaxis de los JS con node --check.',
      inputSchema: {
        adapter: z.string().describe('gsap | three | motion | remotion | react-bits | playwright | ffmpeg'),
        outDir: z.string(),
        write: z.boolean().optional().describe('false para sólo previsualizar.'),
      },
    },
    async (args) => {
      try {
        return ok(await opScaffold(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_deps_plan',
    {
      title: 'Planificar dependencias',
      description: 'Traduce capacidades (web-animation, webgl-3d, video-processing, browser-capture, programmatic-render, react-components) a herramientas presentes y ausentes.',
      inputSchema: {
        capabilities: z.array(z.string()).optional(),
        project: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return ok(await opDepsPlan(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_install_deps',
    {
      title: 'Instalar dependencias gratuitas',
      description: 'Instala paquetes npm gratuitos en el proyecto con el gestor detectado. Requiere confirm=true.',
      inputSchema: {
        packages: z.array(z.string()).min(1),
        project: z.string().optional(),
        confirm: z.boolean(),
        dryRun: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return ok(await opInstallDeps(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_timeline',
    {
      title: 'Línea temporal de vídeo',
      description: 'Detecta escenas reales con FFmpeg, muestrea métricas por fotograma, elige fotogramas clave y puede exportar un storyboard PNG.',
      inputSchema: {
        path: z.string().describe('Vídeo de referencia.'),
        samples: z.number().int().min(6).max(60).optional().describe('Muestras temporales (por defecto 20).'),
        outDir: z.string().optional().describe('Carpeta para timeline.json y el storyboard.'),
        storyboard: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opTimeline(args);
        return ok({ timeline: r.timeline, resumen: r.description, storyboard: r.storyboard, json: r.json });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_camera',
    {
      title: 'Movimiento de cámara',
      description: 'Mide desplazamiento global, zoom y rotación entre fotogramas por correlación, con confianza, aceleración, temblor y transiciones. Separa pares verificados de estimados.',
      inputSchema: {
        path: z.string().describe('Vídeo de referencia.'),
        samples: z.number().int().min(6).max(30).optional(),
        width: z.number().int().min(64).max(320).optional(),
      },
    },
    async (args) => {
      try {
        const r = await opCamera(args);
        return ok({ camara: r.camera, resumen: r.description });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_inspect',
    {
      title: 'Composición, formas, texto y profundidad',
      description: 'Mide composición (tercios, equilibrio, simetría, horizonte), detecta círculos y líneas, localiza regiones de texto (estimadas sin OCR), regiones salientes y un proxy de profundidad. Declara qué es verificado y qué estimado.',
      inputSchema: {
        path: z.string().describe('Imagen o vídeo.'),
        frames: z.number().int().min(1).max(6).optional(),
        ocr: z.boolean().optional().describe('Intenta OCR con Tesseract si está instalado.'),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opInspect(args);
        return ok({ contenido: r.content, resumen: r.description, ocr: r.ocr });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_effects_detect',
    {
      title: 'Detectar efectos visuales',
      description: 'Detecta glow/bloom, partículas, desenfoque, parallax, glitch, iluminación, reflejos, distorsión y grano con evidencia numérica, confianza y estado verified/estimated. La etiqueta es una interpretación de la señal medida.',
      inputSchema: {
        path: z.string().describe('Vídeo de referencia.'),
        samples: z.number().int().min(4).max(16).optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opDetectEffects(args);
        return ok({ efectos: r.report, resumen: r.description, json: r.json });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_spec',
    {
      title: 'Especificación visual estructurada',
      description: 'Combina perfil, línea temporal, cámara, composición y efectos en una especificación JSON+Markdown: escenas, paleta con roles, tipografía estimada, capas, efectos con parámetros, stack y plan de verificación.',
      inputSchema: {
        path: z.string().describe('Vídeo de referencia.'),
        samples: z.number().int().min(8).max(24).optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opSpec(args);
        return ok({ especificacion: r.spec, rutas: r.paths, resumen: r.description });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_recommend',
    {
      title: 'Tecnología y código por efecto',
      description: 'Devuelve la tecnología recomendada, el motivo, el coste y snippets reales (CSS/JS/GLSL) generados con los parámetros medidos. Los snippets JS se validan con node --check.',
      inputSchema: {
        effect: z.string().optional().describe('glow, bloom, particles, blur, parallax, glitch, lighting, reflections, distortion, grain'),
        specFile: z.string().optional().describe('spec.json para recomendar todos sus efectos.'),
        params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      },
    },
    async (args) => {
      try {
        return ok(await opRecommend(args as any));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_temporal',
    {
      title: 'Comparación temporal',
      description: 'Compara referencia y resultado por tiempo normalizado: curva de luminancia, movimiento, cortes alineados, deriva y calidad por dimensiones (fidelidad, composición, jerarquía, animación, fluidez y rendimiento si hay tiempos).',
      inputSchema: {
        reference: z.string(),
        candidate: z.string(),
        samples: z.number().int().min(6).max(24).optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return ok(await opTemporal(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_vision',
    {
      title: 'Visión local opcional',
      description: 'Comprueba Tesseract/Ollama locales, ejecuta OCR real o describe una imagen con un modelo de visión de Ollama. Nunca usa APIs externas; si falta el modelo, devuelve el motivo.',
      inputSchema: {
        action: z.enum(['status', 'describe', 'ocr', 'setup']),
        path: z.string().optional(),
        model: z.string().optional(),
        prompt: z.string().optional(),
        install: z.boolean().optional().describe('Para setup: descarga el modelo recomendado si es true.'),
      },
    },
    async (args) => {
      try {
        return ok(await opVision(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_iterate',
    {
      title: 'Iterar con verificación y reversión',
      description: 'Aplica un reemplazo o un parche git del agente sobre el proyecto, hace copia de seguridad, revisa antes y después, y revierte automáticamente si la puntuación no mejora. Requiere confirm=true porque escribe archivos.',
      inputSchema: {
        projectDir: z.string().optional(),
        target: z.string().describe('Archivo objetivo relativo al proyecto.'),
        reference: z.string(),
        targetDir: z.string().optional(),
        patchFile: z.string().optional(),
        replaceFile: z.string().optional(),
        width: z.number().int().min(320).max(3840).optional(),
        height: z.number().int().min(240).max(2160).optional(),
        frames: z.number().int().min(1).max(30).optional(),
        minDelta: z.number().min(0).max(100).optional(),
        keep: z.boolean().optional(),
        confirm: z.boolean().describe('Debe ser true: la operación escribe en el proyecto.'),
      },
    },
    async (args) => {
      try {
        if (args.confirm !== true) return fail(new Error('Iteración no confirmada: envía confirm=true.'));
        return ok(await opIterate(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_backup',
    {
      title: 'Copias de seguridad de iteraciones',
      description: 'Lista las iteraciones con sus puntuaciones o restaura los archivos de una iteración concreta.',
      inputSchema: {
        action: z.enum(['list', 'restore']),
        project: z.string().optional(),
        id: z.string().optional(),
      },
    },
    async (args) => {
      try {
        if (args.action === 'list') return ok(opBackups(args.project));
        if (!args.id) return fail(new Error('Indica el id de la iteración.'));
        return ok(opRestoreBackup(args.project, args.id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_compose',
    {
      title: 'Componer capas de efectos',
      description: 'Valida y renderiza una composición JSON 0.3: capas, parámetros compartidos, mezclas, máscaras, transformaciones y curvas de animación. Genera HTML autónomo y composition.json.',
      inputSchema: {
        composition: z.record(z.any()).optional().describe('Objeto de composición; si falta, usa file.'),
        file: z.string().optional().describe('Ruta a un composition.json.'),
        outDir: z.string().optional().describe('Directorio de salida.'),
        validateOnly: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return ok(await opCompose(args as any));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_reference_effects',
    {
      title: 'Referencia visual → efectos y composición',
      description: 'Analiza un vídeo de referencia, mapea las señales detectadas a efectos de la biblioteca y genera composición, timeline y código. Declara cada asignación como verified o estimated; no afirma identificación exacta.',
      inputSchema: {
        path: z.string().optional().describe('Vídeo de referencia.'),
        specFile: z.string().optional().describe('Especificación ya generada (spec.json).'),
        outDir: z.string().optional(),
        vision: z.boolean().optional().describe('Ejecuta OCR y descripción local si están disponibles.'),
        model: z.string().optional(),
        render: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const r = await opReferenceEffects(args);
        return ok({ mapping: r.mapping, coverage: r.coverage, warnings: r.warnings, composition: r.composition, rendered: r.rendered });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_benchmark',
    {
      title: 'Medir rendimiento de efectos',
      description: 'Mide FPS reales con requestAnimationFrame, frame time medio/P95, heap JS y tiempo de carga en Chromium headless. Escribe library/benchmarks.json y un informe Markdown.',
      inputSchema: {
        effects: z.array(z.string()).optional(),
        ms: z.number().int().min(300).max(4000).optional(),
        width: z.number().int().min(320).max(1920).optional(),
        height: z.number().int().min(240).max(1080).optional(),
        outFile: z.string().optional(),
        docsFile: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return ok(await opBenchmark(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'visual_art_direction',
    {
      title: 'Dirección artística y sistema de diseño',
      description: 'Convierte un brief en identidad, paleta semántica, tipografía modular, espaciado, materiales, selección de efectos, tokens DTCG, auditoría estructural y CSS. Ofrece 15 estilos diferenciados.',
      inputSchema: {
        brief: z.string().describe('Brief o descripción del proyecto.'),
        style: z.string().optional().describe('Estilo: minimal-premium, cinematic, futuristic, sci-fi, cyberpunk, glassmorphism, neumorphism, editorial, brutalism, game-ui, professional-app, financial-dashboard, immersive-3d, motion-graphics, organic-natural.'),
        projectType: z.string().optional().describe('landing, dashboard, app, game, editorial, motion...'),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try { return ok(opArtDirection(args)); } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    'visual_reference_design',
    {
      title: 'Reference-to-Design',
      description: 'Analiza una imagen o vídeo de referencia y produce identidad, tokens, paleta con roles, aproximación tipográfica, layout, capas, materiales, componentes, motion, efectos y código. Separa explícitamente lo medido de lo estimado.',
      inputSchema: {
        path: z.string().optional().describe('Imagen o vídeo de referencia.'),
        specFile: z.string().optional().describe('Especificación visual JSON ya medida.'),
        style: z.string().optional(),
        brief: z.string().optional(),
        outDir: z.string().optional(),
        vision: z.boolean().optional().describe('Ejecuta OCR local; no identifica fuentes.'),
        model: z.string().optional(),
      },
    },
    async (args) => {
      try { return ok(await opReferenceDesign(args)); } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    'visual_motion_director',
    {
      title: 'Motion Director',
      description: 'Genera recetas de microinteracción, entrada/salida, transición, coreografía y cámara con CSS/GSAP/Motion, reduced motion y validación medida de rotación y transición.',
      inputSchema: {
        style: z.string().optional(),
        brief: z.string().optional(),
        projectType: z.string().optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => {
      try { return ok(opMotionDirector(args)); } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    'visual_showcase',
    {
      title: 'Composiciones completas',
      description: 'Genera 20 composiciones reutilizables con los estilos de 0.4 y mide en Chromium FPS, carga, overflow, contraste, fuentes, interacción y errores. Usa measure=true para ejecutar la medición.',
      inputSchema: {
        outDir: z.string().optional(),
        ids: z.array(z.string()).optional(),
        measure: z.boolean().optional(),
      },
    },
    async (args) => {
      try { return ok(await opShowcase(args)); } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    'visual_context',
    {
      title: 'Contexto selectivo para agentes',
      description: 'Clasifica la tarea y devuelve sólo las herramientas, recetas y documentos necesarios. Evita enviar los 58 efectos y toda la documentación al contexto.',
      inputSchema: {
        task: z.string().describe('Tarea o brief.'),
        maxTools: z.number().int().min(2).max(8).optional(),
        maxRecipes: z.number().int().min(0).max(5).optional(),
        style: z.string().optional(),
        projectType: z.string().optional(),
        clearCache: z.boolean().optional(),
      },
    },
    async (args) => { try { return ok(opContext(args)); } catch (e) { return fail(e); } },
  );

  server.registerTool(
    'visual_debug',
    {
      title: 'Visual Debugger',
      description: 'Inspecciona el DOM real: selectores, cajas, regiones, CSS computado, capas, animaciones, contraste, overflow, canvas y correspondencia con archivos fuente sólo si la cadena aparece de verdad.',
      inputSchema: {
        target: z.string().optional().describe('HTML relativo a targetDir o URL.'),
        targetDir: z.string().optional(),
        width: z.number().int().min(320).max(3840).optional(),
        height: z.number().int().min(240).max(2160).optional(),
        waitMs: z.number().int().min(0).max(15000).optional(),
        outDir: z.string().optional(),
        sourceRoot: z.string().optional(),
      },
    },
    async (args) => { try { return ok(await opDebug(args)); } catch (e) { return fail(e); } },
  );

  server.registerTool(
    'visual_critic',
    {
      title: 'Visual Critic',
      description: 'Detecta diseño plano, falta de profundidad, movimiento rígido, efectos ausentes, composición/jerarquía, tipografía, coherencia, materiales/luz, transiciones, accesibilidad y rendimiento. Cada hallazgo incluye evidencia, ubicación, gravedad, confianza y corrección.',
      inputSchema: {
        reference: z.string(),
        target: z.string().optional(),
        targetDir: z.string().optional(),
        brief: z.string().optional(),
        style: z.string().optional(),
        projectType: z.string().optional(),
        specFile: z.string().optional(),
        outDir: z.string().optional(),
        frames: z.number().int().min(1).max(30).optional(),
        width: z.number().int().min(320).max(3840).optional(),
        height: z.number().int().min(240).max(2160).optional(),
        humanApproval: z.object({ approved: z.boolean().optional(), reviewer: z.string().optional(), note: z.string().optional() }).optional(),
        gates: z.record(z.any()).optional(),
      },
    },
    async (args) => { try { return ok(await opIntelligence(args)); } catch (e) { return fail(e); } },
  );

  server.registerTool(
    'visual_fidelity',
    {
      title: 'Reference Fidelity Engine',
      description: 'Mide posición/proporción, tipografía, materiales, iluminación, profundidad, efectos, movimiento, ritmo, transiciones y coherencia entre fotogramas. Devuelve la similitud de píxeles aparte y no la usa como calidad artística.',
      inputSchema: {
        reference: z.string(),
        target: z.string().optional(),
        targetDir: z.string().optional(),
        brief: z.string().optional(),
        specFile: z.string().optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => { try { return ok(await opIntelligence(args)); } catch (e) { return fail(e); } },
  );

  server.registerTool(
    'visual_gate',
    {
      title: 'Quality Gates',
      description: 'Evalúa fidelidad, calidad, composición, tipografía, accesibilidad, rendimiento, funcionamiento, regresiones y aprobación humana. Un defecto crítico bloquea aunque la puntuación media sea alta.',
      inputSchema: {
        from: z.string().optional().describe('intelligence.json, review.json o gates.json.'),
        config: z.record(z.any()).optional(),
        humanApproval: z.object({ approved: z.boolean().optional(), reviewer: z.string().optional(), note: z.string().optional() }).optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => { try { return ok(opGate(args)); } catch (e) { return fail(e); } },
  );

  server.registerTool(
    'visual_smart_effects',
    {
      title: 'Selección contextual de efectos',
      description: 'Elige efectos por brief, estilo, tipo de proyecto y señales de referencia. Respeta el minimalismo, limita el presupuesto y no devuelve los 58 al contexto.',
      inputSchema: {
        brief: z.string(),
        style: z.string().optional(),
        projectType: z.string().optional(),
        maxEffects: z.number().int().min(0).max(3).optional(),
        intensity: z.enum(['restrained', 'balanced', 'expressive']).optional(),
        allowDecorative: z.boolean().optional(),
        referenceSignals: z.array(z.object({ id: z.string().optional(), category: z.string().optional(), confidence: z.number().min(0).max(1).optional() })).optional(),
        outDir: z.string().optional(),
      },
    },
    async (args) => { try { return ok(opSmartEffects(args)); } catch (e) { return fail(e); } },
  );

  server.registerTool(
    'visual_loop',
    {
      title: 'Autonomous Improvement Loop',
      description: 'Analiza, inspecciona, hace copia, aplica un reemplazo/parche del agente, vuelve a capturar, compara y conserva o revierte. Límites de iteraciones, tiempo y tokens estimados. Sin cambio devuelve awaiting-agent.',
      inputSchema: {
        projectDir: z.string().optional(),
        targetDir: z.string().optional(),
        target: z.string().optional(),
        reference: z.string(),
        brief: z.string(),
        style: z.string().optional(),
        projectType: z.string().optional(),
        changes: z.array(z.object({ replaceFile: z.string().optional(), patchFile: z.string().optional() })).optional(),
        replaceFile: z.string().optional(),
        patchFile: z.string().optional(),
        limits: z.object({
          maxIterations: z.number().int().min(1).max(10).optional(),
          maxMinutes: z.number().min(1).max(120).optional(),
          maxTokenBudget: z.number().int().min(500).max(200000).optional(),
          minQualityDelta: z.number().min(0).max(100).optional(),
          minFidelityDelta: z.number().min(0).max(100).optional(),
        }).optional(),
        gates: z.record(z.any()).optional(),
        humanApproval: z.object({ approved: z.boolean().optional(), reviewer: z.string().optional(), note: z.string().optional() }).optional(),
        outDir: z.string().optional(),
        confirm: z.boolean().describe('Obligatorio si se aportan cambios: escribe archivos.'),
      },
    },
    async (args) => { try { return ok(await opLoop(args)); } catch (e) { return fail(e); } },
  );

  server.registerTool(
    'visual_loops',
    {
      title: 'Historial de loops',
      description: 'Lista los loops con estado, objetivo y tokens estimados, o restaura la copia de una iteración conservada.',
      inputSchema: {
        action: z.enum(['list', 'restore']),
        project: z.string().optional(),
        id: z.string().optional(),
        outDir: z.string().optional().describe('Directorio del loop si se ejecutó con --out personalizado.'),
      },
    },
    async (args) => {
      try {
        if (args.action === 'list') return ok(opLoops(args.project));
        if (!args.id) return fail(new Error('Indica el id del loop.'));
        return ok(opRestoreLoop(args.project, args.id, args.outDir));
      } catch (e) { return fail(e); }
    },
  );

  server.registerResource(
    'effects',
    'visual://effects',
    { title: 'Biblioteca de efectos', description: 'Efectos reutilizables con parámetros y rendimiento declarado.', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: json(opListEffects()) }],
    }),
  );

  server.registerPrompt(
    'visual-quality-review',
    {
      title: 'Revisión de calidad visual',
      description: 'Guía al agente para revisar y mejorar un proyecto contra una referencia real.',
      argsSchema: {
        reference: z.string().describe('Ruta de la referencia'),
        target: z.string().describe('URL o carpeta del proyecto'),
      },
    },
    ({ reference, target }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Revisa la calidad visual de ${target} contra la referencia ${reference}.
1. Ejecuta visual_doctor y no prometas herramientas que falten.
2. Ejecuta visual_review con frames >= 6.
3. Lee las correcciones priorizadas y aplica sólo las que suban la fidelidad.
4. Repite visual_review y muestra la puntuación antes/después.
5. Indica qué queda pendiente y qué no se pudo medir.`,
          },
        },
      ],
    }),
  );

  return server;
}

/** Arranca el servidor MCP por stdio (transporte que usan Codex, Claude Code, Cursor...). */
export async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('visual-engine MCP listo (stdio)\n');
}
