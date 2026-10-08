import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const plan = await loadTypeScript('../src/lib/build/engineering-plan.ts');
const artifact = Object.fromEntries(plan.PLAN_SECTIONS.map((section) => [section, ['A concrete proposal.']]));

test('planning requires every engineering section and rejects partial model output', () => {
  assert.deepEqual(plan.parseEngineeringPlan('```json\n' + JSON.stringify(artifact) + '\n```'), artifact);
  assert.throws(() => plan.parseEngineeringPlan('Work completed!'), /complete structured/);
  assert.throws(() => plan.parseEngineeringPlan(JSON.stringify({ GOAL: ['Build it'] })), /Incomplete/);
  assert.throws(() => plan.parseEngineeringPlan(JSON.stringify({ ...artifact, RISKS: [null] })), /invalid/);
});

function stream(text, terminal = true) {
  const data = 'data: ' + JSON.stringify({ delta: text, done: false }) + '\r\n\r\n' + (terminal ? 'data: ' + JSON.stringify({ delta: '', done: true, usage: { inputTokens: 11, outputTokens: 22 } }) + '\n\n' : '');
  const encoded = new TextEncoder().encode(data);
  return new ReadableStream({ start(controller) { for (let i = 0; i < encoded.length; i += 7) controller.enqueue(encoded.slice(i, i + 7)); controller.close(); } });
}

test('stream parser handles split UTF-8 and SSE frames, retaining measured usage', async () => {
  const source = { ...artifact, GOAL: ['Build العربية infrastructure'] };
  let characters = 0;
  const result = await plan.consumePlanStream(stream(JSON.stringify(source)), (n) => { characters = n; });
  assert.deepEqual(result.plan, source);
  assert.equal(result.terminal.usage.outputTokens, 22);
  assert.ok(characters > 0);
});

test('unterminated and errored streams cannot report a planned success', async () => {
  await assert.rejects(plan.consumePlanStream(stream(JSON.stringify(artifact), false), () => {}), /completion record/);
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: {"delta":"","done":true,"error":{"safeMessage":"Provider blocked"}}\n\n')); c.close(); } });
  await assert.rejects(plan.consumePlanStream(body, () => {}), /Provider blocked/);
});

test('plan context grants no execution or tool permission', () => {
  const text = plan.planPrompt({ rawInput: 'Build a portal', productKind: 'portal', requestedStack: [], requestedCapabilities: [], requestedIntegrations: [], deploymentTarget: 'web' }, { project: null, worktree: null, branch: null });
  const value = JSON.parse(text);
  assert.deepEqual(value.tools, []);
  assert.match(value.permissions, /requires separate trusted executor approval/);
});

test('planning fallback refuses authentication and permission-related errors', () => {
  for (const category of ['AUTHENTICATION', 'INVALID_REQUEST', 'ABORTED', 'CONTEXT_OVERFLOW', 'UNSUPPORTED_CAPABILITY']) {
    assert.equal(plan.canFallbackPlanError(new plan.PlanStreamError('Refused', category)), false);
  }
  assert.equal(plan.canFallbackPlanError(new plan.PlanStreamError('Rate limited', 'RATE_LIMIT')), true);
});

test('a background routing result cannot overwrite the explicit manual selection', async () => {
  const { buildReducer, initialBuildState } = await loadTypeScript('../src/lib/build/workspace-state.ts');
  const selected = { ...initialBuildState, ai: { ...initialBuildState.ai, routingMode: 'manual', providerId: 'gemini', modelId: 'selected' } };
  const updated = buildReducer(selected, { type: 'routing/resolved', routing: { providerId: null, modelId: null } });
  assert.equal(updated.ai.providerId, 'gemini');
  assert.equal(updated.ai.modelId, 'selected');
});

test('AUTO excludes a discovered provider with generation blocked or auth unverified', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const router = await loadTypeScript('../src/lib/ai/router-v2.ts');
  const model = { providerId: 'deepseek', modelId: 'deepseek-chat', displayName: 'DeepSeek', contextWindow: null, modalities: { text: true }, capabilities: { vision: 'UNKNOWN', tools: 'UNKNOWN', structuredOutput: 'UNKNOWN' } };
  registry.setDiscoveryCache('deepseek', [model], 'LIVE');
  const input = router.buildRouterInput('engineering-plan', 'auto', 'Build a portal');
  for (const health of [{ configured: true, auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', generation: 'BLOCKED' }, { configured: true, auth: 'CONFIGURED_UNTESTED', discovery: 'DISCOVERY_VERIFIED', generation: 'GENERATION_VERIFIED' }]) {
    assert.equal(router.routeV2(input, new Map([['deepseek', health]])).selected, null);
  }
  registry.clearDiscoveryCache();
});

test('a stale plan completion cannot replace the newly selected project context', async () => {
  const { buildReducer, initialBuildState } = await loadTypeScript('../src/lib/build/workspace-state.ts');
  const begun = buildReducer(initialBuildState, { type: 'engineering/begin', requestId: 'old-request', context: { project: 'First', worktree: '/first', branch: 'first' } });
  const switched = buildReducer(begun, { type: 'project/activate', path: '/second', name: 'Second' });
  const stale = buildReducer(switched, { type: 'engineering/update', requestId: 'old-request', patch: { stage: 'PLANNED', plan: artifact } });
  assert.equal(stale.engineering.plan, null);
  assert.equal(stale.engineering.stage, 'LISTENING');
});

test('canonical fallback reports actual runtime and never repeats the final charged failure', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const { generateWithFallback } = await loadTypeScript('../src/lib/ai/fallback.ts');
  const primary = registry.getAdapter('openai'), secondary = registry.getAdapter('groq');
  const original = [primary.generate, secondary.generate];
  const counts = { openai: 0, groq: 0 };
  const failure = { ok: false, text: '', finishReason: null, usage: { inputTokens: null, outputTokens: null, cachedTokens: null, source: 'unknown' }, latencyMs: 1, ttftMs: null, providerRequestId: null, modelUsed: 'mock-model', warnings: [], estimatedCost: null, error: { category: 'RATE_LIMIT', safeMessage: 'Rate limited', retryable: true } };
  primary.generate = async () => { counts.openai++; return failure; };
  secondary.generate = async () => { counts.groq++; return failure; };
  try {
    const result = await generateWithFallback({ providerId: 'openai', modelId: 'requested', messages: [{ role: 'user', content: 'Plan' }] }, {}, [{ providerId: 'groq', modelId: 'fallback' }]);
    assert.deepEqual(counts, { openai: 1, groq: 1 });
    assert.equal(result.actualProviderId, 'groq');
    assert.equal(result.actualModelId, 'mock-model');
    assert.equal(result.response.ok, false);
    assert.equal(result.fallbackCount, 1);
    const usage = await loadTypeScript('../src/lib/ai/usage.ts');
    const calls = usage.getUsageRecords().filter((record) => ['requested', 'fallback'].includes(record.modelId));
    assert.equal(calls.length, 2);
    assert.equal(usage.getUsageSummary().byProvider.groq.cost, null);
    assert.equal(usage.getUsageSummary().totalEstimatedCost, null);
  } finally { primary.generate = original[0]; secondary.generate = original[1]; }
});
