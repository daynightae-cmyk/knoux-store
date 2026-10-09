import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { providerEnvironment } from '@/lib/ai/provider-os/runtime-context';
import { NextResponse, type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { getAdapter, updateHealth } from "@/lib/ai/registry";

export const dynamic = "force-dynamic";

/** POST /api/build/ai/providers/probe — explicit auth probe for one provider. */
async function handlePOST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: "ai-probe" });
  if (denied) return denied;

  let body: { provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Expected provider id." },
      { status: 400 },
    );
  }

  const providerId = body.provider;
  if (!providerId)
    return NextResponse.json(
      { message: "Expected provider id." },
      { status: 400 },
    );

  const adapter = getAdapter(providerId);
  if (!adapter)
    return NextResponse.json(
      { message: `Unknown provider: ${providerId}` },
      { status: 404 },
    );

  if (!adapter.isConfigured(providerEnvironment())) {
    return NextResponse.json({
      providerId,
      authenticated: false,
      detail: `Provider not configured. Set ${adapter.requiredEnv.join(" and ")} on the server.`,
      latencyMs: 0,
    });
  }

  const result = await adapter.probe(providerEnvironment());

  // Update health record
  updateHealth(providerId, {
    auth: result.authenticated ? "AUTHENTICATED" : "FAILED",
    lastError: result.error,
    latencyMs: result.latencyMs,
  });

  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: NextRequest) { return providerRequest(request, 'ai-probe', handlePOST); }
