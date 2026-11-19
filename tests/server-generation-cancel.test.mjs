import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();
const { NextRequest } = await import('next/server.js');
const { getAdapter, getHealth } = await import('../src/lib/ai/registry.ts');
const { getUsageRecords } = await import('../src/lib/ai/usage.ts');
const { generateWithFallback } = await import('../src/lib/ai/fallback.ts');
const { environmentContext } = await import('../src/lib/ai/provider-os/request-runtime.ts');
const { withProviderRuntime } = await import('../src/lib/ai/provider-os/runtime-context.ts');
const { OpenAIAdapter } = await import('../src/lib/ai/adapters/openai.ts');
const { GeminiAdapter } = await import('../src/lib/ai/adapters/gemini.ts');
const { OpenCodeConsoleV2Adapter } = await import('../src/lib/ai/adapters/opencode-console-v2.ts');
const { POST: generatePOST } = await import('../src/app/api/build/ai/generate/route.ts');
const { POST: streamPOST } = await import('../src/app/api/build/ai/stream/route.ts');

const env = {
  OPENAI_API_KEY: 'TEST_ONLY_NEVER_LIVE',
  GEMINI_API_KEY: 'TEST_ONLY_NEVER_LIVE',
  OPENCODE_CONSOLE_TOKEN: 'oc_sk_TEST_ONLY_NEVER_LIVE',
  GROQ_API_KEY: 'TEST_ONLY_NEVER_LIVE',
};
const messages = [{ role: 'user', content: 'Cancellation fixture only' }];
const primary = { providerId: 'openai', modelId: 'gpt-4o', messages };
const secondary = [{ providerId: 'groq', modelId: 'fixture-secondary' }];
const measuredUsage = { inputTokens: 11, outputTokens: 7, cachedTokens: 2, source: 'provider' };
const completion = () => ({
  id: 'fixture-request', model: 'fixture-actual',
  choices: [{ message: { content: 'LATE_OUTPUT_MUST_NOT_ESCAPE' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 11, completion_tokens: 7, prompt_tokens_details: { cached_tokens: 2 } },
});
const geminiCompletion = () => ({
  modelVersion: 'fixture-actual',
  candidates: [{ content: { parts: [{ text: 'LATE_OUTPUT_MUST_NOT_ESCAPE' }] }, finishReason: 'STOP' }],
  usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7, cachedContentTokenCount: 2 },
});
const config = () => ({
  providers: { opencode: {
    headers: { 'x-opencode-org-id': 'org_fixture' },
    // Supplied endpoints/private inventory must never be executed or projected.
    settings: { baseURL: 'https://untrusted.example/credential-sink' },
    models: { 'kimi-k2.6': { name: 'Fixture' } },
  } },
  mcp: { private: { token: 'PRIVATE_CONFIG_MUST_NOT_ESCAPE' } },
});
const transports = [
  { name: 'OpenAI-compatible', create: () => new OpenAIAdapter(), request: primary, payload: completion },
  { name: 'Gemini', create: () => new GeminiAdapter(), request: { ...primary, providerId: 'gemini', modelId: 'gemini-2.5-flash' }, payload: geminiCompletion },
  { name: 'Console V2', create: () => new OpenCodeConsoleV2Adapter(), request: { ...primary, providerId: 'opencode-console-v2', modelId: 'kimi-k2.6' }, payload: completion },
];

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function abortFailure(signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}
function assertAborted(response) {
  assert.equal(response.ok, false);
  assert.equal(response.text, '');
  assert.equal(response.finishReason, null);
  assert.equal(response.error.category, 'ABORTED');
  assert.equal(response.error.retryable, false);
  assert.doesNotMatch(JSON.stringify(response), /LATE_OUTPUT_MUST_NOT_ESCAPE|PRIVATE_CONFIG_MUST_NOT_ESCAPE|oc_sk_TEST|TEST_ONLY_NEVER_LIVE/);
}
function trackTimeouts(t) {
  const original = AbortSignal.timeout;
  const durations = [];
  t.mock.method(AbortSignal, 'timeout', ms => { durations.push(ms); return original(ms); });
  return durations;
}
function controlledTransport(t, fixture, inference) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    assert.ok(init.signal instanceof AbortSignal);
    if (fixture.name === 'Console V2' && url === 'https://opencode.ai/console/api/v2/config') {
      assert.equal(init.headers.authorization, `Bearer ${env.OPENCODE_CONSOLE_TOKEN}`);
      return Response.json(config());
    }
    if (fixture.name === 'Console V2') {
      assert.equal(url, 'https://opencode.ai/inference/openai/v1/chat/completions');
      assert.equal(init.headers['x-opencode-org-id'], 'org_fixture');
      assert.equal(init.headers.authorization, `Bearer ${env.OPENCODE_CONSOLE_TOKEN}`);
    }
    return inference(url, init);
  });
  return calls;
}
function isolated(t, run) {
  const context = environmentContext(env);
  context.namespace = `server-cancel:${t.name}`;
  return withProviderRuntime(context, run);
}
function generationResult(ok = true, category = 'RATE_LIMIT') {
  return {
    ok, text: ok ? 'LATE_OUTPUT_MUST_NOT_ESCAPE' : '', finishReason: ok ? 'stop' : null,
    usage: measuredUsage, latencyMs: 4, ttftMs: 2, providerRequestId: 'fixture-request',
    modelUsed: 'fixture-actual', warnings: [], estimatedCost: null,
    error: ok ? null : { category, message: 'Fixture failure', safeMessage: 'Fixture failure', httpStatus: 429, providerErrorId: null, retryable: true },
  };
}
function chunk(delta = '', done = false, error = null) {
  return { delta, done, error, finishReason: done ? 'stop' : null, usage: done ? measuredUsage : null, latencyMs: done ? 4 : null, ttftMs: 1, modelUsed: done ? 'fixture-actual' : null };
}
function routeEnvironment(t) {
  // Exercise the existing anonymous local-checkout policy; no auth/guard mocks.
  const fixtureEnv = { ...env, KNOUX_BUILD_ENVIRONMENT: 'local', KNOUX_BUILD_PUBLIC: '0' };
  const original = new Map(Object.keys(fixtureEnv).map(name => [name, process.env[name]]));
  Object.assign(process.env, fixtureEnv);
  t.after(() => {
    for (const [name, value] of original) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Unexpected fetch: all transport traffic must be controlled'));
}
function routeRequest(operation, signal, body = primary) {
  return new NextRequest(`http://localhost/api/build/ai/${operation}`, {
    method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json' },
    body: JSON.stringify(body), signal,
  });
}
function events(text) {
  return text.split('\n\n').filter(Boolean).map(event => JSON.parse(event.replace(/^data: /, '')));
}
const flush = () => new Promise(resolve => setImmediate(resolve));

for (const fixture of transports) {
  test(`${fixture.name}: preaborted generate/stream make zero fetches even without credentials`, async t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; assert.fail('Preabort must not fetch'); });
    const signal = AbortSignal.abort('private cancellation reason');
    const adapter = fixture.create();
    const response = await adapter.generate(fixture.request, {}, signal);
    assertAborted(response);
    assert.equal(response.modelUsed, null);
    assert.equal(response.usage.source, 'unknown');
    const chunks = [];
    for await (const value of adapter.stream(fixture.request, {}, signal)) chunks.push(value);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].error.category, 'ABORTED');
    assert.equal(chunks[0].done, true);
    assert.equal(calls, 0);
  });

  test(`${fixture.name}: abort during inference fetch propagates user signal and retains deadline`, async t => {
    const started = deferred(), controller = new AbortController();
    const durations = trackTimeouts(t);
    const calls = controlledTransport(t, fixture, async (url, init) => {
      assert.notEqual(init.signal, controller.signal);
      started.resolve(init.signal);
      return abortFailure(init.signal);
    });
    const pending = fixture.create().generate(fixture.request, env, controller.signal);
    const upstream = await started.promise;
    controller.abort('PRIVATE_ABORT_REASON');
    assert.equal(upstream.aborted, true);
    assertAborted(await pending);
    assert.ok(durations.includes(120000));
    if (fixture.name === 'Console V2') assert.ok(durations.includes(10000));
    assert.equal(calls.length, fixture.name === 'Console V2' ? 2 : 1);
  });

  for (const status of [200, 503]) {
    test(`${fixture.name}: abort during ${status} body read cannot become success/retryable failure`, async t => {
      const reading = deferred(), controller = new AbortController();
      let bodyController;
      controlledTransport(t, fixture, async (url, init) => {
        const response = new Response(new ReadableStream({ start(source) { bodyController = source; } }), { status });
        const method = status === 200 ? 'json' : 'text';
        const original = response[method].bind(response);
        t.mock.method(response, method, () => { reading.resolve(); return original(); });
        init.signal.addEventListener('abort', () => bodyController.error(init.signal.reason), { once: true });
        return response;
      });
      const pending = fixture.create().generate(fixture.request, env, controller.signal);
      await reading.promise;
      controller.abort(new DOMException('Private abort', 'AbortError'));
      const response = await pending;
      assertAborted(response);
      assert.equal(response.modelUsed, null);
      assert.equal(response.usage.source, 'unknown');
    });
  }

  test(`${fixture.name}: ignored-signal late JSON discards output but preserves measured usage/identity`, async t => {
    const reading = deferred(), controller = new AbortController();
    let bodyController;
    controlledTransport(t, fixture, async () => {
      const response = new Response(new ReadableStream({ start(source) { bodyController = source; } }));
      const original = response.json.bind(response);
      t.mock.method(response, 'json', () => { reading.resolve(); return original(); });
      return response;
    });
    const pending = fixture.create().generate(fixture.request, env, controller.signal);
    await reading.promise;
    controller.abort('PRIVATE_ABORT_REASON');
    bodyController.enqueue(new TextEncoder().encode(JSON.stringify(fixture.payload())));
    bodyController.close();
    const response = await pending;
    assertAborted(response);
    assert.equal(response.modelUsed, 'fixture-actual');
    assert.deepEqual(response.usage, measuredUsage);
  });

  test(`${fixture.name}: two-argument generate remains compatible and reports real output`, async t => {
    controlledTransport(t, fixture, async () => Response.json(fixture.payload()));
    const response = await fixture.create().generate(fixture.request, env);
    assert.equal(response.ok, true);
    assert.equal(response.modelUsed, 'fixture-actual');
    assert.deepEqual(response.usage, measuredUsage);
  });
}

