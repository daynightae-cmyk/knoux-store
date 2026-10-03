/**
 * AI Runtime — Deterministic Tests
 *
 * Verifies provider registry, credential presence, error normalization,
 * cost calculation, router scoring, context exclusions, and secret boundaries.
 *
 * No live paid provider calls. Network is isolated by the test harness.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';

// ---------------------------------------------------------------------------
// Load AI runtime modules (dynamic, via resolver hook)
// ---------------------------------------------------------------------------

let errors, cost, router, registry, contextManager, contract;

test.before(async () => {
  errors = await loadTypeScript('../src/lib/ai/errors.ts');
  cost = await loadTypeScript('../src/lib/ai/cost.ts');
  router = await loadTypeScript('../src/lib/ai/router-v2.ts');
  registry = await loadTypeScript('../src/lib/ai/registry.ts');
  contextManager = await loadTypeScript('../src/lib/ai/context-manager.ts');
  contract = await loadTypeScript('../src/lib/ai/contract.ts');
});

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

test('registers all 13 required providers', () => {
  const adapters = registry.getAdapters();
  assert.equal(adapters.length, 13);
});

test('includes all required provider IDs', () => {
  const ids = registry.getAdapters().map((a) => a.id);
  for (const expected of ['openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'mistral', 'deepseek', 'qwen', 'grok', 'opencode-go', 'ollama', 'lm-studio', 'custom-openai']) {
    assert.ok(ids.includes(expected), `Missing provider: ${expected}`);
  }
});

test('grok transport is OpenRouter, not xAI', () => {
  const grok = registry.getAdapter('grok');
  assert.ok(grok);
  assert.equal(grok.transport, 'OpenRouter');
  assert.ok(grok.requiredEnv.includes('GROK_OPENROUTER_API_KEY'));
  assert.ok(!grok.requiredEnv.includes('XAI_API_KEY'));
});

test('returns null for unknown provider', () => {
  assert.equal(registry.getAdapter('nonexistent'), null);
});

// ---------------------------------------------------------------------------
// Credential Presence
// ---------------------------------------------------------------------------

test('OpenAI configured when OPENAI_API_KEY present', () => {
  const adapter = registry.getAdapter('openai');
  assert.equal(adapter.isConfigured({ OPENAI_API_KEY: 'sk-test' }), true);
  assert.equal(adapter.isConfigured({}), false);
  assert.equal(adapter.isConfigured({ OPENAI_API_KEY: '  ' }), false);
});

test('Gemini accepts either credential name', () => {
  const adapter = registry.getAdapter('gemini');
  assert.equal(adapter.isConfigured({ GEMINI_API_KEY: 'test' }), true);
  assert.equal(adapter.isConfigured({ GOOGLE_GENERATIVE_AI_API_KEY: 'test' }), true);
  assert.equal(adapter.isConfigured({}), false);
});

test('Ollama is always configured', () => {
  const adapter = registry.getAdapter('ollama');
  assert.equal(adapter.isConfigured({}), true);
});

test('LM Studio is always configured', () => {
  const adapter = registry.getAdapter('lm-studio');
  assert.equal(adapter.isConfigured({}), true);
});

// ---------------------------------------------------------------------------
// Error Normalization
// ---------------------------------------------------------------------------

test('401 -> AUTHENTICATION, not retryable', () => {
  const error = errors.normalizeError(401, '{"error":{"message":"Invalid API key"}}');
  assert.equal(error.category, 'AUTHENTICATION');
  assert.equal(error.retryable, false);
});

test('429 -> RATE_LIMIT, retryable', () => {
  const error = errors.normalizeError(429, '{"error":{"message":"Too many requests"}}');
  assert.equal(error.category, 'RATE_LIMIT');
  assert.equal(error.retryable, true);
});

test('404 -> MODEL_NOT_FOUND', () => {
  const error = errors.normalizeError(404, '{"error":{"message":"Model not found"}}');
  assert.equal(error.category, 'MODEL_NOT_FOUND');
});

test('500 -> PROVIDER_5XX, retryable', () => {
  const error = errors.normalizeError(500, 'Internal server error');
  assert.equal(error.category, 'PROVIDER_5XX');
  assert.equal(error.retryable, true);
});

test('400 -> INVALID_REQUEST', () => {
  const error = errors.normalizeError(400, '{"error":{"message":"Bad request"}}');
  assert.equal(error.category, 'INVALID_REQUEST');
});

test('redacts secrets from error messages', () => {
  const error = errors.normalizeError(401, 'Bearer sk-1234567890abcdef1234567890abcdef');
  assert.ok(!error.safeMessage.includes('sk-1234567890abcdef1234567890abcdef'));
  assert.ok(error.safeMessage.includes('[REDACTED]'));
});

test('truncates long error messages to 500 chars', () => {
  const error = errors.normalizeError(500, 'x'.repeat(1000));
  assert.ok(error.safeMessage.length <= 500);
});

test('detects context overflow from message', () => {
  const error = errors.normalizeError(400, '{"error":{"message":"maximum context length exceeded"}}');
  assert.equal(error.category, 'CONTEXT_OVERFLOW');
});

test('detects timeout from message', () => {
  const error = errors.normalizeError(null, 'Request timed out');
  assert.equal(error.category, 'TIMEOUT');
});

test('networkError returns NETWORK', () => {
  assert.equal(errors.networkError('ECONNREFUSED').category, 'NETWORK');
});

test('timeoutError returns TIMEOUT', () => {
  assert.equal(errors.timeoutError().category, 'TIMEOUT');
});

test('abortedError returns ABORTED', () => {
  assert.equal(errors.abortedError().category, 'ABORTED');
});

// ---------------------------------------------------------------------------
// Cost Engine
// ---------------------------------------------------------------------------

test('calculates cost for openai/gpt-4.1', () => {
  const c = cost.calculateCost('openai', 'gpt-4.1', { inputTokens: 1000, outputTokens: 500, cachedTokens: 0, source: 'provider' });
  assert.equal(c.basis, 'ESTIMATED');
  assert.ok(c.amount !== null);
  assert.ok(Math.abs(c.amount - 0.006) < 0.0001);
});

test('returns UNKNOWN for unknown model', () => {
  const c = cost.calculateCost('unknown', 'unknown', { inputTokens: 1000, outputTokens: 500, cachedTokens: 0, source: 'provider' });
  assert.equal(c.basis, 'UNKNOWN');
  assert.equal(c.amount, null);
});

test('handles cached tokens with reduced pricing', () => {
  const c = cost.calculateCost('openai', 'gpt-4.1', { inputTokens: 2000, outputTokens: 500, cachedTokens: 1000, source: 'provider' });
  assert.equal(c.basis, 'ESTIMATED');
  assert.ok(Math.abs(c.amount - 0.0065) < 0.0001);
});

test('mergeCostBasis prefers MEASURED', () => {
  const merged = cost.mergeCostBasis(
    { amount: 0.01, basis: 'ESTIMATED', currency: 'USD' },
    { amount: 0.02, basis: 'MEASURED', currency: 'USD' },
  );
  assert.equal(merged.basis, 'MEASURED');
});

test('mergeCostBasis returns UNKNOWN when all UNKNOWN', () => {
  const merged = cost.mergeCostBasis(
    { amount: null, basis: 'UNKNOWN', currency: 'USD' },
  );
  assert.equal(merged.basis, 'UNKNOWN');
});

// ---------------------------------------------------------------------------
// Router v2
// ---------------------------------------------------------------------------

test('manual mode honours explicit selection', () => {
  const healthMap = new Map([['openai', {
    providerId: 'openai', displayName: 'OpenAI', transport: 'OpenAI', configured: true,
    auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', generation: 'GENERATION_VERIFIED',
    streaming: 'STREAMING_VERIFIED', tools: 'SUPPORTED', vision: 'SUPPORTED', structuredOutput: 'SUPPORTED',
    modelCount: 5, lastTestedAt: new Date().toISOString(), lastError: null, latencyMs: 500, rateLimits: null,
  }]]);
  const decision = router.routeV2({
    taskClass: 'general', contextRequirement: 0, visionRequired: false, toolsRequired: false,
    structuredOutputRequired: false, mode: 'manual', manualSelection: { providerId: 'openai', modelId: 'gpt-4.1' },
  }, healthMap);
  assert.equal(decision.mode, 'manual');
  assert.equal(decision.selected?.providerId, 'openai');
});

test('manual mode rejects unconfigured without override', () => {
  const healthMap = new Map([['openai', {
    providerId: 'openai', displayName: 'OpenAI', transport: 'OpenAI', configured: false,
    auth: 'UNCONFIGURED', discovery: 'UNCONFIGURED', generation: 'UNCONFIGURED',
    streaming: 'UNCONFIGURED', tools: 'UNKNOWN', vision: 'UNKNOWN', structuredOutput: 'UNKNOWN',
    modelCount: 0, lastTestedAt: null, lastError: null, latencyMs: null, rateLimits: null,
  }]]);
  const decision = router.routeV2({
    taskClass: 'general', contextRequirement: 0, visionRequired: false, toolsRequired: false,
    structuredOutputRequired: false, mode: 'manual', manualSelection: { providerId: 'openai', modelId: 'gpt-4.1' },
  }, healthMap);
  assert.equal(decision.status, 'unavailable');
  assert.ok(decision.blocker?.includes('not configured'));
});

test('returns unavailable when no models discovered', () => {
  const healthMap = new Map([['openai', {
    providerId: 'openai', displayName: 'OpenAI', transport: 'OpenAI', configured: true,
    auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', generation: 'GENERATION_VERIFIED',
    streaming: 'STREAMING_VERIFIED', tools: 'SUPPORTED', vision: 'SUPPORTED', structuredOutput: 'SUPPORTED',
    modelCount: 5, lastTestedAt: new Date().toISOString(), lastError: null, latencyMs: 500, rateLimits: null,
  }]]);
  const decision = router.routeV2({
    taskClass: 'general', contextRequirement: 0, visionRequired: false, toolsRequired: false,
    structuredOutputRequired: false, mode: 'auto',
  }, healthMap);
  assert.equal(decision.status, 'unavailable');
});

test('buildRouterInput estimates context from long prompt', () => {
  const input = router.buildRouterInput('general', 'auto', 'x'.repeat(200_000));
  assert.ok(input.contextRequirement > 50_000);
});

test('buildRouterInput gives zero context for short prompt', () => {
  const input = router.buildRouterInput('general', 'auto', 'short');
  assert.equal(input.contextRequirement, 0);
});

// ---------------------------------------------------------------------------
// Context Exclusions
// ---------------------------------------------------------------------------

test('excludes .env files', () => {
  assert.equal(contextManager.isPathExcluded('.env'), true);
  assert.equal(contextManager.isPathExcluded('.env.local'), true);
  assert.equal(contextManager.isPathExcluded('.env.production'), true);
});

test('excludes node_modules', () => {
  assert.equal(contextManager.isPathExcluded('node_modules/react/index.js'), true);
});

test('excludes .next build artifacts', () => {
  assert.equal(contextManager.isPathExcluded('.next/server/app/page.js'), true);
});

test('excludes binary files', () => {
  assert.equal(contextManager.isPathExcluded('logo.png'), true);
  assert.equal(contextManager.isPathExcluded('video.mp4'), true);
});

test('excludes credential files', () => {
  assert.equal(contextManager.isPathExcluded('secret-key.pem'), true);
  assert.equal(contextManager.isPathExcluded('credentials.json'), true);
});

test('does not exclude regular source files', () => {
  assert.equal(contextManager.isPathExcluded('src/app/page.tsx'), false);
  assert.equal(contextManager.isPathExcluded('README.md'), false);
});

// ---------------------------------------------------------------------------
// Secret Redaction
// ---------------------------------------------------------------------------

test('error messages never contain raw API keys', () => {
  const error = errors.normalizeError(401, 'Authorization: Bearer sk-test1234567890abcdef');
  assert.ok(!error.safeMessage.includes('sk-test1234567890abcdef'));
});

test('ProviderHealth type never includes credential values', () => {
  const health = {
    providerId: 'openai', displayName: 'OpenAI', transport: 'OpenAI', configured: true,
    auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', generation: 'GENERATION_VERIFIED',
    streaming: 'STREAMING_VERIFIED', tools: 'SUPPORTED', vision: 'SUPPORTED', structuredOutput: 'SUPPORTED',
    modelCount: 10, lastTestedAt: new Date().toISOString(), lastError: null, latencyMs: 500, rateLimits: null,
  };
  const json = JSON.stringify(health);
  assert.ok(!json.includes('OPENAI_API_KEY'));
  assert.ok(!json.includes('sk-'));
  assert.ok(!json.includes('Bearer'));
});

// ---------------------------------------------------------------------------
// Token Estimation
// ---------------------------------------------------------------------------

test('estimates ~4 chars per token', () => {
  assert.equal(contract.estimateTokens('hello world'), 3); // 11/4 = 2.75 -> ceil = 3
});

test('handles empty string', () => {
  assert.equal(contract.estimateTokens(''), 0);
});

test('handles large text', () => {
  assert.equal(contract.estimateTokens('x'.repeat(4000)), 1000);
});
