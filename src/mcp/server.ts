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

Reglas:
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
