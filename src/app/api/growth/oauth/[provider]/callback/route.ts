import { NextResponse, type NextRequest } from 'next/server';
import { guardGrowth } from '@/lib/growth/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { completeDurableOAuth } from '@/lib/growth/connectors/durable-oauth';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (provider !== 'meta' && provider !== 'google') return NextResponse.json({ reason: 'Unknown OAuth provider.' }, { status: 404 });
  if (!rateLimit(`growth-oauth-callback:${clientAddress(request.headers)}`, { max: 20 }).allowed) return NextResponse.json({ reason: 'Retry later.' }, { status: 429 });
  const guard = await guardGrowth();
  if (!guard.ok) return NextResponse.json({ reason: guard.failure.code }, { status: guard.failure.status, headers: { 'cache-control': 'no-store' } });
  let outcome = 'failed';
  try {
    const result = await completeDurableOAuth({ client: createAdminClient(), userId: guard.principal.userId, provider,
      state: request.nextUrl.searchParams.get('state') ?? '', binding: request.cookies.get(`knoux-growth-oauth-${provider}`)?.value ?? '',
      code: request.nextUrl.searchParams.get('error') ? '' : request.nextUrl.searchParams.get('code') ?? '', env: process.env });
    if (result.ok) outcome = result.verified ? 'verified' : 'verification-required';
  } catch { /* Storage refusal remains a failure; no raw provider error is reflected. */ }
  const response = NextResponse.redirect(new URL(`/command/connections?oauth=${outcome}`, request.url));
  response.headers.set('cache-control', 'no-store');
  response.cookies.set(`knoux-growth-oauth-${provider}`, '', { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax', path: `/api/growth/oauth/${provider}/callback`, maxAge: 0 });
  return response;
}
