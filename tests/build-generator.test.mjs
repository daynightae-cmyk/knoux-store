import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

const profiles = await loadTypeScript('../src/lib/build/profile.ts');
const search = await loadTypeScript('../src/lib/build/model-search.ts');
const plans = await loadTypeScript('../src/lib/build/engineering-plan.ts');
const topology = await loadTypeScript('../src/lib/build/topology/derive.ts');
const layout = await loadTypeScript('../src/lib/build/topology/layout.ts');
const graph = await loadTypeScript('../src/lib/build/plan-graph.ts');
const model = { providerId: 'gemini', modelId: 'fixture-thinking', displayName: 'Explicit thinking fixture', contextWindow: 200000, maxOutputTokens: 20000, controls: { temperature: true, maxTokens: true, reasoningEffort: true }, capabilities: { reasoning: 'SUPPORTED', streaming: 'VERIFIED', tools: 'UNKNOWN' } };

test('profiles use real controls and cap output against known limits', () => {
  const expectations = [[2048, .2], [4096, .4], [16384, .3], [32768, .1]];
  profiles.GENERATION_PROFILES.forEach((profile, index) => {
    const result = profiles.profileToControls(profile, model);
    assert.deepEqual(Object.values(result.requested), expectations[index]);
    assert.equal(result.controls.maxOutputTokens, Math.min(expectations[index][0], 20000));
    assert.equal('reasoningEffort' in result.controls, false);
  });
  assert.equal(profiles.profileToControls('MAX', { ...model, providerId: 'openai', contextWindow: 1000 }, 900).controls.maxOutputTokens, 100);
  assert.equal(profiles.profileToControls('MAX', null).controls.maxOutputTokens, 4096);
  assert.deepEqual(profiles.profileToControls('DEEP', { ...model, controls: { temperature: false, maxTokens: false } }).controls, {});
});

test('provider thinking is managed or fixed, never advertised as adjustable', () => {
  assert.equal(profiles.effortSupport(model), 'MODEL_MANAGED');
  assert.equal(profiles.effortSupport({ ...model, providerId: 'anthropic' }), 'MODEL_MANAGED');
  assert.equal(profiles.effortSupport({ ...model, providerId: 'openai' }), 'FIXED_BY_PROVIDER');
  assert.equal(profiles.effortSupport({ ...model, capabilities: { reasoning: 'UNKNOWN' } }), 'FIXED_BY_PROVIDER');
  assert.equal(profiles.isGenerationProfile('max'), false);
});

test('search uses normalized identifiers, provider and proven capabilities', () => {
  const other = { ...model, providerId: 'deepseek', modelId: 'fixture-chat', displayName: 'Contract chat', capabilities: { reasoning: 'UNKNOWN', streaming: 'UNSUPPORTED', tools: 'VERIFIED' } };
  assert.deepEqual(search.searchModels([model, other], 'GEMINI thinking'), [model]);
  assert.deepEqual(search.searchModels([model, other], '', '', 'tools'), [other]);
  assert.deepEqual(search.searchModels([model, other], 'chat', 'gemini'), []);
  assert.equal(search.providerState({ configured: false }), 'CONFIG REQUIRED');
  assert.equal(search.providerState({ configured: true, auth: 'CONFIGURED_UNTESTED' }), 'AVAILABLE · UNTESTED');
});

function fixture(product, lines) {
  return { ...Object.fromEntries(plans.PLAN_SECTIONS.map((section) => [section, [`Explicit ${section.toLowerCase()} proposal for ${product}.`]])), GOAL: [`Build a ${product}.`], 'PRODUCT TYPE': [product], ...lines };
}

test('four product fixtures produce distinct, deterministic source-derived topology', () => {
  const fixtures = [fixture('delivery platform', { ROUTES: ['/dispatch', '/deliveries'] }), fixture('ecommerce storefront', { ROUTES: ['/catalog', '/checkout'] }), fixture('academy', { ROUTES: ['/courses', '/lessons'] }), fixture('CRM', { ROUTES: ['/contacts', '/pipeline'] })];
  assert.deepEqual(fixtures.map((plan) => topology.deriveTopology(plan).product), ['DELIVERY', 'ECOMMERCE', 'ACADEMY', 'CRM']);
  for (const plan of fixtures) {
    const derived = topology.deriveTopology(plan);
    assert.deepEqual(derived, topology.deriveTopology(structuredClone(plan)));
    for (const node of derived.nodes) assert.equal(plan[node.provenance.section][node.provenance.line - 1], node.provenance.source);
    for (const node of layout.layoutTopology(derived)) { assert.ok(node.x >= 0 && node.x <= 100); assert.ok(node.y >= 0 && node.y <= 100); }
  }
});

