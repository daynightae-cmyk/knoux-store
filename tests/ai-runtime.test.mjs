/**
 * AI Runtime — Deterministic Tests
 *
 * Verifies provider registry, credential presence, error normalization,
 * cost calculation, router scoring, context exclusions, and secret boundaries.
 *
 * No live paid provider calls. Network is isolated by the test harness.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load.mjs";

// ---------------------------------------------------------------------------
// Load AI runtime modules (dynamic, via resolver hook)
// ---------------------------------------------------------------------------

let errors, cost, router, registry, contextManager, contract, geminiAdapter;

test.before(async () => {
  errors = await loadTypeScript("../src/lib/ai/errors.ts");
  cost = await loadTypeScript("../src/lib/ai/cost.ts");
  router = await loadTypeScript("../src/lib/ai/router-v2.ts");
  registry = await loadTypeScript("../src/lib/ai/registry.ts");
  contextManager = await loadTypeScript("../src/lib/ai/context-manager.ts");
  contract = await loadTypeScript("../src/lib/ai/contract.ts");
  geminiAdapter = await loadTypeScript("../src/lib/ai/adapters/gemini.ts");
});

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

test("registers all 13 required providers", () => {
  const adapters = registry.getAdapters();
  assert.equal(adapters.length, 13);
});

test("declared capabilities do not pass runtime acceptance without execution", () => {
  const health = registry.allProviderHealth({ DEEPSEEK_API_KEY: 'test-only-credential' }).find(p => p.providerId === 'deepseek');
  assert.equal(health.acceptance.tools, 'UNTESTED');
  assert.equal(health.acceptance.structuredOutput, 'UNTESTED');
  assert.equal(health.acceptance.generation, 'UNTESTED');
  assert.equal(health.acceptance.streaming, 'UNTESTED');
});

test("includes all required provider IDs", () => {
  const ids = registry.getAdapters().map((a) => a.id);
  for (const expected of [
    "openai",
    "anthropic",
    "gemini",
    "openrouter",
    "groq",
    "mistral",
    "deepseek",
    "qwen",
    "grok",
    "opencode-go",
    "ollama",
    "lm-studio",
    "custom-openai",
  ]) {
    assert.ok(ids.includes(expected), `Missing provider: ${expected}`);
  }
});

test("grok transport is OpenRouter, not xAI", () => {
  const grok = registry.getAdapter("grok");
  assert.ok(grok);
  assert.equal(grok.transport, "OpenRouter");
  assert.ok(grok.requiredEnv.includes("GROK_OPENROUTER_API_KEY"));
  assert.ok(!grok.requiredEnv.includes("XAI_API_KEY"));
});

test("Grok discovery recognises the OpenRouter x-ai namespace", () => {
  const grok = registry.getAdapter("grok");

  // Adapter-level identity — transport OpenRouter, GROK_OPENROUTER_API_KEY
  // and no XAI_API_KEY — is asserted by the test directly above; this covers
  // the catalog filter, which is what previously matched nothing.
  const payload = {
    data: [
      { id: "x-ai/grok-4.7", name: "Grok 4.7", context_length: 200_000 },
      { id: "x-ai/grok-4.5", name: "Grok 4.5", context_length: 131_072 },
      { id: "xai/grok-legacy", name: "Grok Legacy" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
      { id: "groq/llama-3.3-70b", name: "Llama 3.3 70B" },
      { id: "mistralai/ministral-3b-latest", name: "Ministral 3B" },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "openrouter/auto", name: "Auto" },
    ],
  };

  const models = grok.parseModelList(payload);
  const ids = models.map((m) => m.modelId);

  assert.deepEqual(
    ids,
    ["x-ai/grok-4.7", "x-ai/grok-4.5", "xai/grok-legacy"],
    "the live OpenRouter namespace must be recognised; xai/ retained as alias",
  );

  for (const unrelated of [
    "openai/gpt-4o",
    "anthropic/claude-sonnet-4",
    "groq/llama-3.3-70b",
    "mistralai/ministral-3b-latest",
    "google/gemini-2.5-flash",
    "openrouter/auto",
  ]) {
    assert.ok(
      !ids.includes(unrelated),
      `${unrelated} must not be presented as a Grok model`,
    );
  }

  // Parsed output stays owned by this adapter and carries the real catalog
  // name, so the UI still reads as Grok delivered over OpenRouter.
  assert.equal(models[0].providerId, "grok");
  assert.equal(models[0].displayName, "Grok 4.7");
  assert.equal(models[0].contextWindow, 200_000);
});

test("Grok discovery is not empty against the real OpenRouter namespace", () => {
  // Before the fix this returned [] because the filter spelled the namespace
  // `xai/`, and an empty result is indistinguishable from failed discovery.
  const grok = registry.getAdapter("grok");
  const models = grok.parseModelList({
    data: [{ id: "x-ai/grok-4.7", name: "Grok 4.7" }],
  });
  assert.equal(models.length, 1, "an x-ai model must be discovered");
});

test("Qwen base URL is selectable per region and defaults to the documented host", async () => {
  const { QwenAdapter } = await loadTypeScript("../src/lib/ai/adapters/qwen.ts");
  const CN = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const INTL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

  // Default keeps the region this adapter has always documented.
  delete process.env.DASHSCOPE_BASE_URL;
  assert.equal(new QwenAdapter().config.baseUrl, CN);

  // A credential issued in one region is refused by the other host, so the
  // region must be selectable rather than hardcoded.
  process.env.DASHSCOPE_BASE_URL = INTL;
  assert.equal(new QwenAdapter().config.baseUrl, INTL);

  // A trailing slash is normalized so the request path cannot double up.
  process.env.DASHSCOPE_BASE_URL = "https://example.test/compatible-mode/v1/";
  assert.equal(new QwenAdapter().config.baseUrl, "https://example.test/compatible-mode/v1");

  delete process.env.DASHSCOPE_BASE_URL;
  assert.equal(new QwenAdapter().config.baseUrl, CN);
});

test("returns null for unknown provider", () => {
  assert.equal(registry.getAdapter("nonexistent"), null);
});

// ---------------------------------------------------------------------------
// Credential Presence
// ---------------------------------------------------------------------------

test("OpenAI configured when OPENAI_API_KEY present", () => {
  const adapter = registry.getAdapter("openai");
  assert.equal(adapter.isConfigured({ OPENAI_API_KEY: "sk-test" }), true);
  assert.equal(adapter.isConfigured({}), false);
  assert.equal(adapter.isConfigured({ OPENAI_API_KEY: "  " }), false);
});

test("Gemini accepts either credential name", () => {
  const adapter = registry.getAdapter("gemini");
  assert.equal(adapter.isConfigured({ GEMINI_API_KEY: "test" }), true);
  assert.equal(
    adapter.isConfigured({ GOOGLE_GENERATIVE_AI_API_KEY: "test" }),
    true,
  );
  assert.equal(adapter.isConfigured({}), false);
});

test("Ollama is always configured", () => {
  const adapter = registry.getAdapter("ollama");
  assert.equal(adapter.isConfigured({}), true);
});

test("LM Studio is always configured", () => {
  const adapter = registry.getAdapter("lm-studio");
  assert.equal(adapter.isConfigured({}), true);
});

// ---------------------------------------------------------------------------
// Error Normalization
// ---------------------------------------------------------------------------

test("401 -> AUTHENTICATION, not retryable", () => {
  const error = errors.normalizeError(
    401,
    '{"error":{"message":"Invalid API key"}}',
  );
  assert.equal(error.category, "AUTHENTICATION");
  assert.equal(error.retryable, false);
});

test("429 -> RATE_LIMIT, retryable", () => {
  const error = errors.normalizeError(
    429,
    '{"error":{"message":"Too many requests"}}',
  );
  assert.equal(error.category, "RATE_LIMIT");
  assert.equal(error.retryable, true);
});

test("404 -> MODEL_NOT_FOUND", () => {
  const error = errors.normalizeError(
    404,
    '{"error":{"message":"Model not found"}}',
  );
  assert.equal(error.category, "MODEL_NOT_FOUND");
});

test("500 -> PROVIDER_5XX, retryable", () => {
  const error = errors.normalizeError(500, "Internal server error");
  assert.equal(error.category, "PROVIDER_5XX");
  assert.equal(error.retryable, true);
});

test("400 -> INVALID_REQUEST", () => {
  const error = errors.normalizeError(
    400,
    '{"error":{"message":"Bad request"}}',
  );
  assert.equal(error.category, "INVALID_REQUEST");
});

test("redacts secrets from error messages", () => {
  const error = errors.normalizeError(
    401,
    "Bearer sk-1234567890abcdef1234567890abcdef",
  );
  assert.ok(!error.safeMessage.includes("sk-1234567890abcdef1234567890abcdef"));
  assert.ok(error.safeMessage.includes("[REDACTED]"));
});

test("truncates long error messages to 500 chars", () => {
  const error = errors.normalizeError(500, "x".repeat(1000));
  assert.ok(error.safeMessage.length <= 500);
});

test("detects context overflow from message", () => {
  const error = errors.normalizeError(
    400,
    '{"error":{"message":"maximum context length exceeded"}}',
  );
  assert.equal(error.category, "CONTEXT_OVERFLOW");
});

test("detects timeout from message", () => {
  const error = errors.normalizeError(null, "Request timed out");
  assert.equal(error.category, "TIMEOUT");
});

test("networkError returns NETWORK", () => {
  assert.equal(errors.networkError("ECONNREFUSED").category, "NETWORK");
});

test("timeoutError returns TIMEOUT", () => {
  assert.equal(errors.timeoutError().category, "TIMEOUT");
});

test("abortedError returns ABORTED", () => {
  assert.equal(errors.abortedError().category, "ABORTED");
});

// ---------------------------------------------------------------------------
// Cost Engine
// ---------------------------------------------------------------------------

test("calculates cost for openai/gpt-4.1", () => {
  const c = cost.calculateCost("openai", "gpt-4.1", {
    inputTokens: 1000,
    outputTokens: 500,
    cachedTokens: 0,
    source: "provider",
  });
  assert.equal(c.basis, "ESTIMATED");
  assert.ok(c.amount !== null);
  assert.ok(Math.abs(c.amount - 0.006) < 0.0001);
});

test("returns UNKNOWN for unknown model", () => {
  const c = cost.calculateCost("unknown", "unknown", {
    inputTokens: 1000,
    outputTokens: 500,
    cachedTokens: 0,
    source: "provider",
  });
  assert.equal(c.basis, "UNKNOWN");
  assert.equal(c.amount, null);
});

test("handles cached tokens with reduced pricing", () => {
  const c = cost.calculateCost("openai", "gpt-4.1", {
    inputTokens: 2000,
    outputTokens: 500,
    cachedTokens: 1000,
    source: "provider",
  });
  assert.equal(c.basis, "ESTIMATED");
  assert.ok(Math.abs(c.amount - 0.0065) < 0.0001);
});

test("mergeCostBasis prefers MEASURED", () => {
  const merged = cost.mergeCostBasis(
    { amount: 0.01, basis: "ESTIMATED", currency: "USD" },
    { amount: 0.02, basis: "MEASURED", currency: "USD" },
  );
  assert.equal(merged.basis, "MEASURED");
});

test("mergeCostBasis returns UNKNOWN when all UNKNOWN", () => {
  const merged = cost.mergeCostBasis({
    amount: null,
    basis: "UNKNOWN",
    currency: "USD",
  });
  assert.equal(merged.basis, "UNKNOWN");
});

// ---------------------------------------------------------------------------
// Router v2
// ---------------------------------------------------------------------------

test("manual mode honours explicit selection", () => {
  const healthMap = new Map([["openai", OPENAI_HEALTH]]);
  const decision = router.routeV2(
    {
      taskClass: "general",
      contextRequirement: 0,
      visionRequired: false,
      toolsRequired: false,
      structuredOutputRequired: false,
      mode: "manual",
      manualSelection: { providerId: "openai", modelId: "gpt-4.1" },
    },
    healthMap,
  );
  assert.equal(decision.mode, "manual");
  assert.equal(decision.selected?.providerId, "openai");
});

test("manual mode rejects unconfigured without override", () => {
  const healthMap = new Map([["openai", {
    ...OPENAI_HEALTH,
    configured: false,
    auth: "UNCONFIGURED",
    discovery: "UNCONFIGURED",
    generation: "UNCONFIGURED",
    streaming: "UNCONFIGURED",
    tools: "UNKNOWN",
    vision: "UNKNOWN",
    structuredOutput: "UNKNOWN",
    modelCount: 0,
    lastTestedAt: null,
    latencyMs: null,
  }]]);
  const decision = router.routeV2(
    {
      taskClass: "general",
      contextRequirement: 0,
      visionRequired: false,
      toolsRequired: false,
      structuredOutputRequired: false,
      mode: "manual",
      manualSelection: { providerId: "openai", modelId: "gpt-4.1" },
    },
    healthMap,
  );
  assert.equal(decision.status, "unavailable");
  assert.ok(decision.blocker?.includes("not configured"));
});

test("returns unavailable when no models discovered", () => {
  const healthMap = new Map([["openai", OPENAI_HEALTH]]);
  const decision = router.routeV2(
    {
      taskClass: "general",
      contextRequirement: 0,
      visionRequired: false,
      toolsRequired: false,
      structuredOutputRequired: false,
      mode: "auto",
    },
    healthMap,
  );
  assert.equal(decision.status, "unavailable");
});

test("buildRouterInput estimates context from long prompt", () => {
  // 200,000 characters estimates to exactly 50,000 tokens. The threshold is
  // inclusive, so this must register a context requirement rather than
  // silently reporting none and letting the router pick a small-window model.
  const input = router.buildRouterInput("general", "auto", "x".repeat(200_000));
  assert.ok(
    input.contextRequirement >= 50_000,
    `expected >= 50000, got ${input.contextRequirement}`,
  );
  assert.equal(input.contextRequirement, 50_000);
});

test("buildRouterInput gives zero context for short prompt", () => {
  const input = router.buildRouterInput("general", "auto", "short");
  assert.equal(input.contextRequirement, 0);
});

test("buildRouterInput keeps context requirement just below the threshold at zero", () => {
  // Guards the boundary from both sides: one token under the threshold is a
  // short request, at the threshold it is not.
  const just_under = router.buildRouterInput(
    "general",
    "auto",
    "x".repeat(199_996),
  );
  assert.equal(just_under.contextRequirement, 0);
});

// ---------------------------------------------------------------------------
// Context Exclusions
// ---------------------------------------------------------------------------

test("excludes .env files", () => {
  assert.equal(contextManager.isPathExcluded(".env"), true);
  assert.equal(contextManager.isPathExcluded(".env.local"), true);
  assert.equal(contextManager.isPathExcluded(".env.production"), true);
});

test("excludes node_modules", () => {
  assert.equal(
    contextManager.isPathExcluded("node_modules/react/index.js"),
    true,
  );
});

test("excludes .next build artifacts", () => {
  assert.equal(contextManager.isPathExcluded(".next/server/app/page.js"), true);
});

test("excludes binary files", () => {
  assert.equal(contextManager.isPathExcluded("logo.png"), true);
  assert.equal(contextManager.isPathExcluded("video.mp4"), true);
});

test("excludes credential files", () => {
  assert.equal(contextManager.isPathExcluded("secret-key.pem"), true);
  assert.equal(contextManager.isPathExcluded("credentials.json"), true);
});

test("does not exclude regular source files", () => {
  assert.equal(contextManager.isPathExcluded("src/app/page.tsx"), false);
  assert.equal(contextManager.isPathExcluded("README.md"), false);
});

// ---------------------------------------------------------------------------
// Secret Redaction
// ---------------------------------------------------------------------------

test("error messages never contain raw API keys", () => {
  const error = errors.normalizeError(
    401,
    "Authorization: Bearer sk-test1234567890abcdef",
  );
  assert.ok(!error.safeMessage.includes("sk-test1234567890abcdef"));
});

test("ProviderHealth type never includes credential values", () => {
  const health = {
    providerId: "openai",
    displayName: "OpenAI",
    transport: "OpenAI",
    configured: true,
    auth: "AUTHENTICATED",
    discovery: "DISCOVERY_VERIFIED",
    generation: "GENERATION_VERIFIED",
    streaming: "STREAMING_VERIFIED",
    tools: "SUPPORTED",
    vision: "SUPPORTED",
    structuredOutput: "SUPPORTED",
    modelCount: 10,
    lastTestedAt: new Date().toISOString(),
    lastError: null,
    latencyMs: 500,
    rateLimits: null,
  };
  const json = JSON.stringify(health);
  assert.ok(!json.includes("OPENAI_API_KEY"));
  assert.ok(!json.includes("sk-"));
  assert.ok(!json.includes("Bearer"));
});

// ---------------------------------------------------------------------------
// Token Estimation
// ---------------------------------------------------------------------------

test("estimates ~4 chars per token", () => {
  assert.equal(contract.estimateTokens("hello world"), 3); // 11/4 = 2.75 -> ceil = 3
});

test("handles empty string", () => {
  assert.equal(contract.estimateTokens(""), 0);
});

test("handles large text", () => {
  assert.equal(contract.estimateTokens("x".repeat(4000)), 1000);

// ---------------------------------------------------------------------------
// Provider error envelopes
//
// A vendor envelope is read once, in a documented order of precedence. Which
// identifier a caller ends up with is observable, so the precedence is a
// contract rather than an implementation detail: the `type` and `status`
// fallbacks are unreachable if a branch reads `error.message` and shadows them.
// ---------------------------------------------------------------------------

test("reads the identifier from an OpenAI error envelope", () => {
  const error = errors.normalizeError(
    400,
    '{"error":{"message":"bad","code":"invalid_request"}}',
  );
  assert.equal(error.providerErrorId, "invalid_request");
});

test("falls back to `type` when the envelope carries no code", () => {
  const error = errors.normalizeError(
    400,
    '{"error":{"message":"bad","type":"invalid_request_error"}}',
  );
  assert.equal(error.providerErrorId, "invalid_request_error");
});

test("falls back to `status` when Google sends only a numeric code", () => {
  const error = errors.normalizeError(
    400,
    '{"error":{"message":"bad","code":400,"status":"INVALID_ARGUMENT"}}',
  );
  assert.equal(error.providerErrorId, "INVALID_ARGUMENT");
});

test("a numeric provider code is never reported as a provider error id", () => {
  const error = errors.normalizeError(400, '{"error":{"message":"bad","code":400}}');
  assert.equal(error.providerErrorId, null);
});

test("a generic message envelope still parses, with no id", () => {
  const error = errors.normalizeError(400, '{"message":"bad request"}');
  assert.equal(error.providerErrorId, null);
});

});

// ---------------------------------------------------------------------------
// Gemini model identity boundary
//
// Gemini is the only adapter that addresses a model through the request path
// (`/models/{id}:generateContent`), so an identifier arriving from a browser
// decides which endpoint is called. These tests assert the boundary is real: a
// refused identity never reaches `fetch` at all, so there is nothing to race.
//
// The suite runs with `isolate-network` installed, so a *permitted* identity
// records its URL and then has its connection refused. That is the positive
// half of the proof — the boundary refuses unsafe identities without
// refusing legitimate ones.
// ---------------------------------------------------------------------------

/** Records every outbound URL, then delegates so isolation still applies. */
async function withFetchRecorder(run) {
  const calls = [];
  const guarded = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    calls.push(typeof input === "string" ? input : String(input?.url ?? input));
    return guarded(input, init);
  };
  try {
    const result = await run(calls);
    return { result, calls };
  } finally {
    globalThis.fetch = guarded;
  }
}