for (const fixture of transports) {
  for (const status of [200, 503]) {
    test(`${fixture.name}: ignored-signal late fetch ${status} is ABORTED before body processing`, async t => {
      const started = deferred(), release = deferred(), controller = new AbortController();
      controlledTransport(t, fixture, async () => {
        started.resolve();
        await release.promise;
        const response = status === 200 ? Response.json(fixture.payload()) : new Response('Private retryable error', { status });
        t.mock.method(response, 'json', () => assert.fail('Late response must not read JSON'));
        t.mock.method(response, 'text', () => assert.fail('Late response must not read error text'));
        return response;
      });
      const pending = fixture.create().generate(fixture.request, env, controller.signal);
      await started.promise;
      controller.abort();
      release.resolve();
      const response = await pending;
      assertAborted(response);
      assert.equal(response.modelUsed, null);
      assert.equal(response.usage.source, 'unknown');
    });
  }

  test(`${fixture.name}: inference deadline still aborts with a live user signal and stays TIMEOUT`, async t => {
    const started = deferred(), deadline = new AbortController(), user = new AbortController();
    const originalTimeout = AbortSignal.timeout;
    t.mock.method(AbortSignal, 'timeout', ms => ms === 120000 ? deadline.signal : originalTimeout(ms));
    controlledTransport(t, fixture, async (url, init) => {
      started.resolve(init.signal);
      return abortFailure(init.signal);
    });
    const pending = fixture.create().generate(fixture.request, env, user.signal);
    const upstream = await started.promise;
    deadline.abort(new DOMException('Fixture deadline', 'TimeoutError'));
    assert.equal(upstream.aborted, true);
    assert.equal(user.signal.aborted, false);
    const response = await pending;
    assert.equal(response.ok, false);
    assert.equal(response.error.category, 'TIMEOUT');
    assert.equal(response.error.retryable, true);
  });
}

