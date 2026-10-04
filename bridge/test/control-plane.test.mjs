import assert from 'node:assert/strict';
import test from 'node:test';

import { createControlPlaneWorker, controlPlaneUrlFromEnv } from '../dist/control-plane.js';
import { generateIdentity, verifySignature } from '../dist/identity.js';

test('control plane refuses insecure public HTTP', () => {
  assert.throws(
    () => controlPlaneUrlFromEnv({ KNOUX_CONTROL_PLANE_URL: 'http://example.com' }),
    /HTTPS/,
  );
  assert.equal(
    controlPlaneUrlFromEnv({ KNOUX_CONTROL_PLANE_URL: 'http://127.0.0.1:3000' }),
    'http://127.0.0.1:3000/api/build/bridge/control',
  );
  assert.equal(
    controlPlaneUrlFromEnv({
      KNOUX_CONTROL_PLANE_URL:
        'https://example.supabase.co/functions/v1/knoux-bridge-control/',
    }),
    'https://example.supabase.co/functions/v1/knoux-bridge-control',
  );
});

test('outbound worker registers, claims a read-only job, executes through process-local auth and reports result', async () => {
  const identity = generateIdentity();
  const internalControlToken = 'I'.repeat(43);
  const calls = [];
  let pollCount = 0;
  let reported = null;

  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';
    const headers = new Headers(init.headers);
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, method, headers: Object.fromEntries(headers), body });

    if (url.endsWith('/register')) {
      assert.equal(method, 'POST');
      assert.equal(typeof body.payload, 'string');
      assert.equal(typeof body.signature, 'string');
      const payload = JSON.parse(body.payload);
      assert.equal(payload.bridgeId, identity.fingerprint.slice(0, 16));
      assert.equal(payload.fingerprint, identity.fingerprint);
      assert.equal(verifySignature(identity.publicKey, body.payload, body.signature), true);
      return Response.json({
        ok: true,
        machineId: 'machine-1',
        sessionId: 'session-1',
        sessionToken: 'A'.repeat(43),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        heartbeatIntervalMs: 10_000,
        idlePollMs: 2_000,
      });
    }

    if (url.endsWith('/heartbeat')) {
      assert.equal(headers.get('authorization'), 'Bearer ' + 'A'.repeat(43));
      return Response.json({ ok: true });
    }

    if (url.endsWith('/poll')) {
      assert.equal(headers.get('authorization'), 'Bearer ' + 'A'.repeat(43));
      pollCount += 1;
      if (pollCount === 1) {
        return Response.json({
          ok: true,
          job: {
            id: '11111111-1111-4111-8111-111111111111',
            tool: 'git.status',
            args: {},
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        });
      }
      return new Response(null, { status: 204 });
    }

    if (url === 'http://127.0.0.1:7331/v1/git/status') {
      assert.equal(headers.get('x-knoux-internal-token'), internalControlToken);
      assert.equal(headers.get('authorization'), null);
      return Response.json({
        available: true,
        branch: 'feat/test',
        headSha: 'abc123',
        dirty: false,
        files: [],
        commits: [],
        blocker: null,
      });
    }

    if (url.endsWith('/result')) {
      assert.equal(headers.get('authorization'), 'Bearer ' + 'A'.repeat(43));
      reported = body;
      return Response.json({ ok: true });
    }

    throw new Error('Unexpected fetch: ' + url);
  };

  const worker = createControlPlaneWorker({
    baseUrl: 'https://example.supabase.co/functions/v1/knoux-bridge-control',
    bridgeId: identity.fingerprint.slice(0, 16),
    version: 'test',
    identity,
    internalControlToken,
    config: {
      root: 'D:/Knoux Store',
      port: 7331,
      host: '127.0.0.1',
      requireTls: true,
      allowEnvWrite: false,
      loadProfile: false,
      limits: {
        maxSessions: 4,
        idleTimeoutMinutes: 30,
        maxLifetimeHours: 8,
        scrollbackBytes: 1048576,
        detachTtlMinutes: 10,
      },
      allowlistedTasks: { test: ['npm', 'test'] },
      processProfiles: {},
    },
    fetchImpl,
  });

  worker.start();

  const deadline = Date.now() + 2_000;
  while (!reported && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  await worker.stop();

  assert.ok(reported, 'expected the worker to report a job result');
  assert.equal(reported.jobId, '11111111-1111-4111-8111-111111111111');
  assert.equal(reported.ok, true);
  assert.equal(reported.result.branch, 'feat/test');
  assert.ok(calls.some((call) => call.url.endsWith('/register')));
  assert.ok(calls.some((call) => call.url.endsWith('/heartbeat')));
  assert.ok(calls.some((call) => call.url.endsWith('/poll')));
  assert.ok(calls.some((call) => call.url.endsWith('/result')));
});
