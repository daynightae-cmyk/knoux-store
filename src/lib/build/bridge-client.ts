/**
 * Bridge client — the BFF's server-side view of a bridge.
 *
 * Every call carries a short-lived Ed25519-signed ticket minted for exactly the
 * scope that route requires. The client never forwards bridge error text
 * verbatim: paths and secret-shaped values are redacted on the way out.
 *
 * A `BridgeClient` is bound to one bridge endpoint. Reachability is measured by
 * `health()` and by the handshake, never assumed.
 *
 * Server-only. Never imported by a client component.
 */

import type {
  Handshake, PairResponse, MetricsSample, GitSnapshot, ProcessInfo,
  AuditEntry, FsEntry, FsReadResult, ProcessLogLine, ExecEvent, ShellProfile,
} from './bridge-protocol';

export interface BridgeEndpoint {
  /** Origin only, no trailing slash, e.g. http://127.0.0.1:7331 */
  url: string;
  bridgeId: string;
  fingerprint: string;
}

export interface BridgeClientOptions {
  endpoint: BridgeEndpoint;
  /** Issuer signing key (PKCS8 PEM). Used for `pair`, and for status reporting. */
  signingKey: string;
  /** Default request timeout. Terminal streams pass their own. */
  timeoutMs?: number;
  /** Injected for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export interface BridgeRequest {
  method: string;
  path: string;
  body?: unknown;
  token?: string;
  timeoutMs?: number;
  /** Server-sent events. Resolves to the raw stream instead of parsed JSON. */
  stream?: boolean;
}

export interface BridgeResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  /** Safe to surface to the user: redacted, and never a raw bridge stack. */
  error?: string;
}

/**
 * Strip filesystem paths and secret-shaped values from bridge error text.
 * A bridge error can name a path the user should not be shown verbatim.
 */
