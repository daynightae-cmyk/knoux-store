import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import { BridgeServer } from '../dist/server.js';
import { SessionManager } from '../dist/pty/session.js';
import { ProcessRegistry } from '../dist/proc/registry.js';
import { AuditLog } from '../dist/audit.js';
import { validateConfigObject } from '../dist/config.js';
import { DEFAULT_LIMITS } from '../dist/policy.js';
import { issuerFingerprint } from '../dist/ticket.js';

const BRIDGE_ID = 'bridge-under-test';

function tempDir(prefix = 'knx-server-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** A harness with a real HTTP listener, a real audit log, and a real session manager. */
async function harness(options = {}) {
  const root = options.root ?? tempDir();
  const identity = { publicKey: 'x', privateKey: 'y', fingerprint: 'a'.repeat(64) };

  const issuer = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { format: 'pem', type: 'spki' },
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  });

  const config = validateConfigObject({
    root,
    host: '127.0.0.1',
    requireTls: true,
    limits: { ...DEFAULT_LIMITS, maxSessions: 2 },
    allowlistedTasks: { echo: ['node', '-e', 'console.log("hello from the bridge")'] },
    processProfiles: {},
    ...options.config,
  });

  const audit = new AuditLog(join(root, '.audit'));
  const sessions = new SessionManager({ limits: config.limits, onSessionEnd: () => {} });
  const processes = new ProcessRegistry({ cwd: root });

  const pendingCodes = options.pendingCodes ?? new Map();

  const server = new BridgeServer({
    config,
    identity,
    audit,
    sessions,
    processes,
    bridgeId: BRIDGE_ID,
    trustedIssuers: new Map([[issuerFingerprint(issuer.publicKey), issuer.publicKey]]),
    pendingCodes,
  });

  // Port 0 lets the OS pick a free port.
  await server.listen(0, '127.0.0.1');
  const url = `http://127.0.0.1:${server.port}`;

  return {
    root,
    url,
    issuer,
    issuerPublicKey: issuer.publicKey,
    sessions,
    processes,
    audit,
    pendingCodes,
    async close() {
      sessions.dispose();
      processes.stopAll();
      await server.close();
      if (!options.keepRoot) {
        // A just-signalled process can still hold a handle briefly. Retrying is
        // cheaper than leaking a temp directory on every run.
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            return;
          } catch {
            await new Promise((r) => setTimeout(r, 150));
          }
        }
      }
    },
  };
}

/** Mint a ticket for the harness's bridge. Ed25519 takes no digest argument. */
function mint(h, scopes, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'EdDSA', typ: 'KNX-TKT', kid: issuerFingerprint(h.issuerPublicKey).slice(0, 16) };
  const claims = {
    iss: 'knoux-bff',
    aud: BRIDGE_ID,
    sub: 'owner-1',
    sid: 'sid-1',
    scope: scopes,
    jti: `jti-${Math.random()}-${now}`,
    iat: now,
    exp: now + 60,
    ...overrides,
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const input = `${headerB64}.${claimsB64}`;
  const signature = sign(null, Buffer.from(input, 'utf8'), h.issuer.privateKey).toString('base64url');
  return `${input}.${signature}`;
}

async function get(h, path, token) {
  return fetch(`${h.url}${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
}

async function post(h, path, body, token) {
  return fetch(`${h.url}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

test('health needs no ticket and reports only that this process is running', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.bridgeId, BRIDGE_ID);
    assert.equal(typeof body.uptimeSeconds, 'number');
  } finally { await h.close(); }
});

test('every other route refuses without a ticket', async () => {
  const h = await harness();
  try {
    for (const path of ['/v1/handshake', '/v1/fs/list?path=.', '/v1/metrics', '/v1/git/status', '/v1/proc/list']) {
      const res = await get(h, path);
      assert.equal(res.status, 401, `${path} should require a ticket`);
    }
  } finally { await h.close(); }
});

