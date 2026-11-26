import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const { VENDOR_CONFIGS, VendorAdapter } = await loadTypeScript('../src/lib/ai/adapters/vendors.ts');
const modes = await loadTypeScript('../src/lib/build/knoux-modes.ts');
const { initialBuildState, buildReducer } = await loadTypeScript('../src/lib/build/workspace-state.ts');

const nvidiaConfig = VENDOR_CONFIGS.find((entry) => entry.id === 'nvidia');
const adapter = new VendorAdapter(nvidiaConfig);
const frame = (value) => new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);
const sseResponse = (frames) => new Response(new Blob(frames), { status: 200, headers: { 'content-type': 'text/event-stream' } });

test('nvidia configuration keeps one adapter identity and alias credential names', () => {
  assert.equal(nvidiaConfig.id, 'nvidia');
  assert.equal(nvidiaConfig.baseUrl, 'https://integrate.api.nvidia.com/v1');
  assert.deepEqual(nvidiaConfig.requiredEnv, ['NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY']);
  assert.equal(nvidiaConfig.envMode, 'any');
  assert.equal(nvidiaConfig.probeStrategy, 'completion');
  assert.ok(nvidiaConfig.probeCompletionModel, 'a current probe model must be declared');
  assert.equal(nvidiaConfig.streamUsage, true);
  assert.ok(nvidiaConfig.staticModels.length > 0);
  assert.equal(nvidiaConfig.staticModels.includes('openai/gpt-oss-20b'), false, 'retired model must not be published');
});

test('isConfigured honors envMode any: either alias configures, neither does not', () => {
  assert.equal(adapter.isConfigured({}), false);
  assert.equal(adapter.isConfigured({ NVIDIA_API_KEY: '  ' }), false);
  assert.equal(adapter.isConfigured({ NVIDIA_API_KEY: 'test-only' }), true);
  assert.equal(adapter.isConfigured({ NVIDIA_NIM_API_KEY: 'test-only' }), true);
});

test('completion probe: 200 authenticates, 401 is AUTHENTICATION, 410/404 are MODEL_NOT_FOUND', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const env = { NVIDIA_API_KEY: 'test-only' };
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response('{}', { status: 200 }); };
  const ok = await adapter.probe(env);
  assert.equal(ok.authenticated, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/chat\/completions$/);
  assert.equal(calls[0].body.model, nvidiaConfig.probeCompletionModel);
  assert.ok(calls[0].body.max_tokens <= 16, 'probe must stay bounded');
  assert.equal(calls[0].body.stream, false);

  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'invalid key' } }), { status: 401 });
  const denied = await adapter.probe(env);
  assert.equal(denied.authenticated, false);
  assert.equal(denied.error.category, 'AUTHENTICATION');
  assert.equal(denied.error.httpStatus, 401);

  for (const status of [404, 410]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'retired' }), { status });
    const retired = await adapter.probe(env);
    assert.equal(retired.authenticated, false);
    assert.equal(retired.error.category, 'MODEL_NOT_FOUND', `${status} must not be reported as bad credentials`);
    assert.equal(retired.error.httpStatus, status);
  }

  globalThis.fetch = async () => new Response('busy', { status: 429 });
  const limited = await adapter.probe(env);
  assert.equal(limited.error.category, 'RATE_LIMIT');
  assert.equal(limited.error.retryable, true);
});

test('probe without credential never calls the network', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{}'); };
  const result = await adapter.probe({});
  assert.equal(result.authenticated, false);
  assert.equal(result.error.category, 'AUTHENTICATION');
  assert.equal(calls, 0);
});

test('nvidia streaming requests include_usage and reports provider usage at the terminal', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let body = null;
  globalThis.fetch = async (url, options) => {
    body = JSON.parse(options.body);
    return sseResponse([
      frame({ model: nvidiaConfig.probeCompletionModel, choices: [{ delta: { content: 'ok' }, finish_reason: null }] }),
      frame({ choices: [{ delta: {}, finish_reason: 'stop' }] }),
      frame({ choices: [], usage: { prompt_tokens: 23, completion_tokens: 8, prompt_tokens_details: { cached_tokens: 0 } } }),
      new TextEncoder().encode('data: [DONE]\n\n'),
    ]);
  };
  const chunks = [];
  for await (const chunk of adapter.stream({ providerId: 'nvidia', modelId: nvidiaConfig.probeCompletionModel, messages: [{ role: 'user', content: 'test-only' }] }, { NVIDIA_API_KEY: 'test-only' })) chunks.push(chunk);
  assert.deepEqual(body.stream_options, { include_usage: true });
  const terminal = chunks.at(-1);
  assert.equal(terminal.done, true);
  assert.equal(terminal.finishReason, 'stop');
  assert.equal(terminal.usage.source, 'provider');
  assert.equal(terminal.usage.inputTokens, 23);
  assert.equal(terminal.usage.outputTokens, 8);
});

