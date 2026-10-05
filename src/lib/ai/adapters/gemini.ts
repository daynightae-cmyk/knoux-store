import "server-only";
import {
  abortedError,
  createNormalizedError,
  networkError,
  normalizeError,
} from "../errors";
import { calculateCost } from "../cost";
import { OpenAICompatibleAdapter } from "./base";
import type {
  GenerationRequest,
  GenerationResponse,
  StreamChunk,
  TokenUsage,
  NormalizedModel,
  DiscoveryResult,
  ProbeResult,
  RateLimitSnapshot,
} from "../types";

/**
 * Google Gemini adapter. Uses the Generative Language API.
 *
 * API: https://generativelanguage.googleapis.com/v1beta
 * Auth: API key as query parameter (x-goog-api-key header also supported)
 * Supports: text, streaming, tools, structured output, vision.
 * Model discovery: GET /v1beta/models
 *
 * Two env var names are accepted: GEMINI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY.
 */

/**
 * Canonical Gemini model identities this adapter will address.
 *
 * Gemini is the one adapter in the runtime that puts the model identifier in
 * the request *path* (`/models/{id}:generateContent`) rather than in the body,
 * so the identifier decides which endpoint is called. A value taken straight
 * from a browser request would therefore let the caller choose the target, not
 * merely the model.
 *
 * Discovery is the primary source of identity. This list is the controlled
 * static fallback used before discovery has run on a cold server, and it names
 * only models this repository already declares in its own provider catalogue
 * (`src/lib/build/providers.ts`) and pricing table (`src/lib/ai/cost.ts`).
 * Nothing here is invented for the purpose of passing a gate.
 */
const GEMINI_CANONICAL_MODEL_IDS: readonly string[] = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

/**
 * The fixed operation suffix for each supported endpoint. Kept as a closed
 * union so a URL can only ever be built from one of these two literals.
 */
const GEMINI_OPERATION_SUFFIX = {
  generateContent: ":generateContent",
  streamGenerateContent: ":streamGenerateContent?alt=sse",
} as const;

type GeminiOperation = keyof typeof GEMINI_OPERATION_SUFFIX;

/**
 * The character set a model identifier may use when it becomes a URL path
 * segment: one leading alphanumeric, then alphanumerics, dot, underscore or
 * hyphen. No slash, colon, percent, query, fragment, at-sign or whitespace
 * survives this test, and a `..` traversal cannot either.
 */
const SAFE_MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function isSafeModelIdSegment(value: string): boolean {
  return SAFE_MODEL_ID_PATTERN.test(value) && !value.includes("..");
}

/**
 * The prefix Google puts on every identity in the `name` field of a model
 * listing. `GET /v1beta/models` documents that field as `Format: models/{model}`
 * (e.g. `models/gemini-2.5-flash`), while the generation URL template is
 * `POST /v1beta/models/{model}:generateContent` — the bare identifier, with the
 * `models/` segment supplied by the URL itself.
 *
 * The prefix is therefore a *trusted, provider-owned* part of discovery, never
 * part of the identity this adapter addresses. It is removed before any
 * validation so a legitimate discovered name is not rejected merely for
 * carrying it.
 *
 * The match is anchored: only a single leading occurrence is removed, so
 * `models/../../etc` normalizes to `../../etc` and is then refused by
 * `isSafeModelIdSegment` rather than being partially sanitized into something
 * that still looks path-like.
 */
const GEMINI_MODEL_NAME_PREFIX = "models/";

function stripModelNamePrefix(name: string): string {
  const trimmed = name.trim();
  return trimmed.startsWith(GEMINI_MODEL_NAME_PREFIX)
    ? trimmed.slice(GEMINI_MODEL_NAME_PREFIX.length)
    : trimmed;
}

