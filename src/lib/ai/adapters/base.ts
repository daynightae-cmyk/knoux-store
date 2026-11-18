import "server-only";
import { safeEndpointFetch } from "../provider-os/endpoint";
import { providerRuntimeContext } from "../provider-os/runtime-context";
import {
  abortedError,
  networkError,
  normalizeError,
  timeoutError,
} from "../errors";
import { calculateCost } from "../cost";
import {
  type ProviderAdapter,
  type ProbeResult,
  type GenerationRequest,
  type GenerationResponse,
  type StreamChunk,
  type TokenUsage,
  type RateLimitSnapshot,
  type NormalizedError,
  unknownPricing,
  cancelledGenerationResponse,
  generationSignal,
} from "../contract";
import type { DiscoveryResult, NormalizedModel, ModelControls } from "../types";

/**
 * Base adapter for OpenAI-compatible providers. Many providers use the
 * OpenAI chat completions API format, so the shared logic lives here. Each
 * concrete adapter supplies its base URL, auth header, and model list path.
 */

export type OpenAICompatibleConfig = {
  id: string;
  displayName: string;
  transport: string;
  baseUrl: string;
  /** Auth header name, e.g. "Authorization" or "x-api-key". */
  authHeader: "bearer" | "x-api-key" | "header";
  /** The header name for custom header auth. */
  authHeaderName?: string;
  /** Env var names for the API key. */
  requiredEnv: string[];
  /** Extra headers to send (static, non-secret). */
  extraHeaders?: Record<string, string>;
  /** Whether the provider supports vision. */
  supportsVision: boolean;
  /** Whether the provider supports tools/function calling. */
  supportsTools: boolean;
  /** Whether the provider supports structured output (JSON schema). */
  supportsStructuredOutput: boolean;
  /** Whether the provider supports streaming. */
  supportsStreaming: boolean;
  /** Default model controls. */
  controls: ModelControls;
  /** Rate limit header prefixes to try. */
  rateLimitPrefixes?: string[];
  /**
   * Some vendors authenticate but do not publish a `/models` endpoint. When
   * the key test gets 404/405, a one-token completion separates "wrong key"
   * from "no listing endpoint" instead of reporting a false authentication
   * failure and blocking the field in the browser.
   */
  probeCompletionModel?: string;
  /** Published model identities for a vendor without a listing endpoint. */
  staticModels?: string[];
  /**
   * `models` (default) proves the credential with the listing endpoint.
   * `completion` uses a one-token chat request instead, for vendors whose
   * `/models` is public and would answer 200 to any bearer token — a 200
   * there would report a bad key as authenticated.
   */
  probeStrategy?: 'models' | 'completion';
  /**
   * `all` (default) requires every declared environment name; `any` treats the
   * list as accepted aliases for the same credential (NVIDIA_API_KEY /
   * NVIDIA_NIM_API_KEY).
   */
  envMode?: 'all' | 'any';
};