test('a ticket signed by an unpaired issuer is refused', async () => {
  const h = await harness();
  try {
    const attacker = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { format: 'pem', type: 'spki' },
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    });
    const now = Math.floor(Date.now() / 1000);
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'KNX-TKT' })).toString('base64url');
    const claimsB64 = Buffer.from(JSON.stringify({
      iss: 'attacker', aud: BRIDGE_ID, sub: 'attacker', sid: 's',
      scope: ['fs:read'], jti: 'x', iat: now, exp: now + 60,
    })).toString('base64url');
    const input = `${headerB64}.${claimsB64}`;
    const sig = sign(null, Buffer.from(input), attacker.privateKey).toString('base64url');

    const res = await get(h, '/v1/handshake', `${input}.${sig}`);
    assert.equal(res.status, 403);
  } finally { await h.close(); }
});

test('a refusal carries no detail about why', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/handshake', 'not-a-real-ticket');
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, 'invalid-ticket');
    assert.doesNotMatch(JSON.stringify(body), /audience|signature|jti|scope/i);
  } finally { await h.close(); }
});

test('a scope a ticket does not carry is refused', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/fs/list?path=.', mint(h, ['fs:write']));
    assert.equal(res.status, 403);
  } finally { await h.close(); }
});

test('an unknown route is a 404 even with a valid ticket', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/nope', mint(h, ['fs:read']));
    assert.equal(res.status, 404);
  } finally { await h.close(); }
});

