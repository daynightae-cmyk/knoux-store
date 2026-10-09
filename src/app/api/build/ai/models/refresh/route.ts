import { providerRequest } from '@/lib/ai/provider-os/request-runtime';
import { providerEnvironment } from '@/lib/ai/provider-os/runtime-context';
import { NextResponse, type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import {
  discoverAllModels,
  discoverProviderModels,
  getAdapters,
  updateHealth,
} from "@/lib/ai/registry";

export const dynamic = "force-dynamic";

/** POST /api/build/ai/models/refresh — trigger live model discovery for one or all providers. */
async function handlePOST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: "ai-discovery" });
  if (denied) return denied;

  let body: { provider?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.provider) {
    const adapter = getAdapters().find((a) => a.id === body.provider);
    if (!adapter)
      return NextResponse.json(
        { message: `Unknown provider: ${body.provider}` },
        { status: 404 },
      );

    const result = await discoverProviderModels(
      body.provider,
      providerEnvironment(),
      true,
    );
    updateHealth(body.provider, {
      discovery: result.source === "LIVE" ? "DISCOVERY_VERIFIED" : "FAILED",
      lastError: result.error,
    });

    return NextResponse.json(
      { providers: [result] },
      { headers: { "cache-control": "no-store" } },
    );
  }

  // Discover all configured providers. `discoverAllModels` walks every
  // adapter, so unconfigured ones are filtered here and their health is not
  // overwritten with a discovery failure they could never have avoided.
  const configured = getAdapters().filter((a) => a.isConfigured(providerEnvironment()));
  const results = await discoverAllModels(providerEnvironment(), true);
  const byId = new Map(results.map((r) => [r.providerId, r]));

  const reported = [];
  for (const adapter of configured) {
    const result = byId.get(adapter.id);
    if (!result) continue;
    updateHealth(adapter.id, {
      discovery: result.source === "LIVE" ? "DISCOVERY_VERIFIED" : "FAILED",
      lastError: result.error,
    });
    reported.push(result);
  }

  return NextResponse.json(
    { providers: reported },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) { return providerRequest(request, 'ai-discovery', handlePOST); }