for (const operation of ['generate', 'stream']) {
  test(`Console V2 ${operation}: config deadline stays active with a live user signal`, async t => {
    const started = deferred(), deadline = new AbortController(), user = new AbortController();
    t.mock.method(AbortSignal, 'timeout', ms => { assert.equal(ms, 10000); return deadline.signal; });
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      calls++;
      assert.equal(url, 'https://opencode.ai/console/api/v2/config');
      started.resolve(init.signal);
      return abortFailure(init.signal);
    });
    const adapter = new OpenCodeConsoleV2Adapter();
    const pending = operation === 'generate'
      ? adapter.generate(transports[2].request, env, user.signal)
      : adapter.stream(transports[2].request, env, user.signal).next();
    const upstream = await started.promise;
    deadline.abort(new DOMException('Fixture deadline', 'TimeoutError'));
    assert.equal(upstream.aborted, true);
    assert.equal(user.signal.aborted, false);
    const result = await pending;
    assert.equal((operation === 'generate' ? result : result.value).error.category, 'TIMEOUT');
    assert.equal(calls, 1);
  });

  for (const phase of ['fetch', 'body', 'ignored-fetch', 'ignored-body']) {
    test(`Console V2 ${operation}: abort during config ${phase} never starts inference`, async t => {
      const started = deferred(), release = deferred(), controller = new AbortController();
      let calls = 0, source;
      const durations = trackTimeouts(t);
      t.mock.method(globalThis, 'fetch', async (url, init) => {
        calls++;
        assert.equal(url, 'https://opencode.ai/console/api/v2/config');
        assert.equal(init.headers.authorization, `Bearer ${env.OPENCODE_CONSOLE_TOKEN}`);
        assert.equal(init.redirect, 'error');
        if (phase === 'fetch') { started.resolve(init.signal); return abortFailure(init.signal); }
        if (phase === 'ignored-fetch') { started.resolve(init.signal); await release.promise; return Response.json(config()); }
        const response = new Response(new ReadableStream({ start(value) { source = value; } }));
        const original = response.json.bind(response);
        t.mock.method(response, 'json', () => { started.resolve(init.signal); return original(); });
        if (phase === 'body') init.signal.addEventListener('abort', () => source.error(init.signal.reason), { once: true });
        return response;
      });
      const adapter = new OpenCodeConsoleV2Adapter(), request = transports[2].request;
      const pending = operation === 'generate'
        ? adapter.generate(request, env, controller.signal)
        : adapter.stream(request, env, controller.signal).next();
      const upstream = await started.promise;
      controller.abort('PRIVATE_ABORT_REASON');
      assert.equal(upstream.aborted, true);
      release.resolve();
      if (phase === 'ignored-body') { source.enqueue(new TextEncoder().encode(JSON.stringify(config()))); source.close(); }
      const result = await pending;
      if (operation === 'generate') assertAborted(result);
      else { assert.equal(result.value.error.category, 'ABORTED'); assert.equal(result.value.done, true); }
      assert.deepEqual(durations, [10000]);
      assert.equal(calls, 1);
    });
  }
}