const GEMINI_ENV = { GEMINI_API_KEY: "test-key-not-a-real-credential" };
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function withMockFetch(mock, run) {
  const guarded = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await run();
  } finally {
    globalThis.fetch = guarded;
  }
}

const STREAM_CASES = [
  {
    id: "openai", model: "gpt-4.1", env: { OPENAI_API_KEY: "test" },
    url: "https://api.openai.com/v1/chat/completions", finish: "stop",
    first: [{ choices: [{ delta: { content: "hé" } }] }],
    rest: [
      { choices: [{ delta: { content: "llo" }, finish_reason: "stop" }] },
      { usage: { prompt_tokens: 7, completion_tokens: 2, prompt_tokens_details: { cached_tokens: 1 } } },
    ],
  },
  {
    id: "anthropic", model: "claude-3-haiku-20240307", env: { ANTHROPIC_API_KEY: "test" },
    url: "https://api.anthropic.com/v1/messages", finish: "end_turn",
    first: [
      { type: "message_start", message: { usage: { input_tokens: 7, cache_read_input_tokens: 1 } } },
      { type: "content_block_delta", delta: { text: "hé" } },
    ],
    rest: [
      { type: "content_block_delta", delta: { text: "llo" } },
      { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 2 } },
    ],
  },
  {
    id: "gemini", model: "gemini-2.5-flash", env: GEMINI_ENV,
    url: `${GEMINI_BASE}/models/gemini-2.5-flash:streamGenerateContent?alt=sse`, finish: "STOP",
    first: [{ candidates: [{ content: { parts: [{ text: "hé" }] } }] }],
    rest: [{
      candidates: [{ content: { parts: [{ text: "llo" }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 2, cachedContentTokenCount: 1 },
    }],
  },
];

const sseBytes = (events) => new TextEncoder().encode(
  events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
);

test("native streams yield before EOF and preserve split UTF-8 and protocol usage", async (t) => {
  for (const entry of STREAM_CASES) {
    await t.test(entry.id, async () => {
      let controller;
      const body = new ReadableStream({ start(c) { controller = c; } });
      const signal = new AbortController().signal;
      await withMockFetch((url, init) => {
        assert.equal(url, entry.url);
        assert.equal(init.redirect, "error");
        assert.equal(init.cache, "no-store");
        assert.equal(init.signal, signal);
        return Promise.resolve(new Response(body));
      }, async () => {
        const iterator = registry.getAdapter(entry.id).stream({
          providerId: entry.id, modelId: entry.model,
          messages: [{ role: "user", content: "hi" }],
        }, entry.env, signal);
        const firstPromise = iterator.next();
        const bytes = sseBytes(entry.first);
        const split = bytes.indexOf(0xc3) + 1;
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        const first = await firstPromise;
        assert.equal(first.value.delta, "hé");
        assert.equal(first.value.done, false);
        assert.ok(first.value.ttftMs >= 0);
        // Only now send the remaining events and close the transport.
        controller.enqueue(new TextEncoder().encode("data: malformed\n\n"));
        controller.enqueue(sseBytes(entry.rest));
        controller.close();
        const chunks = [];
        for await (const chunk of iterator) chunks.push(chunk);
        assert.equal(chunks.map((chunk) => chunk.delta).join(""), "llo");
        assert.equal(chunks.filter((chunk) => chunk.done).length, 1);
        const last = chunks.at(-1);
        assert.equal(last.error, null);
        assert.equal(last.finishReason, entry.finish);
        assert.deepEqual(last.usage, {
          inputTokens: 7, outputTokens: 2, cachedTokens: 1, source: "provider",
        });
        assert.equal(last.ttftMs, first.value.ttftMs);
      });
    });
  }
});

test("native streams preserve authentication, HTTP, absent-body and cancellation errors", async (t) => {
  for (const entry of STREAM_CASES) {
    for (const failure of [
      { name: "missing credential", env: {}, category: "AUTHENTICATION", response: () => { assert.fail("must not fetch"); } },
      { name: "HTTP 401", category: "AUTHENTICATION", response: () => new Response("{}", { status: 401 }) },
      { name: "absent body", category: "NETWORK", response: () => new Response(null, { status: 204 }) },
      { name: "abort", category: "ABORTED", response: () => { throw new DOMException("Aborted", "AbortError"); } },
    ]) {
      await t.test(`${entry.id}: ${failure.name}`, async () => {
        await withMockFetch(failure.response, async () => {
          const chunks = [];
          for await (const chunk of registry.getAdapter(entry.id).stream({
            providerId: entry.id, modelId: entry.model, messages: [],
          }, failure.env ?? entry.env)) chunks.push(chunk);
          assert.equal(chunks.length, 1);
          assert.equal(chunks[0].done, true);
          assert.equal(chunks[0].error.category, failure.category);
          assert.equal(chunks[0].usage, null);
        });
      });
    }
  }
});

test("native probes retain their lightweight endpoints and Anthropic discovery retains tools", async () => {
  const urls = [];
  await withMockFetch((url) => {
    urls.push(url);
    return Promise.resolve(Response.json({ data: [
      { id: "claude-3-haiku-20240307" }, { id: "new-claude-model" },
    ] }));
  }, async () => {
    assert.equal((await registry.getAdapter("anthropic").probe({ ANTHROPIC_API_KEY: "test" })).authenticated, true);
    assert.equal((await registry.getAdapter("gemini").probe(GEMINI_ENV)).authenticated, true);
    const result = await registry.getAdapter("anthropic").discoverModels({ ANTHROPIC_API_KEY: "test" });
    assert.equal(result.source, "LIVE");
    assert.equal(result.models.length, 2);
    for (const model of result.models) assert.equal(model.capabilities.tools, "SUPPORTED");
    assert.equal(result.models[0].maxOutputTokens, 4096);
    assert.equal(result.models[1].maxOutputTokens, null);
  });
  assert.deepEqual(urls, [
    "https://api.anthropic.com/v1/models?limit=1",
    `${GEMINI_BASE}/models?pageSize=1`,
    "https://api.anthropic.com/v1/models?limit=100",
  ]);
});

const geminiRequest = (modelId) => ({
  providerId: "gemini",
  modelId,
  messages: [{ role: "user", content: "hi" }],
});

/** Identities a caller must never be able to turn into a path. */
const UNSAFE_MODEL_IDENTITIES = [
  "../../v1beta/tunedModels/x",
  "gemini-2.5-flash/../../secret",
  "gemini-2.5-flash:generateContent",
  "gemini-2.5-flash?alt=sse",
  "gemini-2.5-flash#fragment",
  "gemini 2.5 flash",
  "%2e%2e%2fadmin",
  "gemini-2.5-flash@evil.example",
];

test("a canonical Gemini model builds a URL from the trusted base", async () => {
  const adapter = new geminiAdapter.GeminiAdapter();
  const { result: response, calls } = await withFetchRecorder(() =>
    adapter.generate(geminiRequest("gemini-2.5-flash"), GEMINI_ENV),
  );
  // Isolation refuses the connection, so the result is a NETWORK error — the
  // point is that the request was built and left at all.
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0],
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent`,
  );
  assert.equal(response.ok, false);
  assert.equal(response.error.category, "NETWORK");
});

test("the provider's own `models/` spelling resolves to the same identity", async () => {
  const adapter = new geminiAdapter.GeminiAdapter();
  const { result: response, calls } = await withFetchRecorder(() =>
    adapter.generate(geminiRequest("models/gemini-2.5-flash"), GEMINI_ENV),
  );
  // Discovery reports `models/{model}`; that trusted prefix must be normalized
  // away rather than refused, or a legitimate model becomes unusable.
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0],
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent`,
  );
  assert.equal(response.ok, false);
  assert.equal(response.error.category, "NETWORK");
});

