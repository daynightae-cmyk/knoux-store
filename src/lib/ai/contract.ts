import "server-only";
import type {
  CostEstimate,
  DiscoveryResult,
  GenerationRequest,
  GenerationResponse,
  ModelControls,
  ModelPricing,
  NormalizedError,
  ProbeResult,
  RateLimitSnapshot,
  StreamChunk,
  TokenUsage,
} from "./types";

/**
 * Canonical provider adapter contract.
 *
 * Every method executes server-side. No implementation ever receives or
 * returns a credential to a caller. The `secretStore` is injected at
 * construction time and never leaves the adapter.
 *
 * TYPE OWNERSHIP: `types.ts` owns every domain and data structure. This
 * module owns the adapter interface and the shared runtime helpers built on
 * top of those structures. Consumers import domain types from here as a
 * barrel so that no adapter ever has to reach through a module that merely
 * imported a type in order to obtain it.
 */
export type {
  AcceptanceResult,
  ArenaRequest,
  ArenaResult,
  CapabilityState,
  ChatMessage,
  ContextBundle,
  ContextSelection,
  CostEstimate,
  DiscoveryCacheEntry,
  DiscoveryResult,
  DiscoverySource,
  ErrorCategory,
  GenerationControls,
  GenerationRequest,
  GenerationResponse,
  ModelCapabilities,
  ModelControls,
  ModelLifecycle,
  ModelModality,
  ModelPricing,
  NormalizedError,
  NormalizedModel,
  ProbeResult,
  ProviderHealth,
  RateLimitSnapshot,
  RouterCandidate,
  RouterDecision,
  RouterInput,
  SenshialContextEntry,
  SenshialRequest,
  SenshialResponse,
  StreamChunk,
  SupportState,
  TokenUsage,
  ToolDefinition,
  UsageRecord,
  UsageSummary,
} from "./types";

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
  discoverModels(
    env: Record<string, string | undefined>,
  ): Promise<DiscoveryResult>;

  /** Real text generation. */
  generate(
    request: GenerationRequest,
    env: Record<string, string | undefined>,
  ): Promise<GenerationResponse>;

  /** Real streaming generation via async generator. */
  stream(
    request: GenerationRequest,
    env: Record<string, string | undefined>,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk, void, void>;

  /** Return capability metadata for this provider. */
  capabilities(): {
    streaming: boolean;
    tools: boolean;
    structuredOutput: boolean;
    vision: boolean;
  };

  /** Normalize a provider-specific error. */
  normalizeError(
    status: number | null,
    bodyText: string | null,
  ): NormalizedError;

  /** Estimate cost for a request based on token usage and model pricing. */
  estimateCost(modelId: string, usage: TokenUsage): CostEstimate;

  /** Parse rate-limit headers from a Response. */
  parseRateLimits(headers: Headers): RateLimitSnapshot | null;
}

// ---------------------------------------------------------------------------
// Shared utilities for adapters
// ---------------------------------------------------------------------------

/** Approximate token count: ~4 chars per token. Good enough for routing/UX. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
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
  return {
    inputPerMillion: null,
    outputPerMillion: null,
    cachedInputPerMillion: null,
    currency: "USD",
  };
}
