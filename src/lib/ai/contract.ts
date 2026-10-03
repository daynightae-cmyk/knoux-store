import 'server-only';
import type {
  ChatMessage,
  CostEstimate,
  DiscoveryResult,
  GenerationControls,
  GenerationRequest,
  GenerationResponse,
  ModelControls,
  ModelPricing,
  NormalizedError,
  NormalizedModel,
  ProviderHealth,
  RateLimitSnapshot,
  StreamChunk,
  TokenUsage,
} from './types';

/**
 * Canonical provider adapter contract.
 *
 * Every method executes server-side. No implementation ever receives or
 * returns a credential to a caller. The `secretStore` is injected at
 * construction time and never leaves the adapter.
 */

export interface ProviderAdapter {
  readonly id: string;
  readonly displayName: string;
  /** Human-readable transport, e.g. "OpenAI", "OpenRouter", "Ollama". */
  readonly transport: string;
  /** Environment variable names this provider needs. Names only, never values. */
  readonly requiredEnv: string[];

  /** Check if all required credentials are present. */
  isConfigured(env: Record<string, string | undefined>): boolean;

  /** Lightweight authentication probe. No generation tokens consumed. */
  probe(env: Record<string, string | undefined>): Promise<ProbeResult>;

  /** Discover available models from the provider's API. */
  discoverModels(env: Record<string, string | undefined>): Promise<DiscoveryResult>;

  /** Real text generation. */
  generate(request: GenerationRequest, env: Record<string, string | undefined>): Promise<GenerationResponse>;

  /** Real streaming generation via async generator. */
  stream(
    request: GenerationRequest,
    env: Record<string, string | undefined>,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk, void, void>;

  /** Return capability metadata for this provider. */
  capabilities(): { streaming: boolean; tools: boolean; structuredOutput: boolean; vision: boolean };

  /** Normalize a provider-specific error. */
  normalizeError(status: number | null, bodyText: string | null): NormalizedError;

  /** Estimate cost for a request based on token usage and model pricing. */
  estimateCost(modelId: string, usage: TokenUsage): CostEstimate;

  /** Parse rate-limit headers from a Response. */
  parseRateLimits(headers: Headers): RateLimitSnapshot | null;
}

export type ProbeResult = {
  providerId: string;
  authenticated: boolean;
  detail: string;
  error: NormalizedError | null;
  latencyMs: number;
};

// ---------------------------------------------------------------------------
// Shared utilities for adapters
// ---------------------------------------------------------------------------

/** Approximate token count: ~4 chars per token. Good enough for routing/UX. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Parse rate limits from common header conventions. */
export function parseRateLimitHeaders(
  headers: Headers,
  prefixes: string[],
): RateLimitSnapshot | null {
  for (const prefix of prefixes) {
    const remaining = headers.get(`x-ratelimit-remaining-${prefix}`) ?? headers.get(`x-ratelimit-remaining`);
    const remainingTokens = headers.get(`x-ratelimit-remaining-tokens`);
    const reset = headers.get(`x-ratelimit-reset-${prefix}`) ?? headers.get(`x-ratelimit-reset`);

    if (remaining !== null || remainingTokens !== null || reset !== null) {
      return {
        remainingRequests: remaining !== null ? parseInt(remaining, 10) : null,
        remainingTokens: remainingTokens !== null ? parseInt(remainingTokens, 10) : null,
        resetAt: reset ?? null,
        source: 'header',
      };
    }
  }
  return null;
}

/** Build a GenerationResponse for an error case. */
export function errorResponse(
  error: NormalizedError,
  latencyMs: number,
  modelUsed: string | null = null,
): GenerationResponse {
  return {
    ok: false,
    text: '',
    finishReason: null,
    usage: { inputTokens: null, outputTokens: null, cachedTokens: null, source: 'unknown' },
    latencyMs,
    ttftMs: null,
    providerRequestId: null,
    modelUsed,
    warnings: [],
    error,
    estimatedCost: null,
  };
}

/** Build a successful GenerationResponse. */
export function successResponse(
  text: string,
  finishReason: string | null,
  usage: TokenUsage,
  latencyMs: number,
  ttftMs: number | null,
  providerRequestId: string | null,
  modelUsed: string,
  cost: CostEstimate | null,
  warnings: string[] = [],
): GenerationResponse {
  return {
    ok: true,
    text,
    finishReason,
    usage,
    latencyMs,
    ttftMs,
    providerRequestId,
    modelUsed,
    warnings,
    error: null,
    estimatedCost: cost,
  };
}

/** Default model controls for OpenAI-compatible providers. */
export function openaiCompatibleControls(): ModelControls {
  return {
    temperature: true,
    topP: true,
    maxTokens: true,
    reasoningEffort: false,
    seed: true,
    stop: true,
    toolChoice: true,
  };
}

/** Empty pricing (UNKNOWN). */
export function unknownPricing(): ModelPricing {
  return { inputPerMillion: null, outputPerMillion: null, cachedInputPerMillion: null, currency: 'USD' };
}
