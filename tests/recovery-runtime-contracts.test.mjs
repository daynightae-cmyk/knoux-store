import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTypeScript } from './load.mjs';

const { formatRuntimeCost, readRuntimeJson, readRuntimeStream } = await loadTypeScript(
  '../src/components/build/ai/runtime-response.ts',
);
const { bridgeStatus } = await loadTypeScript(
  '../src/components/build/dev/bridge-status.ts',
);
const { recordUsage, getUsageRecords, getUsageSummary } = await loadTypeScript(
  '../src/lib/ai/usage.ts',
);
const { environmentContext } = await loadTypeScript(
  '../src/lib/ai/provider-os/request-runtime.ts',
);
const { withProviderRuntime } = await loadTypeScript(
  '../src/lib/ai/provider-os/runtime-context.ts',
);

const encoder = new TextEncoder();

function fragmentedResponse(text, init) {
  const bytes = encoder.encode(text);
  const split = Math.max(1, Math.floor(bytes.length / 2));
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, split));
      controller.enqueue(bytes.slice(split));
      controller.close();
    },
  });
  return new Response(body, init);
}

function usageEntry(patch = {}) {
  return {
    providerId: 'fixture-provider',
    modelId: 'fixture-model',
    operation: 'generate',
    taskClass: null,
    inputTokens: 3,
    outputTokens: 2,
    cachedTokens: null,
    latencyMs: 8,
    ttftMs: null,
    estimatedCost: { amount: 0.01, basis: 'ESTIMATED', currency: 'USD' },
    success: true,
    errorCategory: null,
    fallbackCount: 0,
    ...patch,
  };
}

test('runtime JSON preserves HTTP failures and rejects invalid success envelopes', async () => {
  await assert.rejects(
    readRuntimeJson(Response.json({ message: 'Provider refused the request.' }, { status: 429 })),
    /Provider refused the request/,
  );
  await assert.rejects(
    readRuntimeJson(new Response('not-json', { status: 503 })),
    /HTTP 503/,
  );
  await assert.rejects(readRuntimeJson(Response.json(null)), /invalid response/);
  assert.deepEqual(await readRuntimeJson(Response.json({ ok: true })), { ok: true });
});

test('runtime cost labels preserve reported currencies and never turn UNKNOWN into zero', () => {
  assert.equal(formatRuntimeCost({ amount: 0, basis: 'MEASURED', currency: 'USD' }), 'MEASURED USD 0.000000');
  assert.equal(formatRuntimeCost({ amount: 0.02, basis: 'ESTIMATED', currency: 'EUR' }), 'ESTIMATED EUR 0.020000');
  assert.equal(formatRuntimeCost({ amount: 0.02, basis: 'UNKNOWN', currency: 'EUR' }), 'cost UNKNOWN');
  assert.equal(formatRuntimeCost({ amount: null, basis: 'UNKNOWN', currency: 'USD' }), 'cost UNKNOWN');
  assert.equal(formatRuntimeCost(null), 'cost UNKNOWN');
  assert.equal(formatRuntimeCost({ amount: Number.NaN, basis: 'MEASURED', currency: 'USD' }), 'cost UNKNOWN');
  for (const currency of [null, undefined, 7]) {
    assert.equal(formatRuntimeCost({ amount: 0.02, basis: 'ESTIMATED', currency }), 'cost UNKNOWN');
  }
});

test('runtime SSE yields real deltas and requires an explicit completion receipt', async () => {
  const first = { delta: 'hé', done: false, finishReason: null, usage: null, error: null };
  const last = {
    delta: 'llo', done: true, finishReason: 'stop', usage: null, error: null,
    latencyMs: 4, ttftMs: 2, actualModelId: 'fixture-model', estimatedCost: null,
  };
  const response = fragmentedResponse(
    `data: ${JSON.stringify(first)}\n\ndata: ${JSON.stringify(last)}\n\n`,
  );
  const chunks = [];
  const terminal = await readRuntimeStream(response, (chunk) => chunks.push(chunk));
  assert.equal(chunks.map((chunk) => chunk.delta).join(''), 'héllo');
  assert.equal(terminal.done, true);
  assert.equal(terminal.actualModelId, 'fixture-model');

  await assert.rejects(
    readRuntimeStream(fragmentedResponse(`data: ${JSON.stringify(first)}\n\n`), () => {}),
    /without a completion receipt/,
  );
});

