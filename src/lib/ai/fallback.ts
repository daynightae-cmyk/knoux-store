import "server-only";
import type { GenerationResponse } from './types';
import { getAdapter, updateHealth } from "./registry";
import { recordUsage } from "./usage";
import type { GenerationRequest } from "./types";

/**
 * Fallback engine. Executes a primary generation, and on retryable errors
 * falls through a configured fallback chain.
 *
 * Fallback does NOT happen for:
 * - invalid user input (INVALID_REQUEST)
 * - policy rejection
 * - authentication failure (AUTHENTICATION) — requires operator attention
 * - explicit no-fallback mode
 *
 * Every fallback event is recorded in the usage ledger.
 */

export type FallbackResult = {
  actualProviderId: string | null;
  actualModelId: string | null;
  response: GenerationResponse;
  fallbackUsed: boolean;
  fallbackFrom: { providerId: string; modelId: string } | null;
  fallbackChain: { providerId: string; modelId: string }[];
  fallbackCount: number;
};

const NON_FALLBACKABLE_ERRORS = new Set([
  "INVALID_REQUEST",
  "AUTHENTICATION",
  "UNSUPPORTED_CAPABILITY",
  "CONTEXT_OVERFLOW",
  "ABORTED",
]);

export async function generateWithFallback(
  request: GenerationRequest,
  env: Record<string, string | undefined>,
  fallbackChain: { providerId: string; modelId: string }[] = [],
  noFallback = false,
): Promise<FallbackResult> {
  const chain = [
    { providerId: request.providerId, modelId: request.modelId },
    ...(noFallback ? [] : fallbackChain),
  ];

  let fallbackCount = 0;
  let fallbackFrom: { providerId: string; modelId: string } | null = null;
  let lastResponse: GenerationResponse | null = null;
  let actualProviderId: string | null = null;
  let actualModelId: string | null = null;
  let attempts = 0;

  for (let i = 0; i < chain.length; i++) {
    const { providerId, modelId } = chain[i];
    const adapter = getAdapter(providerId);
    if (!adapter) {
      continue;
    }

    const actualRequest: GenerationRequest = {
      ...request,
      providerId,
      modelId,
    };
    fallbackCount = attempts++;
    const response = await adapter.generate(actualRequest, env);
    lastResponse = response;
    actualProviderId = providerId;
    actualModelId = response.modelUsed ?? modelId;

    // Record usage
    recordUsage({
      providerId,
      modelId,
      operation: "generate",
      taskClass: null,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cachedTokens: response.usage.cachedTokens,
      latencyMs: response.latencyMs,
      ttftMs: response.ttftMs,
      estimatedCost: response.estimatedCost,
      success: response.ok,
      errorCategory: response.error?.category ?? null,
      fallbackCount,
    });

    if (response.ok) {
      // Update health: generation verified
      updateHealth(providerId, {
        generation: "GENERATION_VERIFIED",
        lastError: null,
        latencyMs: response.latencyMs,
      });

      return {
        actualProviderId, actualModelId,
        response,
        fallbackUsed: i > 0,
        fallbackFrom,
        fallbackChain: chain.slice(0, i),
        fallbackCount,
      };
    }

    // Check if the error is fallbackable
    const errorCategory = response.error?.category;
    if (errorCategory && NON_FALLBACKABLE_ERRORS.has(errorCategory)) {
      // Update health: failed
      updateHealth(providerId, {
        generation: response.error?.httpStatus === 402 ? "BLOCKED" : "FAILED",
        lastError: response.error,
      });

      // For RATE_LIMITED, mark as rate-limited but still try fallback
      return {
        actualProviderId, actualModelId,
        response,
        fallbackUsed: i > 0,
        fallbackFrom,
        fallbackChain: chain.slice(0, i),
        fallbackCount,
      };
    }

    // Rate-limited is fallbackable
    if (errorCategory === "RATE_LIMIT") {
      updateHealth(providerId, {
        generation: "RATE_LIMITED",
        lastError: response.error,
      });
    } else {
      updateHealth(providerId, {
        generation: response.error?.httpStatus === 402 ? "BLOCKED" : "FAILED",
        lastError: response.error,
      });
    }

    // Record fallback event
    fallbackFrom = { providerId, modelId };
  }

  // Return the last measured failure; never repeat a charged request to build an error result.
  return {
    actualProviderId, actualModelId,
    response: lastResponse ?? {
      ok: false,
      text: "",
      finishReason: null,
      usage: {
        inputTokens: null,
        outputTokens: null,
        cachedTokens: null,
        source: "unknown",
      },
      latencyMs: 0,
      ttftMs: null,
      providerRequestId: null,
      modelUsed: null,
      warnings: ["All providers in the fallback chain failed."],
      error: {
        category: "UNKNOWN",
        message: "All providers failed",
        safeMessage: "All providers in the chain failed.",
        httpStatus: null,
        providerErrorId: null,
        retryable: false,
      },
      estimatedCost: null,
    },
    fallbackUsed: fallbackCount > 0,
    fallbackFrom,
    fallbackChain: chain.slice(0, -1),
    fallbackCount,
  };
}
