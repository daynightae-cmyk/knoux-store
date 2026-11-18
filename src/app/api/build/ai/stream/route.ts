import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { providerModelAllowed, providerEnvironment } from '@/lib/ai/provider-os/runtime-context';
import { type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { getAdapter, getDiscoveryCache, updateHealth } from "@/lib/ai/registry";
import { isGenerationProfile, profileToControls } from '@/lib/build/profile';
import { estimateTokens } from '@/lib/ai/contract';
import { recordUsage } from "@/lib/ai/usage";
import type { GenerationRequest, NormalizedError, StreamChunk } from "@/lib/ai/types";
import { abortedError, networkError } from "@/lib/ai/errors";
import { publicRequestOrigin, checkRequestOrigin } from '@/lib/contact/intake-guard';

export const dynamic = "force-dynamic";

const streamHeaders = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
};

function cancelledResponse() {
  const chunk: StreamChunk = {
    delta: "", done: true, finishReason: null, usage: null,
    error: abortedError(), latencyMs: 0, ttftMs: null, modelUsed: null,
  };
  return new Response(`data: ${JSON.stringify({ ...chunk, actualProviderId: null, actualModelId: null })}\n\n`, { headers: streamHeaders });
}

/** POST /api/build/ai/stream — real server-side streaming via SSE. */
async function handlePOST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) return new Response('Cross-site generation request refused.', { status: 403 });
  const denied = await guardBuildApi(request, { scope: "ai-stream" });
  if (denied) return denied;
  if (request.signal.aborted) return cancelledResponse();

  let body: GenerationRequest;
  try {
    body = await request.json();
  } catch {
    if (request.signal.aborted) return cancelledResponse();
    return new Response("Expected generation request.", { status: 400 });
  }

  if (request.signal.aborted) return cancelledResponse();
  if (!body.providerId || !body.modelId || !body.messages?.length) {
    return new Response("providerId, modelId, and messages are required.", {
      status: 400,
    });
  }

  if (!providerModelAllowed(body.providerId, body.modelId)) return Response.json({ message: 'The active provider profile excludes this model.' }, { status: 403 });
  const adapter = getAdapter(body.providerId);
  if (body.generationProfile !== undefined && !isGenerationProfile(body.generationProfile)) return new Response('Choose a valid generation profile.', { status: 400 });
  if (body.generationProfile) body.controls = profileToControls(body.generationProfile, getDiscoveryCache(body.providerId)?.models.find((model) => model.modelId === body.modelId), estimateTokens((body.system ?? '') + body.messages.map((message) => message.content).join('\n'))).controls;
  if (!adapter)
    return new Response(`Unknown provider: ${body.providerId}`, {
      status: 404,
    });

  if (!adapter.isConfigured(providerEnvironment())) {
    return new Response(`Provider ${body.providerId} is not configured.`, {
      status: 403,
    });
  }

  const abortController = new AbortController();
  const onRequestAbort = () => abortController.abort(request.signal.reason);
  const cleanup = () => request.signal.removeEventListener("abort", onRequestAbort);
  request.signal.addEventListener("abort", onRequestAbort, { once: true });
  // Covers an abort between body parsing and listener registration.
  if (request.signal.aborted) onRequestAbort();

  let cancelled = false;
  let closed = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const start = Date.now();
      let lastChunk: StreamChunk | null = null;
      let characters = 0;
      let error: NormalizedError | null = null;
      const enqueue = (chunk: StreamChunk) => {
        if (cancelled || closed) return;
        const data = JSON.stringify({ ...chunk, actualProviderId: adapter.id, actualModelId: chunk.modelUsed ?? null, ...(chunk.done ? { controlsUsed: body.controls ?? null, estimatedCost: adapter.estimateCost(body.modelId, chunk.usage ?? { inputTokens: null, outputTokens: null, cachedTokens: null, source: 'unknown' }) } : {}) });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        abortController.signal.throwIfAborted();
        for await (const chunk of adapter.stream(body, providerEnvironment(), abortController.signal)) {
          // Preserve measured accounting, but never publish ignored-signal late output.
          lastChunk = chunk;
          abortController.signal.throwIfAborted();
          characters += chunk.delta.length;
          error = chunk.error;
          enqueue(chunk);
          if (chunk.done) break;
        }
        abortController.signal.throwIfAborted();
      } catch (cause) {
        error = abortController.signal.aborted || (cause instanceof Error && cause.name === 'AbortError')
          ? abortedError()
          : networkError('Stream interrupted.');
        enqueue({
          delta: "", done: true, finishReason: null, usage: lastChunk?.usage ?? null,
          error, latencyMs: Date.now() - start, ttftMs: lastChunk?.ttftMs ?? null,
          modelUsed: lastChunk?.modelUsed ?? null,
        });
      } finally {
        cleanup();
        const aborted = abortController.signal.aborted || error?.category === 'ABORTED';
        const success = !aborted && lastChunk?.done === true && !error && characters > 0;
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
          estimatedCost: adapter.estimateCost(body.modelId, lastChunk?.usage ?? {
            inputTokens: null, outputTokens: null, cachedTokens: null, source: "unknown",
          }),
          success,
          errorCategory: aborted ? 'ABORTED' : error?.category ?? null,
          fallbackCount: 0,
        });
        // User/consumer cancellation says nothing about provider health.
        if (!aborted) {
          if (success) {
            updateHealth(body.providerId, {
              generation: 'GENERATION_VERIFIED', streaming: "STREAMING_VERIFIED",
              lastError: null, latencyMs: lastChunk?.latencyMs ?? null,
            });
          } else {
            updateHealth(body.providerId, { streaming: 'FAILED', generation: error?.httpStatus === 402 ? 'BLOCKED' : error?.category === 'RATE_LIMIT' ? 'RATE_LIMITED' : 'FAILED', lastError: error });
          }
        }
        if (!cancelled && !closed) {
          closed = true;
          controller.close();
        }
      }
    },
    cancel(reason) {
      cancelled = true;
      abortController.abort(reason);
      cleanup();
    },
  });

  return new Response(stream, { headers: streamHeaders });
}

export async function POST(request: NextRequest) { return providerRequest(request, 'ai-stream', handlePOST); }
