import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { isBuildOperator } from '@/lib/build/operator';
import { probeOpenAI } from '@/lib/build/provider-probe';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'provider-probe' }); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin || !isBuildOperator(await resolveBuildOwnerId())) return NextResponse.json({ message: 'Connection tests require a same-origin authenticated operator in KNOUX_BUILD_OPERATOR_IDS.' }, { status: 403 });
  let body: { provider?: unknown }; try { body = await request.json(); } catch { return NextResponse.json({ message: 'Expected provider.' }, { status: 400 }); }
  if (body.provider !== 'openai') return NextResponse.json({ message: 'This provider has no installed connection probe adapter.' }, { status: 409 });
  return NextResponse.json(await probeOpenAI(), { headers: { 'cache-control': 'no-store' } });
}
