import { NextResponse, type NextRequest } from 'next/server';
import { guardGrowth } from '@/lib/growth/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { publicRequestOrigin, checkRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
import { beginDurableOAuth, CAPABILITY_PROVIDER } from '@/lib/growth/connectors/durable-oauth';
import type { OAuthCapability } from '@/lib/growth/connectors/oauth';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (provider !== 'meta' && provider !== 'google') return NextResponse.json({ reason: 'Unknown OAuth provider.' }, { status: 404 });
  if (!checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok) return NextResponse.json({ reason: 'Cross-site request refused.' }, { status: 403 });
  if (!rateLimit(`growth-oauth-start:${clientAddress(request.headers)}`, { max: 10 }).allowed) return NextResponse.json({ reason: 'Retry later.' }, { status: 429 });
  const body = await readBoundedJson(request, 4096);
  if (!body.ok || !body.value || typeof body.value !== 'object') return NextResponse.json({ reason: 'Invalid request.' }, { status: 400 });
  const input = body.value as { clientId?: unknown; capability?: unknown };
  const clientId = typeof input.clientId === 'string' ? input.clientId : '';
  const capability = typeof input.capability === 'string' ? input.capability as OAuthCapability : undefined;
  if (!clientId || !capability || CAPABILITY_PROVIDER[capability] !== provider) return NextResponse.json({ reason: 'Choose a client and supported capability.' }, { status: 400 });
  const guard = await guardGrowth({ permission: 'connection.manage', clientId, touchesCredentials: true });
  if (!guard.ok) return NextResponse.json({ reason: guard.failure.code }, { status: guard.failure.status, headers: { 'cache-control': 'no-store' } });
  try {
    const result = await beginDurableOAuth({ client: createAdminClient(), owner: { clientId, userId: guard.principal.userId }, provider, capability, env: process.env, callbackOrigin: publicRequestOrigin(request) });
    if (!result.ok) return NextResponse.json({ reason: result.reason }, { status: 503, headers: { 'cache-control': 'no-store' } });
    const response = NextResponse.json({ url: result.url }, { headers: { 'cache-control': 'no-store' } });
    response.cookies.set(`knoux-growth-oauth-${provider}`, result.binding, { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax', path: `/api/growth/oauth/${provider}/callback`, maxAge: 600 });
    return response;
  } catch {
    return NextResponse.json({ reason: 'Durable OAuth storage is unavailable. No connection was started.' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
