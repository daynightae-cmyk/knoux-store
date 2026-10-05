/**
 * KNOuX Store outbound control-plane worker.
 *
 * The bridge never exposes a routable listener. It registers outward with the
 * KNOuX Store control plane, maintains a short-lived machine session, sends
 * heartbeats, claims queued jobs and executes only a closed read-only tool set
 * against its own loopback BridgeServer.
 */

import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import type { BridgeConfig } from './config.js';
import type { BridgeIdentity } from './identity.js';
import { sign } from './identity.js';

const API_ROOT = '';
const DEFAULT_HEARTBEAT_MS = 30_000;
const DEFAULT_IDLE_POLL_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;
const LOCAL_REQUEST_TIMEOUT_MS = 20_000;
const CLOUD_REQUEST_TIMEOUT_MS = 25_000;
const MAX_RESULT_BYTES = 256 * 1024;

export interface ControlPlaneWorkerOptions {
  baseUrl: string;
  bridgeId: string;
  version: string;
  identity: BridgeIdentity;
  config: BridgeConfig;
  onAudit?: (
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    detail: string,
  ) => void;
  internalControlToken: string;
  fetchImpl?: typeof fetch;
}

interface RegisterResponse {
  ok: boolean;
  machineId: string;
  sessionId: string;
  sessionToken: string;
  expiresAt: string;
  heartbeatIntervalMs?: number;
  idlePollMs?: number;
}

interface ClaimedJob {
  ok: boolean;
  job: {
    id: string;
    tool: string;
    args: Record<string, unknown>;
    expiresAt: string;
  };
}

export interface ControlPlaneWorker {
  start(): void;
  stop(): Promise<void>;
  snapshot(): {
    enabled: boolean;
    connected: boolean;
    machineId: string | null;
    sessionExpiresAt: string | null;
    lastHeartbeatAt: string | null;
    lastError: string | null;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(raw: string): string {
  const url = new URL(raw);
  const loopback = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('KNOuX control plane must use HTTPS outside loopback development.');
  }
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname === '/' ? '/api/build/bridge/control' : url.pathname.replace(/\/+$/g, '');
  return url.toString().replace(/\/$/, '');
}


function capabilitiesFor(config: BridgeConfig): Record<string, boolean> {
  return {
    terminal: true,
    filesystem: true,
    git: true,
    exec: Object.keys(config.allowlistedTasks).length > 0,
    processes: Object.keys(config.processProfiles).length > 0,
    metrics: true,
    logs: true,
    conpty: process.platform === 'win32',
  };
}

function boundedResult(value: unknown): unknown {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    return { unavailable: true, reason: 'result-not-serializable' };
  }

  const bytes = Buffer.byteLength(encoded, 'utf8');
  if (bytes <= MAX_RESULT_BYTES) return value;

  return {
    truncated: true,
    originalBytes: bytes,
    preview: encoded.slice(0, 48_000),
  };
}

class Worker implements ControlPlaneWorker {
  private readonly baseUrl: string;
  private readonly options: ControlPlaneWorkerOptions;
  private readonly fetchImpl: typeof fetch;
  private running = false;
  private stopRequested = false;
  private loopPromise: Promise<void> | null = null;

  private sessionToken: string | null = null;
  private sessionExpiresAt: string | null = null;
  private machineId: string | null = null;
  private heartbeatMs = DEFAULT_HEARTBEAT_MS;
  private idlePollMs = DEFAULT_IDLE_POLL_MS;
  private lastHeartbeatAt: string | null = null;
  private lastError: string | null = null;
  private enrollmentToken: string | null = process.env.KNOUX_CONTROL_PLANE_ENROLLMENT_TOKEN?.trim() || null;

