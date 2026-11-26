import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { loadTypeScript } from './load.mjs';

const plans = await loadTypeScript('../src/lib/build/engineering-plan.ts');
const profiles = await loadTypeScript('../src/lib/build/profile.ts');
const knouxModes = await loadTypeScript('../src/lib/build/knoux-modes.ts');
const { currentWorkspaceVerificationChecks } = await loadTypeScript('../src/components/build/dev/verification-results.ts');
const { initialBuildState, buildReducer } = await loadTypeScript('../src/lib/build/workspace-state.ts');

// Compile the actual exported helper declarations, not replicas. React/Next UI
// imports are deliberately excluded; the existing Node harness cannot load TSX.
async function exportedHelpers(path, names, dependencies) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const selected = tree.statements.filter((statement) => ts.isFunctionDeclaration(statement) && names.includes(statement.name?.text));
  assert.equal(selected.length, names.length, 'Every tested helper must exist in shipped source');
  const compiled = ts.transpileModule(selected.map((node) => node.getText(tree)).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  // The caller may pass one object as both export target and dependency scope;
  // honour that identity instead of allocating a second export bag. The
  // `exports` key names the target, not an injected dependency.
  const exports = dependencies.exports ?? {};
  const injected = Object.keys(dependencies).filter((name) => name !== 'exports');
  new Function('exports', ...injected, compiled)(exports, ...injected.map((name) => dependencies[name]));
  return exports;
}

// The compiled helpers reference each other by bare name inside the harness
// scope. One shared object is both the export target and a dependency, so the
// shipped functions resolve each other exactly as the module bundler does.
const runtime = { ...plans, ...knouxModes, profileToControls: profiles.profileToControls };
runtime.exports = runtime;
await exportedHelpers('../src/components/build/dev/DevWorkspaceHome.tsx', ['createGenerationRequestLock', 'resolvePlanRuntime', 'executePlanPass', 'generateEngineeringProposal', 'generateProProposal'], runtime);
const lifecycle = await exportedHelpers('../src/components/build/generator/GenerationMonitor.tsx', ['generationCheckoutScope', 'scopedEngineeringSession', 'currentGenerationChecks', 'measuredGenerationCheck', 'deriveGenerationLifecycle'], { ...plans, currentWorkspaceVerificationChecks });
const artifact = Object.fromEntries(plans.PLAN_SECTIONS.map((section) => [section, ['Explicit test-only proposal, not executed.']]));
const routing = { decision: { selected: { providerId: 'deepseek', modelId: 'requested' }, reasons: ['Test-only routing'], fallbackChain: [{ providerId: 'groq', modelId: 'alternate' }] } };
const frame = (value) => new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

function harness(t, transport, mode = 'auto') {
  const original = globalThis.fetch;
  const calls = [], updates = [], activities = [];
  const lock = runtime.createGenerationRequestLock();
  const request = lock.start('checkout-a');
  let scope = 'checkout-a';
  globalThis.fetch = async (url, options) => { calls.push({ url, signal: options.signal, body: JSON.parse(options.body) }); return transport(url, options); };
  t.after(() => { lock.cancel(); globalThis.fetch = original; });
  const isCurrent = () => lock.isCurrent(request, scope);
  const run = () => runtime.generateEngineeringProposal({ request, requirement: 'Test-only requirement', mode, profile: 'BALANCED', manualSelection: { providerId: null, modelId: null }, models: [], messages: [], isCurrent, update: (patch) => { if (isCurrent()) updates.push(patch); }, record: (message) => { if (isCurrent()) activities.push(message); } });
  return { lock, request, calls, updates, activities, run, changeScope: () => { scope = 'checkout-b'; } };
}

function noCompletion(h) {
  assert.equal(h.updates.some((patch) => patch.stage === 'PLANNED' || patch.plan || patch.measurement), false);
  assert.deepEqual(h.activities, []);
}

