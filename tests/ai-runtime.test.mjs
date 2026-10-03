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
  const healthMap = new Map([
    [
      "openai",
      {
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
      },
    ],
  ]);
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
  const healthMap = new Map([
    [
      "openai",
      {
        providerId: "openai",
        displayName: "OpenAI",
        transport: "OpenAI",
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
        lastError: null,
        latencyMs: null,
        rateLimits: null,
      },
    ],
  ]);
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
  const healthMap = new Map([
    [
      "openai",
      {
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
      },
    ],
  ]);
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