export function redactBridgeError(message: string): string {
  return message
    .replace(/[A-Za-z]:\\[^\s'"]+/g, '[PATH]')
    .replace(/(?:^|\s)\/[^\s'"]+/g, ' [PATH]')
    .replace(
      /\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE)[A-Z0-9_]*)\s*[=:]\s*\S+/gi,
      '$1=[REDACTED]',
    );
}

/** Parse an SSE stream into ordered `ExecEvent`s. */
export async function* parseExecStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ExecEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawFrame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let eventName = 'message';
        const dataLines: string[] = [];
        for (const line of rawFrame.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        if (dataLines.length > 0) {
          try {
            const parsed = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
            // The event name is authoritative; fall back to a payload type field.
            const type = (eventName !== 'message' ? eventName : parsed.type) as ExecEvent['type'];
            yield { ...parsed, type } as ExecEvent;
          } catch {
            // A malformed frame is skipped rather than aborting the whole run.
          }
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class BridgeClient {
  private endpoint: BridgeEndpoint;
  private signingKey: string;
  private timeoutMs: number;
  private fetchImpl: typeof fetch;

  constructor(options: BridgeClientOptions) {
    this.endpoint = options.endpoint;
    this.signingKey = options.signingKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get bridgeId(): string {
    return this.endpoint.bridgeId;
  }

  get url(): string {
    return this.endpoint.url;
  }

  /** Make a request. Reads are retried once on a transport failure, never writes. */
  async request<T = unknown>(req: BridgeRequest): Promise<BridgeResponse<T>> {
    const isRead = req.method === 'GET' || req.method === 'HEAD';
    const attempts = isRead ? 2 : 1;

    let lastError = 'The bridge did not respond.';
    for (let attempt = 0; attempt < attempts; attempt++) {
      const result = await this.attempt<T>(req);
      if (result.ok) return result;
      lastError = result.error ?? lastError;
      // Only a transport failure (status 0) is worth retrying. A 403 is final.
      if (result.status !== 0) return result;
    }
    return { ok: false, status: 0, error: lastError };
  }

  private async attempt<T>(req: BridgeRequest): Promise<BridgeResponse<T>> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (req.token) headers['authorization'] = `Bearer ${req.token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.endpoint.url}${req.path}`, {
        method: req.method,
        headers,
        body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
        cache: 'no-store',
      });

      if (req.stream) {
        if (!response.ok) {
          return { ok: false, status: response.status, error: await this.readError(response) };
        }
        if (!response.body) {
          return { ok: false, status: response.status, error: 'The bridge returned no stream.' };
        }
        // The caller consumes the stream; the timer must not outlive this call.
        clearTimeout(timer);
        return { ok: true, status: response.status, data: response.body as unknown as T };
      }

      const text = await response.text();
      let data: T | undefined;
      if (text.length > 0) {
        try {
          data = JSON.parse(text) as T;
        } catch {
          data = text as unknown as T;
        }
      }

      if (!response.ok) {
        const message = extractErrorMessage(data) ?? `Bridge responded with status ${response.status}.`;
        return { ok: false, status: response.status, error: redactBridgeError(message) };
      }

      return { ok: true, status: response.status, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        status: 0,
        error: /abort/i.test(message)
          ? 'The bridge did not respond in time.'
          : redactBridgeError(message),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async readError(response: Response): Promise<string> {
    try {
      const text = await response.text();
      try {
        return extractErrorMessage(JSON.parse(text)) ?? `Bridge responded with status ${response.status}.`;
      } catch {
        return `Bridge responded with status ${response.status}.`;
      }
    } catch {
      return `Bridge responded with status ${response.status}.`;
    }
  }

  // -------------------------------------------------------------------------
  // Unauthenticated probes
  // -------------------------------------------------------------------------

  /**
   * Liveness. `/v1/health` needs no ticket and reports only that the process is
   * running. A 200 here does not mean paired — check the handshake for that.
   */
  async health(timeoutMs = 3000): Promise<BridgeResponse<{ status: string; bridgeId: string; uptimeSeconds: number; sessionCount: number }>> {
    return this.request({ method: 'GET', path: '/v1/health', timeoutMs });
  }

  /**
   * Full handshake. Requires a ticket, so this is the real "is this bridge
   * paired to us and what can it do" probe.
   */
  async handshake(token: string): Promise<BridgeResponse<Handshake>> {
    return this.request<Handshake>({ method: 'GET', path: '/v1/handshake', token });
  }

  /** Pair using a code from `knoux-bridge init`. No ticket exists yet. */
  async pair(code: string, issuerPublicKey: string): Promise<BridgeResponse<PairResponse>> {
    return this.request<PairResponse>({
      method: 'POST',
      path: '/v1/pair',
      body: { code: code.trim().toUpperCase(), issuerPublicKey },
      timeoutMs: 15_000,
    });
  }

  async unpair(token: string): Promise<BridgeResponse<{ ok: boolean; removedIssuers: number }>> {
    return this.request({ method: 'POST', path: '/v1/unpair', token });
  }

  // -------------------------------------------------------------------------
  // Filesystem
  // -------------------------------------------------------------------------

  async fsList(token: string, dirPath: string): Promise<BridgeResponse<{ entries: FsEntry[]; path: string }>> {
    return this.request({ method: 'GET', path: `/v1/fs/list?path=${encodeURIComponent(dirPath)}`, token });
  }

  async fsRead(token: string, filePath: string): Promise<BridgeResponse<FsReadResult>> {
    return this.request({ method: 'GET', path: `/v1/fs/read?path=${encodeURIComponent(filePath)}`, token });
  }

  async fsWrite(
    token: string,
    path: string,
    content: string,
    expectedHash?: string,
  ): Promise<BridgeResponse<{ ok: boolean; hash: string; bytes: number }>> {
    return this.request({ method: 'POST', path: '/v1/fs/write', body: { path, content, expectedHash }, token });
  }

  async fsDelete(token: string, path: string, recursive = false): Promise<BridgeResponse<{ ok: boolean; path: string }>> {
    return this.request({ method: 'POST', path: '/v1/fs/delete', body: { path, recursive }, token });
  }

  // -------------------------------------------------------------------------
  // Git
  // -------------------------------------------------------------------------

  async gitStatus(token: string): Promise<BridgeResponse<GitSnapshot>> {
    return this.request({ method: 'GET', path: '/v1/git/status', token });
  }

  async gitLog(token: string, limit = 20): Promise<BridgeResponse<{ commits: GitSnapshot['commits'] }>> {
    return this.request({ method: 'GET', path: `/v1/git/log?limit=${limit}`, token });
  }

  async gitBranch(token: string, name: string, create = false): Promise<BridgeResponse<{ ok: boolean; branch: string }>> {
    return this.request({ method: 'POST', path: '/v1/git/branch', body: { name, create }, token });
  }

  // -------------------------------------------------------------------------
  // Exec — streams SSE
  // -------------------------------------------------------------------------

  async execRun(
    token: string,
    task: string,
    cwd?: string,
  ): Promise<BridgeResponse<ReadableStream<Uint8Array>>> {
    return this.request<ReadableStream<Uint8Array>>({
      method: 'POST',
      path: '/v1/exec/run',
      body: cwd ? { task, cwd } : { task },
      token,
      stream: true,
      // A build task legitimately runs for minutes.
      timeoutMs: 300_000,
    });
  }

  // -------------------------------------------------------------------------
  // Supervised processes
  // -------------------------------------------------------------------------

  async procList(token: string): Promise<BridgeResponse<{ processes: ProcessInfo[] }>> {
    return this.request({ method: 'GET', path: '/v1/proc/list', token });
  }

  async procStart(token: string, name: string): Promise<BridgeResponse<ProcessInfo>> {
    return this.request({ method: 'POST', path: '/v1/proc/start', body: { name }, token });
  }

  async procStop(token: string, name: string): Promise<BridgeResponse<{ ok: boolean; stopping: string; info: ProcessInfo | null }>> {
    return this.request({ method: 'POST', path: '/v1/proc/stop', body: { name }, token });
  }

  async procRestart(token: string, name: string): Promise<BridgeResponse<ProcessInfo>> {
    return this.request({ method: 'POST', path: '/v1/proc/restart', body: { name }, token });
  }

  async logs(token: string, name: string, since = 0, limit = 500): Promise<BridgeResponse<{ name: string; lines: ProcessLogLine[]; info: ProcessInfo | null }>> {
    return this.request({
      method: 'GET',
      path: `/v1/logs?name=${encodeURIComponent(name)}&since=${since}&limit=${limit}`,
      token,
    });
  }

  // -------------------------------------------------------------------------
  // Metrics and audit
  // -------------------------------------------------------------------------

  async metrics(token: string): Promise<BridgeResponse<MetricsSample>> {
    return this.request<MetricsSample>({ method: 'GET', path: '/v1/metrics', token, timeoutMs: 8000 });
  }

  async audit(token: string, limit = 100): Promise<BridgeResponse<{ entries: AuditEntry[] }>> {
    return this.request({ method: 'GET', path: `/v1/audit?limit=${limit}`, token });
  }

  // -------------------------------------------------------------------------
  // Terminal
  // -------------------------------------------------------------------------

  /**
   * Build the terminal WebSocket URL. The ticket travels as a query parameter
   * because browsers cannot set headers on a WebSocket handshake.
   *
   * The ticket is single-use and 60s-lived, so a reconnect mints a fresh one.
   */
  terminalUrl(options: {
    ticket: string;
    sessionId?: string;
    fromSeq?: number;
    cols?: number;
    rows?: number;
  }): string {
    const params = new URLSearchParams({ ticket: options.ticket });
    if (options.sessionId) params.set('session', options.sessionId);
    if (options.fromSeq !== undefined) params.set('from', String(options.fromSeq));
    if (options.cols !== undefined) params.set('cols', String(options.cols));
    if (options.rows !== undefined) params.set('rows', String(options.rows));
    const base = this.endpoint.url.replace(/^http/, 'ws');
    return `${base}/v1/terminal?${params.toString()}`;
  }

  /** Pairing needs no ticket, so `signingKey` is not consulted for it. */
  get issuerKey(): string {
    return this.signingKey;
  }
}

function extractErrorMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  return null;
}

export type { ShellProfile };