test('synchronous request lock blocks duplicate submissions and stale finally cannot unlock a new request', () => {
  const lock = runtime.createGenerationRequestLock();
  const first = lock.start('a');
  assert.equal(lock.start('a'), null);
  assert.equal(lock.start('b'), null);
  assert.equal(lock.cancel(first), first);
  assert.equal(first.controller.signal.aborted, true);
  const second = lock.start('b');
  lock.finish(first);
  assert.equal(lock.peek(), second);
  assert.equal(lock.isCurrent(first, 'a'), false);
  assert.equal(lock.isCurrent(second, 'a'), false);
  assert.equal(lock.isCurrent(second, 'b'), true);
  lock.cancel();
});

test('cancel during prepare JSON aborts its signal and never opens stream or fallback', async (t) => {
  const entered = deferred(), json = deferred();
  const h = harness(t, async () => ({ ok: true, status: 200, json() { entered.resolve(); return json.promise; } }));
  const work = h.run();
  await entered.promise;
  h.lock.cancel();
  json.resolve(routing);
  await work;
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].signal.aborted, true);
  assert.deepEqual(h.updates, []);
  noCompletion(h);
});

test('cancel aborts a pending stream reader with no fallback and no late activity', async (t) => {
  const reading = deferred();
  let readerErrored = false;
  const h = harness(t, async (url, { signal }) => {
    if (url.endsWith('/prepare')) return Response.json(routing);
    const body = new ReadableStream({
      start(controller) { signal.addEventListener('abort', () => { readerErrored = true; controller.error(new DOMException('Aborted', 'AbortError')); }, { once: true }); },
      pull() { reading.resolve(); },
    });
    return new Response(body);
  });
  const work = h.run();
  await reading.promise;
  h.lock.cancel();
  await work;
  assert.equal(readerErrored, true);
  assert.equal(h.calls.length, 2);
  assert.ok(h.calls.every((call) => call.signal === h.request.controller.signal && call.signal.aborted));
  noCompletion(h);
});

test('a stream AbortError never triggers fallback even without an aborted signal', async (t) => {
  const h = harness(t, async (url) => url.endsWith('/prepare') ? Response.json(routing) : new Response(new ReadableStream({ start(controller) { controller.error(new DOMException('Transport cancelled', 'AbortError')); } })));
  await h.run();
  assert.equal(h.calls.length, 2);
  assert.equal(h.updates.at(-1).stage, 'CANCELLED');
  noCompletion(h);
});

test('changed checkout rejects late sections, text, terminal stage and activity even if transport ignores abort', async (t) => {
  const reading = deferred();
  let controller;
  const h = harness(t, async (url) => url.endsWith('/prepare') ? Response.json(routing) : new Response(new ReadableStream({ start(value) { controller = value; }, pull() { reading.resolve(); } })));
  const work = h.run();
  await reading.promise;
  const before = h.updates.length;
  h.changeScope();
  controller.enqueue(frame({ delta: JSON.stringify(artifact), done: true }));
  controller.close();
  await work;
  assert.equal(h.updates.length, before);
  assert.equal(h.calls.length, 2);
  noCompletion(h);
});

test('cancel during fallback JSON prevents a late charged result from becoming a proposal', async (t) => {
  const entered = deferred(), json = deferred();
  const h = harness(t, async (url) => {
    if (url.endsWith('/prepare')) return Response.json(routing);
    if (url.endsWith('/stream')) return new Response(new ReadableStream({ start(controller) { controller.enqueue(frame({ error: { category: 'RATE_LIMIT', safeMessage: 'Test-only retryable error' }, done: true })); controller.close(); } }));
    return { ok: true, json() { entered.resolve(); return json.promise; } };
  });
  const work = h.run();
  await entered.promise;
  const before = h.updates.length;
  h.lock.cancel();
  json.resolve({ ok: true, text: JSON.stringify(artifact), actualProviderId: 'groq', routedModelId: 'alternate' });
  await work;
  assert.equal(h.calls.length, 3);
  assert.ok(h.calls.every((call) => call.signal === h.request.controller.signal && call.signal.aborted));
  assert.equal(h.updates.length, before);
  noCompletion(h);
});

