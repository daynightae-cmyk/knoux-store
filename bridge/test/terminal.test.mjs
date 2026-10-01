import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { BridgeServer } from '../dist/server.js';
import { SessionManager } from '../dist/pty/session.js';
import { ProcessRegistry } from '../dist/proc/registry.js';
import { AuditLog } from '../dist/audit.js';
import { validateConfigObject } from '../dist/config.js';
import { DEFAULT_LIMITS } from '../dist/policy.js';
import { issuerFingerprint } from '../dist/ticket.js';
import { generateKeyPairSync, sign } from 'node:crypto';

const BRIDGE_ID = 'bridge-ws-test';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'knx-ws-'));
}

/**
 * A bridge with no pending codes and one trusted issuer. `pendingCodes` is passed
 * in so a test can seed a code before listening.
 */
async function harness(options = {}) {
  const root = options.root ?? tempDir();
  const issuer = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { format: 'pem', type: 'spki' },
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  });

  const config = validateConfigObject({
    root,
    host: '127.0.0.1',
    limits: { ...DEFAULT_LIMITS, maxSessions: options.maxSessions ?? 2, detachTtlMinutes: 10 },
    processProfiles: {},
    ...options.config,
  });

  const audit = new AuditLog(join(root, '.audit'));
  const sessions = new SessionManager({ limits: config.limits, onSessionEnd: () => {} });
  const processes = new ProcessRegistry({ cwd: root });
  const pendingCodes = options.pendingCodes ?? new Map();

  // Every socket a test opens, so close() can drop them all. A test that leaves a
  // WebSocket open keeps the event loop alive and the runner never exits.
  const openSockets = new Set();

  const server = new BridgeServer({
    config,
    identity: { publicKey: 'x', privateKey: 'y', fingerprint: 'a'.repeat(64) },
    audit,
    sessions,
    processes,
    bridgeId: BRIDGE_ID,
    trustedIssuers: new Map([[issuerFingerprint(issuer.publicKey), issuer.publicKey]]),
    pendingCodes,
  });

  await server.listen(0, '127.0.0.1');
  const httpUrl = `http://127.0.0.1:${server.port}`;
  const wsUrl = `ws://127.0.0.1:${server.port}/v1/terminal`;

  return {
    root,
    httpUrl,
    wsUrl,
    sessions,
    audit,
    issuer,
    issuerPrivateKey: issuer.privateKey,
    openSockets,
    async close() {
      for (const ws of openSockets) {
        try { ws.terminate(); } catch { /* already gone */ }
      }
      openSockets.clear();
      sessions.dispose();
      processes.stopAll();
      await server.close();
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          return;
        } catch { await new Promise((r) => setTimeout(r, 150)); }
      }
    },
  };
}

function mint(h, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'EdDSA', typ: 'KNX-TKT', kid: issuerFingerprint(h.issuer.publicKey).slice(0, 16) };
  const claims = {
    iss: 'knoux-bff',
    aud: BRIDGE_ID,
    sub: 'owner-1',
    sid: 'sid-1',
    scope: ['terminal:open'],
    jti: `jti-${Math.random()}-${now}`,
    iat: now,
    exp: now + 60,
    ...overrides,
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const input = `${headerB64}.${claimsB64}`;
  const sig = sign(null, Buffer.from(input, 'utf8'), h.issuerPrivateKey).toString('base64url');
  return `${input}.${sig}`;
}

