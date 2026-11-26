import http from 'node:http';
import { URL } from 'node:url';
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
import { planInstall, applyInstall, uninstall, repair, inventory, verifyMcpServer } from '../core/installer.js';
import { PROFILES, describeProfile } from '../core/profiles.js';
import { detectActivation, activationSupport } from '../core/activation.js';
import { auditSecurity, isLoopback } from '../core/security.js';
import { recordUsage } from '../core/usage.js';
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

export interface ApiOptions {
  port?: number;
  host?: string;
  /** Permite POST /v1/deps/install. Desactivado por defecto. */
  allowInstall?: boolean;
  /** Permite escuchar fuera de loopback. Desactivado por defecto. */
  allowRemote?: boolean;
}

export interface ApiServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

type Handler = (body: any, query: URLSearchParams, req: http.IncomingMessage) => Promise<unknown>;

const MAX_BODY = 2 * 1024 * 1024;

async function readBody(req: http.IncomingMessage): Promise<any> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('Cuerpo de petición demasiado grande (máx. 2 MB)');
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('JSON inválido en el cuerpo de la petición');
  }
}

/**
 * API local para agentes que no hablan MCP. Sólo escucha en 127.0.0.1.
 * Las operaciones de escritura (instalar paquetes) están desactivadas por defecto.
 */