test("an unsafe Gemini identity is refused before any request is made", async () => {
  for (const modelId of UNSAFE_MODEL_IDENTITIES) {
    const adapter = new geminiAdapter.GeminiAdapter();
    const { result: response, calls } = await withFetchRecorder(() =>
      adapter.generate(geminiRequest(modelId), GEMINI_ENV),
    );
    assert.deepEqual(calls, [], `${modelId} must not reach the network`);
    assert.equal(response.ok, false, `${modelId} must not succeed`);
    assert.equal(
      response.error.category,
      "MODEL_NOT_FOUND",
      `${modelId} must be refused as an unknown identity`,
    );
  }
});

test("an unsafe Gemini identity is refused on the streaming path too", async () => {
  for (const modelId of UNSAFE_MODEL_IDENTITIES) {
    const adapter = new geminiAdapter.GeminiAdapter();
    const chunks = [];
    const { calls } = await withFetchRecorder(async () => {
      for await (const chunk of adapter.stream(geminiRequest(modelId), GEMINI_ENV)) {
        chunks.push(chunk);
      }
    });
    assert.deepEqual(calls, [], `${modelId} must not reach the network`);
    assert.equal(chunks.length, 1, `${modelId} must end on one error chunk`);
    assert.equal(chunks[0].error.category, "MODEL_NOT_FOUND");
  }
});