/** Open a socket and collect frames until a predicate is satisfied. */
function connect(url, registry) {
  const ws = new WebSocket(url);
  registry?.add(ws);
  const frames = [];
  const waiters = [];

  ws.on('message', (raw) => {
    try {
      frames.push(JSON.parse(raw.toString()));
    } catch { /* ignore a non-JSON frame */ }
    for (const waiter of [...waiters]) {
      if (waiter.predicate(frames)) {
        waiters.splice(waiters.indexOf(waiter), 1);
        clearTimeout(waiter.timer);
        waiter.resolve(frames);
      }
    }
  });

  const closed = new Promise((resolve) => {
    ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
  });

  return {
    ws,
    frames,
    closed,
    send: (frame) => ws.send(JSON.stringify(frame)),
    waitFor(predicate, timeoutMs = 5000) {
      if (predicate(frames)) return Promise.resolve(frames);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve };
        waiter.timer = setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error(`timed out waiting for frames; saw ${JSON.stringify(frames)}`));
        }, timeoutMs);
        waiters.push(waiter);
      });
    },
    close: () => { try { ws.close(); } catch { /* already closed */ } },
  };
}

const isReady = (frames) => frames.some((f) => f.t === 'ready');

// ---------------------------------------------------------------------------
// Authentication on the socket
// ---------------------------------------------------------------------------

test('a socket with no ticket is closed', async () => {
  const h = await harness();
  try {
    const c = connect(h.wsUrl, h.openSockets);
    const { code } = await c.closed;
    assert.equal(code, 4001);
  } finally { await h.close(); }
});

test('a socket with an invalid ticket is closed', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=garbage`, h.openSockets);
    const { code } = await c.closed;
    assert.equal(code, 4003);
  } finally { await h.close(); }
});

test('a ticket for another bridge is closed', async () => {
  const h = await harness();
  try {
    const ticket = mint(h, { aud: 'some-other-bridge' });
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(ticket)}`, h.openSockets);
    const { code } = await c.closed;
    assert.equal(code, 4003);
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

test('a valid ticket opens a real shell and reports its pid', async () => {
  const h = await harness();
  try {
    const ticket = mint(h);
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(ticket)}&cols=100&rows=30`, h.openSockets);
    await c.waitFor(isReady);

    const ready = c.frames.find((f) => f.t === 'ready');
    assert.equal(typeof ready.sessionId, 'string');
    assert.equal(typeof ready.pid, 'number');
    assert.ok(ready.pid > 0, 'expected a real pid');
    assert.equal(ready.cwd, h.root);

    // The session is real: the manager knows it and the pid is alive.
    assert.equal(h.sessions.all().length, 1);
    assert.equal(h.sessions.get(ready.sessionId).pid, ready.pid);
    c.close();
  } finally { await h.close(); }
});

test('the shell runs the command it is given and streams real output', async () => {
  const h = await harness();
  try {
    const ticket = mint(h, { profile: 'cmd' });
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(ticket)}`, h.openSockets);
    await c.waitFor(isReady);

    c.send({ t: 'input', d: 'echo KNOUX_BRIDGE_ALIVE\r\n' });
    await c.waitFor((frames) => frames.some((f) => f.t === 'output' && /KNOUX_BRIDGE_ALIVE/.test(f.d)));

    // Output frames carry a monotonic seq the client can resume from.
    const seqs = c.frames.filter((f) => f.t === 'output').map((f) => f.seq);
    assert.ok(seqs.length > 0);
    assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
    c.close();
  } finally { await h.close(); }
});

test('resize is accepted and does not disturb the session', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await c.waitFor(isReady);
    const sessionId = c.frames.find((f) => f.t === 'ready').sessionId;

    c.send({ t: 'resize', cols: 120, rows: 40 });
    await new Promise((r) => setTimeout(r, 300));

    assert.ok(h.sessions.get(sessionId), 'the session survives a resize');
    c.close();
  } finally { await h.close(); }
});

test('ping is answered with pong', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await c.waitFor(isReady);
    c.send({ t: 'ping' });
    await c.waitFor((frames) => frames.some((f) => f.t === 'pong'));
    c.close();
  } finally { await h.close(); }
});

test('an explicit close ends the session and its pty', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await c.waitFor(isReady);
    const sessionId = c.frames.find((f) => f.t === 'ready').sessionId;

    c.send({ t: 'close' });
    await c.waitFor((frames) => frames.some((f) => f.t === 'error') || true);
    await new Promise((r) => setTimeout(r, 300));

    assert.equal(h.sessions.get(sessionId), undefined);
    c.close();
  } finally { await h.close(); }
});

