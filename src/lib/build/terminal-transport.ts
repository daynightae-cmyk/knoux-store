/**
 * Terminal transport — the browser side of a bridge terminal session.
 *
 * Owns the WebSocket lifecycle and nothing else. Rendering belongs to the
 * component; this module moves bytes and reports measured facts:
 *
 *   - which stage the connection is in, with a timestamp for each transition
 *   - round-trip latency from real ping/pong exchanges
 *   - bytes in and out, counted here rather than estimated
 *   - the session the bridge assigned, from the `ready` frame it sent
 *
 * Reconnect uses a fresh ticket every attempt and resumes with the same
 * session id plus the last output seq the client saw, so the bridge replays
 * only what was missed. Backoff is 1, 2, 4, 8, then 15 seconds, and stops
 * after the bridge reports the session gone or the caller closes.
 *
 * No xterm import. The component binds `onOutput` to the terminal and calls
 * `write()` and `resize()` back. `WebSocket` is injected so tests can drive
 * the whole lifecycle without a network.
 */

import type {
  ShellProfile, TerminalClientFrame, TerminalServerFrame,
} from './bridge-protocol';

export type TerminalStage =
  | 'idle'
  | 'requesting-ticket'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'exited'
  | 'closed'
  | 'failed';

export interface TerminalSessionInfo {
  sessionId: string;
  profile: ShellProfile;
  cwd: string;
  pid: number;
}

export interface TerminalExit {
  code: number | null;
  signal: string | null;
}

export interface TerminalTimings {
  ticketRequestedAt: number | null;
  ticketReceivedAt: number | null;
  connectingAt: number | null;
  readyAt: number | null;
}

export interface TerminalStats {
  bytesIn: number;
  bytesOut: number;
  framesIn: number;
  framesOut: number;
  /** Milliseconds, from the most recent ping/pong pair. Null until measured. */
  latencyMs: number | null;
  reconnectAttempts: number;
}

export interface TerminalOpenOptions {
  profile?: ShellProfile;
  cwd?: string;
  cols?: number;
  rows?: number;
}

export interface TerminalCallbacks {
  onOutput?: (data: string) => void;
  onStage?: (stage: TerminalStage, at: number) => void;
  onSession?: (info: TerminalSessionInfo) => void;
  onExit?: (exit: TerminalExit) => void;
  onError?: (code: string, message: string) => void;
}

/** Minimal WebSocket surface this module needs. The DOM type satisfies it. */
export interface TerminalSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'message' | 'close' | 'error' | 'open', listener: (event: unknown) => void): void;
  removeEventListener(type: 'message' | 'close' | 'error' | 'open', listener: (event: unknown) => void): void;
}

/** Opaque handle returned by the injected timer. Never inspected. */
export type TimerHandle = unknown;

export interface TerminalTransportDeps {
  createSocket: (url: string) => TerminalSocket;
  now?: () => number;
  setTimeout?: (fn: () => void, ms: number) => TimerHandle;
  clearTimeout?: (handle: TimerHandle) => void;
}

