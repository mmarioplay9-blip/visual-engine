import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { applyEffect, getEffect, listEffects } from './library.js';
import { ensureDir, newRunDir, PACKAGE_ROOT } from './paths.js';
import { renderComposition, validateComposition } from './composition.js';

export interface GalleryServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.glsl': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function serveFile(res: http.ServerResponse, file: string) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('No encontrado');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=60',
  });
  fs.createReadStream(file).pipe(res);
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function paramsFromQuery(id: string, query: URLSearchParams): Record<string, string | number | boolean> {
  const recipe = getEffect(id);
  const out: Record<string, string | number | boolean> = {};
  for (const p of recipe.params) {
    const raw = query.get(p.name);
    if (raw === null || raw === '') continue;
    if (p.type === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) out[p.name] = n;
    } else if (p.type === 'boolean') out[p.name] = raw === 'true' || raw === '1';
    else out[p.name] = raw;
  }
  return out;
}

/** Galería opcional. Visual Engine sigue funcionando sin ella. */
export async function startGallery(opts: { port?: number; host?: string } = {}): Promise<GalleryServer> {
  const cache = ensureDir(path.join(newRunDir('gallery'), 'cache'));
  const galleryHtml = fs.readFileSync(path.join(PACKAGE_ROOT, 'library', 'gallery', 'index.html'), 'utf8');
  const benchmarksFile = path.join(PACKAGE_ROOT, 'library', 'benchmarks.json');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(galleryHtml);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/effects') {
        const body = JSON.stringify(
          listEffects().map((e) => ({
            id: e.id,
            name: e.name,
            category: e.category,
            summary: e.summary,
            tags: e.tags,
            engines: e.engines,
            requires: e.requires,
            license: e.license,
            performance: e.performance,
            params: e.params,
            entry: e.entry,
          })),
          null,
          2,
        );
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }).end(body);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/benchmarks') {
        if (fs.existsSync(benchmarksFile)) serveFile(res, benchmarksFile);
        else res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ pending: 'Ejecuta `ve benchmark` para medir.' }));
        return;
      }
      const detail = url.pathname.match(/^\/api\/effect\/([\w-]+)$/);
      if (req.method === 'GET' && detail) {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(getEffect(detail[1]), null, 2));
        return;
      }
      const preview = url.pathname.match(/^\/preview\/([\w-]+)\/$/);
      if (req.method === 'GET' && preview) {
        const id = preview[1];
        const params = paramsFromQuery(id, url.searchParams);
        // Un directorio estable por efecto: las rutas relativas de effect.js,
        // config.js y ve-runtime.js funcionan dentro del iframe.
        const dir = path.join(cache, 'preview', id);
        ensureDir(dir);
        applyEffect(id, { outDir: path.join(cache, 'preview'), params });
        serveFile(res, path.join(dir, 'index.html'));
        return;
      }
      if (req.method === 'GET' && url.pathname.startsWith('/preview/')) {
        const rel = url.pathname.replace(/^\/preview\/+/, '');
        const file = path.resolve(cache, 'preview', decodeURIComponent(rel));
        if (!file.startsWith(path.resolve(cache, 'preview'))) throw new Error('Ruta fuera de la galería.');
        serveFile(res, file);
        return;
      }
      if (req.method === 'GET' && url.pathname.startsWith('/node_modules/')) {
        const rel = decodeURIComponent(url.pathname.replace(/^\/node_modules\/+/, ''));
        const root = path.resolve(PACKAGE_ROOT, 'node_modules');
        const file = path.resolve(root, rel);
        if (!file.startsWith(root)) throw new Error('Ruta fuera de node_modules.');
        serveFile(res, file);
        return;
      }
      if (req.method === 'GET' && url.pathname.startsWith('/compositions/')) {
        const rel = decodeURIComponent(url.pathname.replace(/^\/compositions\/+/, ''));
        const root = path.resolve(cache, 'compositions');
        const file = path.resolve(root, rel);
        if (!file.startsWith(root)) throw new Error('Ruta fuera de composiciones.');
        serveFile(res, file);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/compose') {
        const body = await readBody(req);
        const valid = validateComposition(body);
        if (!valid.ok) {
          res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: valid.errors.join('; ') }));
          return;
        }
        const dir = ensureDir(path.join(cache, 'compositions', crypto.randomUUID().slice(0, 8)));
        const rendered = renderComposition(body, { outDir: dir });
        const rel = path.relative(path.join(cache, 'compositions'), rendered.html).split(path.sep).join('/');
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, url: '/compositions/' + rel, dir: rendered.dir, effects: rendered.effects }));
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Ruta no encontrada');
    } catch (e) {
      res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: (e as Error).message }));
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(opts.port ?? 0, opts.host ?? '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : (opts.port ?? 0);
      resolve({
        url: `http://${opts.host ?? '127.0.0.1'}:${port}/`,
        port,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}