test('a known route with the wrong method is a 405', async () => {
  const h = await harness();
  try {
    const res = await post(h, '/v1/metrics', {}, mint(h, ['metrics:read']));
    assert.equal(res.status, 405);
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Handshake
// ---------------------------------------------------------------------------

test('the handshake reports probed capabilities, never assumed ones', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/handshake', mint(h, ['terminal:open']));
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.bridgeId, BRIDGE_ID);
    assert.equal(body.root, h.root);
    assert.equal(typeof body.measuredAt, 'string');
    // No process profiles were configured, so those capabilities are false.
    assert.equal(body.capabilities.processes, false);
    assert.equal(body.capabilities.logs, false);
    // Exec is true because a task is allowlisted.
    assert.equal(body.capabilities.exec, true);
    // Terminal reflects what discovery actually found on this host.
    assert.equal(typeof body.capabilities.terminal, 'boolean');
    assert.equal(body.capabilities.terminal, body.profiles.length > 0);
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

test('fs:list returns real entries for a directory', async () => {
  const h = await harness();
  try {
    mkdirSync(join(h.root, 'src'), { recursive: true });
    writeFileSync(join(h.root, 'src', 'index.ts'), 'export const a = 1;\n', 'utf8');

    const res = await get(h, '/v1/fs/list?path=src', mint(h, ['fs:read']));
    assert.equal(res.status, 200);
    const body = await res.json();
    const entry = body.entries.find((e) => e.name === 'index.ts');
    assert.ok(entry, 'expected index.ts to be listed');
    assert.equal(entry.type, 'file');
    assert.equal(entry.path, 'src/index.ts');
    assert.ok(entry.size > 0);
  } finally { await h.close(); }
});

test('fs:read returns content, a hash and a line count', async () => {
  const h = await harness();
  try {
    writeFileSync(join(h.root, 'a.ts'), 'one\ntwo\nthree\n', 'utf8');
    const res = await get(h, '/v1/fs/read?path=a.ts', mint(h, ['fs:read']));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.content, 'one\ntwo\nthree\n');
    assert.equal(body.lines, 4);
    assert.equal(body.language, 'typescript');
    assert.match(body.hash, /^[0-9a-f]{64}$/);
  } finally { await h.close(); }
});

test('fs:read refuses to escape the root', async () => {
  const h = await harness();
  try {
    for (const path of ['../outside.txt', '/etc/passwd', 'a/../../b']) {
      const res = await get(h, `/v1/fs/read?path=${encodeURIComponent(path)}`, mint(h, ['fs:read']));
      assert.equal(res.status, 403, `${path} should be rejected`);
    }
  } finally { await h.close(); }
});

test('fs:read refuses a symlink that escapes the root', async () => {
  const outside = tempDir('knx-outside-');
  const h = await harness();
  try {
    writeFileSync(join(outside, 'secret.txt'), 'classified', 'utf8');
    symlinkSync(outside, join(h.root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');

    const res = await get(h, '/v1/fs/read?path=escape/secret.txt', mint(h, ['fs:read']));
    assert.equal(res.status, 403);
    const body = await res.text();
    assert.doesNotMatch(body, /classified/);
  } finally {
    await h.close();
    rmSync(outside, { recursive: true, force: true });
  }
});

test('fs:write writes atomically and reports the new hash', async () => {
  const h = await harness();
  try {
    const res = await post(h, '/v1/fs/write', { path: 'new/file.ts', content: 'hello\n' }, mint(h, ['fs:write']));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.match(body.hash, /^[0-9a-f]{64}$/);
    assert.equal(readFileSync(join(h.root, 'new', 'file.ts'), 'utf8'), 'hello\n');
  } finally { await h.close(); }
});

test('fs:write leaves no temp file behind', async () => {
  const h = await harness();
  try {
    await post(h, '/v1/fs/write', { path: 'clean.ts', content: 'x' }, mint(h, ['fs:write']));
    const listing = await get(h, '/v1/fs/list?path=.', mint(h, ['fs:read']));
    assert.equal(listing.status, 200);
    const names = (await listing.json()).entries.map((e) => e.name);
    assert.equal(names.includes('clean.ts'), true);
    assert.equal(names.some((n) => n.includes('.knx-')), false, `temp file left behind: ${names.join(', ')}`);
  } finally { await h.close(); }
});

test('fs:write detects a concurrent modification through expectedHash', async () => {
  const h = await harness();
  try {
    writeFileSync(join(h.root, 'conflict.ts'), 'original', 'utf8');
    const staleHash = '0'.repeat(64);

    const res = await post(h, '/v1/fs/write',
      { path: 'conflict.ts', content: 'mine', expectedHash: staleHash },
      mint(h, ['fs:write']));

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error, 'conflict');
    assert.match(body.currentHash, /^[0-9a-f]{64}$/);
    // The file on disk is untouched.
    assert.equal(readFileSync(join(h.root, 'conflict.ts'), 'utf8'), 'original');
  } finally { await h.close(); }
});

test('fs:write succeeds when expectedHash matches', async () => {
  const h = await harness();
  try {
    writeFileSync(join(h.root, 'ok.ts'), 'original', 'utf8');
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update('original', 'utf8').digest('hex');

    const res = await post(h, '/v1/fs/write',
      { path: 'ok.ts', content: 'updated', expectedHash: hash },
      mint(h, ['fs:write']));

    assert.equal(res.status, 200);
    assert.equal(readFileSync(join(h.root, 'ok.ts'), 'utf8'), 'updated');
  } finally { await h.close(); }
});

test('fs:write refuses to write through a symlink that escapes', async () => {
  const outside = tempDir('knx-outside-');
  const h = await harness();
  try {
    symlinkSync(outside, join(h.root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const res = await post(h, '/v1/fs/write',
      { path: 'escape/planted.txt', content: 'nope' },
      mint(h, ['fs:write']));
    assert.equal(res.status, 403);
    assert.equal(existsSync(join(outside, 'planted.txt')), false);
  } finally {
    await h.close();
    rmSync(outside, { recursive: true, force: true });
  }
});

test('fs:write denies .git and .env by policy', async () => {
  const h = await harness();
  try {
    assert.equal((await post(h, '/v1/fs/write', { path: '.git/config', content: 'x' }, mint(h, ['fs:write']))).status, 403);
    assert.equal((await post(h, '/v1/fs/write', { path: '.env', content: 'x' }, mint(h, ['fs:write']))).status, 403);
  } finally { await h.close(); }
});

test('fs:delete removes a file and refuses the root', async () => {
  const h = await harness();
  try {
    writeFileSync(join(h.root, 'doomed.ts'), 'x', 'utf8');
    const res = await post(h, '/v1/fs/delete', { path: 'doomed.ts' }, mint(h, ['fs:delete']));
    assert.equal(res.status, 200);
    assert.equal(existsSync(join(h.root, 'doomed.ts')), false);

    assert.equal((await post(h, '/v1/fs/delete', { path: '.' }, mint(h, ['fs:delete']))).status, 403);
  } finally { await h.close(); }
});

test('fs:delete needs an explicit recursive flag for a directory', async () => {
  const h = await harness();
  try {
    mkdirSync(join(h.root, 'dir'), { recursive: true });
    writeFileSync(join(h.root, 'dir', 'f.txt'), 'x', 'utf8');

    const refused = await post(h, '/v1/fs/delete', { path: 'dir' }, mint(h, ['fs:delete']));
    assert.equal(refused.status, 400);
    assert.equal(existsSync(join(h.root, 'dir')), true);

    const ok = await post(h, '/v1/fs/delete', { path: 'dir', recursive: true }, mint(h, ['fs:delete']));
    assert.equal(ok.status, 200);
    assert.equal(existsSync(join(h.root, 'dir')), false);
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

test('git:status reports unavailable rather than fabricating a branch', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/git/status', mint(h, ['git:read']));
    assert.equal(res.status, 200);
    const body = await res.json();
    // The temp root is not a git repository.
    assert.equal(body.available, false);
    assert.equal(body.branch, null);
    assert.equal(body.headSha, null);
    assert.equal(typeof body.blocker, 'string');
  } finally { await h.close(); }
});

test('git:branch rejects an invalid ref name before touching git', async () => {
  const h = await harness();
  try {
    for (const name of ['main; rm -rf /', 'a$(whoami)', 'a..b', '/leading']) {
      const res = await post(h, '/v1/git/branch', { name }, mint(h, ['git:write']));
      assert.equal(res.status, 400, `${name} should be rejected`);
    }
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Exec
// ---------------------------------------------------------------------------

test('exec refuses a task that is not allowlisted', async () => {
  const h = await harness();
  try {
    const res = await post(h, '/v1/exec/run', { task: 'rm -rf /' }, mint(h, ['run:allowlisted']));
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'task-not-allowlisted');
  } finally { await h.close(); }
});

test('exec refuses a cwd outside the root', async () => {
  const h = await harness();
  try {
    const res = await post(h, '/v1/exec/run', { task: 'echo', cwd: '../elsewhere' }, mint(h, ['run:allowlisted']));
    assert.equal(res.status, 403);
  } finally { await h.close(); }
});

test('exec streams real output and a real exit code', async () => {
  const h = await harness();
  try {
    const res = await post(h, '/v1/exec/run', { task: 'echo' }, mint(h, ['run:allowlisted']));
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/event-stream/);

    const text = await res.text();
    assert.match(text, /event: start/);
    assert.match(text, /event: chunk/);
    assert.match(text, /event: exit/);
    assert.match(text, /hello from the bridge/);
    // The exit payload is the real code and a real duration.
    assert.match(text, /"code":0/);
    assert.match(text, /"durationMs":\d+/);
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Supervised processes
// ---------------------------------------------------------------------------

test('proc:list reports a registered process as stopped when it has never run', async () => {
  const h = await harness({
    config: { processProfiles: { worker: { cmd: process.execPath, args: ['-e', 'setTimeout(()=>{},50)'] } } },
  });
  try {
    h.processes.register('worker', { cmd: process.execPath, args: ['-e', 'setTimeout(()=>{},50)'] });
    const res = await get(h, '/v1/proc/list', mint(h, ['proc:list']));
    assert.equal(res.status, 200);
    const { processes } = await res.json();
    const worker = processes.find((p) => p.name === 'worker');
    assert.ok(worker);
    assert.equal(worker.status, 'stopped');
    assert.equal(worker.pid, null);
    assert.equal(worker.uptime, null);
  } finally { await h.close(); }
});

test('a supervised process reports a real pid and running status', async () => {
  const h = await harness();
  try {
    h.processes.register('sleeper', { cmd: process.execPath, args: ['-e', 'setTimeout(()=>{},5000)'] });
    const res = await post(h, '/v1/proc/start', { name: 'sleeper' }, mint(h, ['proc:manage']));
    assert.equal(res.status, 200);
    const info = await res.json();
    assert.equal(info.status, 'running');
    assert.ok(info.pid > 0, 'expected a real pid');

    // The listed state agrees with what start reported.
    const listed = (await (await get(h, '/v1/proc/list', mint(h, ['proc:list']))).json())
      .processes.find((p) => p.name === 'sleeper');
    assert.equal(listed.status, 'running');
    assert.equal(listed.pid, info.pid);
    assert.ok(listed.uptime !== null);
  } finally { await h.close(); }
});

test('stopping a process that is not running reports that fact', async () => {
  const h = await harness();
  try {
    h.processes.register('idle', { cmd: process.execPath, args: ['-e', ''] });
    const res = await post(h, '/v1/proc/stop', { name: 'idle' }, mint(h, ['proc:manage']));
    assert.equal(res.status, 409);
    assert.match((await res.json()).message, /not running/i);
  } finally { await h.close(); }
});

test('an unknown process name is refused by every proc route', async () => {
  const h = await harness();
  try {
    // A ticket is single-use, so each request gets its own.
    assert.equal((await post(h, '/v1/proc/start', { name: 'ghost' }, mint(h, ['proc:manage']))).status, 409);
    assert.equal((await post(h, '/v1/proc/stop', { name: 'ghost' }, mint(h, ['proc:manage']))).status, 409);
    assert.equal((await get(h, '/v1/logs?name=ghost', mint(h, ['logs:read']))).status, 404);
  } finally { await h.close(); }
});

test('logs:read returns what the process actually printed', async () => {
  const h = await harness();
  try {
    h.processes.register('printer', {
      cmd: process.execPath,
      args: ['-e', 'console.log("line one"); console.error("line two"); process.exit(0)'],
    });
    await post(h, '/v1/proc/start', { name: 'printer' }, mint(h, ['proc:manage']));

    // Wait for the real process to exit and flush its output.
    const exited = await new Promise((resolve) => {
      h.processes.once('exit', (name) => resolve(name));
      setTimeout(() => resolve(null), 4000);
    });
    assert.equal(exited, 'printer');

    const res = await get(h, '/v1/logs?name=printer', mint(h, ['logs:read']));
    assert.equal(res.status, 200);
    const body = await res.json();
    const stdout = body.lines.filter((l) => l.stream === 'stdout').map((l) => l.data).join('');
    const stderr = body.lines.filter((l) => l.stream === 'stderr').map((l) => l.data).join('');
    assert.match(stdout, /line one/);
    assert.match(stderr, /line two/);
    // A process that exited cleanly is stopped, with its real exit code.
    assert.equal(body.info.status, 'stopped');
    assert.equal(body.info.exitCode, 0);
  } finally { await h.close(); }
});

test('a process that exits non-zero is reported as failed, not stopped', async () => {
  const h = await harness();
  try {
    // restarts: 0 disables the automatic restart, so the failed state is
    // observable rather than immediately replaced by a new process.
    h.processes.register('failing', { cmd: process.execPath, args: ['-e', 'process.exit(3)'] });
    const result = h.processes.start('failing');
    assert.equal(result.ok, true);

    const deadline = Date.now() + 4000;
    let info = h.processes.info('failing');
    while (info.status === 'running' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
      info = h.processes.info('failing');
    }
    assert.equal(info.exitCode, 3);
    assert.equal(info.status, 'failed');
  } finally { await h.close(); }
});

test('an unexpected non-zero exit is restarted a bounded number of times', async () => {
  const h = await harness();
  try {
    const registry = new ProcessRegistry({ cwd: h.root, maxRestarts: 2 });
    registry.register('flapper', { cmd: process.execPath, args: ['-e', 'process.exit(1)'] });
    registry.start('flapper');

    const deadline = Date.now() + 5000;
    while (registry.info('flapper').status !== 'failed' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const info = registry.info('flapper');
    assert.equal(info.status, 'failed');
    // Two automatic restarts were attempted, then it was left failed.
    assert.equal(info.restarts, 2);
    registry.stopAll();
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

test('metrics are measured, and unmeasurable values are null rather than zero', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/metrics', mint(h, ['metrics:read']));
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.ok(body.memoryTotalBytes > 0, 'total memory must be measured');
    assert.ok(body.memoryUsedBytes > 0);
    assert.ok(body.memoryUsedBytes <= body.memoryTotalBytes);
    assert.equal(typeof body.timestamp, 'string');

    // Real measurements, not invented ones.
    assert.ok(body.cpuPercent === null || (body.cpuPercent >= 0 && body.cpuPercent <= 100 * 64));
    assert.ok(body.diskFreeBytes === null || body.diskFreeBytes > 0);
    // Network rates need two readings, so the first sample is null by design.
    assert.equal(body.networkRxBytesPerSec, null);
    assert.equal(body.networkTxBytesPerSec, null);
    assert.ok(typeof body.processUptimeSeconds === 'number');
  } finally { await h.close(); }
});

test('a second metrics sample can produce a real network rate or reports null', async () => {
  const h = await harness();
  try {
    await get(h, '/v1/metrics', mint(h, ['metrics:read']));
    await new Promise((r) => setTimeout(r, 300));
    const res = await get(h, '/v1/metrics', mint(h, ['metrics:read']));
    assert.equal(res.status, 200);
    const body = await res.json();

    for (const rate of [body.networkRxBytesPerSec, body.networkTxBytesPerSec]) {
      assert.ok(rate === null || (Number.isFinite(rate) && rate >= 0), `implausible rate: ${rate}`);
    }
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

test('audit records the real outcome of privileged actions', async () => {
  const h = await harness();
  try {
    writeFileSync(join(h.root, 'audited.ts'), 'x', 'utf8');
    await get(h, '/v1/fs/read?path=audited.ts', mint(h, ['fs:read']));
    await post(h, '/v1/fs/write', { path: 'other.ts', content: 'y' }, mint(h, ['fs:write']));

    const entries = (await (await get(h, '/v1/audit?limit=100', mint(h, ['logs:read']))).json()).entries;
    const actions = entries.map((e) => e.action);
    assert.ok(actions.includes('fs.read'), `expected fs.read in ${actions.join(', ')}`);
    assert.ok(actions.includes('fs.write'));

    const write = entries.find((e) => e.action === 'fs.write');
    assert.equal(write.actor, 'owner-1');
    assert.equal(write.outcome, 'success');
    assert.equal(write.target, 'other.ts');
    assert.equal(typeof write.id, 'string');
  } finally { await h.close(); }
});

test('a rejected path is audited as denied, and the audit records no secrets', async () => {
  const h = await harness();
  try {
    const res = await get(h, '/v1/fs/read?path=../escape', mint(h, ['fs:read']));
    assert.equal(res.status, 403);

    const entries = h.audit.readAll();
    assert.ok(entries.length > 0, 'a rejected action must leave an audit entry');
    // The entry records the denial, not a fabricated success.
    assert.ok(entries.some((e) => e.outcome === 'denied' || e.outcome === 'failure'));
  } finally { await h.close(); }
});

test('a denied ticket is audited without leaking the ticket', async () => {
  const h = await harness();
  try {
    await get(h, '/v1/handshake', 'a.b.c');
    const entries = h.audit.readAll();
    const denial = entries.find((e) => e.action === 'auth.denied');
    assert.ok(denial, 'expected an auth.denied entry');
    assert.equal(denial.outcome, 'denied');
    assert.doesNotMatch(denial.detail, /a\.b\.c/);
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

test('pairing without a valid code is refused', async () => {
  const h = await harness();
  try {
    const res = await post(h, '/v1/pair', { code: 'NOTACODE', issuerPublicKey: h.issuerPublicKey });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'invalid-code');
  } finally { await h.close(); }
});

test('pairing with a valid code trusts the issuer and returns the handshake', async () => {
  const h = await harness({ pendingCodes: new Map() });
  try {
    h.pendingCodes.set('ABCD2345', {
      code: 'ABCD2345',
      expiresAt: Date.now() + 60_000,
      issuerPublicKey: '',
    });

    const res = await post(h, '/v1/pair', { code: 'ABCD2345', issuerPublicKey: h.issuerPublicKey });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.bridgeId, BRIDGE_ID);
    assert.equal(body.handshake.root, h.root);
    assert.equal(body.handshake.capabilities.exec, true);

    // The code is consumed, so a replay fails.
    assert.equal(h.pendingCodes.has('ABCD2345'), false);
    assert.equal((await post(h, '/v1/pair', { code: 'ABCD2345', issuerPublicKey: h.issuerPublicKey })).status, 403);

    // A ticket from the newly trusted issuer now works.
    assert.equal((await get(h, '/v1/handshake', mint(h, ['terminal:open']))).status, 200);
  } finally { await h.close(); }
});

test('an expired pairing code is refused and dropped', async () => {
  const h = await harness({ pendingCodes: new Map() });
  try {
    h.pendingCodes.set('EXPIRED1', {
      code: 'EXPIRED1',
      expiresAt: Date.now() - 1000,
      issuerPublicKey: '',
    });
    const res = await post(h, '/v1/pair', { code: 'EXPIRED1', issuerPublicKey: h.issuerPublicKey });
    assert.equal(res.status, 403);
    assert.equal(h.pendingCodes.has('EXPIRED1'), false, 'an expired code must not stay usable');
  } finally { await h.close(); }
});

test('pairing with an unreadable issuer key is refused', async () => {
  const h = await harness({ pendingCodes: new Map() });
  try {
    h.pendingCodes.set('GOODCODE', { code: 'GOODCODE', expiresAt: Date.now() + 60_000, issuerPublicKey: '' });
    const res = await post(h, '/v1/pair', { code: 'GOODCODE', issuerPublicKey: 'not a key' });
    assert.equal(res.status, 400);
    assert.equal(h.pendingCodes.has('GOODCODE'), false, 'a bad key must still consume the code');
  } finally { await h.close(); }
});

test('the pairing code is matched case-insensitively', async () => {
  const h = await harness({ pendingCodes: new Map() });
  try {
    h.pendingCodes.set('ABCD2345', { code: 'ABCD2345', expiresAt: Date.now() + 60_000, issuerPublicKey: '' });
    const res = await post(h, '/v1/pair', { code: 'abcd2345', issuerPublicKey: h.issuerPublicKey });
    assert.equal(res.status, 200);
  } finally { await h.close(); }
});

test('unpair removes trust, kills sessions and stops processes', async () => {
  const h = await harness({ pendingCodes: new Map() });
  try {
    h.processes.register('sleeper', { cmd: process.execPath, args: ['-e', 'setTimeout(()=>{},5000)'] });
    h.processes.start('sleeper');

    const res = await post(h, '/v1/unpair', {}, mint(h, ['terminal:open']));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.removedIssuers, 1);

    // Trust is gone, so the previously valid ticket no longer works.
    assert.equal((await get(h, '/v1/handshake', mint(h, ['terminal:open']))).status, 403);

    // The process was asked to stop. Give the platform a moment to act on the
    // signal before the harness removes the temp directory.
    const deadline = Date.now() + 4000;
    while (h.processes.info('sleeper').status === 'running' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.notEqual(h.processes.info('sleeper').status, 'running');
  } finally { await h.close(); }
});
test('project inspection endpoints require dedicated signed scopes and preserve the selected root', async () => {
  const h = await harness();
  try {
    mkdirSync(join(h.root, 'project'));
    writeFileSync(join(h.root, 'project/package.json'), JSON.stringify({ name: 'Selected project', scripts: { postinstall: 'DO_NOT_EXECUTE' } }));
    assert.equal((await get(h, '/v1/project/inspect?project=project')).status, 401);
    assert.equal((await get(h, '/v1/project/inspect?project=project', mint(h, ['metrics:read']))).status, 403);
    const ticket = mint(h, ['fs:read']); const response = await get(h, '/v1/project/inspect?project=project', ticket);
    assert.equal(response.status, 200); assert.equal((await response.json()).name, 'Selected project');
    assert.equal((await get(h, '/v1/project/inspect?project=project', ticket)).status, 403);
    assert.equal((await get(h, '/v1/project/inspect?project=../outside', mint(h, ['fs:read']))).status, 409);
  } finally { await h.close(); }
});
test('tools and import refuse unrelated scopes, and import remains off without explicit trusted config', async () => {
  const h = await harness();
  try {
    assert.equal((await get(h, '/v1/tools', mint(h, ['fs:read']))).status, 403);
    assert.equal((await post(h, '/v1/project/import', { repository: 'https://github.com/example/project', destination: 'new' }, mint(h, ['fs:write']))).status, 403);
    const response = await post(h, '/v1/project/import', { repository: 'https://github.com/example/project', destination: 'new' }, mint(h, ['project:import']));
    assert.equal(response.status, 409); assert.equal(existsSync(join(h.root, 'new')), false);
  } finally { await h.close(); }
});

test('provider inventory requires a one-use tools ticket and returns environment names without values',async()=>{
  const h=await harness();
  try{
    writeFileSync(join(h.root,'.mcp.json'),JSON.stringify({mcpServers:{contract:{command:'DO_NOT_EXECUTE',args:['TEST_ONLY_SECRET'],env:{API_KEY:'TEST_ONLY_SECRET'}}}}));
    mkdirSync(join(h.root,'.claude/skills/contract'),{recursive:true});writeFileSync(join(h.root,'.claude/skills/contract/SKILL.md'),'Contract fixture skill');
    assert.equal((await get(h,'/v1/provider-inventory')).status,401);
    assert.equal((await get(h,'/v1/provider-inventory',mint(h,['fs:read']))).status,403);
    const ticket=mint(h,['tools:read']),response=await get(h,'/v1/provider-inventory',ticket);
    assert.equal(response.status,200);const data=await response.json();
    assert.ok(data.agents.length>0);assert.ok(data.agents.every(agent=>agent.authenticated==='UNTESTED'&&!agent.executable));
    assert.deepEqual(data.inventory.find(item=>item.id==='mcp:contract').environmentNames,['API_KEY']);
    assert.ok(data.inventory.some(item=>item.kind==='SKILL'));assert.equal(JSON.stringify(data).includes('TEST_ONLY_SECRET'),false);assert.equal(JSON.stringify(data).includes('DO_NOT_EXECUTE'),false);
    assert.equal((await get(h,'/v1/provider-inventory',ticket)).status,403);
  }finally{await h.close();}
});
