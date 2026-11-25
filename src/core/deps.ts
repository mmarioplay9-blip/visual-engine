import fs from 'node:fs';
import path from 'node:path';
import { exec, text } from './run.js';
import { findProjectRoot } from './paths.js';

export type ToolKind = 'binary' | 'npm' | 'source';

export interface ToolSpec {
  id: string;
  title: string;
  kind: ToolKind;
  pkg?: string;
  bin?: string;
  probe?: string[];
  license: string;
  freeNote: string;
  capabilities: string[];
  purpose: string;
  docs: string;
}

/** Registro de las siete herramientas visuales pedidas, con su licencia y su uso previsto. */
export const TOOLBOX: ToolSpec[] = [
  {
    id: 'ffmpeg',
    title: 'FFmpeg',
    kind: 'binary',
    bin: 'ffmpeg',
    probe: ['-version'],
    license: 'LGPL 2.1+ / GPL si el build incluye libx264 (depende del binario)',
    freeNote: 'Gratuito. El build gyan.dev instalado incluye libx264: úsalo, no redistuyas el binario como si fuera tuyo.',
    capabilities: ['video-processing', 'frames', 'encoding'],
    purpose: 'Extraer fotogramas, medir vídeo, codificar el resultado final y decodificar referencias.',
    docs: 'https://ffmpeg.org/documentation.html',
  },
  {
    id: 'ffprobe',
    title: 'FFprobe',
    kind: 'binary',
    bin: 'ffprobe',
    probe: ['-version'],
    license: 'LGPL 2.1+ / GPL según build',
    freeNote: 'Gratuito, se instala junto a FFmpeg.',
    capabilities: ['video-processing', 'probe'],
    purpose: 'Leer duración, resolución, fps y códecs reales sin adivinar.',
    docs: 'https://ffmpeg.org/ffprobe.html',
  },
  {
    id: 'git',
    title: 'Git',
    kind: 'binary',
    bin: 'git',
    probe: ['--version'],
    license: 'GPL-2.0',
    freeNote: 'Gratuito.',
    capabilities: ['updates'],
    purpose: 'Instalación y actualización automática desde GitHub.',
    docs: 'https://git-scm.com/doc',
  },
  {
    id: 'playwright',
    title: 'Playwright',
    kind: 'npm',
    pkg: 'playwright',
    license: 'Apache-2.0',
    freeNote: 'Gratuito. Chromium/WebKit/Firefox se descargan aparte con `npx playwright install`.',
    capabilities: ['browser-capture', 'visual-testing'],
    purpose: 'Abrir el proyecto real en un navegador, capturar fotogramas y detectar errores de consola.',
    docs: 'https://playwright.dev/docs/intro',
  },
  {
    id: 'three',
    title: 'Three.js',
    kind: 'npm',
    pkg: 'three',
    license: 'MIT',
    freeNote: 'Gratuito, sin plugins de pago.',
    capabilities: ['webgl-3d'],
    purpose: 'Escenas 3D, shaders, partículas e iluminación en WebGL.',
    docs: 'https://threejs.org/docs/',
  },
  {
    id: 'gsap',
    title: 'GSAP',
    kind: 'npm',
    pkg: 'gsap',
    license: 'GSAP standard "no charge" (los plugins de Club GSAP son de pago)',
    freeNote: 'El núcleo y los plugins públicos (ScrollTrigger, Flip, MotionPath...) son gratuitos; SplitText/ScrollSmoother de Club no.',
    capabilities: ['web-animation'],
    purpose: 'Timelines, secuencias y control fino de animación web.',
    docs: 'https://gsap.com/docs/v3/',
  },
  {
    id: 'motion',
    title: 'Motion (Framer Motion / Motion One)',
    kind: 'npm',
    pkg: 'motion',
    license: 'MIT',
    freeNote: 'Gratuito.',
    capabilities: ['web-animation', 'motion-library'],
    purpose: 'Animación declarativa y springs en React o JS.',
    docs: 'https://motion.dev/docs',
  },
  {
    id: 'remotion',
    title: 'Remotion',
    kind: 'npm',
    pkg: 'remotion',
    license: 'Remotion License (gratis para individuos y equipos pequeños; revisa el umbral de empresa)',
    freeNote: 'Gratis en el uso personal/pequeño; no es MIT. Requiere React.',
    capabilities: ['programmatic-render', 'video'],
    purpose: 'Generar vídeo con React: escenas, subtítulos y render determinista.',
    docs: 'https://www.remotion.dev/docs',
  },
  {
    id: 'react-bits',
    title: 'React Bits',
    kind: 'source',
    license: 'MIT y CC-BY-4.0 según el componente (atribución obligatoria en los CC-BY)',
    freeNote: 'Gratuito: son componentes copiables, no un paquete npm oficial.',
    capabilities: ['react-components'],
    purpose: 'Componentes de texto, fondos y animaciones React con acabado profesional.',
    docs: 'https://reactbits.dev/',
  },
];

