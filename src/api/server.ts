import http from 'node:http';
import { URL } from 'node:url';
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
    server.listen(opts.port ?? 4747, opts.host ?? '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : (opts.port ?? 4747);
      resolve({
        url: `http://${opts.host ?? '127.0.0.1'}:${port}`,
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
      'Extracción de fotogramas con FFmpeg',
      'Captura real con Playwright (varios fotogramas, errores de consola y de red)',
      'Comparación de perfiles con puntuación de fidelidad y correcciones priorizadas',
      'Comparación por píxel (SSIM, MAE, ΔE) con mapa de calor PNG',
      'Biblioteca de 6 efectos autocontenidos con parámetros',
      'Adaptadores GSAP, Three.js, Motion, Remotion, React Bits, Playwright y FFmpeg',
      'Detección real de dependencias y plan de instalación',
      'Instalación de paquetes npm gratuitos (opt-in)',
      'Instrucciones y Skills para agentes',
    ],
    pendiente: [
      'Publicación del repositorio GitHub y actualizaciones verificadas desde remoto',
      'Análisis de vídeo con detección de objetos/pose (no implementado)',
      'Sincronización automática de audio y subtítulos',
      'Ajuste automático de código fuente (las correcciones se entregan al agente, no se aplican solas)',
      'Prueba en Linux y macOS (sólo probado en Windows en esta máquina)',
    ],
  };
}