test('feature mutations add and remove only their supporting source nodes', () => {
  const base = fixture('delivery platform', { AUTH: ['No authentication required.'], INTEGRATIONS: ['No payment integration.'], ROUTES: ['/dispatch'] });
  const derived = topology.deriveTopology(base);
  assert.equal(derived.nodes.filter((node) => node.kind === 'auth').length, 0);
  assert.equal(derived.nodes.filter((node) => node.kind === 'integration').length, 0);
  assert.equal(derived.nodes.some((node) => /cash on delivery/i.test(node.label)), false);
  const added = topology.deriveTopology({ ...base, ROUTES: [...base.ROUTES, '/tracking'] });
  assert.equal(added.nodes.length, derived.nodes.length + 1);
  assert.equal(added.nodes.filter((node) => node.label === '/tracking').length, 1);
  assert.deepEqual(topology.deriveTopology(base), derived);
  const removed = topology.deriveTopology({ ...base, ROUTES: [] });
  assert.equal(removed.nodes.some((node) => node.label === '/dispatch'), false);
});

test('relations require an explicit reference and preserve that exact line', () => {
  const plan = fixture('delivery platform', { 'DATA MODEL': ['Orders -> Customers via customerId', 'Customers table holds contact records'] });
  const derived = topology.deriveTopology(plan);
  assert.equal(derived.edges.length, 1);
  assert.equal(derived.edges[0].provenance.source, plan['DATA MODEL'][0]);
  const independent = topology.deriveTopology({ ...plan, 'DATA MODEL': ['Orders table holds delivery records', 'Customers table holds contact records'] });
  assert.equal(independent.edges.length, 0);
});

test('plan graph preserves fourteen sections and every leaf has verbatim provenance', () => {
  const plan = fixture('academy', { ROUTES: ['/courses', '/lessons'] });
  const derived = graph.buildPlanGraph(plan);
  assert.equal(derived.sections.length, 14);
  assert.deepEqual(derived.sections.map((section) => section.label), plans.PLAN_SECTIONS);
  assert.equal(derived.leaves.length, 15);
  assert.equal(derived.edges.length, 15);
  for (const edge of derived.edges) assert.equal(edge.provenance.source, plan[edge.provenance.section][edge.provenance.line - 1]);
  assert.deepEqual(graph.buildPlanGraph(plan), derived);
});

test('the actual adapter body does not emit a declared reasoning effort', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  for (const id of ['openai', 'anthropic']) {
    const body = registry.getAdapter(id).buildRequestBody({ modelId: 'contract-fixture', messages: [], controls: { reasoningEffort: 'high' } }, false);
    assert.equal('reasoning_effort' in body, false);
    assert.equal('thinking' in body, false);
  }
});

test('confirmed stream structure excludes unfinished and invalid section arrays', () => {
  const prefix = '{"GOAL":["A bracket ] and escaped quote \\" survive"],"ROUTES":["/dispatch"],"AUTH":["Unfinished';
  assert.deepEqual(plans.confirmedPlanSections(prefix), { GOAL: ['A bracket ] and escaped quote " survive'], ROUTES: ['/dispatch'] });
  assert.deepEqual(plans.confirmedPlanSections('{"GOAL":[null],"AUTH":[]'), {});
  assert.deepEqual(plans.confirmedPlanSections('A prose response'), {});
});

