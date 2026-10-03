import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { allProviderHealth } from '@/lib/ai/registry';
import { routeV2, buildRouterInput } from '@/lib/ai/router-v2';
import type { RouterInput } from '@/lib/ai/types';

export const dynamic = 'force-dynamic';

/** POST /api/build/ai/router — router v2 decision with scoring and fallback chain. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-router' });
  if (denied) return denied;

  let body: Partial<RouterInput> & { prompt?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Expected router input.' }, { status: 400 }); }

  const prompt = body.prompt ?? '';
  const input: RouterInput = {
    taskClass: body.taskClass ?? 'general',
    contextRequirement: body.contextRequirement ?? 0,
    visionRequired: body.visionRequired ?? false,
    toolsRequired: body.toolsRequired ?? false,
    structuredOutputRequired: body.structuredOutputRequired ?? false,
    mode: body.mode ?? 'auto',
    manualSelection: body.manualSelection,
    noFallback: body.noFallback ?? false,
  };

  // If prompt is provided, estimate context requirement
  if (prompt && input.contextRequirement === 0) {
    const built = buildRouterInput(input.taskClass, input.mode, prompt, {
      visionRequired: input.visionRequired,
      toolsRequired: input.toolsRequired,
      structuredOutputRequired: input.structuredOutputRequired,
      manualSelection: input.manualSelection,
      noFallback: input.noFallback,
    });
    input.contextRequirement = built.contextRequirement;
  }

  const healthMap = new Map(allProviderHealth(process.env).map((h) => [h.providerId, h]));
  const decision = routeV2(input, healthMap);

  return NextResponse.json(decision, { headers: { 'cache-control': 'no-store' } });
}