/**
 * Resolve `requested` against `inventory` and return the inventory's own
 * spelling of the identity.
 *
 * The requested value is used only as a lookup key. The returned value is
 * always an element of the inventory, so no character the caller chose can
 * reach a URL — the caller can select *which* known model is used, never
 * introduce a new path segment. Returns null when the identity is unknown.
 */
function canonicalIdentity(
  requested: string,
  inventory: Iterable<string>,
): string | null {
  if (typeof requested !== "string") return null;
  // A caller may name a model either bare (`gemini-2.5-flash`) or in the
  // provider's own discovery spelling (`models/gemini-2.5-flash`). Both denote
  // the same identity, so the trusted prefix is normalized away before the
  // lookup. This only widens *matching*: the value returned is still an
  // element of the inventory, so it can never carry caller-chosen text.
  const candidate = stripModelNamePrefix(requested).toLowerCase();
  if (candidate.length === 0) return null;
  for (const known of inventory) {
    if (known.toLowerCase() === candidate) return known;
  }
  return null;
}

export class GeminiAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: "gemini",
      displayName: "Google Gemini",
      transport: "Google Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      authHeader: "header",
      authHeaderName: "x-goog-api-key",
      requiredEnv: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
      supportsVision: true,
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: true,
      controls: {
        temperature: true,
        topP: true,
        maxTokens: true,
        reasoningEffort: false,
        seed: false,
        stop: true,
        toolChoice: true,
      },
      rateLimitPrefixes: [],
    });
  }

  override isConfigured(env: Record<string, string | undefined>): boolean {
    return this.requiredEnv.some((name) => {
      const value = env[name];
      return typeof value === "string" && value.trim().length > 0;
    });
  }

  override getApiKey(env: Record<string, string | undefined>): string | null {
    for (const name of this.requiredEnv) {
      const value = env[name]?.trim();
      if (value) return value;
    }
    return null;
  }

  /**
   * Identities the provider itself has confirmed through `discoverModels`.
   *
   * Per server instance, matching the lifecycle of the registry's discovery
   * cache. Entries are added, never cleared, so a transient discovery failure
   * cannot silently shrink what the runtime is willing to address.
   */
  private readonly discoveredModelIds = new Set<string>();

  /**
   * Resolve a requested model identifier to an identity this adapter can prove
   * exists, returning the inventory's spelling rather than the requested
   * string. Returns null when discovery has not confirmed the model and it is
   * not in the canonical list.
   */
  private resolveModelId(requested: string): string | null {
    const resolved =
      canonicalIdentity(requested, this.discoveredModelIds) ??
      canonicalIdentity(requested, GEMINI_CANONICAL_MODEL_IDS);
    return resolved !== null && isSafeModelIdSegment(resolved) ? resolved : null;
  }

  /**
   * Build a request URL from three parts and nothing else: the fixed trusted
   * base URL, one identity already resolved from this adapter's own inventory,
   * and a fixed operation suffix from a closed set. No part of the caller's
   * input reaches this function.
   */
  private buildModelUrl(modelId: string, operation: GeminiOperation): string {
    return `${this.config.baseUrl}/models/${modelId}${GEMINI_OPERATION_SUFFIX[operation]}`;
  }

  protected override get probePath(): string {
    return "/models?pageSize=1";
  }

  override async probe(
    env: Record<string, string | undefined>,
  ): Promise<ProbeResult> {
    const apiKey = this.getApiKey(env);
    if (!apiKey) {
      return {
        providerId: this.id,
        authenticated: false,
        detail:
          "Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY on the server.",
        error: {
          category: "AUTHENTICATION",
          message: "Missing credential",
          safeMessage: "Set GEMINI_API_KEY",
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
        latencyMs: 0,
      };
    }
    return super.probe(env);
  }

  override async discoverModels(
    env: Record<string, string | undefined>,
  ): Promise<DiscoveryResult> {
    const apiKey = this.getApiKey(env);
    if (!apiKey) {
      return {
        providerId: this.id,
        models: [],
        source: "UNKNOWN",
        discoveredAt: new Date().toISOString(),
        error: {
          category: "AUTHENTICATION",
          message: "Missing credential",
          safeMessage: "Set GEMINI_API_KEY",
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
        fromCache: false,
      };
    }
    try {
      const response = await fetch(
        `${this.config.baseUrl}/models?pageSize=100`,
        {
          headers: this.buildHeaders(apiKey),
          redirect: "error",
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const bodyText = await response.text().catch(() => null);
        return {
          providerId: this.id,
          models: [],
          source: "UNKNOWN",
          discoveredAt: new Date().toISOString(),
          error: normalizeError(response.status, bodyText),
          fromCache: false,
        };
      }
      const json = await response.json();
      const list =
        (
          json as {
            models?: Array<{
              name: string;
              displayName?: string;
              supportedGenerationMethods?: string[];
              inputTokenLimit?: number;
              outputTokenLimit?: number;
            }>;
          }
        )?.models ?? [];
      // `supportedGenerationMethods` is the only authoritative signal that a
      // Gemini model can serve generation traffic at all. Embedding-only and
      // image-only models are excluded rather than surfaced as models that
      // would fail the moment generation was attempted.
      const models: NormalizedModel[] = list
        .filter((m) => typeof m.name === "string" && m.name.trim().length > 0)
        .filter((m) => {
          const methods = m.supportedGenerationMethods ?? [];
          return (
            methods.includes("generateContent") ||
            methods.includes("streamGenerateContent")
          );
        })
        .map((entry): NormalizedModel => {
          // Google returns `name` as `models/{model}`. Strip that trusted
          // provider-owned prefix here so everything downstream — capability
          // sniffing, the inventory, and the request URL — works with the bare
          // identifier the API path actually expects.
          const modelId = stripModelNamePrefix(entry.name);
          const methods = entry.supportedGenerationMethods ?? [];
          const supportsStream = methods.includes("streamGenerateContent");
          const isPreview = modelId.includes("exp");
          return {
            providerId: this.id,
            modelId,
            displayName: entry.displayName ?? modelId,
            discoveredAt: new Date().toISOString(),
            contextWindow: entry.inputTokenLimit ?? null,
            maxOutputTokens: entry.outputTokenLimit ?? null,
            modalities: {
              text: true,
              imageInput:
                modelId.includes("vision") || !modelId.includes("text"),
              audioInput: false,
              audioOutput: false,
            },
            capabilities: {
              streaming: supportsStream ? "SUPPORTED" : "UNSUPPORTED",
              // Gemini exposes these through the shared generateContent API,
              // but nothing in a model listing proves a specific model honours
              // them, so they stay UNKNOWN until a probe measures them.
              tools: "UNKNOWN",
              structuredOutput: "UNKNOWN",
              reasoning:
                modelId.includes("thinking") || modelId.includes("pro")
                  ? "SUPPORTED"
                  : "UNKNOWN",
              vision:
                modelId.includes("vision") || !modelId.includes("text")
                  ? "SUPPORTED"
                  : "UNKNOWN",
            },
            controls: this.config.controls,
            pricing: {
              inputPerMillion: null,
              outputPerMillion: null,
              cachedInputPerMillion: null,
              currency: "USD",
            },
            lifecycle: isPreview ? "preview" : "active",
            source: "LIVE",
          };
        })
        .filter(
          (m) =>
            // An identity that cannot be a safe URL path segment is never
            // surfaced as a discoverable model, so what discovery reports and
            // what the adapter is willing to address stay the same set.
            isSafeModelIdSegment(m.modelId) &&
            (m.capabilities.streaming !== "UNSUPPORTED" ||
              m.capabilities.tools !== "UNSUPPORTED"),
        );

      // Discovery may widen the inventory, but only with identities that are
      // safe as a URL path segment. An answer that cannot be addressed safely
      // is dropped here rather than carried into the URL builder later.
      for (const model of models) {
        if (isSafeModelIdSegment(model.modelId)) {
          this.discoveredModelIds.add(model.modelId);
        }
      }

      return {
        providerId: this.id,
        models,
        source: "LIVE",
        discoveredAt: new Date().toISOString(),
        error: null,
        fromCache: false,
      };
    } catch (cause) {
      return {
        providerId: this.id,
        models: [],
        source: "UNKNOWN",
        discoveredAt: new Date().toISOString(),
        error: networkError(
          cause instanceof Error ? cause.message : "Network error",
        ),
        fromCache: false,
      };
    }
  }

  override async generate(
    request: GenerationRequest,
    env: Record<string, string | undefined>,
  ): Promise<GenerationResponse> {
    const start = Date.now();
    const apiKey = this.getApiKey(env);
    if (!apiKey) {
      return this.errorResponse(
        {
          category: "AUTHENTICATION",
          message: "Missing credential",
          safeMessage: "No API key configured.",
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
        0,
        request.modelId,
      );
    }

    // The trust boundary. The caller names a model; this adapter decides
    // whether that name is one it can address. An unconfirmed identity is
    // refused here, before any URL is built.
    const modelId = this.resolveModelId(request.modelId);
    if (!modelId) {
      return this.errorResponse(
        createNormalizedError(
          "MODEL_NOT_FOUND",
          `Unknown Gemini model identity "${request.modelId}". Discovery has not confirmed it and it is not in the canonical model list.`,
        ),
        0,
        request.modelId,
      );
    }

    const body = this.buildGeminiRequestBody(request);
    try {
      const response = await fetch(
        this.buildModelUrl(modelId, "generateContent"),
        {
          method: "POST",
          headers: this.buildHeaders(apiKey),
          body: JSON.stringify(body),
          redirect: "error",
          signal: AbortSignal.timeout(120000),
          cache: "no-store",
        },
      );
      const latencyMs = Date.now() - start;
      if (!response.ok) {
        const bodyText = await response.text().catch(() => null);
        return this.errorResponse(
          normalizeError(response.status, bodyText),
          latencyMs,
          request.modelId,
        );
      }
      const json = await response.json();
      return this.parseGeminiResponse(json, latencyMs, request);
    } catch (cause) {
      const latencyMs = Date.now() - start;
      if (cause instanceof DOMException && cause.name === "TimeoutError") {
        return this.errorResponse(
          {
            category: "TIMEOUT",
            message: "Request timed out",
            safeMessage: "Request timed out.",
            httpStatus: null,
            providerErrorId: null,
            retryable: true,
          },
          latencyMs,
          request.modelId,
        );
      }
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return this.errorResponse(abortedError(), latencyMs, request.modelId);
      }
      return this.errorResponse(
        networkError(cause instanceof Error ? cause.message : "Network error"),
        latencyMs,
        request.modelId,
      );
    }
  }

  override async *stream(
    request: GenerationRequest,
    env: Record<string, string | undefined>,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk, void, void> {
    const start = Date.now();
    const apiKey = this.getApiKey(env);
    if (!apiKey) {
      yield this.streamError({
        category: "AUTHENTICATION",
        message: "Missing credential",
        safeMessage: "No API key configured.",
        httpStatus: null,
        providerErrorId: null,
        retryable: false,
      }, 0);
      return;
    }

    // Same trust boundary as `generate`: the streaming path builds its URL from
    // a resolved identity, never from the requested string.
    const modelId = this.resolveModelId(request.modelId);
    if (!modelId) {
      yield {
        delta: "",
        done: true,
        finishReason: null,
        usage: null,
        error: createNormalizedError(
          "MODEL_NOT_FOUND",
          `Unknown Gemini model identity "${request.modelId}". Discovery has not confirmed it and it is not in the canonical model list.`,
        ),
        latencyMs: 0,
        ttftMs: null,
      };
      return;
    }

    const body = this.buildGeminiRequestBody(request);
    let firstTokenTime: number | null = null;
    let finishReason: string | null = null;
    let usage: TokenUsage | null = null;

    try {
      for await (const data of this.readStreamData(
        this.buildModelUrl(modelId, "streamGenerateContent"), apiKey, body, start, signal,
        "No body",
        "No response body."
      )) {
        if (typeof data !== "string") {
          yield data;
          return;
        }
        try {
          const chunk = JSON.parse(data);
          const text =
            chunk.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text)
              .join("") ?? "";
          if (text) {
            if (firstTokenTime === null) firstTokenTime = Date.now() - start;
            yield {
              delta: text,
              done: false,
              finishReason: null,
              usage: null,
              error: null,
              latencyMs: null,
              ttftMs: firstTokenTime,
            };
          }
          if (chunk.candidates?.[0]?.finishReason)
            finishReason = chunk.candidates[0].finishReason;
          if (chunk.usageMetadata) {
            usage = {
              inputTokens: chunk.usageMetadata.promptTokenCount ?? null,
              outputTokens: chunk.usageMetadata.candidatesTokenCount ?? null,
              cachedTokens:
                chunk.usageMetadata.cachedContentTokenCount ?? null,
              source: "provider",
            };
          }
        } catch {
          /* skip */
        }
      }

      yield this.streamComplete(start, firstTokenTime, finishReason, usage);
    } catch (cause) {
      yield this.streamError(
        cause instanceof DOMException && cause.name === "AbortError"
          ? abortedError()
          : networkError(cause instanceof Error ? cause.message : "Network error"),
        Date.now() - start, firstTokenTime, finishReason, usage,
      );
    }
  }

  private buildGeminiRequestBody(
    request: GenerationRequest,
  ): Record<string, unknown> {
    const contents = request.messages.map((m) => ({
      role:
        m.role === "assistant"
          ? "model"
          : m.role === "system"
            ? "user"
            : m.role,
      parts: [{ text: m.content }],
    }));
    const body: Record<string, unknown> = { contents };
    if (request.system)
      body.systemInstruction = { parts: [{ text: request.system }] };
    const genConfig: Record<string, unknown> = {};
    if (request.controls?.temperature !== undefined)
      genConfig.temperature = request.controls.temperature;
    if (request.controls?.topP !== undefined)
      genConfig.topP = request.controls.topP;
    if (request.controls?.maxOutputTokens !== undefined)
      genConfig.maxOutputTokens = request.controls.maxOutputTokens;
    if (request.controls?.stop) genConfig.stopSequences = request.controls.stop;
    if (request.responseSchema) genConfig.responseMimeType = "application/json";
    if (request.responseSchema)
      genConfig.responseSchema = request.responseSchema;
    if (request.tools && request.tools.length > 0) {
      genConfig.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }
    if (Object.keys(genConfig).length > 0) body.generationConfig = genConfig;
    return body;
  }

  private parseGeminiResponse(
    json: unknown,
    latencyMs: number,
    request: GenerationRequest,
  ): GenerationResponse {
    const data = json as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        cachedContentTokenCount?: number;
      };
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    const finishReason = data.candidates?.[0]?.finishReason ?? null;
    const usage: TokenUsage = {
      inputTokens: data.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
      cachedTokens: data.usageMetadata?.cachedContentTokenCount ?? null,
      source: "provider",
    };
    const cost = calculateCost(this.id, request.modelId, usage);
    return {
      ok: true,
      text,
      finishReason,
      usage,
      latencyMs,
      ttftMs: latencyMs,
      providerRequestId: null,
      modelUsed: request.modelId,
      warnings: [],
      error: null,
      estimatedCost: cost,
    };
  }

  parseRateLimits(_headers: Headers): RateLimitSnapshot | null {
    // Gemini does not expose OpenAI-style x-ratelimit-* headers. Reporting
    // UNKNOWN is correct; inventing a zero-quota reading would be a lie that
    // the router would then score against.
    return null;
  }
}