export abstract class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly transport: string;
  readonly requiredEnv: string[];
  /** Declared explicitly rather than as a constructor parameter property:
   * Node's native type stripping cannot erase parameter properties, so the
   * test runner cannot load this module otherwise. */
  protected readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
    this.id = config.id;
    this.displayName = config.displayName;
    this.transport = config.transport;
    this.requiredEnv = config.requiredEnv;
  }

  protected baseUrl(env: Record<string, string | undefined>): string {
    const variable = this.id === "custom-openai" ? "KNOUX_BUILD_LLM_ENDPOINT" : this.id === "ollama" ? "OLLAMA_BASE_URL" : this.id === "lm-studio" ? "LM_STUDIO_BASE_URL" : null;
    return (variable ? env[variable]?.trim().replace(/\/$/, "") : null) || this.config.baseUrl;
  }
  protected transportFetch(url: string, init: RequestInit): Promise<Response> {
    return ["custom-openai", "ollama", "lm-studio"].includes(this.id)
      ? safeEndpointFetch(url, init, providerRuntimeContext()?.env ?? process.env)
      : fetch(url, init);
  }

  isConfigured(env: Record<string, string | undefined>): boolean {
    return this.config.requiredEnv.every((name) => {
      const value = env[name];
      return typeof value === "string" && value.trim().length > 0;
    });
  }

  /** Published model identities for vendors without a usable listing endpoint.
   * Returned even when the provider is unconfigured, so the picker can show
   * them as catalogue-only / CONFIG REQUIRED instead of an empty list.
   */
  staticModels(): string[] {
    return this.config.staticModels ?? [];
  }

  protected getApiKey(env: Record<string, string | undefined>): string | null {
    for (const name of this.config.requiredEnv) {
      const value = env[name]?.trim();
      if (value) return value;
    }
    return null;
  }

  protected parseModelList(json: unknown): NormalizedModel[] {
    const data = json as {
      data?: Array<{ id: string }>;
      models?: Array<{ id: string }>;
    };
    const list = data?.data ?? data?.models ?? [];
    return list.map((entry) => this.normalizeModel(entry.id));
  }

  protected normalizeModel(modelId: string): NormalizedModel {
    return {
      providerId: this.id,
      modelId,
      displayName: modelId,
      discoveredAt: new Date().toISOString(),
      contextWindow: null,
      maxOutputTokens: null,
      modalities: {
        text: true,
        imageInput: this.config.supportsVision,
        audioInput: false,
        audioOutput: false,
      },
      capabilities: {
        streaming: this.config.supportsStreaming ? "SUPPORTED" : "UNSUPPORTED",
        tools: this.config.supportsTools ? "SUPPORTED" : "UNSUPPORTED",
        structuredOutput: this.config.supportsStructuredOutput
          ? "SUPPORTED"
          : "UNSUPPORTED",
        reasoning: "UNKNOWN" as const,
        vision: this.config.supportsVision ? "SUPPORTED" : "UNSUPPORTED",
      },
      controls: this.config.controls,
      pricing: unknownPricing(),
      lifecycle: "unknown" as const,
      source: "LIVE" as const,
    };
  }

  protected buildHeaders(apiKey: string): HeadersInit {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.config.authHeader === "bearer") {
      headers["authorization"] = `Bearer ${apiKey}`;
    } else if (this.config.authHeader === "x-api-key") {
      headers["x-api-key"] = apiKey;
    } else if (
      this.config.authHeader === "header" &&
      this.config.authHeaderName
    ) {
      headers[this.config.authHeaderName] = apiKey;
    }
    if (this.config.extraHeaders) {
      Object.assign(headers, this.config.extraHeaders);
    }
    return headers;
  }

  protected get probePath(): string {
    return "/models";
  }

  protected get discoveryPath(): string {
    return "/models";
  }

  async probe(env: Record<string, string | undefined>): Promise<ProbeResult> {
    const start = Date.now();
    const apiKey = this.getApiKey(env);
    if (!apiKey) {
      return {
        providerId: this.id,
        authenticated: false,
        detail: `No credential present. Set ${this.config.requiredEnv.join(" and ")} on the server.`,
        error: {
          category: "AUTHENTICATION",
          message: "Missing credential",
          safeMessage: `Set ${this.config.requiredEnv.join(" and ")}`,
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
        latencyMs: 0,
      };
    }
    try {
      const response = await this.transportFetch(`${this.baseUrl(env)}${this.probePath}`, {
        headers: this.buildHeaders(apiKey),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return {
          providerId: this.id,
          authenticated: true,
          detail: "Authenticated; models endpoint answered.",
          error: null,
          latencyMs,
        };
      }
      const bodyText = await response.text().catch(() => null);
      return {
        providerId: this.id,
        authenticated: false,
        detail: `Authentication failed (HTTP ${response.status}).`,
        error: normalizeError(response.status, bodyText),
        latencyMs,
      };
    } catch (cause) {
      const latencyMs = Date.now() - start;
      const message = cause instanceof Error ? cause.message : "Network error";
      return {
        providerId: this.id,
        authenticated: false,
        detail: "Endpoint unreachable.",
        error: networkError(message),
        latencyMs,
      };
    }
  }

  async discoverModels(
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
          safeMessage: `Set ${this.config.requiredEnv.join(" and ")}`,
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
        fromCache: false,
      };
    }
    try {
      const response = await this.transportFetch(`${this.baseUrl(env)}${this.discoveryPath}`, {
        headers: this.buildHeaders(apiKey),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
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
      const models = this.parseModelList(json);
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

  async generate(
    request: GenerationRequest,
    env: Record<string, string | undefined>,
    signal?: AbortSignal,
  ): Promise<GenerationResponse> {
    const start = Date.now();
    if (signal?.aborted) return cancelledGenerationResponse();
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

    const body = this.buildRequestBody(request, false);
    const transportSignal = generationSignal(signal);
    try {
      transportSignal.throwIfAborted();
      const response = await this.transportFetch(`${this.baseUrl(env)}/chat/completions`, {
        method: "POST",
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify(body),
        redirect: "error",
        signal: transportSignal,
        cache: "no-store",
      });
      transportSignal.throwIfAborted();
      const latencyMs = Date.now() - start;
      if (!response.ok) {
        const bodyText = await response.text().catch(() => null);
        transportSignal.throwIfAborted();
        return this.errorResponse(
          normalizeError(response.status, bodyText),
          latencyMs,
          request.modelId,
        );
      }
      const json = await response.json();
      const measured = this.parseCompletionResponse(json, Date.now() - start, request);
      if (signal?.aborted) return cancelledGenerationResponse(Date.now() - start, measured);
      transportSignal.throwIfAborted();
      return measured;
    } catch (cause) {
      const latencyMs = Date.now() - start;
      if (signal?.aborted) return cancelledGenerationResponse(latencyMs);
      if (cause instanceof Error && cause.name === "TimeoutError") {
        return this.errorResponse(timeoutError(), latencyMs, request.modelId);
      }
      if (cause instanceof Error && cause.name === "AbortError") {
        return cancelledGenerationResponse(latencyMs);
      }
      return this.errorResponse(
        networkError(cause instanceof Error ? cause.message : "Network error"),
        latencyMs,
        request.modelId,
      );
    }
  }

  async *stream(
    request: GenerationRequest,
    env: Record<string, string | undefined>,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk, void, void> {
    const start = Date.now();
    if (signal?.aborted) { yield this.streamError(abortedError(), 0); return; }
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

    const body = this.buildRequestBody(request, true);
    let firstTokenTime: number | null = null;
    let finishReason: string | null = null;
    let usage: TokenUsage | null = null;
    let modelUsed: string | null = null;

    try {
      for await (const data of this.readStreamData(
        `${this.baseUrl(env)}/chat/completions`, apiKey, body, start, signal
      )) {
        if (typeof data !== "string") {
          yield data;
          return;
        }
        if (data === "[DONE]") continue;
        try {
          const chunk = JSON.parse(data);
          if (typeof chunk.model === 'string') modelUsed = chunk.model;
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          const reason = chunk.choices?.[0]?.finish_reason ?? null;
          if (delta) {
            if (firstTokenTime === null) firstTokenTime = Date.now() - start;
            yield {
              delta,
              done: false,
              finishReason: null,
              usage: null,
              error: null,
              latencyMs: null,
              ttftMs: firstTokenTime,
            };
          }
          if (reason) finishReason = reason;
          if (chunk.usage) {
            usage = {
              inputTokens: chunk.usage.prompt_tokens ?? null,
              outputTokens: chunk.usage.completion_tokens ?? null,
              cachedTokens:
                chunk.usage.prompt_tokens_details?.cached_tokens ?? null,
              source: "provider" as const,
            };
          }
        } catch {
          // Skip malformed chunks
        }
      }

      signal?.throwIfAborted();
      yield { ...this.streamComplete(start, firstTokenTime, finishReason, usage), modelUsed };
    } catch (cause) {
      yield this.streamError(
        signal?.aborted || (cause instanceof Error && cause.name === "AbortError")
          ? abortedError()
          : cause instanceof Error && cause.name === "TimeoutError"
            ? timeoutError()
            : networkError(cause instanceof Error ? cause.message : "Network error"),
        Date.now() - start, firstTokenTime, finishReason, usage,
      );
    }
  }

  /** Common HTTP/SSE framing only; adapters retain their native event parsers. */
  protected async *readStreamData(
    url: string,
    apiKey: string,
    body: Record<string, unknown>,
    start: number,
    signal?: AbortSignal,
    noBodyMessage = "No response body",
    noBodySafeMessage = "Provider returned no body.",
  ): AsyncGenerator<string | StreamChunk, void, void> {
    const transportSignal = generationSignal(signal);
    transportSignal.throwIfAborted();
    const response = await this.transportFetch(url, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(body),
      redirect: "error",
      signal: transportSignal,
      cache: "no-store",
    });
    transportSignal.throwIfAborted();
    if (!response.ok) {
      const bodyText = await response.text().catch(() => null);
      transportSignal.throwIfAborted();
      yield this.streamError(normalizeError(response.status, bodyText), Date.now() - start);
      return;
    }
    if (!response.body) {
      yield this.streamError({
        category: "NETWORK",
        message: noBodyMessage,
        safeMessage: noBodySafeMessage,
        httpStatus: null,
        providerErrorId: null,
        retryable: false,
      }, Date.now() - start);
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        transportSignal.throwIfAborted();
        const { done, value } = await reader.read();
        transportSignal.throwIfAborted();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          transportSignal.throwIfAborted();
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) yield trimmed.slice(6);
        }
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  protected streamError(
    error: NormalizedError,
    latencyMs: number,
    ttftMs: number | null = null,
    finishReason: string | null = null,
    usage: TokenUsage | null = null,
  ): StreamChunk {
    return { delta: "", done: true, finishReason, usage, error, latencyMs, ttftMs };
  }

  protected streamComplete(
    start: number,
    ttftMs: number | null,
    finishReason: string | null,
    usage: TokenUsage | null,
  ): StreamChunk {
    return {
      delta: "",
      done: true,
      finishReason,
      usage: usage ?? {
        inputTokens: null,
        outputTokens: null,
        cachedTokens: null,
        source: "unknown",
      },
      error: null,
      latencyMs: Date.now() - start,
      ttftMs,
    };
  }

  protected buildRequestBody(
    request: GenerationRequest,
    stream: boolean,
  ): Record<string, unknown> {
    const messages: Array<{ role: string; content: unknown }> = [];
    if (request.system) {
      messages.push({ role: "system", content: request.system });
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
    const body: Record<string, unknown> = {
      model: request.modelId,
      messages,
      stream,
    };
    if (request.controls?.temperature !== undefined)
      body.temperature = request.controls.temperature;
    if (request.controls?.topP !== undefined)
      body.top_p = request.controls.topP;
    if (request.controls?.maxOutputTokens !== undefined)
      body.max_tokens = request.controls.maxOutputTokens;
    if (request.controls?.seed !== undefined) body.seed = request.controls.seed;
    if (request.controls?.stop) body.stop = request.controls.stop;
    if (request.controls?.toolChoice)
      body.tool_choice = request.controls.toolChoice;
    if (request.responseSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: "response", schema: request.responseSchema },
      };
    }
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }
    return body;
  }

  protected parseCompletionResponse(
    json: unknown,
    latencyMs: number,
    request: GenerationRequest,
  ): GenerationResponse {
    const data = json as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
      id?: string;
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    const finishReason = data.choices?.[0]?.finish_reason ?? null;
    const usage: TokenUsage = {
      inputTokens: data.usage?.prompt_tokens ?? null,
      outputTokens: data.usage?.completion_tokens ?? null,
      cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens ?? null,
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
      providerRequestId: data.id ?? null,
      modelUsed: data.model ?? null,
      warnings: [],
      error: null,
      estimatedCost: cost,
    };
  }

  protected errorResponse(
    error: NormalizedError,
    latencyMs: number,
    _requestedModel: string | null,
  ): GenerationResponse {
    return {
      ok: false,
      text: "",
      finishReason: null,
      usage: {
        inputTokens: null,
        outputTokens: null,
        cachedTokens: null,
        source: "unknown",
      },
      latencyMs,
      ttftMs: null,
      providerRequestId: null,
      modelUsed: null,
      warnings: [],
      error,
      estimatedCost: null,
    };
  }

  capabilities() {
    return {
      streaming: this.config.supportsStreaming,
      tools: this.config.supportsTools,
      structuredOutput: this.config.supportsStructuredOutput,
      vision: this.config.supportsVision,
    };
  }

  normalizeError(
    status: number | null,
    bodyText: string | null,
  ): NormalizedError {
    return normalizeError(status, bodyText);
  }

  estimateCost(modelId: string, usage: TokenUsage) {
    return calculateCost(this.id, modelId, usage);
  }

  parseRateLimits(headers: Headers): RateLimitSnapshot | null {
    const prefixes = this.config.rateLimitPrefixes ?? ["requests", "tokens"];
    for (const prefix of prefixes) {
      const remaining = headers.get(`x-ratelimit-remaining-${prefix}`);
      const reset = headers.get(`x-ratelimit-reset-${prefix}`);
      if (remaining !== null || reset !== null) {
        return {
          remainingRequests:
            remaining !== null ? parseInt(remaining, 10) : null,
          remainingTokens: null,
          resetAt: reset,
          source: "header" as const,
        };
      }
    }
    // Generic headers
    const remaining =
      headers.get("x-ratelimit-remaining") ??
      headers.get("ratelimit-remaining");
    const reset =
      headers.get("x-ratelimit-reset") ?? headers.get("ratelimit-reset");
    if (remaining !== null || reset !== null) {
      return {
        remainingRequests: remaining !== null ? parseInt(remaining, 10) : null,
        remainingTokens: null,
        resetAt: reset,
        source: "header" as const,
      };
    }
    return null;
  }
}
