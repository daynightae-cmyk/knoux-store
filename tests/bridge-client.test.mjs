/**
 * Bridge client and configuration — how the BFF decides what it can reach.
 *
 * Two failure modes matter here. The first is claiming a bridge is reachable
 * without asking it. The second is forwarding bridge error text verbatim, which
 * can contain a filesystem path. Both are asserted below.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { loadTypeScript } from './load.mjs';

const clientModule = await loadTypeScript('../src/lib/build/bridge-client.ts');
const configModule = await loadTypeScript('../src/lib/build/bridge-config.ts');
const ticketsModule = await loadTypeScript('../src/lib/build/bridge-tickets.ts');

const { BridgeClient, redactBridgeError, parseExecStream } = clientModule;
const { loadBridgeConfig, measureBridgeStatus } = configModule;
const { mintTicket } = ticketsModule;

const ENDPOINT = { url: 'http://127.0.0.1:7331', bridgeId: 'bridge-test', fingerprint: 'a'.repeat(64) };

function client(fetchImpl, options = {}) {
  return new BridgeClient({ endpoint: ENDPOINT, signingKey: 'unused', fetchImpl, ...options });
}

/** A fetch stub returning a fixed JSON body with the given status. */
function jsonFetch(body, { status = 200 } = {}) {
  return async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

test('a Windows path in a bridge error is redacted', () => {
  const message = redactBridgeError('ENOENT: no such file, open \'C:\\Users\\me\\secret\\file.txt\'');
  assert.doesNotMatch(message, /Users|secret|file\.txt/);
  assert.match(message, /\[PATH\]/);
});

test('a POSIX path in a bridge error is redacted', () => {
  const message = redactBridgeError('cannot open /home/me/private/notes.txt');
  assert.doesNotMatch(message, /home\/me|notes/);
  assert.match(message, /\[PATH\]/);
});

test('a secret-shaped value in a bridge error is redacted', () => {
  for (const message of [
    'API_TOKEN=abcd1234',
    'PASSWORD: hunter2',
    'aws_secret_access_key=xyz',
    'clientSecret = "shh"',
  ]) {
    const redacted = redactBridgeError(message);
    assert.doesNotMatch(redacted, /abcd1234|hunter2|xyz|shh/, `leaked: ${redacted}`);
  }
});

test('a message with nothing sensitive survives intact', () => {
  assert.equal(redactBridgeError('Task is not on the allowlist.'), 'Task is not on the allowlist.');
});

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

test('a bridge error body is surfaced as a redacted message', async () => {
  const result = await client(jsonFetch(
    { error: 'path-rejected', message: 'C:\\Users\\me\\secret denied' },
    { status: 403 },
  )).fsRead('a token', 'a.ts');

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.doesNotMatch(result.error, /Users|secret/);
});

test('a missing message falls back to the error code, then the status', async () => {
  const noMessage = await client(jsonFetch({ error: 'conflict' }, { status: 409 }))
    .fsRead('t', 'a.ts');
  assert.match(noMessage.error, /conflict/);

  const empty = await client(jsonFetch({}, { status: 502 })).fsRead('t', 'a.ts');
  assert.match(empty.error, /502/);
});

test('a read is retried once on a transport failure', async () => {
  let calls = 0;
  const result = await client(async () => {
    calls += 1;
    if (calls === 1) throw new Error('ECONNREFUSED');
    return new Response(JSON.stringify({ entries: [], path: '.' }), { status: 200 });
  }).fsList('t', '.');

  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test('a write is never retried', async () => {
  let calls = 0;
  const result = await client(async () => {
    calls += 1;
    throw new Error('ECONNREFUSED');
  }).fsWrite('t', 'a.ts', 'content');

  assert.equal(result.ok, false);
  assert.equal(calls, 1, 'a write must not be replayed');
});

test('a 403 is not retried, because a rejection is final', async () => {
  let calls = 0;
  const result = await client(async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }).fsList('t', '.');

  assert.equal(result.ok, false);
  assert.equal(calls, 1);
});

test('a timeout is reported as such, not as a raw abort error', async () => {
  const result = await client(async () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  }).handshake('t');
  assert.match(result.error, /did not respond in time/);
});

test('a non-JSON body does not throw', async () => {
  const result = await client(async () => new Response('not json', { status: 200 })).audit('t');
  assert.equal(result.ok, true);
  assert.equal(result.data, 'not json');
});

test('the ticket travels as a bearer token', async () => {
  let seen = null;
  await client(async (_url, init) => {
    seen = init.headers;
    return new Response('{}', { status: 200 });
  }).metrics('TICKET-VALUE');

  assert.equal(seen.authorization, 'Bearer TICKET-VALUE');
});

test('the terminal URL carries the ticket and resume state', () => {
  const url = new URL(client(async () => new Response('{}')).terminalUrl({
    ticket: 'TK',
    sessionId: 'sess-1',
    fromSeq: 42,
    cols: 120,
    rows: 40,
  }));

  assert.equal(url.protocol, 'ws:');
  assert.equal(url.pathname, '/v1/terminal');
  assert.equal(url.searchParams.get('ticket'), 'TK');
  assert.equal(url.searchParams.get('session'), 'sess-1');
  assert.equal(url.searchParams.get('from'), '42');
  assert.equal(url.searchParams.get('cols'), '120');
  assert.equal(url.searchParams.get('rows'), '40');
});

test('the terminal URL omits resume state when opening a new session', () => {
  const url = new URL(client(async () => new Response('{}')).terminalUrl({ ticket: 'TK' }));
  assert.equal(url.searchParams.get('ticket'), 'TK');
  assert.equal(url.searchParams.has('session'), false);
  assert.equal(url.searchParams.has('from'), false);
});

// ---------------------------------------------------------------------------
// SSE parsing
// ---------------------------------------------------------------------------

/** Turn SSE text into a ReadableStream, the way the bridge sends it. */
function sseStream(text) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

test('exec events are parsed in order with their SSE event name', async () => {
  const stream = sseStream(
    'event: start\ndata: {"task":"lint"}\n\n' +
    'event: chunk\ndata: {"stream":"stdout","data":"hello"}\n\n' +
    'event: exit\ndata: {"code":0,"durationMs":123}\n\n',
  );

  const events = [];
  for await (const event of parseExecStream(stream)) events.push(event);

  assert.deepEqual(events.map((e) => e.type), ['start', 'chunk', 'exit']);
  assert.equal(events[1].data, 'hello');
  assert.equal(events[2].code, 0);
  assert.equal(events[2].durationMs, 123);
});

test('exec events split across chunks are reassembled', async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // A frame boundary lands in the middle of the data line.
      controller.enqueue(encoder.encode('event: exit\ndata: {"co'));
      controller.enqueue(encoder.encode('de":0,"durationMs":9}\n\n'));
      controller.close();
    },
  });

  const events = [];
  for await (const event of parseExecStream(stream)) events.push(event);

  assert.equal(events.length, 1);
  assert.equal(events[0].code, 0);
});

