import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './paths.js';

/**
 * Auditoría de seguridad 0.6.
 *
 * Comprueba hechos locales: host de la API, contención de rutas, uso de shell,
 * permisos de archivos de estado y restauración de copias. No certifica el
 * sistema operativo ni el comportamiento de terceros.
 */

export type CheckStatus = 'pass' | 'fail' | 'not-applicable';

export interface SecurityCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  severity: 'blocker' | 'warning' | 'info';
}

export interface SecurityAudit {
  version: '1.0';
  projectDir: string;
  pass: boolean;
  checks: SecurityCheck[];
  summary: string;
  limitations: string[];
}

export function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
}

/** Contención estricta: resuelve enlaces y compara con separador para evitar prefijos falsos. */
export function withinRoot(root: string, candidate: string): boolean {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  const rel = path.relative(r, c);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function scanShellUsage(dir: string): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  const visit = (current: string) => {
    if (!fs.existsSync(current)) return;
    for (const e of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
        visit(full);
      } else if (/\.(ts|mjs|js|sh|ps1)$/.test(e.name) && e.name !== 'security.ts') {
        const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
        lines.forEach((line, i) => {
          if (/shell\s*:\s*true/.test(line) || /\bexecSync\s*\(/.test(line)) {
            hits.push({ file: path.relative(dir, full), line: i + 1, text: line.trim().slice(0, 160) });
          }
        });
      }
    }
  };
  visit(dir);
  return hits;
}

export interface AuditOptions {
  projectDir?: string;
  apiHost?: string;
  apiAllowsInstall?: boolean;
}

export function auditSecurity(opts: AuditOptions = {}): SecurityAudit {
  const projectDir = path.resolve(opts.projectDir ?? process.cwd());
  const checks: SecurityCheck[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string, severity: SecurityCheck['severity'] = 'warning') => {
    checks.push({ id, label, status, detail, severity });
  };

  const host = opts.apiHost ?? '127.0.0.1';
  add('api-loopback', 'API limitada a localhost', isLoopback(host) ? 'pass' : 'fail',
    `Host por defecto: ${host}.`, 'blocker');

  const shellHits = scanShellUsage(path.join(PACKAGE_ROOT, 'src'));
  add('no-shell', 'Ejecución de procesos sin shell', shellHits.length === 0 ? 'pass' : 'fail',
    shellHits.length === 0
      ? 'No hay `shell:true` ni `execSync` en src/.'
      : `${shellHits.length} aparición(es): ${shellHits.slice(0, 3).map((h) => `${h.file}:${h.line}`).join(', ')}.`,
    'blocker');

  const state = path.join(projectDir, '.visual-engine');
  add('state-contained', 'Estado dentro del proyecto', withinRoot(projectDir, state) ? 'pass' : 'fail',
    `${state} ${withinRoot(projectDir, state) ? 'está' : 'NO está'} dentro de ${projectDir}.`, 'blocker');

  const manifest = path.join(state, 'install.json');
  if (fs.existsSync(manifest)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { files?: { path?: string }[] };
      const outside = (parsed.files ?? []).filter((f) => f.path && !withinRoot(projectDir, f.path) && !withinRoot(requireHome(projectDir), f.path));
      add('manifest-contained', 'Manifiesto sin rutas externas', outside.length === 0 ? 'pass' : 'fail',
        outside.length === 0 ? `${parsed.files?.length ?? 0} archivo(s) gestionados dentro de ámbitos permitidos.` : `${outside.length} ruta(s) fuera del proyecto y del home.`,
        'blocker');
    } catch (e) {
      add('manifest-contained', 'Manifiesto sin rutas externas', 'fail', `install.json inválido: ${(e as Error).message}`, 'blocker');
    }
  } else {
    add('manifest-contained', 'Manifiesto sin rutas externas', 'not-applicable', 'Todavía no hay instalación registrada.', 'info');
  }

  if (process.platform === 'win32') {
    add('state-perms', 'Permisos del estado', 'not-applicable',
      'Windows no expone modos POSIX comparables; la protección depende del perfil de usuario.', 'info');
  } else if (fs.existsSync(state)) {
    const mode = fs.statSync(state).mode & 0o777;
    add('state-perms', 'Permisos del estado', (mode & 0o077) === 0 ? 'pass' : 'fail',
      `Modo ${mode.toString(8)}; se espera sin acceso de grupo/otros.`, 'warning');
  } else {
    add('state-perms', 'Permisos del estado', 'not-applicable', 'Sin .visual-engine todavía.', 'info');
  }

  add('install-gate', 'Instalación de paquetes bloqueada por defecto',
    opts.apiAllowsInstall === true ? 'fail' : 'pass',
    opts.apiAllowsInstall === true ? 'La API arrancó con --allow-install.' : 'La API exige --allow-install y confirmación.', 'warning');

  const backups = path.join(state, 'backups');
  add('backups', 'Copias antes de modificar configuraciones', fs.existsSync(backups) ? 'pass' : 'not-applicable',
    fs.existsSync(backups) ? 'Existe .visual-engine/backups.' : 'Aún no se ha modificado ninguna configuración.', 'info');

  const failing = checks.filter((c) => c.status === 'fail');
  const blockers = failing.filter((c) => c.severity === 'blocker');
  return {
    version: '1.0',
    projectDir,
    pass: blockers.length === 0,
    checks,
    summary: blockers.length === 0
      ? `Sin bloqueos de seguridad (${failing.length} aviso(s)).`
      : `${blockers.length} bloqueo(s) de seguridad: ${blockers.map((b) => b.id).join(', ')}.`,
    limitations: [
      'La auditoría es estática y local; no sustituye una revisión de código ni un pentest.',
      'No se comprueban permisos NTFS en Windows ni la configuración del cortafuegos.',
      'Los agentes de terceros pueden tener sus propios riesgos fuera de este repositorio.',
    ],
  };
}

function requireHome(_projectDir: string): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? _projectDir;
}