export interface ToolStatus {
  id: string;
  title: string;
  kind: ToolKind;
  available: boolean;
  version: string | null;
  source: 'sistema' | 'proyecto' | 'ausente';
  license: string;
  freeNote: string;
  capabilities: string[];
  purpose: string;
  docs: string;
  detail?: string;
}

function readJson(file: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const PROJECT_MANIFEST = (dir: string) => readJson(path.join(dir, 'package.json'));

/** Detecta una herramienta npm en el proyecto y, si falta, en esta instalación de Visual Engine. */
function detectNpmPackage(pkg: string, projectDir: string): { version: string | null; source: ToolStatus['source']; license?: string } {
  const project = PROJECT_MANIFEST(projectDir);
  const declared = project?.dependencies?.[pkg] ?? project?.devDependencies?.[pkg];
  const projectInstalled = readJson(path.join(projectDir, 'node_modules', pkg, 'package.json'));
  if (projectInstalled?.version) {
    return { version: String(projectInstalled.version), source: 'proyecto', license: projectInstalled.license };
  }
  if (declared) return { version: String(declared), source: 'proyecto', license: undefined };
  const own = readJson(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..', 'node_modules', pkg, 'package.json'));
  if (own?.version) return { version: String(own.version), source: 'sistema', license: own.license };
  return { version: null, source: 'ausente' };
}

/** Comprueba si Playwright tiene navegadores descargados. */
function playwrightBrowsers(): string | null {
  const home = process.env.LOCALAPPDATA || process.env.HOME || '';
  const dirs = [
    path.join(home, 'ms-playwright'),
    path.join(process.env.HOME ?? '', '.cache', 'ms-playwright'),
    path.join(process.env.HOME ?? '', 'Library', 'Caches', 'ms-playwright'),
  ];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      const items = fs.readdirSync(d).filter((n) => n.startsWith('chromium'));
      if (items.length) return items.join(', ');
    }
  }
  return null;
}

/** Estado real de todas las dependencias. Todas las comprobaciones son ejecuciones reales. */
export async function detectAll(projectDir = process.cwd()): Promise<ToolStatus[]> {
  const dir = findProjectRoot(projectDir);
  return Promise.all(
    TOOLBOX.map(async (tool): Promise<ToolStatus> => {
      if (tool.kind === 'binary') {
        const r = await text(tool.bin!, tool.probe ?? ['--version'], { timeoutMs: 15_000 });
        const version = r.ok ? (r.stdout.split(/\r?\n/)[0] ?? '').slice(0, 120) : null;
        return {
          ...tool,
          available: r.ok,
          version,
          source: r.ok ? 'sistema' : 'ausente',
          detail: r.ok ? undefined : (r.missing ? 'No está en PATH.' : r.stderr.slice(0, 200)),
        };
      }
      if (tool.kind === 'npm') {
        const d = detectNpmPackage(tool.pkg!, dir);
        return {
          ...tool,
          available: d.version !== null && d.source !== 'ausente',
          version: d.version,
          source: d.source,
          detail:
            tool.id === 'playwright'
              ? (playwrightBrowsers() ? `Navegadores: ${playwrightBrowsers()}` : 'Sin navegadores: ejecuta `npx playwright install chromium`.')
              : undefined,
        };
      }
      return {
        ...tool,
        available: false,
        version: null,
        source: 'ausente',
        detail: 'Sin paquete npm: se integra copiando componentes (revisa la licencia y la atribución).',
      };
    }),
  );
}

export interface CapabilityNeed {
  capability: string;
  label: string;
  tools: string[];
  installed: string[];
  missing: string[];
  install: string[];
}

