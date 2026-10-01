/**
 * PTY spawn — node-pty wrapper with ConPTY on Windows.
 *
 * Spawns a shell with: cwd = jailed path, cols/rows from client, env =
 * allowlisted subset + TERM/COLORTERM + KNOUX_BRIDGE_SESSION. Never forwards
 * KNOUX_BRIDGE_* secrets or env vars matching /(KEY|TOKEN|SECRET|PASSWORD)/i.
 */

import { execFileSync } from 'node:child_process';
import * as pty from 'node-pty';
import type { BridgeProfile } from '../protocol.js';

const SECRET_ENV_PATTERN = /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE)/i;
const BRIDGE_ENV_PATTERN = /^KNOUX_BRIDGE_/;

/** Allowlisted env vars that are safe to forward to the PTY. */
const ALLOWED_ENV = new Set([
  'PATH', 'HOME', 'USERPROFILE', 'TEMP', 'TMP', 'LANG', 'LC_ALL',
  'NODE_ENV', 'CI', 'SHELL', 'TERM', 'COLORTERM', 'USER', 'LOGNAME',
  'HOSTNAME', 'PWD', 'OLDPWD', 'EDITOR', 'VISUAL',
  'SystemRoot', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramData',
  'APPDATA', 'LOCALAPPDATA', 'ComSpec', 'PATHEXT', 'NUMBER_OF_PROCESSORS',
  'OS', 'PROCESSOR_ARCHITECTURE', 'PSModulePath',
]);

export interface SpawnOptions {
  profile: BridgeProfile;
  cwd: string;
  cols: number;
  rows: number;
  sessionId: string;
  loadProfile?: boolean;
}

export interface PtyInstance {
  pid: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  pause(): void;
  resume(): void;
  kill(signal?: string): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (exitCode: number, signal?: number) => void): void;

  /**
   * The underlying node-pty process, for diagnostics only.
   *
   * The ConPTY cleanup helpers need it, and the compatibility contract test
   * needs to assert that the private shape they reach for is still the shape
   * this node-pty version has. Nothing on the serving path should read this:
   * it exposes node-pty internals with no stability guarantee. Typed `unknown`
   * so that using it requires a deliberate cast.
   */
  readonly native: unknown;
}

/** Build the environment for the PTY — allowlisted only. */
export function buildPtyEnv(sessionId: string): Record<string, string> {
  const env: Record<string, string> = {
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    KNOUX_BRIDGE_SESSION: sessionId,
  };

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue;
    if (BRIDGE_ENV_PATTERN.test(key)) continue;
    if (SECRET_ENV_PATTERN.test(key)) continue;
    if (ALLOWED_ENV.has(key)) {
      env[key] = value;
    }
  }

  return env;
}

/** Build launch arguments for the profile. */
export function buildLaunchArgs(profile: BridgeProfile, loadProfile?: boolean): string[] {
  const args = [...profile.args];
  if (profile.id === 'pwsh' || profile.id === 'powershell') {
    if (!loadProfile && !args.includes('-NoProfile')) {
      args.push('-NoProfile');
    }
    // Set UTF-8 output encoding so Arabic and symbols render.
    args.push('-Command', '[Console]::OutputEncoding = [Text.UTF8Encoding]::new();');
  }
  return args;
}

