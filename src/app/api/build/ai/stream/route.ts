import { type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { getAdapter, updateHealth } from "@/lib/ai/registry";
import { recordUsage } from "@/lib/ai/usage";
import type { GenerationRequest, StreamChunk } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

/** POST /api/build/ai/stream — real server-side streaming via SSE. */
export async function POST(request: NextRequest) {
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

      try {
        for await (const chunk of adapter.stream(
          body,
          process.env,
          abortController.signal,
        )) {
          lastChunk = chunk;
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
          success: !lastChunk?.error,
          errorCategory: lastChunk?.error?.category ?? null,
          fallbackCount: 0,
        });

        if (!lastChunk?.error) {
          updateHealth(body.providerId, {
            streaming: "STREAMING_VERIFIED",
            lastError: null,
            latencyMs: lastChunk?.latencyMs ?? null,
          });
        }
      } catch (cause) {
        const errorChunk: StreamChunk = {
          delta: "",
          done: true,
          finishReason: null,
          usage: null,
          error: {
            category: "NETWORK",
            message: cause instanceof Error ? cause.message : "Stream error",
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