export async function startApi(opts: ApiOptions = {}): Promise<ApiServer> {
  const allowInstall = opts.allowInstall === true;
  const host = opts.host ?? '127.0.0.1';
  if (!isLoopback(host) && opts.allowRemote !== true) {
    throw new Error(`La API sólo escucha en localhost por defecto (${host}). Usa --allow-remote sólo si asumes el riesgo.`);
  }
  const routes: { method: string; pattern: RegExp; handler: Handler }[] = [
    { method: 'GET', pattern: /^\/v1\/health$/, handler: async () => ({ ok: true, ...opVersion(), install: allowInstall ? 'permitido' : 'bloqueado' }) },
    { method: 'GET', pattern: /^\/v1\/capabilities$/, handler: async () => capabilities() },
    { method: 'GET', pattern: /^\/v1\/effects$/, handler: async (_b, q) => opListEffects({ category: q.get('category') ?? undefined, query: q.get('q') ?? undefined }) },
    { method: 'GET', pattern: /^\/v1\/effects\/([\w-]+)$/, handler: async (_b, _q, _r) => ({}) },
    { method: 'POST', pattern: /^\/v1\/analyze$/, handler: async (b) => opAnalyze({ paths: b.paths ?? (b.path ? [b.path] : []), samples: b.samples, outDir: b.outDir }) },
    { method: 'POST', pattern: /^\/v1\/frames$/, handler: async (b) => opExtractFrames(b) },
    { method: 'POST', pattern: /^\/v1\/capture$/, handler: async (b) => opCapture(b) },
    { method: 'POST', pattern: /^\/v1\/compare$/, handler: async (b) => opCompare(b) },
    { method: 'POST', pattern: /^\/v1\/review$/, handler: async (b) => opReview(b) },
    { method: 'GET', pattern: /^\/v1\/adapters$/, handler: async () => opAdapters() },
    { method: 'POST', pattern: /^\/v1\/scaffold$/, handler: async (b) => opScaffold(b) },
    { method: 'GET', pattern: /^\/v1\/deps$/, handler: async (_b, q) => opDepsPlan({ capabilities: q.get('capabilities')?.split(',').filter(Boolean) }) },
    { method: 'POST', pattern: /^\/v1\/deps\/install$/, handler: async (b) => {
      if (!allowInstall) throw new Error('Instalación desactivada: arranca la API con --allow-install');
      return opInstallDeps({ ...b, confirm: b.confirm === true });
    } },
    { method: 'GET', pattern: /^\/v1\/doctor$/, handler: async (_b, q) => opDoctor({ capabilities: q.get('capabilities')?.split(',').filter(Boolean) }) },
    { method: 'POST', pattern: /^\/v1\/timeline$/, handler: async (b) => opTimeline(b) },
    { method: 'POST', pattern: /^\/v1\/camera$/, handler: async (b) => opCamera(b) },
    { method: 'POST', pattern: /^\/v1\/inspect$/, handler: async (b) => opInspect(b) },
    { method: 'POST', pattern: /^\/v1\/effects\/detect$/, handler: async (b) => opDetectEffects(b) },
    { method: 'POST', pattern: /^\/v1\/spec$/, handler: async (b) => opSpec(b) },
    { method: 'GET', pattern: /^\/v1\/recommend$/, handler: async (_b, q) => opRecommend({ effect: q.get('effect') ?? undefined }) },
    { method: 'POST', pattern: /^\/v1\/recommend$/, handler: async (b) => opRecommend(b) },
    { method: 'POST', pattern: /^\/v1\/temporal$/, handler: async (b) => opTemporal(b) },
    { method: 'GET', pattern: /^\/v1\/vision\/status$/, handler: async () => opVision({ action: 'status' }) },
    { method: 'POST', pattern: /^\/v1\/vision$/, handler: async (b) => opVision(b) },
    { method: 'POST', pattern: /^\/v1\/compose$/, handler: async (b) => opCompose(b) },
    { method: 'POST', pattern: /^\/v1\/composition\/validate$/, handler: async (b) => opCompose({ ...b, validateOnly: true }) },
    { method: 'POST', pattern: /^\/v1\/reference-effects$/, handler: async (b) => opReferenceEffects(b) },
    { method: 'POST', pattern: /^\/v1\/benchmark$/, handler: async (b) => opBenchmark(b) },
    { method: 'POST', pattern: /^\/v1\/art-direction$/, handler: async (b) => opArtDirection(b) },
    { method: 'POST', pattern: /^\/v1\/reference-design$/, handler: async (b) => opReferenceDesign(b) },
    { method: 'POST', pattern: /^\/v1\/motion-director$/, handler: async (b) => opMotionDirector(b) },
    { method: 'POST', pattern: /^\/v1\/showcase$/, handler: async (b) => opShowcase(b) },
    { method: 'POST', pattern: /^\/v1\/intelligence$/, handler: async (b) => opIntelligence(b) },
    { method: 'POST', pattern: /^\/v1\/debug$/, handler: async (b) => opDebug(b) },
    { method: 'POST', pattern: /^\/v1\/critic$/, handler: async (b) => opIntelligence(b) },
    { method: 'POST', pattern: /^\/v1\/fidelity$/, handler: async (b) => opIntelligence(b) },
    { method: 'POST', pattern: /^\/v1\/gates$/, handler: async (b) => opGate(b) },
    { method: 'POST', pattern: /^\/v1\/context$/, handler: async (b) => opContext(b) },
    { method: 'POST', pattern: /^\/v1\/smart-effects$/, handler: async (b) => opSmartEffects(b) },
    { method: 'POST', pattern: /^\/v1\/loop$/, handler: async (b) => {
      if (b.confirm !== true && (b.replaceFile || b.patchFile || b.changes?.length)) throw new Error('Loop no confirmado: envía confirm=true (escribe archivos).');
      return opLoop(b);
    } },
    { method: 'GET', pattern: /^\/v1\/loops$/, handler: async (_b, q) => opLoops(q.get('project') ?? undefined) },
    { method: 'POST', pattern: /^\/v1\/loops\/restore$/, handler: async (b) => opRestoreLoop(b.project, b.id, b.outDir) },
    { method: 'GET', pattern: /^\/v1\/benchmarks$/, handler: async () => {
      const file = new URL('../../library/benchmarks.json', import.meta.url);
      try {
        return JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8'));
      } catch {
        return { pending: 'Ejecuta POST /v1/benchmark o `ve benchmark` para medir.' };
      }
    } },
    { method: 'POST', pattern: /^\/v1\/iterate$/, handler: async (b) => {
      if (b.confirm !== true) throw new Error('Iteración no confirmada: envía confirm=true (escribe archivos).');
      return opIterate(b);
    } },
    { method: 'GET', pattern: /^\/v1\/backups$/, handler: async (_b, q) => opBackups(q.get('project') ?? undefined) },
    { method: 'POST', pattern: /^\/v1\/backups\/restore$/, handler: async (b) => opRestoreBackup(b.project, b.id) },
    { method: 'GET', pattern: /^\/v1\/agents$/, handler: async (_b, q) => inventory(q.get('project') ?? undefined) },
    { method: 'GET', pattern: /^\/v1\/profiles$/, handler: async () => Object.values(PROFILES) },
    { method: 'GET', pattern: /^\/v1\/profiles\/([\w-]+)$/, handler: async (_b, _q, req) => {
      const id = new URL(req.url ?? '/', 'http://127.0.0.1').pathname.split('/').pop()!;
      const p = PROFILES[id as keyof typeof PROFILES];
      if (!p) throw new Error(`Perfil desconocido: ${id}`);
      return { profile: p, description: describeProfile(p) };
    } },
    { method: 'POST', pattern: /^\/v1\/install\/plan$/, handler: async (b) => planInstall(b) },
    { method: 'POST', pattern: /^\/v1\/install$/, handler: async (b) => {
      if (b.confirm !== true) throw new Error('Instalación no confirmada: envía confirm=true (escribe archivos y respaldos).');
      return applyInstall({ ...b, confirm: true });
    } },
    { method: 'POST', pattern: /^\/v1\/uninstall$/, handler: async (b) => {
      if (b.confirm !== true) throw new Error('Desinstalación no confirmada: envía confirm=true.');
      return uninstall(b);
    } },
    { method: 'POST', pattern: /^\/v1\/repair$/, handler: async (b) => repair(b) },
    { method: 'GET', pattern: /^\/v1\/install\/verify$/, handler: async () => verifyMcpServer() },
    { method: 'POST', pattern: /^\/v1\/activation$/, handler: async (b) => {
      if (!b.request) throw new Error('Falta request (texto de la solicitud).');
      const r = detectActivation(b.request);
      return { ...r, agentSupport: b.agent ? activationSupport(b.agent) : undefined };
    } },
    { method: 'GET', pattern: /^\/v1\/security$/, handler: async (_b, q) => auditSecurity({ projectDir: q.get('project') ?? undefined, apiAllowsInstall: allowInstall }) },
    { method: 'POST', pattern: /^\/v1\/usage$/, handler: async (b) => recordUsage(b) },
  ];

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    const send = (status: number, payload: unknown) => {
      const body = JSON.stringify(payload, null, 2);
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
      res.end(body);
    };

    if (url.pathname === '/' && req.method === 'GET') {
      send(200, {
        name: 'visual-engine',
        health: '/v1/health',
        endpoints: routes.map((r) => `${r.method} ${r.pattern.source.replace(/^\^|\$$/g, '').replace(/\\\//g, '/')}`),
        docs: 'https://github.com/ <pendiente de publicar>',
      });
      return;
    }

    // Ruta de recurso con id: se resuelve aparte para mantener el patrón simple.
    const effectMatch = url.pathname.match(/^\/v1\/effects\/([\w-]+)$/);
    if (effectMatch && req.method === 'GET') {
      try {
        send(200, opGetEffect(effectMatch[1]));
      } catch (e) {
        send(404, { error: (e as Error).message });
      }
      return;
    }

    const route = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
    if (!route) {
      send(404, { error: 'Ruta no encontrada', path: url.pathname });
      return;
    }
    try {
      const body = await readBody(req);
      const result = await route.handler(body, url.searchParams, req);
      send(200, result);
    } catch (e) {
      send(400, { error: (e as Error).message });
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(opts.port ?? 4747, host, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : (opts.port ?? 4747);
      resolve({
        url: `http://${host}:${port}`,
        port,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

export function capabilities() {
  return {
    implementado: [
      'Análisis de imágenes y vídeo de referencia (paleta, luz, contraste, detalle, movimiento, cortes)',
      'Línea temporal con escenas, fotogramas clave y storyboard (detector de escenas FFmpeg)',
      'Movimiento de cámara medido (desplazamiento, zoom, rotación, aceleración, temblor, transiciones)',
      'Composición, círculos, líneas, regiones de texto (estimadas), saliencia y profundidad proxy',
      'Detección de efectos con evidencia y estado verified/estimated',
      'Especificación visual JSON+Markdown y recomendaciones con snippets validados',
      'Comparación temporal con deriva, cortes alineados y calidad multidimensional',
      'Iteración con copia, verificación y reversión automática',
      'Visión local opcional (Tesseract/Ollama) sin APIs externas',
      'Extracción de fotogramas con FFmpeg',
      'Captura real con Playwright (varios fotogramas, errores de consola y de red)',
      'Comparación de perfiles con puntuación de fidelidad y correcciones priorizadas',
      'Comparación por píxel (SSIM, MAE, ΔE) con mapa de calor PNG',
      'Biblioteca de 58 efectos autocontenidos (Canvas/WebGL) con parámetros, instrucciones y métricas',
      'Motor de composición JSON con capas, mezclas, máscaras, transformaciones y timelines',
      'Reference-to-Effects con correspondencias declaradas verified/estimated',
      'Galería local opcional y banco de rendimiento con FPS/memoria reales',
      'OCR Tesseract y visión local Ollama con detección de VRAM y selección de modelo',
      'Adaptadores GSAP, Three.js, Motion, Remotion, React Bits, Playwright y FFmpeg',
      'Detección real de dependencias y plan de instalación',
      'Instalación de paquetes npm gratuitos (opt-in)',
      'Instrucciones y Skills para agentes',
      'Visual Critic con evidencia, ubicación, gravedad, confianza y corrección',
      'Visual Debugger con selectores, regiones, CSS, capas, frames y correspondencia fuente verificada',
      'Reference Fidelity Engine por dimensiones, separado de la similitud de píxeles',
      'Smart Effects Selection contextual que respeta estilos minimalistas',
      'Quality Gates configurables con bloqueo por defecto de defectos críticos y aprobación humana',
      'Autonomous Improvement Loop con copia, límites y reversión (el cambio lo aporta el agente)',
    ],
    pendiente: [
      'Publicación del repositorio GitHub y actualizaciones verificadas desde remoto',
      'Detección semántica de objetos/pose: requiere modelo local; no integrada (sólo regiones salientes)',
      'Detección de objetos/pose: requiere un modelo específico que no forma parte de esta entrega',
      'Sincronización automática de audio y subtítulos',
      'Prueba en Linux y macOS (sólo probado en Windows en esta máquina)',
    ],
    limites: [
      'El texto se localiza sin OCR si Tesseract no está: estado estimated.',
      'La profundidad y el parallax son proxies geométricos, no mapas métricos.',
      'La etiqueta de un efecto es una interpretación de la señal medida.',
      'El parcheo lo aporta el agente; iterate lo aplica, mide y revierte, pero no inventa el cambio.',
      'El loop no llama a un proveedor de IA: si no recibe un cambio, devuelve una tarea para el agente conectado.',
      'El presupuesto de tokens del loop es una estimación caracteres/4, no el recuento del proveedor.',
      'La crítica es estructural; la aprobación artística final es humana.',
    ],
  };
}
