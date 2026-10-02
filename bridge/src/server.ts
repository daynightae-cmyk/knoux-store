/**
 * Bridge server — HTTP + WebSocket.
 *
 * HTTP: health, handshake, pair, unpair, fs (list/read/write/delete), git
 * (status/log), exec (SSE), proc (list/start/stop/restart), metrics, logs, audit.
 * WebSocket: terminal sessions.
 *
 * Every route except /v1/health requires a signed ticket whose scope covers the
 * route. Verification order and failure reasons are in ticket.ts; the client
 * always receives a generic error so the endpoint is not an oracle.
 *
 * This module imports only from local files plus node: and ws.
 */

import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { randomUUID, createHash, createPublicKey } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { readdirSync, statSync, readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync, rmSync, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { hostname } from 'node:os';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import type { BridgeConfig } from './config.js';
import type { BridgeIdentity } from './identity.js';
import type { AuditLog } from './audit.js';
import type { SessionManager } from './pty/session.js';
import type { ProcessRegistry } from './proc/registry.js';
import type {
  Handshake, BridgeScope, TerminalClientFrame, TerminalServerFrame,
  FsEntry, FsReadResult, GitSnapshot, PairRequest, PairResponse,
} from './protocol.js';
import { verifyTicket } from './ticket.js';
import { resolveInsideRoot, isValidGitRef, realpathInside, realpathForCreate, PathEscapeError } from './policy.js';
import { redactError } from './redact.js';
import { spawnPty } from './pty/spawn.js';
import { discoverProfiles, getExecutionPolicy, getPowerShellVersion, isElevated, currentUser } from './pty/profiles.js';
import { sampleMetrics } from './metrics.js';
import { inspectProject, cloneProject, projectRoot } from './projects.js';
import { detectTools } from './tools.js';

const BRIDGE_VERSION = '0.1.0';

/** Max bytes accepted on a JSON request body. */
const MAX_BODY_BYTES = 1024 * 1024;
/** Max file size served by fs:read. */
const MAX_READ_BYTES = 512 * 1024;

export interface PendingCode {
  code: string;
  expiresAt: number;
  /** Empty until a pair attempt binds this code to an issuer. */
  issuerPublicKey: string;
}

export interface BridgeServerOptions {
  config: BridgeConfig;
  identity: BridgeIdentity;
  audit: AuditLog;
  sessions: SessionManager;
  processes: ProcessRegistry;
  bridgeId: string;
  /** Trusted issuer public keys, keyed by fingerprint. */
  trustedIssuers: Map<string, string>;
  /**
   * Pending pairing codes. The key is empty when the code was minted by `init`
   * before any issuer existed; the first successful pair binds it.
   */
  pendingCodes: Map<string, PendingCode>;
  /** Run a function with a bound listener address. Exposed for tests. */
  onListening?: (address: { port: number }) => void;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(data);
}

function error(res: ServerResponse, status: number, code: string, message: string): void {
  json(res, status, { error: code, message });
}

function readBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        rejectBody(new Error('Request body exceeds the size limit.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rejectBody);
  });
}

