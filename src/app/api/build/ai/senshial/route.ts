import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi } from '@/lib/build/api-guard';
import { runSenshial } from '@/lib/ai/senshial';
import type { SenshialRequest } from '@/lib/ai/types';

export const dynamic = 'force-dynamic';

/** POST /api/build/ai/senshial — real ASK/PLAN inference. EXECUTE is blocked. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'ai-senshial' });
  if (denied) return denied;

  let body: SenshialRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Expected Senshial request.' }, { status: 400 }); }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ message: 'Prompt is required.' }, { status: 400 });
  }

  if (body.mode !== 'ask' && body.mode !== 'plan' && body.mode !== 'execute') {
    return NextResponse.json({ message: 'Mode must be ask, plan, or execute.' }, { status: 400 });
  }

  const response = await runSenshial(body, process.env);

  const status = response.blocked ? 403 : response.ok ? 200 : 502;
  return NextResponse.json(response, { status, headers: { 'cache-control': 'no-store' } });
}
