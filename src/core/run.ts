import { spawn } from 'node:child_process';

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  input?: Buffer | string;
  /** Sólo para shims .cmd en Windows; nunca con rutas del usuario. */
  shell?: boolean;
}

export interface ExecResult {
  ok: boolean;
  code: number;
  stdout: Buffer;
  stderr: string;
  /** true cuando el binario no existe o no es ejecutable. */
  missing: boolean;
}

/**
 * PIDs de los procesos directos todavía vivos. Permite comprobar que un
 * timeout no deja hijos huérfanos: tras `finish` esta lista vuelve a vaciarse.
 */
const liveChildren = new Set<number>();

export function liveChildPids(): number[] {
  return [...liveChildren];
}

/**
 * Ejecuta un binario sin shell (seguro en las tres plataformas) y devuelve
 * stdout como Buffer para no corromper vídeo/fotogramas crudos.
 */
export function exec(command: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      windowsHide: true,
      shell: opts.shell === true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (child.pid) liveChildren.add(child.pid);
    // Si el hijo muere antes de leer stdin, la escritura produce EPIPE; sin
    // este manejador el error sería no capturado y tumbaría el proceso.
    child.stdin.on('error', () => undefined);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let missing = false;
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      child.kill('SIGKILL');
      // En Windows, matar el shim .cmd no mata el proceso real; se corta el árbol
      // por PID propio (no hay entrada del usuario en el comando).
      if (process.platform === 'win32' && child.pid) {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        killer.on('error', () => undefined);
        killer.unref();
      }
      // El cierre puede no llegar si un nieto conserva las tuberías.
      setTimeout(() => finish(124), 1500).unref();
    }, opts.timeoutMs ?? 120_000);

    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Un nieto (shim .cmd) puede conservar las tuberías tras el timeout: se
      // cierran aquí para que el proceso Node pueda terminar.
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      child.unref();
      if (child.pid) liveChildren.delete(child.pid);
      resolve({
        ok: code === 0,
        code,
        stdout: Buffer.concat(out),
        stderr: Buffer.concat(err).toString('utf8'),
        missing,
      });
    };

    child.on('error', (e: NodeJS.ErrnoException) => {
      missing = e.code === 'ENOENT' || e.code === 'EACCES';
      err.push(Buffer.from(`${e.code ?? 'ERROR'}: ${e.message}`));
      finish(missing ? 127 : 1);
    });
    child.stdout.on('data', (c: Buffer) => out.push(c));
    child.stderr.on('data', (c: Buffer) => err.push(c));
    // Si el cierre llega tras el timeout, el código real es 124: un SIGKILL
    // deja `code` en null y no debe confundirse con un fallo del binario.
    child.on('close', (code) => finish(timedOut ? 124 : code ?? 1));
    child.on('exit', () => {
      if (child.pid) liveChildren.delete(child.pid);
    });

    if (opts.input !== undefined) {
      child.stdin.end(opts.input);
    } else {
      child.stdin.end();
    }
  });
}

/** Igual que exec, pero devuelve stdout/stderr como texto recortado. */
export async function text(command: string, args: string[], opts: ExecOptions = {}) {
  const r = await exec(command, args, { timeoutMs: 20_000, ...opts });
  return {
    ...r,
    stdout: r.stdout.toString('utf8').trim(),
    stderr: r.stderr.trim(),
  };
}