test('runtime SSE surfaces HTTP, provider and malformed-event failures', async () => {
  await assert.rejects(
    readRuntimeStream(Response.json({ error: { safeMessage: 'Stream refused safely.' } }, { status: 401 }), () => {}),
    /Stream refused safely/,
  );
  await assert.rejects(
    readRuntimeStream(new Response('not-json', { status: 502 }), () => {}),
    /HTTP 502/,
  );
  await assert.rejects(
    readRuntimeStream(fragmentedResponse('data: {not-json}\n\n'), () => {}),
    /malformed stream event/,
  );
  const providerFailure = fragmentedResponse(
    `data: ${JSON.stringify({ delta: '', done: true, error: { safeMessage: 'Provider failed.' } })}\n\n`,
  );
  await assert.rejects(readRuntimeStream(providerFailure, () => {}), /Provider failed/);
});

test('bridge status never trusts a successful-looking body behind an HTTP refusal', () => {
  const optimistic = {
    configured: true,
    paired: true,
    reachable: true,
    handshake: {
      capabilities: { terminal: true },
      profiles: [{ id: 'pwsh', version: '7.5' }],
    },
  };
  const refused = bridgeStatus(503, optimistic);
  assert.equal(refused.reachable, false);
  assert.equal(refused.handshake, null);
  assert.equal(refused.capabilities, null);
  assert.match(refused.blocker, /HTTP 503/);

  const accepted = bridgeStatus(200, optimistic);
  assert.equal(accepted.reachable, true);
  assert.equal(accepted.handshake.profiles[0].id, 'pwsh');
  assert.equal(accepted.noProfiles, false);

  const noProfiles = bridgeStatus(200, { ...optimistic, handshake: { ...optimistic.handshake, profiles: [] } });
  assert.equal(noProfiles.reachable, false);
  assert.equal(noProfiles.noProfiles, true);
  assert.match(noProfiles.blocker, /no usable shell profile/);

  for (const status of [401, 503]) {
    const invalid = bridgeStatus(status, null);
    assert.equal(invalid.reachable, false);
    assert.equal(invalid.handshake, null);
    assert.match(invalid.blocker, status === 401 ? /Sign in/ : /HTTP 503/);
  }

  for (const name of ['TerminalPage', 'PowerShellPage', 'SettingsPage']) {
    const source = readFileSync(new URL(`../src/components/build/dev/${name}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /response\.json\(\)\.catch\(\(\) => null\)/, `${name} must classify non-JSON HTTP failures instead of throwing a parse error`);
  }
});

test('usage records are safely projected, cloned and preserve UNKNOWN token/cost states', () => {
  const context = environmentContext({});
  context.namespace = 'recovery-usage-projection';
  withProviderRuntime(context, () => {
    const entry = usageEntry({
      inputTokens: null,
      estimatedCost: { amount: 0.25, basis: 'ESTIMATED', currency: 'USD' },
      prompt: 'DO_NOT_RETAIN_PROMPT',
      rawProviderResponse: { credential: 'DO_NOT_RETAIN_SECRET' },
    });
    const stored = recordUsage(entry);
    assert.equal(stored.inputTokens, null);
    assert.equal(stored.outputTokens, 2);
    assert.equal(stored.estimatedCost.basis, 'UNKNOWN');
    assert.equal(stored.estimatedCost.amount, null);
    assert.equal('prompt' in stored, false);
    assert.equal('rawProviderResponse' in stored, false);
    assert.doesNotMatch(JSON.stringify(stored), /DO_NOT_RETAIN/);

    entry.modelId = 'caller-mutated';
    entry.estimatedCost.amount = 999;
    assert.equal(getUsageRecords()[0].modelId, 'fixture-model');
    assert.equal(getUsageRecords()[0].estimatedCost.amount, null);
    stored.modelId = 'returned-record-mutated';
    assert.equal(getUsageRecords()[0].modelId, 'fixture-model');
    const summary = getUsageSummary();
    assert.equal(summary.totalEstimatedCost, null);
    assert.equal(summary.costBasis, 'UNKNOWN');
  });
});

test('usage sums only documented USD amounts and retains measured versus estimated basis', () => {
  const context = environmentContext({});
  context.namespace = 'recovery-usage-currencies';
  withProviderRuntime(context, () => {
    recordUsage(usageEntry({ estimatedCost: { amount: 0, basis: 'MEASURED', currency: 'USD' } }));
    recordUsage(usageEntry({ estimatedCost: { amount: 0.02, basis: 'MEASURED', currency: 'EUR' } }));
    let summary = getUsageSummary();
    assert.equal(summary.totalEstimatedCost, null, 'non-USD amounts must not be presented as a USD total');
    assert.equal(summary.costBasis, 'UNKNOWN');

    const isolated = environmentContext({});
    isolated.namespace = 'recovery-usage-zero';
    withProviderRuntime(isolated, () => {
      recordUsage(usageEntry({ estimatedCost: { amount: 0, basis: 'MEASURED', currency: 'USD' } }));
      recordUsage(usageEntry({ modelId: 'estimated-model', estimatedCost: { amount: 0.01, basis: 'ESTIMATED', currency: 'USD' } }));
      summary = getUsageSummary();
      assert.equal(summary.totalEstimatedCost, 0.01);
      assert.equal(summary.costBasis, 'ESTIMATED');
      assert.equal(summary.byProvider['fixture-provider'].cost, 0.01);
    });
  });
});

test('terminal Clear resets only the renderer and mounts persist across stage changes', () => {
  for (const name of ['TerminalPage', 'PowerShellPage']) {
    const source = readFileSync(new URL(`../src/components/build/dev/${name}.tsx`, import.meta.url), 'utf8');
    const clear = source.match(/const clearTerminal = useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[\]\);/);
    assert.ok(clear, `${name} must expose its Clear implementation`);
    assert.match(clear[1], /termRef\.current\?\.write\('\\x1bc'\)/);
    assert.doesNotMatch(clear[1], /transportRef|TerminalTransport|\.open\(/);
    assert.match(source, /hidden=\{!\(live \|\| stage === 'reconnecting' \|\| stage === 'exited'\)\}/);
  }
});

test('AI surfaces retain shared request cancellation and canonical model discovery contracts', () => {
  const control = readFileSync(new URL('../src/components/build/ai/AiControlPage.tsx', import.meta.url), 'utf8');
  const arena = readFileSync(new URL('../src/components/build/ai/AiArenaPage.tsx', import.meta.url), 'utf8');
  const senshial = readFileSync(new URL('../src/components/build/ai/AiSenshialPage.tsx', import.meta.url), 'utf8');
  assert.match(control, /if \(!selected \|\| !prompt\.trim\(\) \|\| requestRef\.current\) return;/);
  assert.match(control, /signal: controller\.signal/);
  assert.match(control, /useEffect\(\(\) => \(\) => requestRef\.current\?\.abort\(\), \[\]\)/);
  assert.match(control, /disabled=\{loading \|\| streaming/);
  assert.match(arena, /useCanonicalModels\(\)/);
  assert.doesNotMatch(arena, /useProviderIntelligence|useProviderDiscovery/);
  for (const [name, source] of [['Control', control], ['Arena', arena], ['Senshial', senshial]]) {
    assert.match(source, /formatRuntimeCost\(/, `${name} must use the currency-preserving cost formatter`);
    assert.doesNotMatch(source, /\$\{(?:response|r\.response)\.estimatedCost\.amount\.toFixed/, `${name} must not relabel a reported amount as dollars`);
  }
});
