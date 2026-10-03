import "server-only";
import { abortedError, networkError, normalizeError } from "../errors";
import { calculateCost } from "../cost";
import { OpenAICompatibleAdapter } from "./base";
import type {
  GenerationRequest,
  GenerationResponse,
  StreamChunk,
  TokenUsage,
  NormalizedError,
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

  override async probe(
    env: Record<string, string | undefined>,
  ): Promise<ProbeResult> {
    const start = Date.now();
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
    try {
      const response = await fetch(`${this.config.baseUrl}/models?pageSize=1`, {
        headers: this.buildHeaders(apiKey),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      const latencyMs = Date.now() - start;
      if (response.ok)
        return {
          providerId: this.id,
          authenticated: true,
          detail: "Authenticated; models endpoint answered.",
          error: null,
          latencyMs,
        };
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
        error: {
          category: "NETWORK",
          message,
          safeMessage: message.slice(0, 200),
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
        latencyMs,
      };
    }
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
        .filter((m) => m.name?.startsWith("models/"))
        .filter((m) => {
          const methods = m.supportedGenerationMethods ?? [];
          return (
            methods.includes("generateContent") ||
            methods.includes("streamGenerateContent")
          );
        })
        .map((entry): NormalizedModel => {
          const modelId = entry.name.replace("models/", "");
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
            m.capabilities.streaming !== "UNSUPPORTED" ||
            m.capabilities.tools !== "UNSUPPORTED",
        );
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

    const body = this.buildGeminiRequestBody(request);
    try {
      const response = await fetch(
        `${this.config.baseUrl}/models/${request.modelId}:generateContent`,
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
      yield {
        delta: "",
        done: true,
        finishReason: null,
        usage: null,
        error: {
          category: "AUTHENTICATION",
          message: "Missing credential",
          safeMessage: "No API key configured.",
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
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
      const response = await fetch(
        `${this.config.baseUrl}/models/${request.modelId}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: this.buildHeaders(apiKey),
          body: JSON.stringify(body),
          redirect: "error",
          signal: signal ?? AbortSignal.timeout(120000),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const bodyText = await response.text().catch(() => null);
        yield {
          delta: "",
          done: true,
          finishReason: null,
          usage: null,
          error: normalizeError(response.status, bodyText),
          latencyMs: Date.now() - start,
          ttftMs: null,
        };
        return;
      }

      if (!response.body) {
        yield {
          delta: "",
          done: true,
          finishReason: null,
          usage: null,
          error: {
            category: "NETWORK",
            message: "No body",
            safeMessage: "No response body.",
            httpStatus: null,
            providerErrorId: null,
            retryable: false,
          },
          latencyMs: Date.now() - start,
          ttftMs: null,
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const chunk = JSON.parse(trimmed.slice(6));
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
      }

      yield {
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
        ttftMs: firstTokenTime,
      };
    } catch (cause) {
      const error: NormalizedError =
        cause instanceof DOMException && cause.name === "AbortError"
          ? abortedError()
          : networkError(
              cause instanceof Error ? cause.message : "Network error",
            );
      yield {
        delta: "",
        done: true,
        finishReason,
        usage,
        error,
        latencyMs: Date.now() - start,
        ttftMs: firstTokenTime,
      };
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