async function retryingTransport(url) {
  if (url.endsWith('/prepare')) return Response.json(routing);
  if (url.endsWith('/stream')) return new Response(new ReadableStream({ start(controller) { controller.enqueue(frame({ error: { category: 'RATE_LIMIT', safeMessage: 'Test-only rate limit' }, done: true })); controller.close(); } }));
  return Response.json({ ok: true, text: JSON.stringify(artifact), actualProviderId: 'groq', routedModelId: 'alternate', actualModelId: null });
}

test('eligible AUTO fallback remains real and preserves UNKNOWN actual model metadata', async (t) => {
  const h = harness(t, retryingTransport);
  await h.run();
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.updates.at(-1).plan, artifact);
  assert.equal(h.updates.at(-1).stage, 'PLANNED');
  assert.match(h.updates.at(-1).selection.reasons.at(-1), /actual model UNKNOWN/);
  assert.equal(h.activities.length, 1);
});

test('exact MANUAL never falls back', async (t) => {
  const h = harness(t, retryingTransport, 'manual');
  await h.run();
  assert.equal(h.calls.length, 2);
  assert.equal(h.updates.at(-1).stage, 'PROVIDER_BLOCKED');
  noCompletion(h);
});

function proHarness(t, transport) {
  const original = globalThis.fetch;
  const calls = [], updates = [], activities = [];
  const lock = runtime.createGenerationRequestLock();
  const request = lock.start('checkout-a');
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return transport(url, options, calls.length); };
  t.after(() => { lock.cancel(); globalThis.fetch = original; });
  const isCurrent = () => lock.isCurrent(request, 'checkout-a');
  const intent = { rawInput: 'Test-only PRO requirement', productKind: 'web', requestedStack: [], requestedCapabilities: [], requestedIntegrations: [], deploymentTarget: null };
  // The component's engineering/update dispatch is requestId-scoped, not
  // lock-gated: a terminal CANCELLED patch lands after cancellation. Mirror
  // that contract here; intermediate patches stay guarded by isCurrent.
  const run = () => runtime.generateProProposal({ request, requirement: 'Test-only PRO requirement', intent, context: { project: null, worktree: null, branch: null }, mode: 'auto', profile: 'BALANCED', manualSelection: { providerId: null, modelId: null }, models: [], isCurrent, update: (patch) => { if (isCurrent() || patch.stage === 'CANCELLED') updates.push(patch); }, record: (message) => { if (isCurrent()) activities.push(message); } });
  return { lock, calls, updates, activities, run };
}

const proTerminal = (providerId = 'gemini') => ({ delta: '', done: true, actualProviderId: providerId, actualModelId: 'contract-model', latencyMs: 10, usage: { inputTokens: 12, outputTokens: 40 } });
const proStream = (plan, terminal = proTerminal()) => new Response(new ReadableStream({ start(controller) { controller.enqueue(frame({ delta: JSON.stringify(plan), done: false })); controller.enqueue(frame(terminal)); controller.close(); } }));

test('KNOUX PRO runs five measured role passes through the same engine and aggregates only real totals', async (t) => {
  const h = proHarness(t, async (url) => url.endsWith('/prepare') ? Response.json(routing) : proStream(artifact));
  await h.run();
  assert.equal(h.calls.length, 10, 'five prepare + five stream requests, no extra engine');
  const systems = h.calls.filter((call) => call.url.endsWith('/stream')).map((call) => call.body.system);
  assert.deepEqual(systems.map((system) => knouxModes.PRO_ROLES.find((role) => system.includes(`KNOuX PRO ${role},`) || system.startsWith(`You are the KNOuX PRO ${role}`))), knouxModes.PRO_ROLES);
  const final = h.updates.at(-1);
  assert.equal(final.stage, 'PLANNED');
  assert.deepEqual(final.plan, artifact);
  assert.equal(final.measurement.latencyMs, 50);
  assert.deepEqual(final.measurement.usage, { inputTokens: 60, outputTokens: 200 });
  const ledger = h.updates.filter((patch) => patch.proRuns).at(-1).proRuns;
  assert.equal(ledger.length, 5);
  assert.ok(ledger.every((run) => run.status === 'COMPLETE' && run.latencyMs === 10));
  assert.equal(h.activities.length, 11, 'pass + role record per role, plus the chain summary');
});