test('streamed draft evidence does not require or manufacture a validated artifact', async () => {
  const frames = [{ delta: '{"GOAL":["Real incoming fixture goal"],', done: false }, { delta: '"ROUTES":["/dispatch"]}', done: true }];
  const stream = new ReadableStream({ start(controller) { frames.forEach((frame) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(frame)}\n\n`))); controller.close(); } });
  const drafts = [], text = [];
  await assert.rejects(plans.consumePlanStream(stream, () => {}, (draft) => drafts.push(draft), (part) => text.push(part)), /Incomplete/);
  assert.equal(drafts[0].GOAL[0], 'Real incoming fixture goal');
  assert.equal(text.length, 2);
  assert.equal(Object.keys(drafts.at(-1)).length, 2);
});

test('planning transitions never report executing, verifying or complete', async () => {
  const states = await loadTypeScript('../src/lib/build/generator-state.ts');
  for (const stage of ['LISTENING', 'RESOLVING', 'ROUTING', 'GENERATING', 'PLANNED', 'REVIEWING', 'EXECUTOR_NOT_CONNECTED']) {
    for (const prohibited of ['EXECUTING', 'VERIFYING', 'COMPLETE']) assert.equal(states.canTransitionPlan(stage, prohibited), false);
  }
  assert.equal(states.canTransitionPlan('GENERATING', 'PLANNED'), true);
  assert.equal(states.canTransitionPlan('PLANNED', 'REVIEWING'), true);
  assert.equal(states.stageToSkyPhase('GENERATING'), 'generating');
  assert.equal(states.stageToSkyPhase('AUTH_REQUIRED'), 'blocked');
  const { buildReducer, initialBuildState } = await loadTypeScript('../src/lib/build/workspace-state.ts');
  const begun = buildReducer(initialBuildState, { type: 'engineering/begin', requestId: 'fresh', context: { project: null, worktree: null, branch: null } });
  assert.equal(buildReducer(begun, { type: 'engineering/update', requestId: 'fresh', patch: { stage: 'COMPLETE' } }).engineering.stage, 'RESOLVING');
  const cleared = buildReducer({ ...begun, engineering: { ...begun.engineering, plan: fixture('CRM', {}), streamText: 'old', draftPlan: { GOAL: ['old'] } } }, { type: 'engineering/begin', requestId: 'new', context: { project: null, worktree: null, branch: null } });
  assert.equal(cleared.engineering.plan, null); assert.equal(cleared.engineering.draftPlan, null); assert.equal(cleared.engineering.streamText, '');
});

test('canonical fallback reapplies the profile to each actual model limit', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const { generateWithFallback } = await loadTypeScript('../src/lib/ai/fallback.ts');
  const first = registry.getAdapter('deepseek'), next = registry.getAdapter('groq');
  const originals = [first.generate, next.generate];
  const calls = [];
  registry.setDiscoveryCache('deepseek', [{ ...model, providerId: 'deepseek', modelId: 'fixture-a', maxOutputTokens: 1200 }], 'LIVE');
  registry.setDiscoveryCache('groq', [{ ...model, providerId: 'groq', modelId: 'fixture-b', maxOutputTokens: 800 }], 'LIVE');
  const response = { text: '', usage: { inputTokens: null, outputTokens: null, cachedTokens: null, source: 'unknown' }, latencyMs: 1, ttftMs: null, estimatedCost: null, warnings: [], modelUsed: null, finishReason: null, providerRequestId: null };
  first.generate = async (request) => { calls.push(request); return { ...response, ok: false, error: { category: 'NETWORK', retryable: true, safeMessage: 'Isolated fixture failure' } }; };
  next.generate = async (request) => { calls.push(request); return { ...response, ok: true, text: 'Explicit fixture output', modelUsed: 'fixture-b-version', error: null }; };
  try {
    const result = await generateWithFallback({ providerId: 'deepseek', modelId: 'fixture-a', messages: [], generationProfile: 'MAX', controls: { maxOutputTokens: 999999 } }, {}, [{ providerId: 'groq', modelId: 'fixture-b' }]);
    assert.deepEqual(calls.map((request) => request.controls.maxOutputTokens), [1200, 800]);
    assert.equal(result.actualProviderId, 'groq'); assert.equal(result.actualModelId, 'fixture-b-version');
    assert.equal(result.fallbackCount, 1);
  } finally { first.generate = originals[0]; next.generate = originals[1]; registry.clearDiscoveryCache(); }
});

test('probe exceptions redact credential-like strings in the entire browser response', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const original = globalThis.fetch;
  const marker = 'sk-testonly-securityregression000';
  globalThis.fetch = async () => { throw new Error(`Authorization: Bearer ${marker}`); };
  try {
    const result = await registry.getAdapter('deepseek').probe({ DEEPSEEK_API_KEY: 'test-only-credential' });
    assert.equal(result.authenticated, false);
    assert.equal(result.error.category, 'NETWORK');
    assert.equal(JSON.stringify(result).includes(marker), false);
    assert.match(result.error.safeMessage, /REDACTED/);
  } finally { globalThis.fetch = original; }
});

test('a rejected arena adapter cannot serialize a raw exception to the browser', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const { POST } = await loadTypeScript('../src/app/api/build/ai/arena/route.ts');
  const adapter = registry.getAdapter('deepseek');
  const generate = adapter.generate, configured = adapter.isConfigured;
  const environment = process.env.KNOUX_BUILD_ENVIRONMENT;
  const marker = 'sk-testonly-arenaregression000';
  process.env.KNOUX_BUILD_ENVIRONMENT = 'local';
  adapter.isConfigured = () => true;
  adapter.generate = async () => { throw new Error(`Authorization: Bearer ${marker}`); };
  try {
    const response = await POST(new Request('http://localhost/api/build/ai/arena', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'Explicit isolated contract fixture', selections: [
        { providerId: 'deepseek', modelId: 'fixture' }, { providerId: 'deepseek', modelId: 'fixture' },
      ] }),
    }));
    const result = await response.json();
    assert.equal(JSON.stringify(result).includes(marker), false);
    assert.equal(result.results.length, 2);
    for (const entry of result.results) {
      assert.equal(entry.response.ok, false);
      assert.equal(entry.response.error.message, 'Arena generation failed.');
      assert.equal(entry.response.error.safeMessage, 'Generation failed in arena.');
    }
  } finally {
    adapter.generate = generate; adapter.isConfigured = configured;
    if (environment === undefined) delete process.env.KNOUX_BUILD_ENVIRONMENT;
    else process.env.KNOUX_BUILD_ENVIRONMENT = environment;
  }
});


test('missing provider model metadata remains UNKNOWN after successful generation', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const { generateWithFallback } = await loadTypeScript('../src/lib/ai/fallback.ts');
  const adapter = registry.getAdapter('deepseek');
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Explicit fixture response' }, finish_reason: 'stop' }], usage: { prompt_tokens: 2, completion_tokens: 3 } }), { status: 200 });
  try {
    const result = await generateWithFallback({ providerId: 'deepseek', modelId: 'fixture-requested', messages: [{ role: 'user', content: 'Isolated fixture' }] }, { DEEPSEEK_API_KEY: 'test-only-credential' }, [], true);
    assert.equal(result.response.ok, true);
    assert.equal(result.routedModelId, 'fixture-requested');
    assert.equal(result.response.modelUsed, null);
    assert.equal(result.actualModelId, null);
    const failed = await adapter.generate({ providerId: 'deepseek', modelId: 'fixture-requested', messages: [] }, {});
    assert.equal(failed.ok, false); assert.equal(failed.modelUsed, null);
  } finally { globalThis.fetch = original; }
});


test('canonical Groq speech metadata excludes audio models from automatic and exact manual text routing', async () => {
  const registry = await loadTypeScript('../src/lib/ai/registry.ts');
  const { routeV2, buildRouterInput } = await loadTypeScript('../src/lib/ai/router-v2.ts');
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ id: 'canopylabs/orpheus-arabic-saudi', context_window: 4000 }, { id: 'whisper-large-v3' }] }), { status: 200 });
  try {
    const discovered = await registry.getAdapter('groq').discoverModels({ GROQ_API_KEY: 'test-only-credential' });
    assert.equal(discovered.models.length, 2);
    assert.ok(discovered.models.every((model) => model.modalities.text === false));
    registry.clearDiscoveryCache(); registry.setDiscoveryCache('groq', discovered.models, 'LIVE');
    const health = new Map([['groq', { configured: true, auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', generation: 'CONFIGURED_UNTESTED' }]]);
    const auto = routeV2(buildRouterInput('engineering-plan', 'auto', 'Build a portal'), health);
    assert.equal(auto.selected, null);
    const manual = routeV2(buildRouterInput('engineering-plan', 'manual', 'Build a portal', { manualSelection: { providerId: 'groq', modelId: 'canopylabs/orpheus-arabic-saudi' } }), health);
    assert.equal(manual.selected, null); assert.equal(manual.fallbackChain.length, 0);
  } finally { globalThis.fetch = original; registry.clearDiscoveryCache(); }
});