/**
 * Release the ConPTY input socket that node-pty leaves open.
 *
 * node-pty 1.1.0, `lib/windowsPtyAgent.js`, `WindowsPtyAgent.kill()`:
 *
 *   if (this._useConpty) {
 *     if (!this._useConptyDll) {
 *       this._inSocket.readable  = false;      // line 138
 *       this._outSocket.readable = false;      // line 139
 *       this._getConsoleProcessList().then(...)
 *       this._ptyNative.kill(...)
 *       this._conoutSocketWorker.dispose();
 *     } else {
 *       this._inSocket.destroy();              // line 155 — the other branch does this
 *       ...
 *     }
 *   }
 *
 * The inSocket is a `net.Socket` built from an fd opened on the ConPTY `conin`
 * named pipe (`fs.openSync(term.conin, 'w')`). Setting `.readable = false` does
 * not close it. So in the default path exactly one libuv handle per session
 * survives `kill()`, writable and never closed. It is not reclaimed when the
 * process exits, and a bridge that opens and closes sessions over a day as a
 * service accumulates one per session for the life of the process.
 *
 * The `useConptyDll` branch closes it; this branch does not. The socket is
 * reachable at `_agent.inSocket` and is a documented-enough internal that
 * destroying it after `kill()` is the only supported way to release it. Measured
 * with `process._getActiveHandles()`: one survivor before, zero after, with
 * output and exit delivery unaffected.
 *
 * Every access is guarded. If a future node-pty closes the socket itself, or
 * renames the field, this becomes a no-op rather than a crash.
 */
export function releaseConptyInputSocket(ptyProcess: unknown): boolean {
  if (process.platform !== 'win32') return false;

  const agent = (ptyProcess as { _agent?: { inSocket?: { destroyed?: boolean; destroy?: () => void } } } | null)?._agent;
  const socket = agent?.inSocket;
  if (!socket || typeof socket.destroy !== 'function') return false;
  if (socket.destroyed === true) return false;

  try {
    socket.destroy();
    return true;
  } catch {
    // The handle was already gone. Nothing to release.
    return false;
  }
}

/**
 * Close the ConPTY drain worker that node-pty can leave behind.
 *
 * `ConoutConnection` (lib/windowsConoutConnection.js) runs a Worker thread per
 * session to drain the ConPTY output pipe: draining it on the main thread
 * deadlocks against `ClosePseudoConsole`. Its `dispose()` schedules
 * `worker.terminate()` one second out and returns immediately:
 *
 *   ConoutConnection.prototype.dispose = function () {
 *     if (!this._useConptyDll && this._isDisposed) return;
 *     this._isDisposed = true;
 *     this._drainDataAndClose();     // setTimeout(_destroySocket, FLUSH_DATA_INTERVAL)
 *   };
 *
 * `WindowsPtyAgent.kill()` does call dispose(), so the worker is normally reaped a
 * second later. Not always. A session whose shell exits on its own runs
 * `_flushDataAndCleanUp` instead, and a session torn down by `taskkill` can reach
 * dispose() after the pipe is already broken; in both cases that timer never
 * completes and the Worker — with the `MessagePort` handle that represents it —
 * survives for the life of the process.
 *
 * Measured with `process._getActiveHandles()`: the terminal suite finishes with
 * 2 orphaned MessagePorts that never drain, and terminating the worker takes the
 * count to zero and lets the process exit naturally. For a bridge meant to run as
 * a service that is two worker threads per unclean shutdown, indefinitely.
 *
 * `terminate()` and `unref()` are Worker API, so the only private part is the
 * path to the Worker and to the socket whose close must gate the call.
 *
 * This reaches into node-pty's internals, which is not its API, and is guarded
 * accordingly: if a future version reaps the worker itself or renames the field,
 * this is a no-op rather than a crash.
 */
