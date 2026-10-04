import { NextResponse, type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { getAdapter } from "@/lib/ai/registry";
import { generateWithFallback } from "@/lib/ai/fallback";
import { createNormalizedError } from "@/lib/ai/errors";
import type { GenerationRequest } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

/** POST /api/build/ai/generate — real text generation with optional fallback. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: "ai-generate" });
  if (denied) return denied;

  let body: GenerationRequest & {
    fallbackChain?: { providerId: string; modelId: string }[];
    noFallback?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Expected generation request." },
      { status: 400 },
    );
  }

  if (!body.providerId || !body.modelId || !body.messages?.length) {
    return NextResponse.json(
      { message: "providerId, modelId, and messages are required." },
      { status: 400 },
    );
  }

  const adapter = getAdapter(body.providerId);
  if (!adapter)
    return NextResponse.json(
      { message: `Unknown provider: ${body.providerId}` },
      { status: 404 },
    );

  if (!adapter.isConfigured(process.env)) {
    // A complete NormalizedError, not a two-field projection: clients render
    // `safeMessage`, but the rest of the contract is part of the response.
    const error = createNormalizedError(
      "AUTHENTICATION",
      `Provider ${body.providerId} is not configured. Set ${adapter.requiredEnv.join(" and ")} on the server.`,
    );
    return NextResponse.json(
      {
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
        modelUsed: body.modelId,
        warnings: [],
        estimatedCost: null,
        error,
      },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  const result = await generateWithFallback(
    body,
    process.env,
    body.fallbackChain ?? [],
    body.noFallback ?? false,
  );

  return NextResponse.json(
    {
      ...result.response,
      fallbackUsed: result.fallbackUsed,
      fallbackFrom: result.fallbackFrom,
      fallbackCount: result.fallbackCount,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