test('a failed PRO role halts the chain, retains the last complete proposal and never fabricates later passes', async (t) => {
  let streams = 0;
  const h = proHarness(t, async (url) => {
    if (url.endsWith('/prepare')) return Response.json(routing);
    streams++;
    if (streams === 3) return new Response(new ReadableStream({ start(controller) { controller.enqueue(frame({ error: { category: 'RATE_LIMIT', safeMessage: 'Test-only role failure' }, done: true })); controller.close(); } }));
    return proStream(artifact);
  });
  await h.run();
  // AUTO mode grants the failed role its one canonical fallback attempt;
  // when that also fails the chain halts. MANUAL would stop at three.
  assert.equal(streams, 4, 'one bounded fallback for the failed role, then no further passes');
  assert.equal(h.calls.filter((call) => call.url.endsWith('/prepare')).length, 3, 'no fourth or fifth role resolution');
  const final = h.updates.at(-1);
  assert.equal(final.stage, 'PROVIDER_BLOCKED');
  assert.match(final.error, /UI Designer pass failed/);
  assert.match(final.error, /last complete proposal is retained/);
  const retained = h.updates.filter((patch) => patch.plan).at(-1);
  assert.deepEqual(retained.plan, artifact);
  const ledger = h.updates.filter((patch) => patch.proRuns).at(-1).proRuns;
  assert.deepEqual(ledger.map((run) => run.status), ['COMPLETE', 'COMPLETE', 'FAILED', 'PENDING', 'PENDING']);
});

test('PRO cancellation marks the active role CANCELLED and opens no further passes', async (t) => {
  const reading = deferred();
  let streams = 0;
  const h = proHarness(t, async (url, { signal }) => {
    if (url.endsWith('/prepare')) return Response.json(routing);
    streams++;
    if (streams > 1) return proStream(artifact);
    return new Response(new ReadableStream({
      start(controller) { signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true }); },
      pull() { reading.resolve(); },
    }));
  });
  const work = h.run();
  await reading.promise;
  h.lock.cancel();
  await work;
  assert.equal(streams, 1);
  assert.equal(h.updates.at(-1).stage, 'CANCELLED');
  const ledger = h.updates.filter((patch) => patch.proRuns).at(-1).proRuns;
  assert.equal(ledger[0].status, 'CANCELLED');
  noCompletion(h);
});

function currentState(stage = 'PLANNED') {
  return { ...initialBuildState, projectRef: null,
    project: { id: 'native', name: 'Native', root: 'K:/test-only', headSha: 'aaa' },
    git: { available: true, dirty: false, branch: 'feature', headSha: 'aaa' },
    engineering: { ...initialBuildState.engineering, requestId: 'request-a', stage, plan: stage === 'PLANNED' ? artifact : null,
      context: { projectId: 'native', project: 'Native', worktree: 'K:/test-only', branch: 'feature', projectRef: null, headSha: 'aaa' } },
  };
}
const measuredCheck = (id, status = 'pass') => ({ id, label: id, command: `npm run ${id}`, status, exitCode: status === 'pass' ? 0 : 1, evidence: 'Test-only measured fixture', ranAt: '2026-11-18T00:00:00Z', durationMs: 5 });
const step = (state, name) => lifecycle.deriveGenerationLifecycle(state).find((entry) => entry.name === name);