/** POST /api/build/bridge/ticket and return the minted ticket plus the ws URL. */
async function requestTicket(
  options: TerminalOpenOptions & { fetchImpl?: typeof fetch },
): Promise<{ ticket: string; wsUrl: string; expiresAt: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl('/api/build/bridge/ticket', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.cwd ? { cwd: options.cwd } : {}),
    }),
  });

  if (!response.ok) {
    let message = `The ticket request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      if (typeof body.message === 'string') message = body.message;
    } catch { /* keep the status-based message */ }
    throw new TicketError(message, response.status);
  }

  const body = (await response.json()) as { ticket?: unknown; wsUrl?: unknown; expiresAt?: unknown };
  if (typeof body.ticket !== 'string' || typeof body.wsUrl !== 'string') {
    throw new TicketError('The ticket response was malformed.', 502);
  }
  return {
    ticket: body.ticket,
    wsUrl: body.wsUrl,
    expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : '',
  };
}

export class TicketError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'TicketError';
    this.status = status;
  }
}

/** Backoff schedule in milliseconds: 1, 2, 4, 8, then 15 seconds, capped. */
export function reconnectDelayMs(attempt: number): number {
  const schedule = [1000, 2000, 4000, 8000, 15000];
  return schedule[Math.min(Math.max(0, attempt), schedule.length - 1)];
}

const PING_INTERVAL_MS = 15_000;

export class TerminalTransport {
  private deps: Required<TerminalTransportDeps>;
  private callbacks: TerminalCallbacks;
  private socket: TerminalSocket | null = null;
  private stage: TerminalStage = 'idle';
  private sid: string;
  private session: TerminalSessionInfo | null = null;
  private exit: TerminalExit | null = null;
  private lastSeq = 0;
  private reconnectAttempt = 0;
  private reconnectTimer: unknown = null;
  private pingTimer: unknown = null;
  private pingSentAt: number | null = null;
  private userClosed = false;
  private options: TerminalOpenOptions & { fetchImpl?: typeof fetch };
  private timings: TerminalTimings = {
    ticketRequestedAt: null,
    ticketReceivedAt: null,
    connectingAt: null,
    readyAt: null,
  };
  private stats: TerminalStats = {
    bytesIn: 0,
    bytesOut: 0,
    framesIn: 0,
    framesOut: 0,
    latencyMs: null,
    reconnectAttempts: 0,
  };
  private listeners: Array<{ type: 'message' | 'close' | 'error' | 'open'; fn: (event: unknown) => void }> = [];

  constructor(
    callbacks: TerminalCallbacks = {},
    deps: TerminalTransportDeps,
    options: TerminalOpenOptions & { fetchImpl?: typeof fetch } = {},
  ) {
    this.callbacks = callbacks;
    this.deps = {
      createSocket: deps.createSocket,
      now: deps.now ?? Date.now,
      // Wrapped rather than assigned: the globals carry overloads that do not
      // fit the single-shape dependency type.
      setTimeout: deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms)),
      clearTimeout: deps.clearTimeout ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)),
    };
    this.options = options;
    this.sid = `web-${this.deps.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  get currentStage(): TerminalStage { return this.stage; }
  get sessionInfo(): TerminalSessionInfo | null { return this.session; }
  get lastExit(): TerminalExit | null { return this.exit; }
  get measuredTimings(): TerminalTimings { return { ...this.timings }; }
  get measuredStats(): TerminalStats {
    return { ...this.stats, reconnectAttempts: this.reconnectAttempt };
  }

  /** Open a session. A second call while live is ignored. */
  async open(options: TerminalOpenOptions & { fetchImpl?: typeof fetch } = {}): Promise<void> {
    if (this.stage === 'live' || this.stage === 'connecting' || this.stage === 'requesting-ticket') return;
    this.options = { ...this.options, ...options };
    this.userClosed = false;
    this.reconnectAttempt = 0;
    this.lastSeq = 0;
    this.session = null;
    this.exit = null;
    await this.connect(false);
  }

  /** Close the session. The bridge ends the PTY; no reconnect follows. */
  close(): void {
    this.userClosed = true;
    this.clearTimers();
    if (this.socket) {
      try {
        if (this.socket.readyState === 1) {
          this.socket.send(JSON.stringify({ t: 'close' } satisfies TerminalClientFrame));
        }
      } catch { /* the socket is already gone */ }
      try { this.socket.close(1000, 'Closed by client'); } catch { /* already closed */ }
      this.detach();
    }
    // A session that never connected has no socket to close through.
    if (this.stage !== 'exited') this.setStage('closed');
  }

  /** Write user input to the PTY. Returns false when there is no live session. */
  write(data: string): boolean {
    if (!this.socket || this.socket.readyState !== 1 || !this.session) return false;
    try {
      this.socket.send(JSON.stringify({ t: 'input', d: data } satisfies TerminalClientFrame));
      this.stats.bytesOut += data.length;
      this.stats.framesOut += 1;
      return true;
    } catch {
      return false;
    }
  }

  /** Resize the PTY. Returns false when there is no live session. */
  resize(cols: number, rows: number): boolean {
    if (!this.socket || this.socket.readyState !== 1 || !this.session) return false;
    try {
      this.socket.send(JSON.stringify({ t: 'resize', cols, rows } satisfies TerminalClientFrame));
      return true;
    } catch {
      return false;
    }
  }

  private async connect(isResume: boolean): Promise<void> {
    this.setStage(isResume ? 'reconnecting' : 'requesting-ticket');
    this.timings.ticketRequestedAt = this.deps.now();

    let ticket: string;
    let wsUrl: string;
    try {
      const issued = await requestTicket(this.options);
      ticket = issued.ticket;
      wsUrl = issued.wsUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The ticket request failed.';
      this.callbacks.onError?.('ticket-failed', message);
      this.setStage('failed');
      return;
    }
    this.timings.ticketReceivedAt = this.deps.now();

    if (this.userClosed) return;

    this.setStage('connecting');
    this.timings.connectingAt = this.deps.now();

    const params = new URLSearchParams({ ticket });
    // A resume names the session and the last seq seen, so the bridge replays
    // only what was missed. A fresh open names neither and gets a new shell.
    if (isResume && this.session) {
      params.set('session', this.session.sessionId);
      params.set('from', String(this.lastSeq));
    }
    const cols = this.options.cols ?? 80;
    const rows = this.options.rows ?? 24;
    params.set('cols', String(cols));
    params.set('rows', String(rows));

    const socket = this.deps.createSocket(`${wsUrl}/v1/terminal?${params.toString()}`);
    this.socket = socket;

    const onMessage = (event: unknown) => this.handleMessage(event);
    const onClose = (event: unknown) => this.handleClose(event);
    const onError = () => this.handleSocketError();
    this.listeners = [
      { type: 'message', fn: onMessage },
      { type: 'close', fn: onClose },
      { type: 'error', fn: onError },
    ];
    for (const { type, fn } of this.listeners) socket.addEventListener(type, fn);
  }

  private handleMessage(event: unknown): void {
    const raw = typeof event === 'string'
      ? event
      : (event as { data?: unknown }).data;
    if (typeof raw !== 'string') return;

    let frame: TerminalServerFrame;
    try {
      frame = JSON.parse(raw) as TerminalServerFrame;
    } catch {
      return;
    }

    this.stats.framesIn += 1;

    switch (frame.t) {
      case 'ready':
        this.session = {
          sessionId: frame.sessionId,
          profile: frame.profile,
          cwd: frame.cwd,
          pid: frame.pid,
        };
        this.timings.readyAt = this.deps.now();
        this.callbacks.onSession?.(this.session);
        this.setStage('live');
        this.reconnectAttempt = 0;
        this.startPing();
        break;

      case 'output':
        this.lastSeq = Math.max(this.lastSeq, frame.seq);
        this.stats.bytesIn += frame.d.length;
        this.callbacks.onOutput?.(frame.d);
        // Confirm receipt so the bridge's ring accounting can track it.
        this.send({ t: 'ack', seq: frame.seq });
        break;

      case 'replay':
        for (const replayed of frame.frames) {
          if (replayed.t === 'output') {
            this.lastSeq = Math.max(this.lastSeq, replayed.seq);
            this.stats.bytesIn += replayed.d.length;
            this.callbacks.onOutput?.(replayed.d);
          }
        }
        this.send({ t: 'ack', seq: this.lastSeq });
        break;

      case 'pong':
        if (this.pingSentAt !== null) {
          this.stats.latencyMs = this.deps.now() - this.pingSentAt;
          this.pingSentAt = null;
        }
        break;

      case 'exit':
        this.exit = { code: frame.code, signal: frame.signal };
        this.callbacks.onExit?.(this.exit);
        this.setStage('exited');
        this.clearTimers();
        break;

      case 'error':
        this.callbacks.onError?.(frame.code, `The bridge reported: ${frame.code}.`);
        break;

      default:
        break;
    }
  }

  private handleClose(event: unknown): void {
    this.detach();
    this.clearTimers();

    // The session ended cleanly on the bridge side, or the user closed it.
    if (this.stage === 'exited' || this.userClosed) return;

    // A close code from the bridge in the 4000 range is a refusal, not a drop:
    // reconnecting with a fresh ticket would fail the same way.
    const code = (event as { code?: unknown }).code;
    if (typeof code === 'number' && code >= 4000 && code < 5000) {
      this.callbacks.onError?.('refused', `The bridge refused the connection (code ${code}).`);
      this.setStage('failed');
      return;
    }

    // Otherwise the socket dropped and the session may still be alive on the
    // bridge, retained for its detach TTL. Resume it.
    this.scheduleReconnect();
  }

  private handleSocketError(): void {
    // The close event follows with the detail; there is nothing to do here but
    // avoid an unhandled error on sockets that throw on failure.
  }

  private scheduleReconnect(): void {
    if (this.userClosed || !this.session) {
      // No session to resume means there is nothing a reconnect could reattach
      // to. Report the failure rather than opening a new shell unasked.
      this.setStage(this.session ? 'reconnecting' : 'failed');
      if (!this.session) {
        this.callbacks.onError?.('disconnected', 'The connection dropped before a session was assigned.');
      }
      return;
    }

    const delay = reconnectDelayMs(this.reconnectAttempt);
    this.setStage('reconnecting');
    this.reconnectTimer = this.deps.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.userClosed) return;
      this.reconnectAttempt += 1;
      void this.connect(true);
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    const tick = (): void => {
      if (!this.socket || this.socket.readyState !== 1) return;
      this.pingSentAt = this.deps.now();
      try {
        this.socket.send(JSON.stringify({ t: 'ping' } satisfies TerminalClientFrame));
      } catch {
        this.pingSentAt = null;
      }
      this.pingTimer = this.deps.setTimeout(tick, PING_INTERVAL_MS);
    };
    this.pingTimer = this.deps.setTimeout(tick, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      this.deps.clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }
    this.pingSentAt = null;
  }

  private send(frame: TerminalClientFrame): void {
    try {
      this.socket?.send(JSON.stringify(frame));
    } catch { /* the socket is gone; the close handler owns what happens next */ }
  }

  private detach(): void {
    if (this.socket) {
      for (const { type, fn } of this.listeners) {
        try { this.socket.removeEventListener(type, fn); } catch { /* already gone */ }
      }
      this.listeners = [];
      this.socket = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== null) {
      this.deps.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
  }

  private setStage(stage: TerminalStage): void {
    this.stage = stage;
    this.callbacks.onStage?.(stage, this.deps.now());
  }
}
