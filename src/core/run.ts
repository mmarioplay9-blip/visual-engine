import { spawn } from 'node:child_process';

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  input?: Buffer | string;
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
 * Ejecuta un binario sin shell (seguro en las tres plataformas) y devuelve
 * stdout como Buffer para no corromper vídeo/fotogramas crudos.
 */
export function exec(command: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let missing = false;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        child.kill('SIGKILL');
      }
    }, opts.timeoutMs ?? 120_000);

    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
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
    child.on('close', (code) => finish(code ?? 1));

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