test('seven lifecycle steps separate validated proposal from execution and deployment', () => {
  const state = currentState();
  state.adapter = { ...state.adapter, environment: 'production', capabilities: { 'project.write': 'available', 'deploy.trigger': 'available' } };
  state.engineering.stage = 'COMPLETE';
  assert.deepEqual(lifecycle.deriveGenerationLifecycle(state).map((entry) => entry.name), ['Planning', 'Generated proposal', 'Real file execution', 'Build', 'Test', 'Verification', 'Deployment']);
  assert.equal(step(state, 'Generated proposal').status, 'READY FOR REVIEW');
  assert.equal(step(state, 'Real file execution').status, 'UNCONNECTED');
  assert.equal(step(state, 'Deployment').status, 'AVAILABLE');
  assert.equal(step(state, 'Build').status, 'NOT MEASURED');
  assert.equal(step(state, 'Test').status, 'NOT MEASURED');
  assert.equal(step(state, 'Verification').status, 'NOT MEASURED');
  state.engineering.plan = { GOAL: ['Partial fixture'] };
  assert.equal(step(state, 'Generated proposal').status, 'NOT GENERATED');
});

test('current SHA checks report measured pass and failure independently, never proposal execution', () => {
  const state = currentState();
  state.verification = { sourceState: 'clean', headSha: 'aaa', capturedAt: '2026-11-18', checks: [measuredCheck('build'), measuredCheck('test', 'fail'), measuredCheck('deployment')] };
  assert.equal(step(state, 'Build').status, 'PASS');
  assert.equal(step(state, 'Test').status, 'FAIL');
  assert.equal(step(state, 'Verification').status, 'MEASURED OUTCOMES');
  assert.match(step(state, 'Verification').evidence, /build: PASS \(exit 0\).*test: FAIL \(exit 1\)/);
  assert.equal(step(state, 'Verification').evidence.includes('deployment'), false);
  assert.equal(step(state, 'Real file execution').status, 'UNCONNECTED');
  assert.equal(step(state, 'Deployment').status, 'UNCONNECTED');
});

test('mismatched, absent or unreadable SHA and imported projectRef never reuse native verification', () => {
  for (const mutate of [
    (s) => { s.verification.headSha = 'bbb'; },
    (s) => { s.git.headSha = null; s.verification.headSha = null; },
    (s) => { s.git.available = false; },
    (s) => { s.git.dirty = true; },
    (s) => { s.git.dirty = null; },
    (s) => { delete s.git.dirty; },
    (s) => { s.verification.sourceState = 'wip'; },
    (s) => { s.verification.sourceState = 'unknown'; },
    (s) => { delete s.verification.sourceState; },
    (s) => { s.projectRef = 'K:/imported'; },
  ]) {
    const state = currentState();
    state.verification = { sourceState: 'clean', headSha: 'aaa', capturedAt: '2026-11-18', checks: [measuredCheck('build'), measuredCheck('test')] };
    mutate(state);
    assert.equal(step(state, 'Build').status, 'NOT MEASURED');
    assert.equal(step(state, 'Test').status, 'NOT MEASURED');
    assert.equal(step(state, 'Verification').status, 'NOT MEASURED');
  }
});

test('asserted pass without timestamp, outcome or evidence is not a measured check', () => {
  for (const patch of [{ ranAt: null }, { ranAt: 'invalid' }, { exitCode: null }, { exitCode: 1 }, { exitCode: NaN, status: 'fail' }, { command: null }, { command: ' ' }, { evidence: '' }, { status: 'not-run' }]) {
    const state = currentState();
    state.verification = { sourceState: 'clean', headSha: 'aaa', checks: [{ ...measuredCheck('build'), ...patch }] };
    assert.equal(step(state, 'Build').status, 'NOT MEASURED');
    assert.equal(step(state, 'Verification').status, 'NOT MEASURED');
  }
});

