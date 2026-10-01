/**
 * Supervised process registry — the source of truth for `proc:*` and `logs:*`.
 *
 * Every entry here corresponds to a real OS child process owned by the bridge.
 * Status is derived from the child's own lifecycle events, never invented:
 *   - spawned and not exited  → running
 *   - exited with 0            → stopped
 *   - exited non-zero / killed → failed
 *
 * stdout and stderr are captured into bounded ring buffers so `logs:read`
 * returns what the process actually emitted. Nothing is synthesized: a process
 * that produced no output returns an empty log.
 */

import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ProcessInfo } from '../protocol.js';

export interface ProcessProfile {
  cmd: string;
  args: string[];
  port?: number;
}

export interface LogLine {
  stream: 'stdout' | 'stderr';
  data: string;
  at: number;
}

interface ManagedProcess {
  name: string;
  profile: ProcessProfile;
  cwd: string;
  child: ChildProcess | null;
  pid: number | null;
  startedAt: number | null;
  stoppedAt: number | null;
  exitCode: number | null;
  signal: string | null;
  status: 'running' | 'stopped' | 'failed';
  restarts: number;
  logs: LogLine[];
  logBytes: number;
  /** True once the user asked for a stop — suppresses crash classification. */
  stopping: boolean;
}

export interface ProcessRegistryOptions {
  cwd: string;
  /** Per-process stdout/stderr ring buffer size. */
  maxLogBytes?: number;
  /** Cap on automatic restarts after an unexpected exit. */
  maxRestarts?: number;
  onAudit?: (action: string, target: string, outcome: 'success' | 'failure' | 'denied', detail: string) => void;
}

const DEFAULT_MAX_LOG_BYTES = 256 * 1024;
const DEFAULT_MAX_RESTARTS = 3;

export class ProcessRegistry extends EventEmitter {
  private processes = new Map<string, ManagedProcess>();
  private cwd: string;
  private maxLogBytes: number;
  private maxRestarts: number;
  private onAudit: ProcessRegistryOptions['onAudit'];

  constructor(options: ProcessRegistryOptions) {
    super();
    this.cwd = options.cwd;
    this.maxLogBytes = options.maxLogBytes ?? DEFAULT_MAX_LOG_BYTES;
    this.maxRestarts = options.maxRestarts ?? DEFAULT_MAX_RESTARTS;
    this.onAudit = options.onAudit;
  }

  /** Names of every configured profile, running or not. */
  names(): string[] {
    return [...this.processes.keys()];
  }

  /** Real status for one process. */
  info(name: string): ProcessInfo | null {
    const p = this.processes.get(name);
    if (!p) return null;
    return {
      name: p.name,
      pid: p.pid,
      status: p.status,
      port: p.profile.port ?? null,
      uptime: p.startedAt && p.status === 'running' ? Math.floor((Date.now() - p.startedAt) / 1000) : null,
      exitCode: p.exitCode,
      restarts: p.restarts,
      cmd: p.profile.cmd,
      args: p.profile.args,
    };
  }

  /** Real status for every known process, in configuration order. */
  list(): ProcessInfo[] {
    return [...this.processes.values()].map((p) => this.info(p.name)!);
  }

  /** Register a profile without starting it, so `proc:list` can report it as stopped. */
  register(name: string, profile: ProcessProfile): void {
    const existing = this.processes.get(name);
    if (existing) {
      existing.profile = profile;
      return;
    }
    this.processes.set(name, {
      name,
      profile,
      cwd: this.cwd,
      child: null,
      pid: null,
      startedAt: null,
      stoppedAt: null,
      exitCode: null,
      signal: null,
      status: 'stopped',
      restarts: 0,
      logs: [],
      logBytes: 0,
      stopping: false,
    });
  }