test("streaming a canonical model still builds the streaming URL", async () => {
  const adapter = new geminiAdapter.GeminiAdapter();
  const { calls } = await withFetchRecorder(async () => {
    for await (const _chunk of adapter.stream(
      geminiRequest("models/gemini-2.5-flash"),
      GEMINI_ENV,
    )) {
      // Isolation refuses the connection; the URL is the assertion.
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0],
    `${GEMINI_BASE}/models/gemini-2.5-flash:streamGenerateContent?alt=sse`,
  );
});


// ---------------------------------------------------------------------------
// Router provider identity boundary
//
// In manual mode the provider identifier arrives from the browser and is used
// as a key in the decision's health record. An unidentified key is a
// remote-property-injection sink, so the router resolves the name against its
// own registry before anything is written.
// ---------------------------------------------------------------------------

const OPENAI_HEALTH = {
  providerId: "openai",
  displayName: "OpenAI",
  transport: "OpenAI",
  configured: true,
  auth: "AUTHENTICATED",
  discovery: "DISCOVERY_VERIFIED",
  generation: "GENERATION_VERIFIED",
  streaming: "STREAMING_VERIFIED",
  tools: "SUPPORTED",
  vision: "SUPPORTED",
  structuredOutput: "SUPPORTED",
  modelCount: 5,
  lastTestedAt: new Date().toISOString(),
  lastError: null,
  latencyMs: 500,
  rateLimits: null,
};

const manualInput = (providerId) => ({
  taskClass: "general",
  contextRequirement: 0,
  visionRequired: false,
  toolsRequired: false,
  structuredOutputRequired: false,
  mode: "manual",
  manualSelection: { providerId, modelId: "gpt-4.1" },
});

test("manual mode keys health by the registry's own provider id", () => {
  const healthMap = new Map([["openai", OPENAI_HEALTH]]);
  const decision = router.routeV2(manualInput("openai"), healthMap);
  assert.equal(decision.status, "resolved");
  assert.deepEqual(Object.keys(decision.health), ["openai"]);
});

test("an unregistered provider name never becomes a health key", () => {
  const healthMap = new Map([["openai", OPENAI_HEALTH]]);
  for (const providerId of [
    "__proto__",
    "constructor",
    "toString",
    "openai/../../etc",
    "nonexistent",
  ]) {
    const decision = router.routeV2(manualInput(providerId), healthMap);
    assert.equal(decision.status, "unavailable", `${providerId} must be refused`);
    assert.equal(decision.selected, null, `${providerId} must select nothing`);
    assert.deepEqual(
      Object.keys(decision.health),
      [],
      `${providerId} must not add a property to the health record`,
    );
    assert.equal(
      Object.getPrototypeOf(decision.health),
      Object.prototype,
      `${providerId} must not alter the health record's prototype`,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(decision.health, providerId),
      false,
      `${providerId} must not exist as an own property`,
    );
  }
});