test('other-checkout or legacy proposals and stale stream evidence are hidden, including same branch different SHA', () => {
  for (const mutate of [
    (s) => { s.projectRef = 'K:/imported'; },
    (s) => { s.project.id = 'other'; },
    (s) => { s.project.root = 'K:/other'; },
    (s) => { s.git.branch = 'other'; },
    (s) => { s.git.headSha = 'bbb'; },
    (s) => { delete s.engineering.context.headSha; },
    (s) => { delete s.engineering.context.projectRef; },
  ]) {
    const state = currentState('GENERATING');
    state.engineering.plan = artifact;
    state.engineering.streamText = 'Old checkout output';
    const oldScope = lifecycle.generationCheckoutScope(state);
    mutate(state);
    const session = lifecycle.scopedEngineeringSession(state);
    assert.equal(session.stage, 'LISTENING');
    assert.equal(session.plan, null);
    assert.equal(session.streamText, '');
    assert.equal(step(state, 'Generated proposal').status, 'NOT GENERATED');
    if (state.git.headSha === 'bbb') assert.notEqual(lifecycle.generationCheckoutScope(state), oldScope);
  }
});

test('a proposal compiled before the first checkout measurement adopts it instead of being discarded', () => {
  // The workspace facts can land after the user has already generated a plan
  // (slow first project read). The plan was compiled against an unmeasured
  // checkout; the initial measurement identifies that same checkout, so the
  // session must survive rather than reset to LISTENING.
  const unmeasuredContext = { project: null, worktree: null, branch: null, projectRef: null, projectId: null, headSha: null };
  let state = { ...initialBuildState, projectRef: null, project: null, git: null,
    engineering: { ...initialBuildState.engineering, requestId: 'request-a', stage: 'PLANNED', plan: artifact, context: unmeasuredContext } };
  const project = { id: 'native', name: 'Native', root: 'K:/test-only', type: 'unknown', framework: null, packageManager: null, currentBranch: null, headSha: null };
  const git = { available: true, dirty: false, branch: 'feature', headSha: 'aaa', originMainSha: null, ahead: null, behind: null, files: [], commits: [], blocker: null };
  // Project facts arrive before git facts: the context must keep completing.
  state = buildReducer(state, { type: 'project/resolved', project, graph: { nodes: [], edges: [] } });
  assert.equal(state.engineering.plan, artifact, 'plan survives the project measurement');
  state = buildReducer(state, { type: 'git/resolved', git });
  assert.equal(state.engineering.plan, artifact, 'plan survives the git measurement');
  assert.equal(state.engineering.context.projectId, 'native');
  assert.equal(state.engineering.context.branch, 'feature');
  assert.equal(state.engineering.context.headSha, 'aaa');
  assert.equal(lifecycle.scopedEngineeringSession(state).stage, 'PLANNED');
  // Reverse arrival order (git before project) must behave identically.
  let reversed = { ...initialBuildState, projectRef: null, project: null, git: null,
    engineering: { ...initialBuildState.engineering, requestId: 'request-a', stage: 'PLANNED', plan: artifact, context: unmeasuredContext } };
  reversed = buildReducer(reversed, { type: 'git/resolved', git });
  reversed = buildReducer(reversed, { type: 'project/resolved', project, graph: { nodes: [], edges: [] } });
  assert.equal(lifecycle.scopedEngineeringSession(reversed).stage, 'PLANNED');
  // A fully measured context that names a different checkout is still discarded.
  const switched = { ...state, git: { ...git, headSha: 'bbb' } };
  assert.equal(lifecycle.scopedEngineeringSession(switched).plan, null);
});

test('confirmed cancellation is visible only for its own request, never a newer request', () => {
  const state = currentState('GENERATING');
  const aborted = buildReducer(state, { type: 'engineering/update', requestId: 'request-a', patch: { stage: 'CANCELLED' } });
  assert.equal(lifecycle.scopedEngineeringSession(aborted).stage, 'CANCELLED');
  const staleAbort = buildReducer(state, { type: 'engineering/update', requestId: 'request-old', patch: { stage: 'CANCELLED' } });
  assert.equal(lifecycle.scopedEngineeringSession(staleAbort).stage, 'GENERATING');
  const cancelled = { ...state, engineering: { ...state.engineering, stage: 'CANCELLED' } };
  assert.equal(step(cancelled, 'Planning').status, 'CANCELLED');
  assert.equal(step(cancelled, 'Generated proposal').status, 'NOT GENERATED');
});

