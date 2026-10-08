import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { isBuildOperator } from '@/lib/build/operator';
import { checkRequestOrigin } from '@/lib/contact/intake-guard';
import { wordpressExecutorConfig, runWordPressOperation } from '@/lib/wordpress/executor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authorized(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'wordpress-operations' });
  if (denied) return { denied, ownerId: null };
  const ownerId = await resolveBuildOwnerId();
  if (!isBuildOperator(ownerId)) return { denied: NextResponse.json({ state: 'AUTH_REQUIRED', message: 'A signed-in allowlisted Build operator is required.' }, { status: 403 }), ownerId: null };
  return { denied: null, ownerId };
}

export async function GET(request: NextRequest) {
  const guard = await authorized(request); if (guard.denied) return guard.denied;
  const config = wordpressExecutorConfig(process.env);
  return NextResponse.json({ state: config.state, siteIds: config.siteIds, source: 'Server configuration · executor not yet probed', message: config.configured ? 'Select a site and probe it to measure readiness.' : 'Trusted executor configuration is required.' }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!checkRequestOrigin(request.headers, new URL(request.url).origin).ok) return NextResponse.json({ state: 'BLOCKED', message: 'Cross-site operation refused.' }, { status: 403 });
  const guard = await authorized(request); if (guard.denied) return guard.denied;
  if (!guard.ownerId) return NextResponse.json({ state: 'AUTH_REQUIRED' }, { status: 403 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ state: 'BLOCKED', message: 'Expected a structured operation.' }, { status: 400 }); }
  try { const result = await runWordPressOperation(body, guard.ownerId, process.env); return NextResponse.json(result, { status: ['NOT_CONFIGURED', 'EXECUTOR_NOT_CONNECTED'].includes(result.state) ? 409 : 200, headers: { 'cache-control': 'no-store' } }); }
  catch { return NextResponse.json({ state: 'BLOCKED', message: 'Select a configured site, allowlisted operation, valid slug or reference, and confirm the exact mutation.' }, { status: 400 }); }
}
