/**
 * PTY session lifecycle.
 *
 * A session owns one real PTY process, a bounded scrollback ring, and a
 * detach/attach cycle. Closing a browser socket detaches the session rather
 * than destroying it: the shell keeps running and the client can resume by
 * naming the session id and the last seq it saw. The reaper is the only thing
 * that ends a detached session — on idle timeout, max lifetime, or the session
 * having nothing left to resume to.
 *
 * All state is in memory by design. A restarted bridge has no sessions, and
 * `alive()` never claims otherwise.
 */

import { randomUUID } from 'node:crypto';
import type { BridgeLimits } from '../policy.js';
import type { PtyInstance } from './spawn.js';
import type { BridgeProfile, TerminalServerFrame } from '../protocol.js';

export interface Session {
  id: string;
  profile: BridgeProfile;
  cwd: string;
  pid: number;
  startedAt: number;
  lastActivityAt: number;
  /** When the last socket detached; null while attached. */
  detachedAt: number | null;
  /** How many times this session has been resumed. */
  attachments: number;
  pty: PtyInstance;
  scrollback: TerminalServerFrame[];
  scrollbackBytes: number;
  /** Monotonic output sequence. Clients resume with from = last seq seen. */
  seq: number;
  /** Highest seq a client has acknowledged receiving. */
  ackedSeq: number;
  bytesIn: number;
  bytesOut: number;
  killed: boolean;
  killReason: string | null;
}

export interface SessionManagerOptions {
  limits: BridgeLimits;
  onSessionEnd: (session: Session) => void;
  /** Reap interval. Defaults to 30s. */
  reapIntervalMs?: number;
}

const DEFAULT_REAP_INTERVAL_MS = 30_000;

export class SessionManager {
  private sessions = new Map<string, Session>();
  private limits: BridgeLimits;
  private onSessionEnd: (session: Session) => void;
  private reaper: ReturnType<typeof setInterval>;

  constructor(options: SessionManagerOptions) {
    this.limits = options.limits;
    this.onSessionEnd = options.onSessionEnd;
    this.reaper = setInterval(() => this.reap(), options.reapIntervalMs ?? DEFAULT_REAP_INTERVAL_MS);
    // Never hold the process open just to reap.
    this.reaper.unref?.();
  }

  /**
   * Create a session, enforcing maxSessions by refusing rather than silently
   * killing someone's working shell.
   */
  create(profile: BridgeProfile, cwd: string, pty: PtyInstance): { ok: true; session: Session } | { ok: false; reason: string } {
    if (this.sessions.size >= this.limits.maxSessions) {
      return { ok: false, reason: `The maximum of ${this.limits.maxSessions} sessions is already open.` };
    }

    const now = Date.now();
    const session: Session = {
      id: randomUUID(),
      profile,
      cwd,
      pid: pty.pid,
      startedAt: now,
      lastActivityAt: now,
      detachedAt: null,
      attachments: 1,
      pty,
      scrollback: [],
      scrollbackBytes: 0,
      seq: 0,
      ackedSeq: 0,
      bytesIn: 0,
      bytesOut: 0,
      killed: false,
      killReason: null,
    };

    this.sessions.set(session.id, session);
    return { ok: true, session };
  }

  get(id: string): Session | undefined {
    const session = this.sessions.get(id);
    return session && !session.killed ? session : undefined;
  }

  all(): Session[] {
    return [...this.sessions.values()].filter((s) => !s.killed);
  }

  /** Mark a socket as attached to this session. */
  attach(id: string): void {
    const session = this.sessions.get(id);
    if (!session || session.killed) return;
    session.detachedAt = null;
    session.lastActivityAt = Date.now();
    session.attachments += 1;
  }

  /** Mark a socket as detached. The PTY keeps running. */
  detach(id: string): void {
    const session = this.sessions.get(id);
    if (!session || session.killed) return;
    session.detachedAt = Date.now();
  }

