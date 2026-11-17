import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { providerModelAllowed, providerEnvironment, providerRuntimeContext } from '@/lib/ai/provider-os/runtime-context';
import { type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { getAdapter, getDiscoveryCache, updateHealth } from "@/lib/ai/registry";
import { isGenerationProfile, profileToControls } from '@/lib/build/profile';
import { estimateTokens } from '@/lib/ai/contract';
import { reserveUsage, completeUsage } from "@/lib/ai/usage";
import type { GenerationRequest, StreamChunk } from "@/lib/ai/types";
import { publicRequestOrigin, checkRequestOrigin } from '@/lib/contact/intake-guard';

export const dynamic = "force-dynamic";

/** POST /api/build/ai/stream — real server-side streaming via SSE. */
async function handlePOST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) return new Response('Cross-site generation request refused.', { status: 403 });
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

  const attemptId = await reserveUsage(body.providerId, body.modelId);
  const runId = providerRuntimeContext()?.runId ?? attemptId;
  const abortController = new AbortController();
  const abort = () => abortController.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  let cancelled = false;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const start = Date.now();
      let lastChunk: StreamChunk | null = null;
      let characters = 0;
      let failed = false;

      try {
        for await (const chunk of adapter.stream(
          body,
          providerEnvironment(),
          abortController.signal,
        )) {
          lastChunk = chunk;
          characters += chunk.delta.length;
          const data = JSON.stringify({ ...chunk, runId, actualProviderId: adapter.id, actualModelId: chunk.modelUsed ?? null, ...(chunk.done ? { controlsUsed: body.controls ?? null, estimatedCost: adapter.estimateCost(body.modelId, chunk.usage ?? { inputTokens: null, outputTokens: null, cachedTokens: null, source: 'unknown' }) } : {}) });
          if (!cancelled) controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          if (chunk.done) break;
        }

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
        failed = true;
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
        if (!cancelled) controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
        );
        updateHealth(body.providerId, { streaming: 'FAILED', lastError: errorChunk.error });
      } finally {
        request.signal.removeEventListener('abort', abort);
        try {
          await completeUsage(attemptId, {
            providerId: body.providerId, modelId: body.modelId,
            actualModelId: lastChunk?.modelUsed ?? null, usageSource: lastChunk?.usage?.source ?? 'unknown',
            requestedControls: body.controls ?? null, controlsUsed: body.controls ?? null,
            operation: 'stream', taskClass: null,
            inputTokens: lastChunk?.usage?.inputTokens ?? null, outputTokens: lastChunk?.usage?.outputTokens ?? null,
            cachedTokens: lastChunk?.usage?.cachedTokens ?? null, latencyMs: Date.now() - start, ttftMs: lastChunk?.ttftMs ?? null,
            estimatedCost: adapter.estimateCost(body.modelId, lastChunk?.usage ?? { inputTokens: null, outputTokens: null, cachedTokens: null, source: 'unknown' }),
            success: !failed && lastChunk?.done === true && !lastChunk.error && characters > 0 && !abortController.signal.aborted,
            errorCategory: abortController.signal.aborted ? 'ABORTED' : lastChunk?.error?.category ?? (failed || !lastChunk?.done ? 'NETWORK' : null),
            fallbackCount: 0,
          });
        } catch {
          if (!cancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, delta: '', runId, error: { safeMessage: 'Usage completion could not be saved. The reservation remains counted.' } })}\n\n`));
        }
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; abort(); },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) { return providerRequest(request, 'ai-stream', handlePOST); }
