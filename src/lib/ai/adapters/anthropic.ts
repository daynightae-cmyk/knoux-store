import "server-only";
import { abortedError, networkError } from "../errors";
import { calculateCost } from "../cost";
import { OpenAICompatibleAdapter } from "./base";
import type {
  GenerationRequest,
  GenerationResponse,
  StreamChunk,
  TokenUsage,
  NormalizedModel,
  RateLimitSnapshot,
} from "../types";

/**
 * Anthropic adapter. Uses the Messages API.
 *
 * API: https://api.anthropic.com/v1/messages
 * Auth: x-api-key header + anthropic-version header
 * Supports: text generation, streaming, tools, vision, structured output (via tool).
 * Model discovery: GET /v1/models (requires API key).
 */

const ANTHROPIC_MODELS: {
  id: string;
  label: string;
  context: number;
  maxOutput: number;
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
}[] = [
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    context: 200_000,
    maxOutput: 16_384,
    tools: true,
    vision: true,
    reasoning: true,
  },
  {
    id: "claude-opus-4-20250514",
    label: "Claude Opus 4",
    context: 200_000,
    maxOutput: 16_384,
    tools: true,
    vision: true,
    reasoning: true,
  },
  {
    id: "claude-3.5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    context: 200_000,
    maxOutput: 8_192,
    tools: true,
    vision: true,
    reasoning: true,
  },
  {
    id: "claude-3.5-haiku-20241022",
    label: "Claude 3.5 Haiku",
    context: 200_000,
    maxOutput: 8_192,
    tools: true,
    vision: true,
    reasoning: false,
  },
  {
    id: "claude-3-opus-20240229",
    label: "Claude 3 Opus",
    context: 200_000,
    maxOutput: 4_096,
    tools: true,
    vision: true,
    reasoning: true,
  },
  {
    id: "claude-3-sonnet-20240229",
    label: "Claude 3 Sonnet",
    context: 200_000,
    maxOutput: 4_096,
    tools: true,
    vision: true,
    reasoning: false,
  },
  {
    id: "claude-3-haiku-20240307",
    label: "Claude 3 Haiku",
    context: 200_000,
    maxOutput: 4_096,
    tools: true,
    vision: true,
    reasoning: false,
  },
];