test('shared reducer accepts CANCELLED from active planning stages (owner integration contract)', () => {
  for (const stage of ['RESOLVING', 'ROUTING', 'GENERATING']) {
    const state = currentState(stage);
    const cancelled = buildReducer(state, { type: 'engineering/update', requestId: state.engineering.requestId, patch: { stage: 'CANCELLED' } });
    assert.equal(cancelled.engineering.stage, 'CANCELLED', 'generator-state.ts owner must permit cancellation; do not fake shared state');
  }
});

test('both scoped UI surfaces wire a real cancel handler and accessible minimum targets', async () => {
  const home = await readFile(new URL('../src/components/build/dev/DevWorkspaceHome.tsx', import.meta.url), 'utf8');
  const monitor = await readFile(new URL('../src/components/build/generator/GenerationMonitor.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/components/build/generator/preview-workspace.module.css', import.meta.url), 'utf8');
  assert.match(home, /onCancel=\{cancelPlanning\}/);
  assert.match(home, /onClick=\{cancelPlanning\}>Cancel planning/);
  assert.match(monitor, /onClick=\{onCancel\}>Cancel planning/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /minmax\(min\(100%, 145px\), 1fr\)/);
});

test('a receipt is execution evidence while an unreviewed artifact is only awaiting confirmation', () => {
  const generatedProject = { kind: 'static-web', files: [{ path: 'index.html', content: '<!doctype html><title>Reviewed fixture</title>' }] };
  const state = currentState('REVIEWING');
  state.engineering.plan = { ...artifact, generatedProject };
  assert.equal(step(state, 'Real file execution').status, 'AWAITING CONFIRMATION');
  assert.doesNotMatch(step(state, 'Real file execution').evidence, /bytes written/);

  const preview = { url: 'http://127.0.0.1:4311/' + 'a'.repeat(64) + '/index.html', origin: 'http://127.0.0.1:4311', processId: 5150, httpStatus: 200, readinessMs: 120, expiresAt: '2026-11-19T00:15:00Z', blocker: null };
  state.engineering.execution = {
    operationId: '6f1c0a7e-2f6b-4d8e-9a1b-2c3d4e5f6a7b', ownerId: 'owner-fixture', kind: 'static-web',
    planSha256: 'a'.repeat(64), state: 'ready', files: [{ path: 'index.html', bytes: 51, sha256: 'b'.repeat(64) }],
    bytes: 51, sourceSha256: 'c'.repeat(64),
    build: { command: 'knoux-static-validate@1 · no shell', exitCode: 0, status: 'passed', evidence: 'Fixture only.', durationMs: null },
    bundle: { path: 'artifacts/knoux-static-app.zip', bytes: 240, sha256: 'd'.repeat(64) },
    preview, externalReference: 'generated-static:fixture', createdAt: '2026-11-19T00:00:00Z', updatedAt: '2026-11-19T00:00:01Z', error: null,
  };
  const ready = step(state, 'Real file execution');
  assert.equal(ready.status, 'PREVIEW LIVE');
  assert.match(ready.evidence, /1 reviewed static files · 51 bytes/);
  assert.match(ready.evidence, /bundle SHA-256 dddddddddddddddd/);
  assert.match(ready.evidence, /http:\/\/127\.0\.0\.1:4311/);

  state.engineering.execution = { ...state.engineering.execution, state: 'failed', error: 'Preview stopped.', preview: { ...preview, url: null, processId: null, httpStatus: null, blocker: 'Preview process is no longer running.' } };
  const failed = step(state, 'Real file execution');
  assert.equal(failed.status, 'FAILED');
  assert.match(failed.evidence, /Preview process is no longer running/);
  assert.match(failed.evidence, /Preview stopped/);
});