test('other vendors keep their request shape: no stream_options unless declared', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const xai = new VendorAdapter(VENDOR_CONFIGS.find((entry) => entry.id === 'xai'));
  let body = null;
  globalThis.fetch = async (url, options) => { body = JSON.parse(options.body); return sseResponse([frame({ choices: [{ delta: {}, finish_reason: 'stop' }] }), new TextEncoder().encode('data: [DONE]\n\n')]); };
  for await (const _chunk of xai.stream({ providerId: 'xai', modelId: 'test-model', messages: [{ role: 'user', content: 'test-only' }] }, { XAI_API_KEY: 'test-only' })) { /* drain */ }
  assert.equal(body.stream_options, undefined);
});

test('KNOUX modes: PRO first, Standard second; roles are a fixed measured chain', () => {
  assert.deepEqual(modes.KNOUX_BUILD_MODES, ['PRO', 'STANDARD']);
  assert.equal(modes.KNOUX_MODE_LABELS.PRO, 'KNOUX PRO');
  assert.equal(modes.KNOUX_MODE_LABELS.STANDARD, 'KNOUX Standard');
  assert.deepEqual(modes.PRO_ROLES, ['Architect', 'Coder', 'UI Designer', 'Debugger', 'Reviewer']);
  assert.equal(modes.isKnouxBuildMode('PRO'), true);
  assert.equal(modes.isKnouxBuildMode('pro'), false);
  const runs = modes.initialProRoleRuns();
  assert.equal(runs.length, 5);
  assert.ok(runs.every((run) => run.status === 'PENDING' && run.latencyMs === null));
  for (const role of modes.PRO_ROLES) {
    const system = modes.proRoleSystem(role);
    assert.ok(system.includes(role));
    assert.ok(system.includes('Return ONLY one JSON object'));
    assert.ok(system.includes('No tools are available during planning'));
  }
});

test('PRO aggregation sums only measured passes; unknown stays unknown', () => {
  const runs = modes.initialProRoleRuns();
  runs[0] = { ...runs[0], status: 'COMPLETE', latencyMs: 100, usage: { inputTokens: 10, outputTokens: 20 } };
  runs[1] = { ...runs[1], status: 'COMPLETE', latencyMs: null, usage: { inputTokens: 5, outputTokens: null } };
  runs[2] = { ...runs[2], status: 'FAILED', latencyMs: 999, usage: { inputTokens: 999, outputTokens: 999 } };
  const totals = modes.aggregateProRuns(runs);
  assert.equal(totals.completed, 2);
  assert.equal(totals.total, 5);
  assert.equal(totals.latencyMs, 100);
  assert.deepEqual(totals.usage, { inputTokens: 15, outputTokens: 20 });
  const empty = modes.aggregateProRuns(modes.initialProRoleRuns());
  assert.equal(empty.latencyMs, null);
  assert.deepEqual(empty.usage, { inputTokens: null, outputTokens: null });
});

test('workspace state defaults to PRO and switches modes through the reducer', () => {
  assert.equal(initialBuildState.ai.buildMode, 'PRO');
  const standard = buildReducer(initialBuildState, { type: 'ai/build-mode', buildMode: 'STANDARD' });
  assert.equal(standard.ai.buildMode, 'STANDARD');
  const back = buildReducer(standard, { type: 'ai/build-mode', buildMode: 'PRO' });
  assert.equal(back.ai.buildMode, 'PRO');
  assert.equal(back.ai.generationProfile, initialBuildState.ai.generationProfile, 'mode switch must not disturb other AI settings');
});

test('PRO role prompts embed the prior proposal as bounded data', async () => {
  const plans = await loadTypeScript('../src/lib/build/engineering-plan.ts');
  const intent = { rawInput: 'Test-only requirement', productKind: 'web', requestedStack: [], requestedCapabilities: [], requestedIntegrations: [], deploymentTarget: null };
  const context = { project: null, worktree: null, branch: null };
  const first = JSON.parse(modes.proRolePrompt('Architect', intent, context));
  assert.equal(first.agent, 'KNOuX PRO Architect');
  assert.deepEqual(first.chain, modes.PRO_ROLES);
  assert.equal(first.priorProposal, undefined);
  const artifact = Object.fromEntries(plans.PLAN_SECTIONS.map((section) => [section, ['Test-only proposal.']]));
  const second = JSON.parse(modes.proRolePrompt('Coder', intent, context, artifact));
  assert.equal(second.agent, 'KNOuX PRO Coder');
  assert.deepEqual(second.previousProposal.sections['GOAL'], ['Test-only proposal.']);
  assert.equal(second.previousProposal.generatedProjectFiles, null);
});