export class AnthropicAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super({
      id: "anthropic",
      displayName: "Anthropic",
      transport: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      authHeader: "x-api-key",
      requiredEnv: ["ANTHROPIC_API_KEY"],
      extraHeaders: { "anthropic-version": "2023-06-01" },
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
      rateLimitPrefixes: ["requests", "tokens"],
    });
  }

  protected override get probePath(): string {
    return "/models?limit=1";
  }

  protected override get discoveryPath(): string {
    return "/models?limit=100";
  }

  protected override parseModelList(json: unknown): NormalizedModel[] {
    const list =
      (json as { data?: Array<{ id: string; display_name?: string }> })
        ?.data ?? [];
    return list.map((entry) => {
      const known = ANTHROPIC_MODELS.find((m) => m.id === entry.id);
      return {
        providerId: this.id,
        modelId: entry.id,
        displayName: entry.display_name ?? known?.label ?? entry.id,
        discoveredAt: new Date().toISOString(),
        contextWindow: known?.context ?? 200_000,
        maxOutputTokens: known?.maxOutput ?? null,
        modalities: {
          text: true,
          imageInput: known?.vision ?? true,
          audioInput: false,
          audioOutput: false,
        },
        capabilities: {
          streaming: "SUPPORTED",
          tools: "SUPPORTED",
          structuredOutput: "SUPPORTED",
          reasoning: known?.reasoning ? "SUPPORTED" : "UNKNOWN",
          vision: (known?.vision ?? true) ? "SUPPORTED" : "UNSUPPORTED",
        },
        controls: this.config.controls,
        pricing: {
          inputPerMillion: null,
          outputPerMillion: null,
          cachedInputPerMillion: null,
          currency: "USD",
        },
        lifecycle: "active",
        source: "LIVE" as const,
      };
  });
  }

  protected buildRequestBody(
    request: GenerationRequest,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.modelId,
      max_tokens: request.controls?.maxOutputTokens ?? 4096,
      stream,
    };
    if (request.system) body.system = request.system;
    // Anthropic uses a messages array but system is separate
    body.messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    if (request.controls?.temperature !== undefined)
      body.temperature = request.controls.temperature;
    if (request.controls?.topP !== undefined)
      body.top_p = request.controls.topP;
    if (request.controls?.stop) body.stop_sequences = request.controls.stop;
    if (request.responseSchema) {
      // Anthropic uses tool-based structured output
      body.tools = [
        {
          name: "response",
          description: "Return the response as structured JSON",
          input_schema: request.responseSchema,
        },
      ];
      body.tool_choice = { type: "tool", name: "response" };
    } else if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
      if (request.controls?.toolChoice) {
        if (request.controls.toolChoice === "auto")
          body.tool_choice = { type: "auto" };
        else if (request.controls.toolChoice === "none")
          body.tool_choice = { type: "none" };
        else if (request.controls.toolChoice === "required")
          body.tool_choice = { type: "any" };
        else if (typeof request.controls.toolChoice === "object")
          body.tool_choice = {
            type: "tool",
            name: request.controls.toolChoice.name,
          };
      }
    }
    return body;
  }

  protected parseCompletionResponse(
    json: unknown,
    latencyMs: number,
    request: GenerationRequest,
  ): GenerationResponse {
    const data = json as {
      content?: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
      };
      id?: string;
      model?: string;
    };
    const textPart = data.content?.find((c) => c.type === "text")?.text ?? "";
    const finishReason = data.stop_reason ?? null;
    const usage: TokenUsage = {
      inputTokens: data.usage?.input_tokens ?? null,
      outputTokens: data.usage?.output_tokens ?? null,
      cachedTokens: data.usage?.cache_read_input_tokens ?? null,
      source: "provider",
    };
    const cost = calculateCost(this.id, request.modelId, usage);
    return {
      ok: true,
      text: textPart,
      finishReason,
      usage,
      latencyMs,
      ttftMs: latencyMs,
      providerRequestId: data.id ?? null,
      modelUsed: data.model ?? request.modelId,
      warnings: [],
      error: null,
      estimatedCost: cost,
    };
  }

  async *stream(
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

    const body = this.buildRequestBody(request, true);
    let firstTokenTime: number | null = null;
    let finishReason: string | null = null;
    // `message_start` and `message_delta` each contribute a partial usage
    // record across separate SSE events, so the two are accumulated in
    // dedicated slots rather than being read back off `usage` — the compiler
    // treats a `let` assigned only inside a loop body as its initial value,
    // which collapses the merge target to `never`.
    let usage: TokenUsage | null = null;
    let usageInputTokens: number | null = null;
    let usageCachedTokens: number | null = null;

    try {
      for await (const data of this.readStreamData(
        `${this.config.baseUrl}/messages`, apiKey, body, start, signal
      )) {
        if (typeof data !== "string") {
          yield data;
          return;
        }
        try {
          const event = JSON.parse(data);
          if (event.type === "content_block_delta" && event.delta?.text) {
            if (firstTokenTime === null) firstTokenTime = Date.now() - start;
            yield {
              delta: event.delta.text,
              done: false,
              finishReason: null,
              usage: null,
              error: null,
              latencyMs: null,
              ttftMs: firstTokenTime,
            };
          } else if (event.type === "message_delta") {
            if (event.delta?.stop_reason)
              finishReason = event.delta.stop_reason;
            if (event.usage) {
              // `message_start` establishes input tokens and `message_delta`
              // reports the final output count, so the two have to merge.
              usageInputTokens =
                usageInputTokens ?? event.usage.input_tokens ?? null;
              usage = {
                inputTokens: usageInputTokens,
                outputTokens: event.usage.output_tokens ?? null,
                cachedTokens: usageCachedTokens,
                source: "provider",
              };
            }
          } else if (event.type === "message_start" && event.message?.usage) {
            usageInputTokens = event.message.usage.input_tokens ?? null;
            usageCachedTokens =
              event.message.usage.cache_read_input_tokens ?? null;
            usage = {
              inputTokens: usageInputTokens,
              outputTokens: null,
              cachedTokens: usageCachedTokens,
              source: "provider",
            };
          }
        } catch {
          /* skip malformed */
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

  parseRateLimits(headers: Headers): RateLimitSnapshot | null {
    const remaining = headers.get("anthropic-ratelimit-requests-remaining");
    const remainingTokens = headers.get("anthropic-ratelimit-tokens-remaining");
    const reset = headers.get("anthropic-ratelimit-requests-reset");
    if (remaining !== null || remainingTokens !== null || reset !== null) {
      return {
        remainingRequests: remaining !== null ? parseInt(remaining, 10) : null,
        remainingTokens:
          remainingTokens !== null ? parseInt(remainingTokens, 10) : null,
        resetAt: reset,
        source: "header" as const,
      };
    }
    return null;
  }
}