export function releaseConptyDrainWorker(ptyProcess: unknown): boolean {
  if (process.platform !== 'win32') return false;

  const agent = (ptyProcess as {
    _agent?: {
      outSocket?: { destroyed?: boolean; readyState?: string; once?: (e: string, f: () => void) => void };
      _conoutSocketWorker?: {
        _worker?: { terminate?: () => Promise<number>; unref?: () => void };
      };
    };
  } | null)?._agent;

  const worker = agent?._conoutSocketWorker?._worker;
  const outSocket = agent?.outSocket;
  if (!worker || typeof worker.terminate !== 'function' || !outSocket) return false;

  const terminate = (): void => {
    try {
      // terminate() resolves with the worker exit code. Nothing awaits it: this
      // runs on the teardown path, and an unhandled rejection from a worker that
      // is already gone would be worse than the leak it prevents. The call is
      // still what releases the handle.
      void Promise.resolve(worker.terminate?.()).catch(() => { /* already exited */ });
      worker.unref?.();
    } catch {
      // Already terminated.
    }
  };

  try {
    // Ordering matters. The worker publishes the ConPTY output pipe as a named
    // pipe that `outSocket` connects to; terminating the worker first leaves that
    // connect with nothing to reach, and the failure surfaces later as an
    // uncaught ENOENT for `\\.\pipe\conpty-*-out-worker`.
    //
    // So terminate only once the socket the worker feeds has closed. When it has
    // already closed, nothing can be waiting on the pipe any more and this runs
    // inline; otherwise it runs from the socket's own close event.
    const socketClosed = outSocket.destroyed === true || outSocket.readyState === 'closed';
    if (socketClosed) {
      terminate();
    } else if (typeof outSocket.once === 'function') {
      outSocket.once('close', terminate);
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Release every node-pty handle this session owns. Safe to call more than once. */
function releasePtyHandles(ptyProcess: unknown): void {
  releaseConptyInputSocket(ptyProcess);
  releaseConptyDrainWorker(ptyProcess);
}

/** Spawn a PTY session. */
export function spawnPty(options: SpawnOptions): PtyInstance {
  const env = buildPtyEnv(options.sessionId);
  const args = buildLaunchArgs(options.profile, options.loadProfile);

  const ptyProcess = pty.spawn(options.profile.path, args, {
    name: 'xterm-256color',
    cols: options.cols,
    rows: options.rows,
    cwd: options.cwd,
    env,
    useConpty: true,
  });

  let released = false;

  return {
    pid: ptyProcess.pid,
    native: ptyProcess,
    write: (data) => ptyProcess.write(data),
    resize: (cols, rows) => ptyProcess.resize(cols, rows),
    pause: () => ptyProcess.pause(),
    resume: () => ptyProcess.resume(),
    kill: (signal) => {
      // Idempotent: kill() can be reached from a session reap, an unpair and a
      // shutdown. Only the first call does work.
      if (released) return;
      released = true;

      // Kill the process tree before touching the pty. A shell's children
      // outlive it, and ConPTY's own cleanup enumerates them; on Windows
      // `taskkill /T` is the reliable way to take the whole tree down.
      try {
        if (process.platform === 'win32') {
          execFileSync('taskkill', ['/T', '/F', '/PID', String(ptyProcess.pid)], {
            stdio: 'ignore',
            windowsHide: true,
          });
        } else {
          try {
            process.kill(-ptyProcess.pid, signal ?? 'SIGTERM');
          } catch {
            // The process group may not exist; fall back to the process itself.
          }
        }
      } catch {
        // taskkill fails if the process already exited. The pty cleanup below
        // still releases our own handles either way.
      }

      // node-pty owns the native ConPTY handle. ptyProcess.kill() is what
      // releases it, so it must be called even when taskkill already succeeded.
      try {
        ptyProcess.kill(signal ?? (process.platform === 'win32' ? undefined : 'SIGKILL'));
      } catch {
        // Already exited; the handle cleanup below still runs.
      }

      // node-pty's own kill() leaves two ConPTY handles open on Windows: the
      // input socket and, when the drain worker cannot finish its own cleanup,
      // its worker thread. Close both, or every session costs this process
      // handles that only exit can reclaim.
      releasePtyHandles(ptyProcess);
    },
    onData: (callback) => ptyProcess.onData(callback),
    onExit: (callback) => ptyProcess.onExit(({ exitCode, signal }) => {
      // The shell exited on its own, so kill() was never called and nothing has
      // released the handles. Do it here, on the path node-pty took instead.
      releasePtyHandles(ptyProcess);
      callback(exitCode, signal);
    }),
  };
}