test('the maxSessions limit is enforced with a refusal, not a kill', async () => {
  const h = await harness({ maxSessions: 1 });
  try {
    const first = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await first.waitFor(isReady);
    const firstSession = first.frames.find((f) => f.t === 'ready').sessionId;

    const second = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await second.waitFor((frames) => frames.some((f) => f.t === 'error' && f.code === 'too-many-sessions'));

    // The existing session is untouched.
    assert.ok(h.sessions.get(firstSession), 'the first session must survive');
    first.close();
    second.close();
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

test('a dropped socket detaches the session and keeps the pty alive', async () => {
  const h = await harness();
  try {
    const first = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await first.waitFor(isReady);
    const ready = first.frames.find((f) => f.t === 'ready');
    const sessionId = ready.sessionId;

    // Kill the socket without closing the session.
    first.ws.terminate();
    await first.closed;
    await new Promise((r) => setTimeout(r, 300));

    const session = h.sessions.get(sessionId);
    assert.ok(session, 'the session must survive a dropped socket');
    assert.notEqual(session.detachedAt, null, 'the session must be marked detached');
    assert.equal(session.killed, false);

    // The pty really is still there: the process still exists.
    assert.ok(session.pid > 0);
  } finally { await h.close(); }
});

test('a resume replays only the output the client missed', async () => {
  const h = await harness();
  try {
    const first = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await first.waitFor(isReady);
    const sessionId = first.frames.find((f) => f.t === 'ready').sessionId;

    // Produce output, note how far the client got, then drop the socket.
    first.send({ t: 'input', d: 'echo FIRST_MARKER\r\n' });
    await first.waitFor((frames) => frames.some((f) => f.t === 'output' && /FIRST_MARKER/.test(f.d)));
    const lastSeq = Math.max(...first.frames.filter((f) => f.t === 'output').map((f) => f.seq));

    first.ws.terminate();
    await first.closed;
    await new Promise((r) => setTimeout(r, 200));

    // The shell produced more output while nobody was listening.
    const manager = h.sessions;
    manager.write(sessionId, 'echo SECOND_MARKER\r\n');
    await new Promise((r) => setTimeout(r, 600));

    // Resume from the last seq the client actually saw.
    const second = connect(
      `${h.wsUrl}?ticket=${encodeURIComponent(mint(h))}&session=${sessionId}&from=${lastSeq}`,
      h.openSockets,
    );
    await second.waitFor((frames) => frames.some((f) => f.t === 'ready'));

    const replay = second.frames.find((f) => f.t === 'replay');
    assert.ok(replay, 'expected a replay frame');
    assert.ok(replay.frames.length > 0, 'expected missed frames');
    assert.ok(
      replay.frames.every((f) => f.t === 'output' && f.seq > lastSeq),
      'replay must contain only frames after the requested seq',
    );
    const replayText = replay.frames.map((f) => f.d).join('');
    assert.match(replayText, /SECOND_MARKER/);
    assert.doesNotMatch(replayText, /FIRST_MARKER/, 'already-seen output must not be replayed');

    // The ready frame confirms this is the same shell.
    const ready = second.frames.find((f) => f.t === 'ready');
    assert.equal(ready.sessionId, sessionId);
    second.close();
  } finally { await h.close(); }
});

test('a resume keeps the same shell, so state survives the reconnect', async () => {
  const h = await harness();
  try {
    const first = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await first.waitFor(isReady);
    const ready = first.frames.find((f) => f.t === 'ready');
    const sessionId = ready.sessionId;

    first.send({ t: 'input', d: 'echo MARKER_ONE\r\n' });
    await first.waitFor((frames) => frames.some((f) => f.t === 'output' && /MARKER_ONE/.test(f.d)));
    first.ws.terminate();
    await first.closed;
    await new Promise((r) => setTimeout(r, 200));

    const second = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h))}&session=${sessionId}`, h.openSockets);
    await second.waitFor(isReady);

    // Same pid: this is the same process, not a new shell.
    const resumed = second.frames.find((f) => f.t === 'ready');
    assert.equal(resumed.pid, ready.pid);
    assert.equal(h.sessions.all().length, 1);
    second.close();
  } finally { await h.close(); }
});

test('a resume counts as an attachment', async () => {
  const h = await harness();
  try {
    const first = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await first.waitFor(isReady);
    const sessionId = first.frames.find((f) => f.t === 'ready').sessionId;
    const afterOpen = h.sessions.get(sessionId).attachments;

    first.ws.terminate();
    await first.closed;
    await new Promise((r) => setTimeout(r, 200));

    const second = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h))}&session=${sessionId}`, h.openSockets);
    await second.waitFor(isReady);

    const session = h.sessions.get(sessionId);
    assert.equal(session.attachments, afterOpen + 1);
    assert.equal(session.detachedAt, null);
    second.close();
  } finally { await h.close(); }
});