  /** Start a registered process. Returns the measured status, or a failure reason. */
  start(name: string): { ok: true; info: ProcessInfo } | { ok: false; reason: string } {
    const p = this.processes.get(name);
    if (!p) return { ok: false, reason: `No process profile named "${name}".` };
    if (p.status === 'running' && p.pid !== null) {
      return { ok: false, reason: `"${name}" is already running (pid ${p.pid}).` };
    }

    let child: ChildProcess;
    try {
      child = spawn(p.profile.cmd, p.profile.args, {
        cwd: p.cwd,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err) {
      // The spawn error text stays in the audit log. The caller gets a generic
      // reason: exception text routinely names paths and environment details.
      this.onAudit?.('proc.start', name, 'failure', err instanceof Error ? err.message : 'spawn failed');
      return { ok: false, reason: `The process "${name}" could not be started.` };
    }

    p.child = child;
    p.pid = child.pid ?? null;
    p.startedAt = Date.now();
    p.stoppedAt = null;
    p.exitCode = null;
    p.signal = null;
    p.status = 'running';
    p.stopping = false;

    child.stdout?.on('data', (chunk: Buffer) => this.appendLog(p, 'stdout', chunk));
    child.stderr?.on('data', (chunk: Buffer) => this.appendLog(p, 'stderr', chunk));

    child.on('error', (err) => {
      this.appendLog(p, 'stderr', Buffer.from(`${err.message}\n`));
      p.status = 'failed';
      p.stoppedAt = Date.now();
      p.child = null;
      p.pid = null;
      this.onAudit?.('proc.start', name, 'failure', err.message);
      this.emit('changed', name);
    });

    child.on('close', (code, signal) => {
      const wasStopping = p.stopping;
      p.child = null;
      p.pid = null;
      p.exitCode = code;
      p.signal = signal ? String(signal) : null;
      p.stoppedAt = Date.now();
      p.status = wasStopping || code === 0 ? 'stopped' : 'failed';

      this.onAudit?.(
        'proc.exit',
        name,
        wasStopping || code === 0 ? 'success' : 'failure',
        `pid ${p.pid ?? 'unknown'} exited code=${String(code)} signal=${String(signal)}`,
      );
      this.emit('exit', name, code, signal);

      // Bounded automatic restart for non-zero exits that the user did not ask for.
      if (!wasStopping && code !== 0 && code !== null && p.restarts < this.maxRestarts) {
        p.restarts += 1;
        this.onAudit?.('proc.restart', name, 'success', `restart ${p.restarts}/${this.maxRestarts} after exit ${code}`);
        this.start(name);
        return;
      }
      this.emit('changed', name);
    });

    this.onAudit?.('proc.start', name, 'success', `started pid ${String(p.pid)} (${p.profile.cmd})`);
    this.emit('changed', name);
    return { ok: true, info: this.info(name)! };
  }

  /**
   * Stop a running process, escalating SIGTERM → kill after `graceMs`.
   * Reports whether a real process was signalled.
   */
  stop(name: string, graceMs = 5000): { ok: boolean; reason?: string } {
    const p = this.processes.get(name);
    if (!p) return { ok: false, reason: `No process profile named "${name}".` };
    if (!p.child || p.pid === null) {
      return { ok: false, reason: `"${name}" is not running.` };
    }

    const pid = p.pid;
    p.stopping = true;

    try {
      if (process.platform === 'win32') {
        // /T takes the whole process tree down, which a bare kill would orphan.
        fireAndForget('taskkill', ['/PID', String(pid), '/T']);
      } else {
        process.kill(-pid, 'SIGTERM');
      }
    } catch {
      try { p.child.kill('SIGTERM'); } catch { /* already gone */ }
    }

    const timer = setTimeout(() => {
      if (!p.child) return;
      try {
        if (process.platform === 'win32') {
          fireAndForget('taskkill', ['/F', '/T', '/PID', String(pid)]);
        } else {
          process.kill(-pid, 'SIGKILL');
        }
      } catch { /* already gone */ }
    }, graceMs);
    timer.unref?.();

    this.onAudit?.('proc.stop', name, 'success', `signalled pid ${pid}`);
    return { ok: true };
  }

  /** Explicit restart. Counts toward `restarts`. */
  restart(name: string): { ok: true; info: ProcessInfo } | { ok: false; reason: string } {
    const p = this.processes.get(name);
    if (!p) return { ok: false, reason: `No process profile named "${name}".` };
    if (p.status === 'running') {
      this.stop(name, 0);
    }
    p.restarts += 1;
    return this.start(name);
  }

  /** Real captured output for one process. */
  logs(name: string, since = 0, limit = 500): LogLine[] | null {
    const p = this.processes.get(name);
    if (!p) return null;
    const filtered = p.logs.filter((l) => l.at >= since);
    return filtered.slice(Math.max(0, filtered.length - limit));
  }

  /** Terminate every supervised process. Used on shutdown and unpair. */
  stopAll(): void {
    for (const name of this.processes.keys()) {
      this.stop(name, 2000);
    }
  }

  private appendLog(p: ManagedProcess, stream: 'stdout' | 'stderr', chunk: Buffer): void {
    const data = chunk.toString('utf8');
    if (!data) return;
    for (const line of splitKeepingTail(data)) {
      p.logs.push({ stream, data: line, at: Date.now() });
      p.logBytes += line.length;
    }
    while (p.logBytes > this.maxLogBytes && p.logs.length > 0) {
      p.logBytes -= p.logs.shift()!.data.length;
    }
    this.emit('log', p.name, stream, data);
  }
}

/** Split a chunk into lines, keeping the trailing partial line buffered via empty tail. */
function splitKeepingTail(data: string): string[] {
  return data.split(/(?<=\n)/).filter((s) => s.length > 0);
}

/** Fire-and-forget execFile. The child's own close event is the real signal. */
function fireAndForget(cmd: string, args: string[]): void {
  execFile(cmd, args, { windowsHide: true, timeout: 5000 }, () => { /* outcome arrives via close */ });
}