const nativeStreams = [
  ...transports,
  { name: 'Anthropic', create: () => getAdapter('anthropic'), request: { ...primary, providerId: 'anthropic', modelId: 'claude-3-haiku-20240307' } },
];
for (const fixture of nativeStreams) {
  test(`${fixture.name}: composed streaming signal retains incremental UTF-8 and native usage before EOF`, async t => {
    const user = new AbortController();
    let source, upstream;
    controlledTransport(t, fixture, async (url, init) => {
      upstream = init.signal;
      assert.notEqual(upstream, user.signal);
      assert.equal(upstream.aborted, false);
      return new Response(new ReadableStream({ start(value) { source = value; } }));
    });
    const firstEvents = fixture.name === 'Gemini'
      ? [{ candidates: [{ content: { parts: [{ text: 'hé' }] } }] }]
      : fixture.name === 'Anthropic'
        ? [{ type: 'message_start', message: { usage: { input_tokens: 11, cache_read_input_tokens: 2 } } }, { type: 'content_block_delta', delta: { text: 'hé' } }]
        : [{ choices: [{ delta: { content: 'hé' } }] }];
    const restEvents = fixture.name === 'Gemini'
      ? [{ candidates: [{ content: { parts: [{ text: 'llo' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7, cachedContentTokenCount: 2 } }]
      : fixture.name === 'Anthropic'
        ? [{ type: 'content_block_delta', delta: { text: 'llo' } }, { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 7 } }]
        : [{ choices: [{ delta: { content: 'llo' }, finish_reason: 'stop' }] }, { usage: completion().usage }];
    const encode = values => new TextEncoder().encode(values.map(value => `data: ${JSON.stringify(value)}\n\n`).join(''));
    const iterator = fixture.create().stream(fixture.request, { ...env, ANTHROPIC_API_KEY: 'TEST_ONLY_NEVER_LIVE' }, user.signal);
    const firstPending = iterator.next();
    // Console configuration is asynchronous; wait for its actual inference fetch.
    await flush();
    const bytes = encode(firstEvents), split = bytes.indexOf(0xc3) + 1;
    source.enqueue(bytes.slice(0, split));
    source.enqueue(bytes.slice(split));
    const first = await firstPending;
    assert.equal(first.value.delta, 'hé');
    assert.equal(first.value.done, false);
    source.enqueue(encode(restEvents));
    source.close();
    const values = [];
    for await (const value of iterator) values.push(value);
    assert.equal(values.map(value => value.delta).join(''), 'llo');
    assert.equal(values.filter(value => value.done).length, 1);
    assert.equal(values.at(-1).error, null);
    assert.deepEqual(values.at(-1).usage, measuredUsage);
    user.abort();
    assert.equal(upstream.aborted, true);
  });
}

for (const fixture of transports.slice(0, 2)) {
  test(`${fixture.name}: stream body abort is distinct and releases the upstream reader`, async t => {
    const controller = new AbortController(), reading = deferred();
    let source, response;
    const durations = trackTimeouts(t);
    controlledTransport(t, fixture, async (url, init) => {
      response = new Response(new ReadableStream({
        start(value) { source = value; },
        pull() { reading.resolve(); },
      }));
      init.signal.addEventListener('abort', () => source.error(init.signal.reason), { once: true });
      return response;
    });
    const iterator = fixture.create().stream(fixture.request, env, controller.signal);
    const pending = iterator.next();
    await reading.promise;
    controller.abort('PRIVATE_ABORT_REASON');
    const result = await pending;
    assert.equal(result.value.error.category, 'ABORTED');
    assert.equal(result.value.done, true);
    assert.equal(response.body.locked, false);
    assert.deepEqual(durations, [120000]);
    assert.equal((await iterator.next()).done, true);
  });
}

for (const late of ['success', 'retryable failure', 'throw']) {
  test(`fallback: ignored cancellation plus late ${late} never starts a secondary or mutates health`, async t => isolated(t, async () => {
    const started = deferred(), release = deferred(), controller = new AbortController();
    const adapter = getAdapter('openai'), other = getAdapter('groq');
    const health = { ...getHealth('openai') };
    let secondaryCalls = 0;
    t.mock.method(other, 'generate', async () => { secondaryCalls++; assert.fail('No secondary after cancellation'); });
    t.mock.method(adapter, 'generate', async (request, suppliedEnv, signal) => {
      assert.equal(signal, controller.signal);
      assert.equal(request.modelId, primary.modelId);
      assert.equal(suppliedEnv, env);
      started.resolve();
      await release.promise;
      if (late === 'throw') throw new Error('Private late failure');
      return generationResult(late === 'success');
    });
    const pending = generateWithFallback(primary, env, secondary, false, controller.signal);
    await started.promise;
    controller.abort('PRIVATE_ABORT_REASON');
    release.resolve();
    const result = await pending;
    assertAborted(result.response);
    assert.equal(result.actualProviderId, 'openai');
    assert.equal(result.routedModelId, primary.modelId);
    assert.equal(result.actualModelId, late === 'throw' ? null : 'fixture-actual');
    assert.equal(result.fallbackUsed, false);
    assert.equal(result.fallbackCount, 0);
    assert.equal(secondaryCalls, 0);
    assert.deepEqual(getHealth('openai'), health);
    const records = getUsageRecords();
    assert.equal(records.length, 1);
    assert.equal(records[0].success, false);
    assert.equal(records[0].errorCategory, 'ABORTED');
    assert.equal(records[0].outputTokens, late === 'throw' ? null : 7);
  }));
}

test('fallback: preabort reports no actual/routed identity, health change, usage, or adapter call', async t => isolated(t, async () => {
  t.mock.method(getAdapter('openai'), 'generate', async () => assert.fail('Preabort must not call primary'));
  t.mock.method(getAdapter('groq'), 'generate', async () => assert.fail('Preabort must not call secondary'));
  const health = { ...getHealth('openai') };
  const result = await generateWithFallback(primary, env, secondary, false, AbortSignal.abort());
  assertAborted(result.response);
  for (const key of ['actualProviderId', 'actualModelId', 'routedModelId', 'controlsUsed']) assert.equal(result[key], null);
  assert.equal(result.fallbackCount, 0);
  assert.deepEqual(result.fallbackChain, []);
  assert.deepEqual(getUsageRecords(), []);
  assert.deepEqual(getHealth('openai'), health);
}));

test('fallback: adapter ABORTED outcome without an aborted caller never fails provider health or retries', async t => isolated(t, async () => {
  const health = { ...getHealth('openai') };
  t.mock.method(getAdapter('openai'), 'generate', async () => generationResult(false, 'ABORTED'));
  t.mock.method(getAdapter('groq'), 'generate', async () => assert.fail('ABORTED is never retryable'));
  const result = await generateWithFallback(primary, env, secondary);
  assertAborted(result.response);
  assert.deepEqual(getHealth('openai'), health);
  assert.equal(getUsageRecords()[0].errorCategory, 'ABORTED');
}));

for (const operation of ['generate', 'stream']) {
  test(`${operation} POST: already-aborted request executes handler with zero transport/adapter calls`, async t => {
    routeEnvironment(t);
    const adapter = getAdapter('openai'), health = { ...getHealth('openai') };
    const count = getUsageRecords().length;
    t.mock.method(adapter, operation, () => assert.fail('Preabort must not execute adapter'));
    const request = routeRequest(operation, AbortSignal.abort());
    const baseline = getEventListeners(request.signal, 'abort').length;
    const response = await (operation === 'generate' ? generatePOST : streamPOST)(request);
    if (operation === 'generate') {
      const value = await response.json();
      assertAborted(value);
      assert.equal(value.actualProviderId, null);
      assert.equal(value.actualModelId, null);
    } else {
      const values = events(await response.text());
      assert.equal(values.length, 1);
      assert.equal(values[0].error.category, 'ABORTED');
      assert.equal(values[0].actualProviderId, null);
    }
    assert.equal(getEventListeners(request.signal, 'abort').length, baseline);
    assert.deepEqual(getHealth('openai'), health);
    assert.equal(getUsageRecords().length, count);
  });

  test(`${operation} POST: abort while parsing request body is normalized without provider calls`, async t => {
    routeEnvironment(t);
    const controller = new AbortController(), reading = deferred();
    let source;
    const request = new NextRequest(`http://localhost/api/build/ai/${operation}`, {
      method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, signal: controller.signal,
      body: new ReadableStream({ start(value) { source = value; } }), duplex: 'half',
    });
    const original = request.json.bind(request);
    t.mock.method(request, 'json', () => { reading.resolve(); return original(); });
    const pending = (operation === 'generate' ? generatePOST : streamPOST)(request);
    await reading.promise;
    controller.abort();
    source.error(controller.signal.reason);
    const response = await pending;
    if (operation === 'generate') assertAborted(await response.json());
    else assert.equal(events(await response.text())[0].error.category, 'ABORTED');
  });
}

test('generate POST: request.signal reaches real fetch and cancellation never starts fallback', async t => {
  routeEnvironment(t);
  const controller = new AbortController(), started = deferred();
  const health = { ...getHealth('openai') }, count = getUsageRecords().length;
  t.mock.method(getAdapter('groq'), 'generate', async () => assert.fail('No fallback after route cancellation'));
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    started.resolve(init.signal);
    return abortFailure(init.signal);
  });
  const request = routeRequest('generate', controller.signal, { ...primary, fallbackChain: secondary });
  const pending = generatePOST(request);
  const signal = await started.promise;
  controller.abort('PRIVATE_ABORT_REASON');
  assert.equal(signal.aborted, true);
  const result = await (await pending).json();
  assertAborted(result);
  assert.equal(result.actualProviderId, 'openai');
  assert.equal(result.actualModelId, null);
  assert.equal(result.fallbackCount, 0);
  assert.deepEqual(getHealth('openai'), health);
  assert.equal(getUsageRecords().length, count + 1);
  assert.equal(getUsageRecords()[0].errorCategory, 'ABORTED');
});

test('stream POST: request abort rejects late output, records ABORTED, and removes listener', async t => {
  routeEnvironment(t);
  const controller = new AbortController(), waiting = deferred(), release = deferred();
  const health = { ...getHealth('openai') };
  t.mock.method(getAdapter('openai'), 'stream', async function* (request, suppliedEnv, signal) {
    yield chunk('before');
    waiting.resolve(signal);
    await release.promise; // Deliberately ignore abort.
    yield chunk('LATE_OUTPUT_MUST_NOT_ESCAPE', true);
  });
  const request = routeRequest('stream', controller.signal);
  const baseline = getEventListeners(request.signal, 'abort').length;
  const response = await streamPOST(request), reader = response.body.getReader();
  const first = await reader.read();
  const upstream = await waiting.promise;
  assert.equal(getEventListeners(request.signal, 'abort').length, baseline + 1);
  controller.abort('PRIVATE_ABORT_REASON');
  assert.equal(upstream.aborted, true);
  release.resolve();
  let text = new TextDecoder().decode(first.value);
  while (true) { const result = await reader.read(); if (result.done) break; text += new TextDecoder().decode(result.value); }
  const values = events(text);
  assert.equal(values.length, 2);
  assert.equal(values[0].delta, 'before');
  assert.equal(values[1].delta, '');
  assert.equal(values[1].error.category, 'ABORTED');
  assert.equal(values[1].actualModelId, 'fixture-actual');
  assert.doesNotMatch(text, /LATE_OUTPUT_MUST_NOT_ESCAPE|PRIVATE_ABORT_REASON/);
  assert.equal(getEventListeners(request.signal, 'abort').length, baseline);
  assert.deepEqual(getHealth('openai'), health);
  assert.equal(getUsageRecords()[0].errorCategory, 'ABORTED');
  assert.equal(getUsageRecords()[0].success, false);
  assert.equal(getUsageRecords()[0].outputTokens, 7);
});

for (const outcome of ['late success', 'late throw']) {
  test(`stream POST: reader.cancel aborts upstream and cleans listener without enqueue/close after ${outcome}`, async t => {
    routeEnvironment(t);
    const waiting = deferred(), release = deferred(), finished = deferred();
    const health = { ...getHealth('openai') }, count = getUsageRecords().length;
    t.mock.method(getAdapter('openai'), 'stream', async function* (request, suppliedEnv, signal) {
      try {
        yield chunk('before');
        waiting.resolve(signal);
        await release.promise;
        if (outcome === 'late throw') throw new Error('Private late failure');
        yield chunk('LATE_OUTPUT_MUST_NOT_ESCAPE', true);
      } finally { finished.resolve(); }
    });
    const request = routeRequest('stream', new AbortController().signal);
    const baseline = getEventListeners(request.signal, 'abort').length;
    const response = await streamPOST(request), reader = response.body.getReader();
    await reader.read();
    const upstream = await waiting.promise;
    assert.equal(getEventListeners(request.signal, 'abort').length, baseline + 1);
    await reader.cancel('PRIVATE_CONSUMER_REASON');
    assert.equal(upstream.aborted, true);
    assert.equal(getEventListeners(request.signal, 'abort').length, baseline);
    release.resolve();
    await finished.promise;
    await flush();
    assert.equal((await reader.read()).done, true);
    assert.deepEqual(getHealth('openai'), health);
    assert.equal(getUsageRecords().length, count + 1);
    assert.equal(getUsageRecords()[0].errorCategory, 'ABORTED');
    assert.equal(getUsageRecords()[0].success, false);
  });
}

for (const category of ['ABORTED', 'NETWORK', null]) {
  test(`stream POST: ${category ?? 'normal completion'} classification and listener cleanup`, async t => {
    routeEnvironment(t);
    const health = { ...getHealth('openai') };
    t.mock.method(getAdapter('openai'), 'stream', async function* () {
      yield chunk('before');
      if (category === 'ABORTED') throw new DOMException('Private cancellation', 'AbortError');
      if (category === 'NETWORK') throw new Error('PRIVATE_NETWORK_DETAILS');
      yield chunk('', true);
    });
    const request = routeRequest('stream', new AbortController().signal);
    const baseline = getEventListeners(request.signal, 'abort').length;
    const values = events(await (await streamPOST(request)).text());
    assert.equal(values.at(-1).error?.category ?? null, category);
    assert.equal(getUsageRecords()[0].errorCategory, category);
    assert.equal(getUsageRecords()[0].success, category === null);
    assert.equal(getEventListeners(request.signal, 'abort').length, baseline);
    assert.doesNotMatch(JSON.stringify(values), /PRIVATE_NETWORK_DETAILS|Private cancellation/);
    if (category === 'ABORTED') assert.deepEqual(getHealth('openai'), health);
    else assert.equal(getHealth('openai').streaming, category ? 'FAILED' : 'STREAMING_VERIFIED');
  });
}

test('generation handlers retain origin and hosted authentication refusals even on preabort', async t => {
  routeEnvironment(t);
  for (const handler of [generatePOST, streamPOST]) {
    const hostile = new NextRequest('http://localhost/api/build/ai/generate', {
      method: 'POST', headers: { origin: 'https://hostile.example' }, body: JSON.stringify(primary), signal: AbortSignal.abort(),
    });
    assert.equal((await handler(hostile)).status, 403);
  }
  process.env.KNOUX_BUILD_ENVIRONMENT = 'preview';
  for (const handler of [generatePOST, streamPOST]) {
    const response = await handler(routeRequest('generate', AbortSignal.abort()));
    assert.equal(response.status, 401);
  }
});