  /** Write client input to the PTY. */
  write(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session || session.killed) return false;
    session.bytesIn += data.length;
    session.lastActivityAt = Date.now();
    try {
      session.pty.write(data);
      return true;
    } catch {
      // The PTY died between the check and the write.
      this.kill(id, 'write-failed');
      return false;
    }
  }

  /** Resize the PTY. Clamped to a sane terminal geometry. */
  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session || session.killed) return false;
    const c = Math.min(500, Math.max(20, Math.round(cols)));
    const r = Math.min(200, Math.max(5, Math.round(rows)));
    session.lastActivityAt = Date.now();
    try {
      session.pty.resize(c, r);
      return true;
    } catch {
      this.kill(id, 'resize-failed');
      return false;
    }
  }

  /**
   * Append PTY output to the ring and return the frame to send.
   * Returns null when the session is gone — the caller then has nothing to send.
   */
  appendOutput(id: string, data: string): TerminalServerFrame | null {
    const session = this.sessions.get(id);
    if (!session || session.killed) return null;

    session.seq += 1;
    session.bytesOut += data.length;
    session.lastActivityAt = Date.now();

    const frame: TerminalServerFrame = { t: 'output', d: data, seq: session.seq };
    session.scrollback.push(frame);
    session.scrollbackBytes += data.length;

    // Evict the oldest frames once the ring exceeds its byte budget.
    while (session.scrollbackBytes > this.limits.scrollbackBytes && session.scrollback.length > 1) {
      const removed = session.scrollback.shift();
      session.scrollbackBytes -= removed && removed.t === 'output' ? removed.d.length : 0;
    }

    return frame;
  }

  /** Frames with seq > fromSeq. An empty array means the client is current. */
  replay(id: string, fromSeq: number): TerminalServerFrame[] {
    const session = this.sessions.get(id);
    if (!session || session.killed) return [];
    return session.scrollback.filter((f) => f.t === 'output' && f.seq > fromSeq);
  }

  /** Record that a client has received everything up to seq. */
  acknowledge(id: string, seq: number): void {
    const session = this.sessions.get(id);
    if (!session || session.killed) return;
    if (seq > session.ackedSeq) session.ackedSeq = seq;
  }

  /** End a session and free its PTY. Idempotent. */
  kill(id: string, reason = 'unknown'): void {
    const session = this.sessions.get(id);
    if (!session || session.killed) return;
    session.killed = true;
    session.killReason = reason;
    this.sessions.delete(id);
    try {
      session.pty.kill();
    } catch { /* the process is already gone */ }
    this.onSessionEnd(session);
  }

  killAll(reason = 'kill-all'): void {
    for (const session of [...this.sessions.values()]) {
      this.kill(session.id, reason);
    }
  }

  /**
   * End sessions that have outlived their limits.
   *
   * A detached session past detachTtlMinutes is ended. An attached session is
   * only ended by idle timeout or max lifetime, so an open terminal is not
   * killed while someone is watching it.
   */
  private reap(): void {
    const now = Date.now();
    const idleMs = this.limits.idleTimeoutMinutes * 60_000;
    const lifetimeMs = this.limits.maxLifetimeHours * 3_600_000;
    const detachMs = this.limits.detachTtlMinutes * 60_000;

    for (const session of [...this.sessions.values()]) {
      if (session.killed) continue;
      if (now - session.startedAt > lifetimeMs) {
        this.kill(session.id, 'max-lifetime');
        continue;
      }
      if (session.detachedAt !== null && now - session.detachedAt > detachMs) {
        this.kill(session.id, 'detach-timeout');
        continue;
      }
      if (now - session.lastActivityAt > idleMs) {
        this.kill(session.id, 'idle-timeout');
      }
    }
  }

  /** A snapshot for diagnostics. Contains no secrets and no output content. */
  describe(): Array<{
    id: string;
    profile: string;
    pid: number;
    startedAt: number;
    detached: boolean;
    attachments: number;
    seq: number;
    ackedSeq: number;
    bytesIn: number;
    bytesOut: number;
  }> {
    return this.all().map((s) => ({
      id: s.id,
      profile: s.profile.id,
      pid: s.pid,
      startedAt: s.startedAt,
      detached: s.detachedAt !== null,
      attachments: s.attachments,
      seq: s.seq,
      ackedSeq: s.ackedSeq,
      bytesIn: s.bytesIn,
      bytesOut: s.bytesOut,
    }));
  }

  dispose(): void {
    clearInterval(this.reaper);
    this.killAll('shutdown');
  }
}