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

  return {
    pid: ptyProcess.pid,
    write: (data) => ptyProcess.write(data),
    resize: (cols, rows) => ptyProcess.resize(cols, rows),
    pause: () => ptyProcess.pause(),
    resume: () => ptyProcess.resume(),
    kill: (signal) => {
      // node-pty owns a native ConPTY (Windows) or pty (POSIX) handle. That
      // handle is only released by ptyProcess.kill(); killing the OS process
      // alone leaves the native handle open, which keeps the bridge process
      // alive at shutdown. Both are required.
      try {
        if (process.platform === 'win32') {
          // Kill the whole process tree first — a shell's children outlive it.
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
        // taskkill can fail if the process already exited. Killing the pty
        // below still releases the handle.
      }

      try {
        ptyProcess.kill(signal ?? (process.platform === 'win32' ? undefined : 'SIGKILL'));
      } catch {
        // Already exited; nothing to release.
      }
    },
    onData: (callback) => ptyProcess.onData(callback),
    onExit: (callback) => ptyProcess.onExit(({ exitCode, signal }) => callback(exitCode, signal)),
  };
}
