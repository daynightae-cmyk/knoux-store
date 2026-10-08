import { type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { getAdapter, updateHealth } from "@/lib/ai/registry";
import { recordUsage } from "@/lib/ai/usage";
import type { GenerationRequest, StreamChunk } from "@/lib/ai/types";
import { checkRequestOrigin } from '@/lib/contact/intake-guard';

export const dynamic = "force-dynamic";

/** POST /api/build/ai/stream — real server-side streaming via SSE. */
export async function POST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, new URL(request.url).origin).ok) return new Response('Cross-site generation request refused.', { status: 403 });
  const denied = await guardBuildApi(request, { scope: "ai-stream" });
  if (denied) return denied;

  let body: GenerationRequest;
  try {
    body = await request.json();
  } catch {
    return new Response("Expected generation request.", { status: 400 });
  }

  if (!body.providerId || !body.modelId || !body.messages?.length) {
    return new Response("providerId, modelId, and messages are required.", {
      status: 400,
    });
  }

  const adapter = getAdapter(body.providerId);
  if (!adapter)
    return new Response(`Unknown provider: ${body.providerId}`, {
      status: 404,
    });

  if (!adapter.isConfigured(process.env)) {
    return new Response(`Provider ${body.providerId} is not configured.`, {
      status: 403,
    });
  }

  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort());

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const start = Date.now();
      let lastChunk: StreamChunk | null = null;
      let characters = 0;

      try {
        for await (const chunk of adapter.stream(
          body,
          process.env,
          abortController.signal,
        )) {
          lastChunk = chunk;
          characters += chunk.delta.length;
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          if (chunk.done) break;
        }

        // Record usage
        recordUsage({
          providerId: body.providerId,
          modelId: body.modelId,
          operation: "stream",
          taskClass: null,
          inputTokens: lastChunk?.usage?.inputTokens ?? null,
          outputTokens: lastChunk?.usage?.outputTokens ?? null,
          cachedTokens: lastChunk?.usage?.cachedTokens ?? null,
          latencyMs: lastChunk?.latencyMs ?? Date.now() - start,
          ttftMs: lastChunk?.ttftMs ?? null,
          estimatedCost: adapter.estimateCost(
            body.modelId,
            lastChunk?.usage ?? {
              inputTokens: null,
              outputTokens: null,
              cachedTokens: null,
              source: "unknown",
            },
          ),
          success: lastChunk?.done === true && !lastChunk.error && characters > 0 && !abortController.signal.aborted,
          errorCategory: lastChunk?.error?.category ?? null,
          fallbackCount: 0,
        });

        if (lastChunk?.done && !lastChunk.error && characters > 0 && !abortController.signal.aborted) {
          updateHealth(body.providerId, {
            generation: 'GENERATION_VERIFIED',
            streaming: "STREAMING_VERIFIED",
            lastError: null,
            latencyMs: lastChunk?.latencyMs ?? null,
          });
        } else {
          updateHealth(body.providerId, { streaming: 'FAILED', generation: lastChunk?.error?.httpStatus === 402 ? 'BLOCKED' : lastChunk?.error?.category === 'RATE_LIMIT' ? 'RATE_LIMITED' : 'FAILED', lastError: lastChunk?.error ?? null });
        }
      } catch {
        const errorChunk: StreamChunk = {
          delta: "",
          done: true,
          finishReason: null,
          usage: null,
          error: {
            category: "NETWORK",
            message: "Stream interrupted.",
            safeMessage: "Stream interrupted.",
            httpStatus: null,
            providerErrorId: null,
            retryable: false,
          },
          latencyMs: Date.now() - start,
          ttftMs: null,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
        );
        updateHealth(body.providerId, { streaming: 'FAILED', lastError: errorChunk.error });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
