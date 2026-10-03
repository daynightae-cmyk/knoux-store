/**
 * KNOuX AI Runtime — Normalized Type Contracts.
 *
 * Every type here is server-side. Nothing in this file is ever imported by a
 * client component. The browser only sees safe projections through API routes.
 *
 * Core principle: "unknown" can never widen to "pass". A capability that was
 * not measured is UNKNOWN, never SUPPORTED or VERIFIED.
 */

// ---------------------------------------------------------------------------
// Capability states
// ---------------------------------------------------------------------------

/**
 * The lifecycle of a provider capability test. Each is a distinct, measured
 * fact. Credential presence alone does not advance past UNCONFIGURED.
 */
export type CapabilityState =
  | "UNCONFIGURED"
  | "CONFIGURED_UNTESTED"
  | "AUTHENTICATED"
  | "DISCOVERY_VERIFIED"
  | "GENERATION_VERIFIED"
  | "STREAMING_VERIFIED"
  | "TOOLS_VERIFIED"
  | "VISION_VERIFIED"
  | "STRUCTURED_OUTPUT_VERIFIED"
  | "RATE_LIMITED"
  | "DEGRADED"
  | "FAILED"
  | "BLOCKED";

/** A tri-state for optional capabilities that may not exist on a model. */
export type SupportState = "UNKNOWN" | "SUPPORTED" | "VERIFIED" | "UNSUPPORTED";

/** Acceptance values for the final deliverable matrix. */
export type AcceptanceResult =
  | "PASS"
  | "FAIL"
  | "UNTESTED"
  | "UNSUPPORTED"
  | "BLOCKED";

// ---------------------------------------------------------------------------
// Normalized model record
// ---------------------------------------------------------------------------

export type ModelModality = {
  text: boolean;
  imageInput: boolean;
  audioInput: boolean;
  audioOutput: boolean;
};

export type ModelCapabilities = {
  streaming: SupportState;
  tools: SupportState;
  structuredOutput: SupportState;
  reasoning: SupportState;
  vision: SupportState;
};

export type ModelControls = {
  temperature: boolean;
  topP: boolean;
  maxTokens: boolean;
  reasoningEffort: boolean;
  seed: boolean;
  stop: boolean;
  toolChoice: boolean;
};

export type ModelPricing = {
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  cachedInputPerMillion: number | null;
  currency: string;
};

export type ModelLifecycle = "active" | "deprecated" | "preview" | "unknown";

export type DiscoverySource = "LIVE" | "STATIC" | "CACHED_LIVE" | "UNKNOWN";

export type NormalizedModel = {
  providerId: string;
  modelId: string;
  displayName: string;
  discoveredAt: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  modalities: ModelModality;
  capabilities: ModelCapabilities;
  controls: ModelControls;
  pricing: ModelPricing;
  lifecycle: ModelLifecycle;
  source: DiscoverySource;
};

// ---------------------------------------------------------------------------
// Provider health snapshot
// ---------------------------------------------------------------------------

export type ProviderHealth = {
  providerId: string;
  displayName: string;
  transport: string;
  configured: boolean;
  auth: CapabilityState;
  discovery: CapabilityState;
  generation: CapabilityState;
  streaming: CapabilityState;
  tools: SupportState;
  vision: SupportState;
  structuredOutput: SupportState;
  modelCount: number;
  lastTestedAt: string | null;
  lastError: NormalizedError | null;
  latencyMs: number | null;
  rateLimits: RateLimitSnapshot | null;
  /**
   * The deliverable verdict for each measured axis. Derived from the measured
   * state, never from the presence of a credential — a configured-but-untested
   * provider reports UNTESTED, not PASS.
   */
  acceptance?: {
    auth: AcceptanceResult;
    discovery: AcceptanceResult;
    generation: AcceptanceResult;
    streaming: AcceptanceResult;
    tools: AcceptanceResult;
    vision: AcceptanceResult;
    structuredOutput: AcceptanceResult;
  };
};

export type RateLimitSnapshot = {
  remainingRequests: number | null;
  remainingTokens: number | null;
  resetAt: string | null;
  source: "header" | "body" | "unknown";
};

/**
 * The result of an explicit authentication probe.
 *
 * `authenticated` is a measured fact from a live request, never inferred from
 * the presence of a credential. `detail` is safe to display; `error` is always
 * a complete NormalizedError, never a partial projection.
 */
export type ProbeResult = {
  providerId: string;
  authenticated: boolean;
  detail: string;
  error: NormalizedError | null;
  latencyMs: number;
};

// ---------------------------------------------------------------------------
// Generation request / response
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Optional image input (base64 data URL or URL) for vision models. */
  images?: string[];
  /** Tool call id when role is 'tool'. */
  toolCallId?: string;
};

export type GenerationControls = {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
  seed?: number;
  stop?: string[];
  toolChoice?: "auto" | "none" | "required" | { name: string };
};

export type GenerationRequest = {
  providerId: string;
  modelId: string;
  messages: ChatMessage[];
  system?: string;
  controls?: GenerationControls;
  /** Optional JSON schema for structured output. */
  responseSchema?: Record<string, unknown>;
  /** Optional tool definitions. */
  tools?: ToolDefinition[];
  /** Approximate token count of the full input context. */
  inputTokenEstimate?: number;
};

export type TokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  /** How the token counts were obtained. */
  source: "provider" | "estimated" | "unknown";
};

export type GenerationResponse = {
  ok: boolean;
  text: string;
  finishReason: string | null;
  usage: TokenUsage;
  latencyMs: number;
  ttftMs: number | null;
  providerRequestId: string | null;
  modelUsed: string | null;
  warnings: string[];
  error: NormalizedError | null;
  estimatedCost: CostEstimate | null;
};

