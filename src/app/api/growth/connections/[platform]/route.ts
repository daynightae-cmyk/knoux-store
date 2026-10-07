import { NextResponse, type NextRequest } from 'next/server';
import { checkRequestOrigin } from '@/lib/contact/intake-guard';
import { guardGrowth } from '@/lib/growth/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLATFORM_IDS, type PlatformId } from '@/lib/growth/types';

export const dynamic = 'force-dynamic';
export async function DELETE(request: NextRequest, context: { params: Promise<{ platform: string }> }) {
  if (!checkRequestOrigin(request.headers, new URL(request.url).origin).ok) return NextResponse.json({ reason: 'Cross-site request refused.' }, { status: 403 });
  const { platform } = await context.params;
  const clientId = request.nextUrl.searchParams.get('clientId') ?? '';
  if (!clientId || !PLATFORM_IDS.includes(platform as PlatformId)) return NextResponse.json({ reason: 'Choose a client and platform.' }, { status: 400 });
  const guard = await guardGrowth({ permission: 'connection.manage', clientId, platform: platform as PlatformId, touchesCredentials: true });
  if (!guard.ok) return NextResponse.json({ reason: guard.failure.code }, { status: guard.failure.status });
  try {
    const { data, error } = await createAdminClient().rpc('knoux_growth_connection_remove', { p_client: clientId, p_user: guard.principal.userId, p_platform: platform });
    if (error) return NextResponse.json({ reason: 'Connection removal was refused.' }, { status: 503 });
    return NextResponse.json({ removed: data === true }, { status: data === true ? 200 : 404, headers: { 'cache-control': 'no-store' } });
  } catch { return NextResponse.json({ reason: 'Connection storage is unavailable.' }, { status: 503 }); }
}