/** Parse a JSON body, or return null. Callers decide the status code. */
async function readJson<T>(req: IncomingMessage, maxBytes?: number): Promise<T | null> {
  try {
    const body = await readBody(req, maxBytes);
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function buildHandshake(options: BridgeServerOptions): Handshake {
  const profiles = discoverProfiles();
  const processNames = Object.keys(options.config.processProfiles);
  const config = options.config;
  return {
    bridgeId: options.bridgeId,
    projectImport: config.allowProjectImport && probeGit(),
    version: BRIDGE_VERSION,
    hostname: hostname(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    user: currentUser(),
    elevated: isElevated(),
    root: config.root,
    profiles: profiles.map((p) => ({ id: p.id, path: p.path, version: p.version, args: p.args })),
    capabilities: {
      // Each capability reflects something actually probed on this host.
      terminal: profiles.length > 0,
      filesystem: true,
      git: isValidGitRef('probe') && probeGit(),
      exec: Object.keys(config.allowlistedTasks).length > 0,
      processes: processNames.length > 0,
      metrics: true,
      logs: processNames.length > 0,
      conpty: process.platform === 'win32',
    },
    maxSessions: config.limits.maxSessions,
    idleTimeoutMinutes: config.limits.idleTimeoutMinutes,
    maxLifetimeHours: config.limits.maxLifetimeHours,
    scrollbackBytes: config.limits.scrollbackBytes,
    detachTtlMinutes: config.limits.detachTtlMinutes,
    allowlistedTasks: config.allowlistedTasks,
    processProfiles: config.processProfiles,
    powershellVersion: getPowerShellVersion(),
    executionPolicy: getExecutionPolicy(),
    measuredAt: new Date().toISOString(),
  };
}

/** Probe whether git is actually usable in the root. Never assumes it is. */
function probeGit(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore', timeout: 4000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export class BridgeServer {
  private http: HttpServer;
  private wss: WebSocketServer;
  private options: BridgeServerOptions;
  /** Live TCP sockets, so shutdown can drop idle keep-alive connections. */
  private sockets = new Set<Duplex>();

  constructor(options: BridgeServerOptions) {
    this.options = options;
    this.http = createServer((req, res) => void this.handleHttp(req, res));

    // Track sockets: a keep-alive connection would otherwise hold http.close()
    // open indefinitely.
    this.http.on('connection', (socket: Duplex) => {
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
    });

    this.wss = new WebSocketServer({ noServer: true });
    this.http.on('upgrade', (req, socket, head) => {
      // An upgraded socket is detached from the HTTP server's connection
      // bookkeeping: it is no longer an HTTP request/response connection, so
      // the 'connection' listener above does not track it. Add it here or a
      // live terminal holds the server open forever, because an upgraded socket
      // is not one http.close() knows how to drain.
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.handleWebSocket(ws, req);
      });
    });
  }

  listen(port: number, host: string): Promise<{ port: number }> {
    // Shell discovery belongs to startup. Running synchronous cold version
    // probes during the first WebSocket upgrade can hold its opening handshake
    // past the client timeout, even though the PTY itself is healthy.
    discoverProfiles();
    return new Promise((resolveListen, rejectListen) => {
      const onError = (err: Error): void => rejectListen(err);
      this.http.once('error', onError);
      this.http.listen(port, host, () => {
        this.http.removeListener('error', onError);
        const address = this.http.address();
        const bound = typeof address === 'object' && address !== null ? address.port : port;
        this.options.onListening?.({ port: bound });
        resolveListen({ port: bound });
      });
    });
  }

  /** The bound port, once listening. */
  get port(): number {
    const address = this.http.address();
    return typeof address === 'object' && address !== null ? address.port : 0;
  }

  /**
   * Stop listening and drop every connection.
   *
   * A graceful `ws.close()` waits for the client's close handshake, which a
   * client that has already gone will never send. Clients are terminated and
   * tracked sockets are destroyed, so close always completes.
   */
  close(): Promise<void> {
    // Drop every WebSocket. terminate() rather than close(): a client that has
    // already gone will never send its close handshake back.
    for (const client of this.wss.clients) {
      try { client.terminate(); } catch { /* already gone */ }
    }

    // `wss.close(cb)` never invokes its callback for a `noServer` instance —
    // there is no HTTP server for it to close — so it is fired and not awaited.
    this.wss.close();

    return new Promise((resolveClose) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        resolveClose();
      };

      this.http.close(() => finish());

      // http.close() waits for open keep-alive connections to drain, which
      // never happens on their own. Destroy what remains so shutdown cannot hang.
      const sweep = setTimeout(() => {
        for (const socket of this.sockets) {
          try { socket.destroy(); } catch { /* already gone */ }
        }
        this.sockets.clear();
        finish();
      }, 250);
      sweep.unref?.();
    });
  }

  // -------------------------------------------------------------------------
  // HTTP dispatch
  // -------------------------------------------------------------------------

  private async handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      error(res, 400, 'invalid-request', 'Malformed request URL.');
      return;
    }
    const path = url.pathname;
    const method = req.method ?? 'GET';

    // Health is unauthenticated so a launcher can probe liveness. It reports
    // only what this process can attest to: it is running.
    if (path === '/v1/health') {
      json(res, 200, {
        status: 'ok',
        bridgeId: this.options.bridgeId,
        version: BRIDGE_VERSION,
        uptimeSeconds: Math.floor(process.uptime()),
        sessionCount: this.options.sessions.all().length,
      });
      return;
    }

    if (path === '/v1/pair') {
      if (method !== 'POST') { error(res, 405, 'method-not-allowed', 'Use POST.'); return; }
      await this.handlePair(req, res);
      return;
    }

    if (path === '/v1/unpair') {
      if (method !== 'POST') { error(res, 405, 'method-not-allowed', 'Use POST.'); return; }
      await this.handleUnpair(req, res);
      return;
    }

    const token = bearerToken(req);
    if (!token) {
      error(res, 401, 'unauthorized', 'A signed ticket is required.');
      return;
    }

    const requiredScope = this.scopeForPath(path);
    if (!requiredScope) {
      error(res, 404, 'not-found', 'Unknown route.');
      return;
    }

    const verified = verifyTicket(
      token,
      [...this.options.trustedIssuers.values()],
      this.options.bridgeId,
      requiredScope,
    );

    if (!verified.ok) {
      this.options.audit.append({
        action: 'auth.denied',
        actor: 'unknown',
        target: `${method} ${path}`,
        outcome: 'denied',
        detail: verified.reason ?? 'Ticket verification failed',
        approvalId: null,
      });
      // The status code and error code are constant for every rejection reason.
      // A client cannot learn whether its signature, audience, expiry, jti or
      // scope was the problem, so this endpoint is not an oracle. The specific
      // reason went to the local audit log above.
      error(res, 403, verified.error, 'The ticket was rejected.');
      return;
    }

    const claims = verified.claims!;
    const root = this.rootFor(claims.cwd);

    try {
      await this.route(method, path, url, req, res, claims, root);
    } catch (err) {
      this.options.audit.append({
        action: 'request.error',
        actor: claims.sub,
        target: `${method} ${path}`,
        outcome: 'failure',
        detail: redactError(err),
        approvalId: null,
      });
      error(res, path.startsWith('/v1/project/') ? 409 : 500, 'internal-error', path.startsWith('/v1/project/') ? 'Selected project is unavailable or refused by the bridge path policy.' : 'The request could not be completed.');
    }
  }

  private async route(
    method: string,
    path: string,
    url: URL,
    req: IncomingMessage,
    res: ServerResponse,
    claims: { sub: string; cwd?: string },
    root: string,
  ): Promise<void> {
    switch (`${method} ${path}`) {
      case 'GET /v1/project/inspect':
        json(res, 200, await inspectProject(root, url.searchParams.get('project') ?? '.'));
        return;
      case 'GET /v1/project/git':
        this.handleGitStatus(res, await projectRoot(root, url.searchParams.get('project') ?? '.'));
        return;
      case 'GET /v1/project/file':
        this.handleFsRead(res, url, await projectRoot(root, url.searchParams.get('project') ?? '.'));
        return;
      case 'POST /v1/project/import': {
        const body = await readJson<{ repository?: string; destination?: string }>(req, 8192);
        if (!body || typeof body.repository !== 'string' || typeof body.destination !== 'string') { error(res, 400, 'invalid-body', 'Repository and destination required.'); return; }
        try {
          const snapshot = await cloneProject(root, body.repository, body.destination, this.options.config.allowProjectImport);
          this.options.audit.append({ action: 'project.import', actor: claims.sub, target: body.destination, outcome: 'success', detail: body.repository, approvalId: null });
          json(res, 200, snapshot);
        } catch (cause) {
          this.options.audit.append({ action: 'project.import', actor: claims.sub, target: body.destination.slice(0, 80), outcome: 'denied', detail: redactError(cause), approvalId: null });
          error(res, 409, 'import-refused', cause instanceof Error && 'code' in cause && cause.code === 'EEXIST' ? 'Destination already exists. Choose a new folder; existing projects are never overwritten.' : redactError(cause));
        }
        return;
      }
      case 'GET /v1/tools':
        json(res, 200, { tools: await detectTools() });
        return;
      case 'GET /v1/handshake':
        json(res, 200, buildHandshake(this.options));
        return;

      case 'GET /v1/fs/list':
        this.handleFsList(res, url, root);
        return;
      case 'GET /v1/fs/read':
        this.handleFsRead(res, url, root);
        return;
      case 'POST /v1/fs/write':
        await this.handleFsWrite(req, res, root, claims.sub);
        return;
      case 'POST /v1/fs/delete':
        await this.handleFsDelete(req, res, root, claims.sub);
        return;

      case 'GET /v1/git/status':
        this.handleGitStatus(res, root);
        return;
      case 'GET /v1/git/log':
        this.handleGitLog(res, root);
        return;
      case 'POST /v1/git/branch':
        await this.handleGitBranch(req, res, root, claims.sub);
        return;

      case 'POST /v1/exec/run':
        await this.handleExecRun(req, res, root, claims.sub);
        return;

      case 'GET /v1/proc/list':
        json(res, 200, { processes: this.options.processes.list() });
        return;
      case 'POST /v1/proc/start':
        await this.handleProcStart(req, res);
        return;
      case 'POST /v1/proc/stop':
        await this.handleProcStop(req, res);
        return;
      case 'POST /v1/proc/restart':
        await this.handleProcRestart(req, res);
        return;

      case 'GET /v1/metrics':
        json(res, 200, sampleMetrics(root));
        return;

      case 'GET /v1/logs':
        this.handleLogs(res, url);
        return;

      case 'GET /v1/audit': {
        const limit = clampInt(url.searchParams.get('limit'), 1, 500, 100);
        const entries = this.options.audit.readAll().slice(-limit);
        json(res, 200, { entries });
        return;
      }

      default:
        // A known path with the wrong method is a 405, not a 404.
        if (this.scopeForPath(path)) {
          error(res, 405, 'method-not-allowed', `${method} is not supported on ${path}.`);
        } else {
          error(res, 404, 'not-found', 'Unknown route.');
        }
    }
  }

  private rootFor(claimCwd?: string): string {
    return claimCwd ?? this.options.config.root;
  }

  private scopeForPath(path: string): BridgeScope | null {
    if (path === '/v1/project/inspect' || path === '/v1/project/file') return 'fs:read';
    if (path === '/v1/project/git') return 'git:read';
    if (path === '/v1/project/import') return 'project:import';
    if (path === '/v1/tools') return 'tools:read';
    if (path === '/v1/handshake') return 'terminal:open';
    if (path === '/v1/fs/list' || path === '/v1/fs/read') return 'fs:read';
    if (path === '/v1/fs/write') return 'fs:write';
    if (path === '/v1/fs/delete') return 'fs:delete';
    if (path === '/v1/git/status' || path === '/v1/git/log') return 'git:read';
    if (path === '/v1/git/branch') return 'git:write';
    if (path.startsWith('/v1/exec/')) return 'run:allowlisted';
    if (path === '/v1/proc/list') return 'proc:list';
    if (path === '/v1/proc/start' || path === '/v1/proc/stop' || path === '/v1/proc/restart') return 'proc:manage';
    if (path === '/v1/metrics') return 'metrics:read';
    if (path === '/v1/logs' || path === '/v1/audit') return 'logs:read';
    return null;
  }

  // -------------------------------------------------------------------------
  // Pairing
  // -------------------------------------------------------------------------

  private async handlePair(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const pairReq = await readJson<Partial<PairRequest>>(req, 8 * 1024);
    if (!pairReq || typeof pairReq.code !== 'string' || typeof pairReq.issuerPublicKey !== 'string') {
      error(res, 400, 'invalid-body', 'Expected a JSON body with code and issuerPublicKey.');
      return;
    }

    const code = pairReq.code.trim().toUpperCase();
    const pending = this.options.pendingCodes.get(code);
    if (!pending || pending.expiresAt < Date.now()) {
      // Also drop an expired entry so it cannot be retried.
      if (pending) this.options.pendingCodes.delete(code);
      this.options.audit.append({
        action: 'pair.denied',
        actor: 'unknown',
        target: this.options.bridgeId,
        outcome: 'denied',
        detail: 'Pairing code missing or expired',
        approvalId: null,
      });
      error(res, 403, 'invalid-code', 'The pairing code is invalid or has expired.');
      return;
    }

    // A code is single-use. Consume it before validating the key so a malformed
    // attempt cannot burn a code the user still needs.
    this.options.pendingCodes.delete(code);

    const fingerprint = safeFingerprint(pairReq.issuerPublicKey);
    if (!fingerprint) {
      this.options.audit.append({
        action: 'pair.denied',
        actor: 'unknown',
        target: this.options.bridgeId,
        outcome: 'denied',
        detail: 'Issuer public key was not a readable Ed25519 key',
        approvalId: null,
      });
      error(res, 400, 'invalid-issuer-key', 'The issuer public key could not be read.');
      return;
    }

    // Bind the code to this issuer and remember the trust.
    pending.issuerPublicKey = pairReq.issuerPublicKey;
    this.options.trustedIssuers.set(fingerprint, pairReq.issuerPublicKey);

    const response: PairResponse = {
      bridgeId: this.options.bridgeId,
      publicKey: this.options.identity.publicKey,
      fingerprint: this.options.identity.fingerprint,
      handshake: buildHandshake(this.options),
    };

    this.options.audit.append({
      action: 'pair',
      actor: `issuer:${fingerprint.slice(0, 16)}`,
      target: this.options.bridgeId,
      outcome: 'success',
      detail: 'Bridge paired with a new issuer',
      approvalId: null,
    });

    json(res, 200, response);
  }

  private async handleUnpair(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const token = bearerToken(req);
    if (!token) {
      error(res, 401, 'unauthorized', 'A signed ticket is required.');
      return;
    }

    const verified = verifyTicket(token, [...this.options.trustedIssuers.values()], this.options.bridgeId, 'terminal:open');
    if (!verified.ok) {
      error(res, 403, 'forbidden', 'The ticket was rejected.');
      return;
    }

    const removed = this.options.trustedIssuers.size;
    this.options.trustedIssuers.clear();
    this.options.pendingCodes.clear();
    this.options.sessions.killAll();
    this.options.processes.stopAll();

    this.options.audit.append({
      action: 'unpair',
      actor: verified.claims!.sub,
      target: this.options.bridgeId,
      outcome: 'success',
      detail: `Bridge unpaired; ${removed} issuer(s) removed`,
      approvalId: null,
    });

    json(res, 200, { ok: true, removedIssuers: removed });
  }

  // -------------------------------------------------------------------------
  // Filesystem
  // -------------------------------------------------------------------------

  private handleFsList(res: ServerResponse, url: URL, root: string): void {
    const dirPath = url.searchParams.get('path') ?? '.';
    const resolved = resolveInsideRoot(root, dirPath);
    if (!resolved.ok) {
      this.auditFsFailure('ticket', 'fs.list', dirPath.slice(0, 200), resolved.reason ?? 'rejected');
      error(res, 403, 'path-rejected', resolved.reason ?? 'The path was rejected.');
      return;
    }

    let target = resolved.absolute!;
    try {
      // A symlink can point outside the root even when the joined path does not.
      target = realpathInside(root, target);
    } catch {
      // Not resolvable — fall through to the read which will fail cleanly.
    }

    try {
      const entries: FsEntry[] = [];
      for (const name of readdirSync(target)) {
        const full = resolve(target, name);
        try {
          const stat = statSync(full);
          if (!stat.isFile() && !stat.isDirectory()) continue; // sockets, fifos
          entries.push({
            name,
            path: joinRelative(resolved.relative!, name),
            type: stat.isDirectory() ? 'directory' : 'file',
            size: stat.isDirectory() ? 0 : stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        } catch { /* vanished mid-listing */ }
      }
      entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));
      json(res, 200, { entries, path: resolved.relative });
    } catch {
      // No exception text reaches the client. The redacted reason is recorded
      // in the audit log below, never in the response.
      this.options.audit.append({
        action: 'fs.list',
        actor: 'ticket',
        target: resolved.relative!,
        outcome: 'failure',
        detail: 'listing failed',
        approvalId: null,
      });
      error(res, 404, 'fs-unavailable', 'The directory could not be listed.');
    }
  }

  private handleFsRead(res: ServerResponse, url: URL, root: string): void {
    const filePath = url.searchParams.get('path') ?? '';
    const resolved = resolveInsideRoot(root, filePath);
    if (!resolved.ok) {
      this.auditFsFailure('ticket', 'fs.read', filePath.slice(0, 200), resolved.reason ?? 'rejected');
      error(res, 403, 'path-rejected', resolved.reason ?? 'The path was rejected.');
      return;
    }

    let absolute = resolved.absolute!;
    try {
      // Re-check containment after following symlinks. An escape is a refusal;
      // a path that simply does not exist is a 404.
      absolute = realpathInside(root, absolute);
    } catch (err) {
      if (err instanceof PathEscapeError) {
        this.auditFsFailure('ticket', 'fs.read', resolved.relative!, err.message);
        error(res, 403, 'path-rejected', 'The path resolves outside the workspace root.');
        return;
      }
      error(res, 404, 'not-found', 'No such file.');
      return;
    }

    // Open first, then stat the open descriptor. A statSync followed by a
    // separate readFileSync is a TOCTOU window: the path can be swapped for a
    // different file — or a pipe that never ends — between the two calls. The
    // descriptor pins the file the checks were made against.
    let fd: number | null = null;
    try {
      fd = openSync(absolute, 'r');
      const stat = fstatSync(fd);
      if (!stat.isFile()) {
        error(res, 400, 'not-a-file', 'That path is not a regular file.');
        return;
      }
      if (stat.size > MAX_READ_BYTES) {
        error(res, 413, 'file-too-large', `The file exceeds the ${MAX_READ_BYTES / 1024} KB read limit.`);
        return;
      }
      // Read exactly the measured size from the same descriptor. A file that
      // grows concurrently cannot turn this into an unbounded read.
      const buffer = Buffer.alloc(stat.size);
      let offset = 0;
      while (offset < stat.size) {
        const read = readSync(fd, buffer, offset, stat.size - offset, offset);
        if (read === 0) break;
        offset += read;
      }
      const content = buffer.subarray(0, offset).toString('utf8');
      const result: FsReadResult = {
        content,
        language: languageOf(filePath),
        bytes: offset,
        lines: content.length === 0 ? 0 : content.split('\n').length,
        hash: sha256(content),
      };
      this.options.audit.append({
        action: 'fs.read',
        actor: 'ticket',
        target: resolved.relative!,
        outcome: 'success',
        detail: `${offset} bytes`,
        approvalId: null,
      });
      json(res, 200, result);
    } catch {
      // No exception text reaches the client. The audit log below is the only
      // place a failure reason is recorded, and even there it is redacted.
      this.options.audit.append({
        action: 'fs.read',
        actor: 'ticket',
        target: filePath.slice(0, 200),
        outcome: 'failure',
        detail: 'read failed',
        approvalId: null,
      });
      error(res, 404, 'not-found', 'No such file.');
    } finally {
      if (fd !== null) {
        try { closeSync(fd); } catch { /* already closed */ }
      }
    }
  }

  private async handleFsWrite(req: IncomingMessage, res: ServerResponse, root: string, actor: string): Promise<void> {
    const writeReq = await readJson<{ path?: string; content?: string; expectedHash?: string | null }>(req);
    if (!writeReq || typeof writeReq.path !== 'string' || typeof writeReq.content !== 'string') {
      error(res, 400, 'invalid-body', 'Expected a JSON body with path and content.');
      return;
    }

    const allowEnvWrite = this.options.config.allowEnvWrite;
    const resolved = resolveInsideRoot(root, writeReq.path, { allowEnvWrite });
    if (!resolved.ok) {
      this.auditFsFailure(actor, 'fs.write', resolved.relative ?? writeReq.path, resolved.reason ?? 'rejected');
      error(res, 403, 'path-rejected', resolved.reason ?? 'The path was rejected.');
      return;
    }

    const absolute = resolved.absolute!;

    // Refuse to write over a symlink that escapes the root.
    if (existsSync(absolute)) {
      let stat;
      try { stat = statSync(absolute); } catch { stat = null; }
      if (stat && !stat.isFile()) {
        error(res, 400, 'not-a-file', 'That path is not a regular file.');
        return;
      }
      try {
        realpathInside(root, absolute);
      } catch {
        error(res, 403, 'path-rejected', 'The path resolves outside the workspace root.');
        return;
      }
    } else {
      // A new file: the parent chain must still be inside the root, since a
      // symlinked parent would otherwise redirect the write.
      try {
        realpathForCreate(root, absolute);
      } catch {
        error(res, 403, 'path-rejected', 'The path resolves outside the workspace root.');
        return;
      }
    }

    // Optimistic concurrency: refuse if the file changed since it was read.
    if (typeof writeReq.expectedHash === 'string' && existsSync(absolute)) {
      let current: string;
      try { current = readFileSync(absolute, 'utf8'); } catch { current = ''; }
      const currentHash = sha256(current);
      if (currentHash !== writeReq.expectedHash) {
        json(res, 409, {
          error: 'conflict',
          message: 'The file changed since it was read. Reload before writing.',
          currentHash,
        });
        return;
      }
    }

    const content = writeReq.content;
    try {
      mkdirSync(dirname(absolute), { recursive: true });
      // Write to a sibling temp file, then rename. rename is atomic within a
      // volume, so a reader never observes a half-written file.
      const tmp = resolve(dirname(absolute), `.knx-${randomUUID()}.tmp`);
      try {
        writeFileSync(tmp, content, 'utf8');
        renameSync(tmp, absolute);
      } catch (err) {
        try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* ignore */ }
        throw err;
      }
    } catch (err) {
      this.auditFsFailure(actor, 'fs.write', resolved.relative!, redactError(err));
      error(res, 500, 'write-failed', 'The file could not be written.');
      return;
    }

    const hash = sha256(content);
    this.options.audit.append({
      action: 'fs.write',
      actor,
      target: resolved.relative!,
      outcome: 'success',
      detail: `${Buffer.byteLength(content, 'utf8')} bytes written`,
      approvalId: null,
    });
    json(res, 200, { ok: true, hash, bytes: Buffer.byteLength(content, 'utf8') });
  }

  private async handleFsDelete(req: IncomingMessage, res: ServerResponse, root: string, actor: string): Promise<void> {
    const body = await readJson<{ path?: string; recursive?: boolean }>(req, 8 * 1024);
    if (!body || typeof body.path !== 'string') {
      error(res, 400, 'invalid-body', 'Expected a JSON body with a path.');
      return;
    }

    const resolved = resolveInsideRoot(root, body.path, { allowEnvWrite: this.options.config.allowEnvWrite });
    if (!resolved.ok) {
      this.auditFsFailure(actor, 'fs.delete', body.path, resolved.reason ?? 'rejected');
      error(res, 403, 'path-rejected', resolved.reason ?? 'The path was rejected.');
      return;
    }

    // Deleting the root itself is never an intended operation.
    if (resolved.relative === '' || resolved.relative === '.') {
      error(res, 403, 'path-rejected', 'The workspace root cannot be deleted.');
      return;
    }

    const absolute = resolved.absolute!;
    if (!existsSync(absolute)) {
      error(res, 404, 'not-found', 'No such path.');
      return;
    }

    try {
      realpathInside(root, absolute);
    } catch {
      error(res, 403, 'path-rejected', 'The path resolves outside the workspace root.');
      return;
    }

    const isDirectory = statSync(absolute).isDirectory();
    try {
      if (isDirectory) {
        if (!body.recursive) {
          error(res, 400, 'recursive-required', 'Deleting a directory requires recursive: true.');
          return;
        }
        // Only the root itself may recurse, and its contents are bounded by root.
        rmSync(absolute, { recursive: true, force: true });
      } else {
        unlinkSync(absolute);
      }
    } catch (err) {
      this.auditFsFailure(actor, 'fs.delete', resolved.relative!, redactError(err));
      error(res, 500, 'delete-failed', 'The path could not be deleted.');
      return;
    }

    this.options.audit.append({
      action: 'fs.delete',
      actor,
      target: resolved.relative!,
      outcome: 'success',
      detail: isDirectory ? 'directory removed' : 'file removed',
      approvalId: null,
    });
    json(res, 200, { ok: true, path: resolved.relative });
  }

  private auditFsFailure(actor: string, action: string, target: string, detail: string): void {
    this.options.audit.append({
      action,
      actor,
      target,
      outcome: 'denied',
      detail,
      approvalId: null,
    });
  }

  // -------------------------------------------------------------------------
  // Git — every value comes from a git invocation; failure is reported as failure
  // -------------------------------------------------------------------------

  private handleGitStatus(res: ServerResponse, root: string): void {
    try {
      const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
      const headSha = git(['rev-parse', 'HEAD'], root);
      const statusOutput = git(['status', '--porcelain=v1'], root);

      const files: GitSnapshot['files'] = [];
      for (const line of statusOutput.split('\n')) {
        if (line.length < 4) continue;
        const index = line[0];
        const worktree = line[1];
        const path = line.slice(3).trim();
        if (!path) continue;
        // A path can be quoted by git when it contains unusual bytes.
        files.push({
          path: unquoteGitPath(path),
          state: index === '?' || worktree === '?' ? 'untracked' : index !== ' ' ? 'staged' : 'unstaged',
        });
      }

      const snapshot: GitSnapshot = {
        available: true,
        branch,
        headSha,
        dirty: files.length > 0,
        files,
        commits: this.readCommits(root, 8),
        blocker: null,
      };
      json(res, 200, snapshot);
    } catch {
      // The blocker reports that git failed, not how. Exception text — which
      // for a git failure routinely includes paths — stays in the audit log.
      this.options.audit.append({
        action: 'git.status',
        actor: 'ticket',
        target: root,
        outcome: 'failure',
        detail: 'git status failed',
        approvalId: null,
      });
      json(res, 200, {
        available: false,
        branch: null,
        headSha: null,
        dirty: false,
        files: [],
        commits: [],
        blocker: 'Git status is unavailable for this workspace.',
      } satisfies GitSnapshot);
    }
  }

  private handleGitLog(res: ServerResponse, root: string): void {
    try {
      json(res, 200, { commits: this.readCommits(root, 20) });
    } catch {
      this.options.audit.append({
        action: 'git.log',
        actor: 'ticket',
        target: root,
        outcome: 'failure',
        detail: 'git log failed',
        approvalId: null,
      });
      json(res, 200, { commits: [], blocker: 'Git history is unavailable for this workspace.' });
    }
  }

  private readCommits(root: string, limit: number): GitSnapshot['commits'] {
    // %x1f is the unit separator — safe inside a subject that cannot contain it.
    const out = git(['log', `-${Math.max(1, Math.min(100, limit))}`, '--pretty=format:%H%x1f%s%x1f%an%x1f%aI'], root);
    const commits: GitSnapshot['commits'] = [];
    for (const line of out.split('\n')) {
      if (!line) continue;
      const [sha, subject, author, at] = line.split('\x1f');
      if (!sha) continue;
      commits.push({ sha, subject: subject ?? '', author: author ?? '', at: at ?? '' });
    }
    return commits;
  }

  private async handleGitBranch(req: IncomingMessage, res: ServerResponse, root: string, actor: string): Promise<void> {
    const body = await readJson<{ name?: string; create?: boolean }>(req, 8 * 1024);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!isValidGitRef(name)) {
      this.options.audit.append({
        action: 'git.branch.denied',
        actor,
        target: name.slice(0, 64),
        outcome: 'denied',
        detail: 'Branch name rejected by validation',
        approvalId: null,
      });
      error(res, 400, 'invalid-ref', 'That branch name is not valid.');
      return;
    }

    try {
      const args = body?.create
        ? ['checkout', '-b', name]
        : ['checkout', name];
      git(args, root);
      const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
      this.options.audit.append({
        action: body?.create ? 'git.branch.create' : 'git.branch.checkout',
        actor,
        target: name,
        outcome: 'success',
        detail: `now on ${branch}`,
        approvalId: null,
      });
      // The response carries the measured branch, not git's raw stdout, which
      // can name paths the client was never shown.
      json(res, 200, { ok: true, branch });
    } catch (err) {
      this.options.audit.append({
        action: 'git.branch.failure',
        actor,
        target: name,
        outcome: 'failure',
        detail: redactError(err),
        approvalId: null,
      });
      error(res, 409, 'git-failed', 'The branch operation failed.');
    }
  }

  // -------------------------------------------------------------------------
  // Exec — allowlisted tasks only, streamed as SSE
  // -------------------------------------------------------------------------

  private async handleExecRun(req: IncomingMessage, res: ServerResponse, root: string, actor: string): Promise<void> {
    const body = await readJson<{ task?: string; cwd?: string }>(req, 8 * 1024);
    if (!body || typeof body.task !== 'string') {
      error(res, 400, 'invalid-body', 'Expected a JSON body with a task name.');
      return;
    }

    const task = body.task;
    const command = this.options.config.allowlistedTasks[task];
    if (!command || command.length === 0) {
      this.options.audit.append({
        action: 'exec.denied',
        actor,
        target: task.slice(0, 64),
        outcome: 'denied',
        detail: 'Task is not on the allowlist',
        approvalId: null,
      });
      error(res, 403, 'task-not-allowlisted', 'That task is not on the allowlist.');
      return;
    }

    // A task may override cwd only with a path inside the root.
    let cwd = root;
    if (typeof body.cwd === 'string' && body.cwd.length > 0) {
      const resolved = resolveInsideRoot(root, body.cwd);
      if (!resolved.ok) {
        this.options.audit.append({
          action: 'exec.denied',
          actor,
          target: task,
          outcome: 'denied',
          detail: `cwd rejected: ${resolved.reason ?? 'unknown'}`,
          approvalId: null,
        });
        error(res, 403, 'path-rejected', resolved.reason ?? 'The working directory was rejected.');
        return;
      }
      cwd = resolved.absolute!;
    }

    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-content-type-options': 'nosniff',
    });

    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const startedAt = Date.now();
    this.options.audit.append({
      action: 'exec.start',
      actor,
      target: task,
      outcome: 'success',
      detail: `running ${command[0]}`,
      approvalId: null,
    });

    let child: ChildProcess;
    try {
      // shell:false — the allowlist is an argv array, never a command string.
      child = spawn(command[0], command.slice(1), {
        cwd,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        // spawn() types env as ProcessEnv; this map is a plain string record.
        env: childEnv() as NodeJS.ProcessEnv,
      });
    } catch (err) {
      send('error', { message: 'The task could not be started.' });
      res.end();
      this.options.audit.append({
        action: 'exec.failure',
        actor,
        target: task,
        outcome: 'failure',
        detail: redactError(err),
        approvalId: null,
      });
      return;
    }

    // The client can walk away mid-run; killing the task avoids an orphan.
    res.on('close', () => {
      if (!child.killed && child.exitCode === null) {
        try { child.kill('SIGTERM'); } catch { /* already gone */ }
      }
    });

    child.stdout?.on('data', (chunk: Buffer) => send('chunk', { stream: 'stdout', data: chunk.toString('utf8') }));
    child.stderr?.on('data', (chunk: Buffer) => send('chunk', { stream: 'stderr', data: chunk.toString('utf8') }));

    child.on('error', (err) => {
      send('error', { message: 'The task failed to run.' });
      res.end();
      this.options.audit.append({
        action: 'exec.failure',
        actor,
        target: task,
        outcome: 'failure',
        detail: redactError(err),
        approvalId: null,
      });
    });

    child.on('close', (code, signal) => {
      const durationMs = Date.now() - startedAt;
      send('exit', { code, signal: signal ? String(signal) : null, durationMs });
      res.end();
      this.options.audit.append({
        action: 'exec.exit',
        actor,
        target: task,
        outcome: code === 0 ? 'success' : 'failure',
        detail: `exit=${String(code)} signal=${String(signal)} durationMs=${durationMs}`,
        approvalId: null,
      });
    });

    send('start', { task, command: command.join(' '), cwd, startedAt: new Date(startedAt).toISOString() });
  }

  // -------------------------------------------------------------------------
  // Supervised processes — status always reflects a real child
  // -------------------------------------------------------------------------

  private async handleProcStart(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readJson<{ name?: string }>(req, 8 * 1024);
    const name = typeof body?.name === 'string' ? body.name : '';
    if (!name) {
      error(res, 400, 'invalid-body', 'Expected a JSON body with a process name.');
      return;
    }
    const result = this.options.processes.start(name);
    if (!result.ok) {
      error(res, 409, 'proc-failed', result.reason);
      return;
    }
    json(res, 200, result.info);
  }

  private async handleProcStop(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readJson<{ name?: string }>(req, 8 * 1024);
    const name = typeof body?.name === 'string' ? body.name : '';
    if (!name) {
      error(res, 400, 'invalid-body', 'Expected a JSON body with a process name.');
      return;
    }
    const result = this.options.processes.stop(name);
    if (!result.ok) {
      error(res, 409, 'proc-failed', result.reason ?? 'The process could not be stopped.');
      return;
    }
    // Report measured state right after signalling, not a promise of exit.
    json(res, 200, { ok: true, stopping: name, info: this.options.processes.info(name) });
  }

  private async handleProcRestart(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readJson<{ name?: string }>(req, 8 * 1024);
    const name = typeof body?.name === 'string' ? body.name : '';
    if (!name) {
      error(res, 400, 'invalid-body', 'Expected a JSON body with a process name.');
      return;
    }
    const result = this.options.processes.restart(name);
    if (!result.ok) {
      error(res, 409, 'proc-failed', result.reason ?? 'The process could not be restarted.');
      return;
    }
    json(res, 200, result.info);
  }

  private handleLogs(res: ServerResponse, url: URL): void {
    const name = url.searchParams.get('name') ?? '';
    if (!name) {
      error(res, 400, 'invalid-body', 'A process name is required.');
      return;
    }
    const since = clampInt(url.searchParams.get('since'), 0, Number.MAX_SAFE_INTEGER, 0);
    const limit = clampInt(url.searchParams.get('limit'), 1, 2000, 500);
    const lines = this.options.processes.logs(name, since, limit);
    if (lines === null) {
      error(res, 404, 'unknown-process', `No process profile named "${name}".`);
      return;
    }
    json(res, 200, { name, lines, info: this.options.processes.info(name) });
  }

  // -------------------------------------------------------------------------
  // WebSocket — terminal
  // -------------------------------------------------------------------------

  /**
   * Accept a terminal WebSocket.
   *
   * Two modes:
   *   - resume: `session=<id>` names a live session. Missed output is replayed
   *     from the requested seq and the socket re-attaches to the existing PTY.
   *   - open:   no session. A new PTY is spawned inside the ticket's cwd.
   */
  private handleWebSocket(ws: WebSocket, req: IncomingMessage): void {
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      ws.close(4000, 'Malformed URL');
      return;
    }

    const token = url.searchParams.get('ticket') ?? '';
    const sessionId = url.searchParams.get('session') ?? '';
    const fromSeq = clampInt(url.searchParams.get('from'), 0, Number.MAX_SAFE_INTEGER, 0);
    const cols = clampInt(url.searchParams.get('cols'), 20, 500, 80);
    const rows = clampInt(url.searchParams.get('rows'), 5, 200, 24);

    if (!token) {
      ws.close(4001, 'A signed ticket is required.');
      return;
    }

    const verified = verifyTicket(token, [...this.options.trustedIssuers.values()], this.options.bridgeId, 'terminal:open');
    if (!verified.ok) {
      this.options.audit.append({
        action: 'terminal.denied',
        actor: 'unknown',
        target: 'websocket',
        outcome: 'denied',
        detail: verified.reason ?? 'Ticket verification failed',
        approvalId: null,
      });
      ws.close(4003, 'The ticket was rejected.');
      return;
    }

    // verifyTicket only returns ok:true with claims populated.
    const claims = verified.claims!;
    const root = this.rootFor(claims.cwd);
    const send = (frame: TerminalServerFrame): void => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
    };

    // ---- resume an existing session ----
    if (sessionId) {
      const existing = this.options.sessions.get(sessionId);
      if (!existing || existing.killed) {
        send({ t: 'error', code: 'session-gone' });
        ws.close(4009, 'The session is no longer available.');
        return;
      }

      // A resumed session must belong to this root — an id is not a capability.
      if (resolve(existing.cwd) !== resolve(root)) {
        send({ t: 'error', code: 'cwd-mismatch' });
        ws.close(4003, 'The session belongs to a different workspace.');
        return;
      }

      const replayed = this.options.sessions.replay(sessionId, fromSeq);
      send({ t: 'replay', frames: replayed });
      send({
        t: 'ready',
        sessionId: existing.id,
        profile: existing.profile.id,
        cwd: existing.cwd,
        pid: existing.pid,
      });
      this.attachSocket(ws, existing.id, claims.sub, send);
      return;
    }

    // ---- open a new session ----
    const profiles = discoverProfiles();
    const requested = claims.profile;
    const profile = (requested ? profiles.find((p) => p.id === requested) : undefined) ?? profiles[0];
    if (!profile) {
      send({ t: 'error', code: 'no-shell' });
      ws.close(4004, 'No shell profile is available on this host.');
      return;
    }

    

    let pty;
    try {
      pty = spawnPty({
        profile,
        cwd: root,
        cols,
        rows,
        sessionId: claims.sid,
        loadProfile: this.options.config.loadProfile,
      });
    } catch {
      send({ t: 'error', code: 'spawn-failed' });
      ws.close(4010, 'The shell could not be started.');
      this.options.audit.append({
        action: 'terminal.open',
        actor: claims.sub,
        target: profile.id,
        outcome: 'failure',
        detail: 'PTY spawn failed',
        approvalId: null,
      });
      return;
    }

    const created = this.options.sessions.create(profile, root, pty);
    if (!created.ok) {
      // The session limit was hit between the check and here. Do not leak the PTY.
      try { pty.kill(); } catch { /* already gone */ }
      send({ t: 'error', code: 'too-many-sessions' });
      ws.close(4029, created.reason);
      return;
    }

    const session = created.session;

    send({ t: 'ready', sessionId: session.id, profile: profile.id, cwd: session.cwd, pid: pty.pid });

    // PTY output flows through the session's scrollback so a reconnect can
    // replay what was missed while this socket was away.
    pty.onData((data: string) => {
      const frame = this.options.sessions.appendOutput(session.id, data);
      if (frame) send(frame);
    });

    pty.onExit((code, signal) => {
      send({ t: 'exit', code, signal: signal !== undefined ? String(signal) : null });
      this.options.sessions.kill(session.id, 'process-exit');
      // Let the frame flush before closing.
      setTimeout(() => ws.close(1000, 'Session ended'), 50).unref?.();
    });

    this.attachSocket(ws, session.id, claims.sub, send);

    this.options.audit.append({
      action: 'terminal.open',
      actor: claims.sub,
      target: session.id,
      outcome: 'success',
      detail: `${profile.id} pid=${pty.pid}`,
      approvalId: null,
    });
  }

  /** Wire a socket's inbound frames and detach handling to a session. */
  private attachSocket(
    ws: WebSocket,
    sessionId: string,
    actor: string,
    send: (frame: TerminalServerFrame) => void,
  ): void {
    this.options.sessions.attach(sessionId);

    let closedByClient = false;

    ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      let frame: TerminalClientFrame;
      try {
        frame = JSON.parse(raw.toString()) as TerminalClientFrame;
      } catch {
        send({ t: 'error', code: 'bad-frame' });
        return;
      }

      switch (frame?.t) {
        case 'input': {
          if (typeof frame.d !== 'string') {
            send({ t: 'error', code: 'bad-input' });
            return;
          }
          this.options.sessions.write(sessionId, frame.d);
          break;
        }
        case 'resize': {
          const cols = clampInt(frame.cols, 20, 500, 80);
          const rows = clampInt(frame.rows, 5, 200, 24);
          this.options.sessions.resize(sessionId, cols, rows);
          break;
        }
        case 'ack':
          // Client confirms receipt so the ring can be trimmed safely.
          this.options.sessions.acknowledge(sessionId, Number(frame.seq) || 0);
          break;
        case 'ping':
          send({ t: 'pong' });
          break;
        case 'close':
          closedByClient = true;
          this.options.sessions.kill(sessionId, 'client-close');
          ws.close(1000, 'Closed by client');
          break;
        default:
          send({ t: 'error', code: 'unknown-frame' });
      }
    });

    // A dropped connection does not end the session: the PTY keeps running
    // and the session survives for detachTtlMinutes so the browser can resume.
    ws.on('close', () => {
      if (!closedByClient) {
        this.options.sessions.detach(sessionId);
        this.options.audit.append({
          action: 'terminal.detach',
          actor,
          target: sessionId,
          outcome: 'success',
          detail: 'socket closed; session retained for resume',
          approvalId: null,
        });
      } else {
        this.options.sessions.detach(sessionId);
      }
    });

    ws.on('error', () => {
      this.options.sessions.detach(sessionId);
    });
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function bearerToken(req: IncomingMessage): string {
  const header = req.headers['authorization'];
  const value = Array.isArray(header) ? header[0] ?? '' : header ?? '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Clamp a value into range, falling back when it is absent or not a number. */
function clampInt(raw: string | number | null | undefined, min: number, max: number, fallback: number): number {
  if (raw === null || raw === undefined) return fallback;
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function joinRelative(base: string, name: string): string {
  const clean = base.replace(/\/+$/, '');
  return clean === '' || clean === '.' ? name : `${clean}/${name}`;
}



/** Run git and return stdout. Throws with a redacted message on failure. */
function git(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(`git ${args[0]} failed: ${redactError(err)}`);
  }
}

/** Strip git's quoting of unusual path bytes. */
function unquoteGitPath(path: string): string {
  if (!path.startsWith('"') || !path.endsWith('"')) return path;
  try {
    return JSON.parse(path) as string;
  } catch {
    return path.slice(1, -1);
  }
}

function safeFingerprint(publicKeyPem: string): string | null {
  try {
    const der = createPublicKey(publicKeyPem).export({ format: 'der', type: 'spki' });
    return createHash('sha256').update(der).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Environment for exec'd tasks: the bridge's own environment minus anything
 * secret-shaped. A task gets no access to bridge credentials.
 */
function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue;
    if (/^(KNOUX_BRIDGE_)/.test(key)) continue;
    if (/(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE)/i.test(key)) continue;
    env[key] = value;
  }
  return env;
}

function languageOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts': case 'tsx': return 'typescript';
    case 'js': case 'jsx': case 'mjs': case 'cjs': return 'javascript';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'svg': return 'svg';
    case 'yml': case 'yaml': return 'yaml';
    case 'html': case 'htm': return 'html';
    case 'sh': case 'ps1': return 'shell';
    default: return 'text';
  }
}