export type CostEstimate = {
  amount: number | null;
  /** MEASURED = provider returned cost. ESTIMATED = calculated from pricing. UNKNOWN = no pricing data. */
  basis: "MEASURED" | "ESTIMATED" | "UNKNOWN";
  currency: string;
};

export type StreamChunk = {
  delta: string;
  done: boolean;
  finishReason: string | null;
  usage: TokenUsage | null;
  error: NormalizedError | null;
  latencyMs: number | null;
  ttftMs: number | null;
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

export type ErrorCategory =
  | "AUTHENTICATION"
  | "RATE_LIMIT"
  | "MODEL_NOT_FOUND"
  | "CONTEXT_OVERFLOW"
  | "TIMEOUT"
  | "NETWORK"
  | "PROVIDER_5XX"
  | "INVALID_REQUEST"
  | "UNSUPPORTED_CAPABILITY"
  | "ABORTED"
  | "UNKNOWN";

export type NormalizedError = {
  category: ErrorCategory;
  message: string;
  /** Safe to show in UI. Never contains secrets, tokens, or full response bodies. */
  safeMessage: string;
  httpStatus: number | null;
  providerErrorId: string | null;
  retryable: boolean;
};

// ---------------------------------------------------------------------------
// Router v2
// ---------------------------------------------------------------------------

export type RouterInput = {
  taskClass: string;
  contextRequirement: number;
  visionRequired: boolean;
  toolsRequired: boolean;
  structuredOutputRequired: boolean;
  mode: "auto" | "manual";
  manualSelection?: { providerId: string; modelId: string };
  noFallback?: boolean;
};

export type RouterCandidate = {
  providerId: string;
  modelId: string;
  displayName: string;
  score: number;
  accepted: boolean;
  rejectionReason: string | null;
};

export type RouterDecision = {
  taskClass: string;
  mode: "auto" | "manual";
  selected: { providerId: string; modelId: string; displayName: string } | null;
  candidates: RouterCandidate[];
  fallbackChain: { providerId: string; modelId: string; displayName: string }[];
  estimatedCost: CostEstimate | null;
  health: Record<string, CapabilityState>;
  contextFit: "fits" | "exceeds" | "unknown";
  reasons: string[];
  status: "resolved" | "unavailable";
  blocker: string | null;
};

// ---------------------------------------------------------------------------
// Usage ledger
// ---------------------------------------------------------------------------

export type UsageRecord = {
  id: string;
  timestamp: string;
  providerId: string;
  modelId: string;
  operation: "generate" | "stream" | "arena" | "probe" | "discover";
  taskClass: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  latencyMs: number | null;
  ttftMs: number | null;
  estimatedCost: CostEstimate | null;
  success: boolean;
  errorCategory: ErrorCategory | null;
  fallbackCount: number;
};

export type UsageSummary = {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number | null;
  byProvider: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  >;
  byModel: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  >;
  costBasis: "MEASURED" | "ESTIMATED" | "UNKNOWN";
};

// ---------------------------------------------------------------------------
// Arena
// ---------------------------------------------------------------------------

export type ArenaRequest = {
  prompt: string;
  system?: string;
  controls?: GenerationControls;
  selections: { providerId: string; modelId: string }[];
};

export type ArenaResult = {
  providerId: string;
  modelId: string;
  displayName: string;
  response: GenerationResponse;
  startedAt: string;
  completedAt: string;
};

// ---------------------------------------------------------------------------
// Senshial
// ---------------------------------------------------------------------------

export type SenshialRequest = {
  mode: "ask" | "plan" | "execute";
  prompt: string;
  system?: string;
  context?: SenshialContextEntry[];
  controls?: GenerationControls;
};

export type SenshialContextEntry = {
  type: "file" | "directory" | "route" | "git-diff" | "instructions" | "pasted";
  label: string;
  path: string | null;
  content: string;
  tokenEstimate: number;
};

export type SenshialResponse = {
  ok: boolean;
  mode: "ask" | "plan" | "execute";
  text: string;
  providerId: string | null;
  modelId: string | null;
  usage: TokenUsage | null;
  latencyMs: number | null;
  estimatedCost: CostEstimate | null;
  error: NormalizedError | null;
  blocked: boolean;
  blocker: string | null;
};

// ---------------------------------------------------------------------------
// Context manager
// ---------------------------------------------------------------------------

export type ContextSelection = {
  type: "file" | "directory" | "route" | "git-diff" | "instructions" | "pasted";
  path: string | null;
  label: string;
};

export type ContextBundle = {
  /**
   * `path` is null for synthetic entries — pasted text, project instructions
   * and git diffs have no filesystem path. Forcing them to `''` would collide
   * with a real root-level entry, so the type reflects reality.
   */
  entries: {
    path: string | null;
    content: string;
    lines: number;
    excluded: boolean;
    exclusionReason: string | null;
  }[];
  totalTokenEstimate: number;
  totalBytes: number;
  excludedCount: number;
};

// ---------------------------------------------------------------------------
// Discovery cache
// ---------------------------------------------------------------------------

export type DiscoveryResult = {
  providerId: string;
  models: NormalizedModel[];
  source: DiscoverySource;
  discoveredAt: string;
  error: NormalizedError | null;
  fromCache: boolean;
};

export type DiscoveryCacheEntry = {
  providerId: string;
  models: NormalizedModel[];
  discoveredAt: string;
  expiresAt: string;
  source: DiscoverySource;
};