test('a malformed frame is skipped rather than aborting the run', async () => {
  const stream = sseStream(
    'event: chunk\ndata: {not json\n\n' +
    'event: exit\ndata: {"code":0}\n\n',
  );

  const events = [];
  for await (const event of parseExecStream(stream)) events.push(event);

  assert.deepEqual(events.map((e) => e.type), ['exit']);
});

test('a comment-only frame yields nothing', async () => {
  const events = [];
  for await (const event of parseExecStream(sseStream(': keepalive\n\n'))) events.push(event);
  assert.equal(events.length, 0);
});

test('a payload type is used when the event name is absent', async () => {
  const events = [];
  for await (const event of parseExecStream(sseStream('data: {"type":"exit","code":1}\n\n'))) {
    events.push(event);
  }
  assert.equal(events[0].type, 'exit');
  assert.equal(events[0].code, 1);
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** A store stub with the shape loadBridgeConfig uses. */
function storeStub(bridges) {
  return (ownerId) => ({
    ownerId,
    async listBridges() {
      return bridges;
    },
  });
}

/** A real signing key, because loadBridgeKeys refuses anything it cannot parse. */
const ISSUER = generateKeyPairSync('ed25519', {
  publicKeyEncoding: { format: 'pem', type: 'spki' },
  privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
});
const KEY_ENV = { KNOUX_BRIDGE_SIGNING_KEY: ISSUER.privateKey };

test('no signing key blocks with a message naming the variable', async () => {
  const config = await loadBridgeConfig({ ownerId: 'owner-1', env: {} });
  assert.equal(config.endpoint, null);
  assert.equal(config.keys, null);
  assert.match(config.blocker, /KNOUX_BRIDGE_SIGNING_KEY/);
});

test('a key with no bridge URL is blocked, not assumed reachable', async () => {
  const config = await loadBridgeConfig({ ownerId: 'owner-1', env: KEY_ENV });
  assert.equal(config.endpoint, null);
  assert.match(config.blocker, /KNOUX_BRIDGE_URL/);
});

test('a malformed bridge URL is treated as absent', async () => {
  for (const url of ['not a url', 'ftp://host', '', '   ']) {
    const config = await loadBridgeConfig({
      ownerId: 'owner-1',
      env: { ...KEY_ENV, KNOUX_BRIDGE_URL: url },
    });
    assert.equal(config.endpoint, null, `expected ${url} to be rejected`);
  }
});

test('a URL with no paired record is blocked, because tickets need an audience', async () => {
  const config = await loadBridgeConfig({
    ownerId: 'owner-1',
    env: { ...KEY_ENV, KNOUX_BRIDGE_URL: 'http://127.0.0.1:7331' },
    storeFactory: storeStub([]),
  });
  assert.equal(config.endpoint, null);
  assert.match(config.blocker, /no paired bridge/i);
});

test('a paired record produces a usable endpoint', async () => {
  const config = await loadBridgeConfig({
    ownerId: 'owner-1',
    env: { ...KEY_ENV, KNOUX_BRIDGE_URL: 'http://127.0.0.1:7331' },
    storeFactory: storeStub([{
      id: 'row-1',
      ownerId: 'owner-1',
      url: 'http://127.0.0.1:7331',
      bridgeId: 'bridge-abc',
      fingerprint: 'f'.repeat(64),
      pairedBy: 'owner-1',
      pairedAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    }]),
  });

  assert.ok(config.endpoint, 'expected an endpoint');
  assert.equal(config.endpoint.bridgeId, 'bridge-abc');
  assert.equal(config.blocker, null);
});

test('a store that throws does not produce a usable endpoint', async () => {
  const config = await loadBridgeConfig({
    ownerId: 'owner-1',
    env: { ...KEY_ENV, KNOUX_BRIDGE_URL: 'http://127.0.0.1:7331' },
    storeFactory: () => ({ async listBridges() { throw new Error('supabase down'); } }),
  });
  assert.equal(config.endpoint, null);
  assert.ok(config.blocker, 'a store failure must produce a blocker, not an optimistic endpoint');
});

// ---------------------------------------------------------------------------
// Status measurement
// ---------------------------------------------------------------------------

const CONFIGURED = {
  endpoint: ENDPOINT,
  keys: { publicKeyPem: 'pub', privateKeyPem: 'priv', fingerprint: ENDPOINT.fingerprint },
  store: null,
  blocker: null,
};

/** A health response the bridge would actually send. */
function healthBody() {
  return {
    status: 'ok',
    bridgeId: ENDPOINT.bridgeId,
    version: '0.1.0',
    uptimeSeconds: 12,
    sessionCount: 1,
  };
}

test('an unconfigured deployment reports not configured', async () => {
  const status = await measureBridgeStatus({
    endpoint: null, keys: null, store: null, blocker: 'nothing is configured',
  }, { fetchImpl: async () => new Response('{}') });

  assert.equal(status.configured, false);
  assert.equal(status.reachable, false);
  assert.equal(status.capabilities, null);
  assert.equal(status.blocker, 'nothing is configured');
});

test('a bridge that answers health is reachable', async () => {
  const status = await measureBridgeStatus(CONFIGURED, {
    fetchImpl: jsonFetch(healthBody()),
  });

  assert.equal(status.configured, true);
  assert.equal(status.paired, true);
  assert.equal(status.reachable, true);
  assert.equal(status.bridgeId, ENDPOINT.bridgeId);
  // Without a ticket factory there is no handshake, so no capabilities.
  assert.equal(status.capabilities, null);
});

test('a bridge that cannot be reached reports unreachable, not paired-and-up', async () => {
  const status = await measureBridgeStatus(CONFIGURED, {
    fetchImpl: async () => { throw new Error('ECONNREFUSED 127.0.0.1:7331'); },
  });

  assert.equal(status.reachable, false);
  assert.equal(status.capabilities, null);
  assert.match(status.blocker, /ECONNREFUSED/);
});

test('a bridge returning a non-ok health status is not reachable', async () => {
  const status = await measureBridgeStatus(CONFIGURED, {
    fetchImpl: jsonFetch({ status: 'starting' }, { ok: true, status: 200 }),
  });
  assert.equal(status.reachable, false, 'health must report status ok');
});

test('capabilities come from the handshake, not from the health probe', async () => {
  const handshake = {
    bridgeId: ENDPOINT.bridgeId,
    version: '0.1.0',
    hostname: 'host',
    platform: 'win32',
    arch: 'x64',
    nodeVersion: 'v24.0.0',
    user: 'me',
    elevated: false,
    root: '/w',
    profiles: [{ id: 'cmd', path: 'cmd.exe', version: 'unknown', args: [] }],
    capabilities: {
      terminal: true, filesystem: true, git: true, exec: true,
      processes: false, metrics: true, logs: false, conpty: true,
    },
    maxSessions: 3,
    idleTimeoutMinutes: 30,
    maxLifetimeHours: 8,
    scrollbackBytes: 262144,
    detachTtlMinutes: 10,
    allowlistedTasks: {},
    processProfiles: {},
    powershellVersion: null,
    executionPolicy: null,
    measuredAt: new Date().toISOString(),
  };

  const status = await measureBridgeStatus(CONFIGURED, {
    fetchImpl: async (url) => (
      url.includes('/v1/health')
        ? new Response(JSON.stringify(healthBody()), { status: 200 })
        : new Response(JSON.stringify(handshake), { status: 200 })
    ),
    ticketFactory: (audience) => mintTicket(
      { userId: 'owner-1', sid: 'status', scopes: ['terminal:open'], bridgeId: audience },
      {
        publicKeyPem: ISSUER.publicKey,
        privateKeyPem: ISSUER.privateKey,
        fingerprint: 'b'.repeat(64),
      },
    ),
  });

  assert.equal(status.reachable, true);
  assert.deepEqual(status.capabilities, handshake.capabilities);
  assert.equal(status.blocker, null);
});

test('a handshake the bridge refuses leaves capabilities null', async () => {
  const status = await measureBridgeStatus(CONFIGURED, {
    fetchImpl: async (url) => (
      url.includes('/v1/health')
        ? new Response(JSON.stringify(healthBody()), { status: 200 })
        : new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    ),
    ticketFactory: () => 'a-ticket',
  });

  assert.equal(status.reachable, true);
  assert.equal(status.capabilities, null);
  assert.ok(status.blocker, 'a refused handshake is a blocker, not a silent pass');
});