  constructor(options: ControlPlaneWorkerOptions) {
    if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(options.config.host)) {
      throw new Error('The outbound worker requires a loopback bridge host.');
    }
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    this.stopRequested = false;
    this.loopPromise = this.runLoop().finally(() => {
      this.running = false;
    });
  }

  async stop(): Promise<void> {
    this.stopRequested = true;
    if (!this.loopPromise) return;
    await Promise.race([this.loopPromise, sleep(2_500)]);
  }

  snapshot() {
    return {
      enabled: true,
      connected: Boolean(this.sessionToken && this.machineId),
      machineId: this.machineId,
      sessionExpiresAt: this.sessionExpiresAt,
      lastHeartbeatAt: this.lastHeartbeatAt,
      lastError: this.lastError,
    };
  }

  private audit(
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    detail: string,
  ): void {
    this.options.onAudit?.(action, outcome, detail.slice(0, 500));
  }

  private async runLoop(): Promise<void> {
    let backoffMs = 1_000;
    let lastHeartbeat = 0;

    while (!this.stopRequested) {
      try {
        if (!this.sessionToken || this.sessionNearExpiry()) {
          await this.register();
          backoffMs = 1_000;
          lastHeartbeat = 0;
        }

        const now = Date.now();
        if (now - lastHeartbeat >= this.heartbeatMs) {
          const ok = await this.heartbeat();
          if (!ok) {
            await sleep(1_000);
            continue;
          }
          lastHeartbeat = now;
        }

        const job = await this.poll();
        if (job) {
          await this.executeAndReport(job);
          backoffMs = 1_000;
          continue;
        }

        await sleep(this.idlePollMs);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.lastError = message.slice(0, 500);
        this.audit('control.error', 'failure', this.lastError);
        await sleep(backoffMs);
        backoffMs = Math.min(MAX_BACKOFF_MS, Math.max(2_000, backoffMs * 2));
      }
    }
  }

  private sessionNearExpiry(): boolean {
    if (!this.sessionExpiresAt) return true;
    const expiry = Date.parse(this.sessionExpiresAt);
    return !Number.isFinite(expiry) || expiry - Date.now() < 60_000;
  }

  private async register(): Promise<void> {
    const payloadObject = {
      bridgeId: this.options.bridgeId,
      fingerprint: this.options.identity.fingerprint,
      publicKey: this.options.identity.publicKey,
      nonce: randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      hostname: hostname(),
      platform: process.platform,
      arch: process.arch,
      version: this.options.version,
      capabilities: capabilitiesFor(this.options.config),
      ...(this.enrollmentToken ? { enrollmentToken: this.enrollmentToken } : {}),
    };

    const payload = JSON.stringify(payloadObject);
    const signature = sign(this.options.identity, payload);

    const response = await this.requestCloud(
      API_ROOT + '/register',
      { payload, signature },
      false,
    );

    if (!response.ok) {
      const detail = await this.readError(response);
      throw new Error('Control-plane registration failed: ' + detail);
    }

    const data = await response.json() as RegisterResponse;
    if (!data.ok || !data.sessionToken || !data.machineId || !data.expiresAt) {
      throw new Error('Control-plane registration returned an invalid session.');
    }

    this.sessionToken = data.sessionToken;
    this.sessionExpiresAt = data.expiresAt;
    this.machineId = data.machineId;
    this.heartbeatMs = Math.max(10_000, Math.min(120_000, data.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS));
    this.idlePollMs = Math.max(2_000, Math.min(60_000, data.idlePollMs ?? DEFAULT_IDLE_POLL_MS));
    this.lastError = null;
    this.enrollmentToken = null;
    delete process.env.KNOUX_CONTROL_PLANE_ENROLLMENT_TOKEN;
    this.audit('control.register', 'success', 'machine=' + data.machineId);
    console.log('[bridge-control] registered with KNOuX Store as machine ' + data.machineId);
  }

  private async heartbeat(): Promise<boolean> {
    if (!this.sessionToken) return false;
    const response = await this.requestCloud(
      API_ROOT + '/heartbeat',
      {
        version: this.options.version,
        capabilities: capabilitiesFor(this.options.config),
      },
      true,
    );

    if (response.status === 401 || response.status === 403) {
      this.clearSession('heartbeat authorization expired');
      return false;
    }
    if (!response.ok) {
      throw new Error('Control-plane heartbeat failed: ' + await this.readError(response));
    }

    this.lastHeartbeatAt = new Date().toISOString();
    return true;
  }

  private async poll(): Promise<ClaimedJob | null> {
    if (!this.sessionToken) return null;
    const response = await this.requestCloud(API_ROOT + '/poll', {}, true);

    if (response.status === 204) return null;
    if (response.status === 401 || response.status === 403) {
      this.clearSession('poll authorization expired');
      return null;
    }
    if (!response.ok) {
      throw new Error('Control-plane poll failed: ' + await this.readError(response));
    }

    const data = await response.json() as ClaimedJob;
    if (!data.ok || !data.job?.id || !data.job.tool) {
      throw new Error('Control-plane poll returned an invalid job.');
    }
    if (Date.parse(data.job.expiresAt) <= Date.now()) {
      throw new Error('Control-plane poll returned an expired job.');
    }
    return data;
  }

  private async executeAndReport(claimed: ClaimedJob): Promise<void> {
    const started = Date.now();
    let ok = false;
    let result: unknown = null;
    let error: string | null = null;

    try {
      result = await this.executeLocal(
        claimed.job.tool,
        claimed.job.args ?? {},
      );
      ok = true;
      this.audit('control.job', 'success', 'job=' + claimed.job.id + ' tool=' + claimed.job.tool);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      this.audit('control.job', 'failure', 'job=' + claimed.job.id + ' tool=' + claimed.job.tool + ' error=' + error);
    }

    await this.reportResult({
      jobId: claimed.job.id,
      ok,
      result: ok ? boundedResult(result) : null,
      error: ok ? null : error,
      durationMs: Date.now() - started,
    });
  }

  private async executeLocal(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    // The constructor restricts the host to loopback; the local HTTP listener
    // uses process-local authentication and intentionally does not offer TLS.
    const host = this.options.config.host === '::1' ? '[::1]' : this.options.config.host;
    const origin = 'http://' + host + ':' + this.options.config.port; // NOSONAR: strictly authenticated loopback transport.
    let path = '';
    const method = 'GET';

    switch (tool) {
      case 'bridge.handshake':
        path = '/v1/handshake';
        break;
      case 'git.status':
        path = '/v1/git/status';
        break;
      case 'metrics.read':
        path = '/v1/metrics';
        break;
      case 'proc.list':
        path = '/v1/proc/list';
        break;
      case 'logs.read': {
        const name = String(args.name ?? '');
        const since = Number(args.since ?? 0);
        const limit = Number(args.limit ?? 200);
        if (name === 'bridge' || name === 'bridge-audit') {
          path = '/v1/audit?limit=' + encodeURIComponent(String(limit));
        } else {
          path = '/v1/logs?name=' + encodeURIComponent(name)
            + '&since=' + encodeURIComponent(String(since))
            + '&limit=' + encodeURIComponent(String(limit));
        }
        break;
      }
      case 'fs.list':
        path = '/v1/fs/list?path=' + encodeURIComponent(String(args.path ?? ''));
        break;
      case 'fs.read':
        path = '/v1/fs/read?path=' + encodeURIComponent(String(args.path ?? ''));
        break;
      default:
        throw new Error('Control-plane tool is not allowlisted locally: ' + tool);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOCAL_REQUEST_TIMEOUT_MS);

    try {
      const response = await this.fetchImpl(origin + path, {
        method,
        headers: {
          'x-knoux-internal-token': this.options.internalControlToken,
          accept: 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error('Local bridge returned HTTP ' + response.status + ': ' + text.slice(0, 500));
      }

      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return { text: text.slice(0, 48_000) };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private async reportResult(body: Record<string, unknown>): Promise<void> {
    let response = await this.requestCloud(API_ROOT + '/result', body, true);
    if (response.status === 401 || response.status === 403) {
      this.clearSession('result authorization expired');
      await this.register();
      response = await this.requestCloud(API_ROOT + '/result', body, true);
    }
    if (!response.ok) {
      throw new Error('Control-plane result upload failed: ' + await this.readError(response));
    }
  }

  private clearSession(reason: string): void {
    this.audit('control.session', 'failure', reason);
    this.sessionToken = null;
    this.sessionExpiresAt = null;
    this.machineId = null;
  }

  private async requestCloud(
    path: string,
    body: unknown,
    authenticated: boolean,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLOUD_REQUEST_TIMEOUT_MS);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };

    if (authenticated) {
      if (!this.sessionToken) throw new Error('No control-plane machine session is available.');
      headers.authorization = 'Bearer ' + this.sessionToken;
    }

    try {
      return await this.fetchImpl(this.baseUrl + path, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async readError(response: Response): Promise<string> {
    try {
      const body = await response.json() as Record<string, unknown>;
      if (typeof body.error === 'string') return body.error;
      if (typeof body.message === 'string') return body.message;
    } catch {}
    return 'HTTP ' + response.status;
  }
}

export function createControlPlaneWorker(options: ControlPlaneWorkerOptions): ControlPlaneWorker {
  return new Worker(options);
}

export function controlPlaneUrlFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.KNOUX_CONTROL_PLANE_URL?.trim();
  if (!raw) return null;
  return normalizeBaseUrl(raw);
}