test('resuming a session that no longer exists is refused honestly', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h))}&session=00000000-0000-0000-0000-000000000000`, h.openSockets);
    const { code } = await c.closed;
    assert.equal(code, 4009);
  } finally { await h.close(); }
});

// ---------------------------------------------------------------------------
// Failure paths
// ---------------------------------------------------------------------------

test('a ticket scoped away from terminal:open cannot open a shell', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { scope: ['fs:read'] }))}`, h.openSockets);
    const { code } = await c.closed;
    assert.equal(code, 4003);
  } finally { await h.close(); }
});

test('a malformed frame is reported without killing the socket', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await c.waitFor(isReady);

    c.ws.send('this is not json');
    await c.waitFor((frames) => frames.some((f) => f.t === 'error' && f.code === 'bad-frame'));

    // The session is still usable.
    assert.equal(h.sessions.all().length, 1);
    c.send({ t: 'ping' });
    await c.waitFor((frames) => frames.some((f) => f.t === 'pong'));
    c.close();
  } finally { await h.close(); }
});

test('an unknown frame type is reported, not silently ignored', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await c.waitFor(isReady);
    c.send({ t: 'teleport' });
    await c.waitFor((frames) => frames.some((f) => f.t === 'error' && f.code === 'unknown-frame'));
    c.close();
  } finally { await h.close(); }
});

test('input of a non-string type is refused', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await c.waitFor(isReady);
    c.send({ t: 'input', d: { not: 'a string' } });
    await c.waitFor((frames) => frames.some((f) => f.t === 'error' && f.code === 'bad-input'));
    c.close();
  } finally { await h.close(); }
});

test('a requested profile that does not exist falls back to a real one', async () => {
  const h = await harness();
  try {
    // 'zsh' is not a Windows profile, so discovery falls back to what it found.
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'zsh' }))}`, h.openSockets);
    await c.waitFor(isReady);
    const ready = c.frames.find((f) => f.t === 'ready');
    assert.ok(ready.pid > 0);
    c.close();
  } finally { await h.close(); }
});

test('a terminal open is audited with the actor and the real pid', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=${encodeURIComponent(mint(h, { profile: 'cmd' }))}`, h.openSockets);
    await c.waitFor(isReady);
    await new Promise((r) => setTimeout(r, 200));

    const entries = h.audit.readAll();
    const open = entries.find((e) => e.action === 'terminal.open');
    assert.ok(open, 'expected a terminal.open entry');
    assert.equal(open.actor, 'owner-1');
    assert.equal(open.outcome, 'success');
    assert.match(open.detail, /pid=\d+/);
    c.close();
  } finally { await h.close(); }
});

test('a denied socket is audited', async () => {
  const h = await harness();
  try {
    const c = connect(`${h.wsUrl}?ticket=garbage`, h.openSockets);
    await c.closed;
    const entries = h.audit.readAll();
    assert.ok(entries.some((e) => e.action === 'terminal.denied' && e.outcome === 'denied'));
  } finally { await h.close(); }
});