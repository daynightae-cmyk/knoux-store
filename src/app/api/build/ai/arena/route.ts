import { NextResponse, type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { getAdapter, updateHealth } from "@/lib/ai/registry";
import { recordUsage } from "@/lib/ai/usage";
import type { ArenaRequest, GenerationRequest } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

/** POST /api/build/ai/arena — run one prompt against 2-4 selected models in parallel. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: "ai-arena" });
  if (denied) return denied;

  let body: ArenaRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Expected arena request." },
      { status: 400 },
    );
  }

  if (
    !body.selections?.length ||
    body.selections.length < 2 ||
    body.selections.length > 4
  ) {
    return NextResponse.json(
      { message: "Arena requires 2-4 model selections." },
      { status: 400 },
    );
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      { message: "Prompt is required." },
      { status: 400 },
    );
  }

  // Run all generations in parallel
  const results = await Promise.allSettled(
    body.selections.map(async (selection) => {
      const adapter = getAdapter(selection.providerId);
      if (!adapter)
        throw new Error(`Unknown provider: ${selection.providerId}`);
      if (!adapter.isConfigured(process.env))
        throw new Error(`Provider ${selection.providerId} is not configured.`);

      const genRequest: GenerationRequest = {
        providerId: selection.providerId,
        modelId: selection.modelId,
        messages: [{ role: "user", content: body.prompt }],
        system: body.system,
        controls: body.controls,
      };

      const startedAt = new Date().toISOString();
      const response = await adapter.generate(genRequest, process.env);
      const completedAt = new Date().toISOString();

      recordUsage({
        providerId: selection.providerId,
        modelId: selection.modelId,
        operation: "arena",
        taskClass: null,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cachedTokens: response.usage.cachedTokens,
        latencyMs: response.latencyMs,
        ttftMs: response.ttftMs,
        estimatedCost: response.estimatedCost,
        success: response.ok,
        errorCategory: response.error?.category ?? null,
        fallbackCount: 0,
      });

      if (response.ok) {
        updateHealth(selection.providerId, {
          generation: "GENERATION_VERIFIED",
          lastError: null,
          latencyMs: response.latencyMs,
        });
      }

      return {
        providerId: selection.providerId,
        modelId: selection.modelId,
        displayName: adapter.displayName,
        response,
        startedAt,
        completedAt,
      };
    }),
  );

  const arenaResults = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const selection = body.selections[index];
    return {
      providerId: selection.providerId,
      modelId: selection.modelId,
      displayName:
        getAdapter(selection.providerId)?.displayName ?? selection.providerId,
      response: {
        ok: false,
        text: "",
        finishReason: null,
        usage: {
          inputTokens: null,
          outputTokens: null,
          cachedTokens: null,
          source: "unknown" as const,
        },
        latencyMs: 0,
        ttftMs: null,
        providerRequestId: null,
        modelUsed: null,
        warnings: [],
        error: {
          category: "UNKNOWN" as const,
          message: "Arena generation failed.",
          safeMessage: "Generation failed in arena.",
          httpStatus: null,
          providerErrorId: null,
          retryable: false,
        },
        estimatedCost: null,
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  });

  return NextResponse.json(
    { results: arenaResults },
    { headers: { "cache-control": "no-store" } },
  );
}