const CAPABILITIES: { id: string; label: string; install?: string[] }[] = [
  { id: 'web-animation', label: 'Animación web (timelines, transiciones)', install: ['gsap'] },
  { id: 'motion-library', label: 'Animación declarativa / springs', install: ['motion'] },
  { id: 'webgl-3d', label: '3D, shaders y partículas', install: ['three'] },
  { id: 'browser-capture', label: 'Captura y prueba en navegador', install: ['playwright'] },
  { id: 'video-processing', label: 'Vídeo, fotogramas y codificación', install: [] },
  { id: 'programmatic-render', label: 'Render programático de vídeo', install: ['remotion'] },
  { id: 'react-components', label: 'Componentes visuales React', install: [] },
];

/** Traduce capacidades pedidas a herramientas presentes y ausentes, con comando de instalación. */
export async function planFor(capabilities: string[], projectDir = process.cwd(), status?: ToolStatus[]): Promise<CapabilityNeed[]> {
  const all = status ?? (await detectAll(projectDir));
  const byId = new Map(all.map((t) => [t.id, t]));
  const wanted = capabilities.length ? capabilities : CAPABILITIES.map((c) => c.id);
  return wanted.map((cap) => {
    const def = CAPABILITIES.find((c) => c.id === cap);
    const tools = all.filter((t) => t.capabilities.includes(cap)).map((t) => t.id);
    const installed = tools.filter((id) => byId.get(id)?.available);
    const missing = tools.filter((id) => !byId.get(id)?.available);
    return {
      capability: cap,
      label: def?.label ?? cap,
      tools,
      installed,
      missing,
      install: def?.install ?? missing.filter((id) => byId.get(id)?.kind === 'npm'),
    };
  });
}

export interface InstallResult {
  ok: boolean;
  manager: string;
  command: string;
  dryRun: boolean;
  stdout: string;
  stderr: string;
}

/**
 * Localiza el CLI de npm que acompaña a Node. Evita lanzar `npm.cmd`, que en
 * Windows exige shell y rompe con rutas que llevan espacios.
 */
export function npmCliPath(): string | null {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(exeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(exeDir, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(exeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  return candidates.find((c) => fs.existsSync(c)) ?? null;
}

/** Ejecuta npm sin shell cuando es posible (todas las plataformas soportadas). */
export async function runNpm(args: string[], cwd: string, timeoutMs = 600_000) {
  const cli = npmCliPath();
  if (cli) return exec(process.execPath, [cli, ...args], { cwd, timeoutMs });
  return exec('npm', args, { cwd, timeoutMs, shell: process.platform === 'win32' });
}

export function detectPackageManager(dir: string): string {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'bun.lockb')) || fs.existsSync(path.join(dir, 'bun.lock'))) return 'bun';
  return 'npm';
}

/**
 * Instala paquetes en el proyecto del usuario. Nunca ejecuta sin dryRun=false explícito.
 * No instala nada de pago: sólo los paquetes gratuitos del registro por defecto.
 */
export async function installPackages(
  packages: string[],
  projectDir = process.cwd(),
  opts: { dryRun?: boolean } = {},
): Promise<InstallResult> {
  const dir = findProjectRoot(projectDir);
  const manager = detectPackageManager(dir);
  const list = [...new Set(packages)].filter(Boolean);
  const args = manager === 'npm' ? ['install', ...list] : ['add', ...list];
  const command = `${manager} ${args.join(' ')}`;
  if (opts.dryRun !== false) {
    return { ok: true, manager, command, dryRun: true, stdout: 'Simulación: no se ha instalado nada.', stderr: '' };
  }
  if (!list.length) return { ok: true, manager, command, dryRun: false, stdout: 'Nada que instalar.', stderr: '' };
  const r = manager === 'npm'
    ? await runNpm(args, dir)
    : await exec(manager, args, { cwd: dir, timeoutMs: 600_000, shell: process.platform === 'win32' });
  return {
    ok: r.ok,
    manager,
    command,
    dryRun: false,
    stdout: r.stdout.toString('utf8').slice(-4000),
    stderr: r.stderr.slice(-4000),
  };
}

export function capabilityCatalog(): { id: string; label: string }[] {
  return CAPABILITIES.map(({ id, label }) => ({ id, label }));
}
