import { NextResponse } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { createEnrollmentToken } from '@/lib/build/control-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await guardBuildApi(request, { scope: 'bridge-control-enroll' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { token, tokenHash } = createEnrollmentToken();
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  const { data, error } = await admin
    .from('knoux_bridge_enrollments')
    .insert({
      owner_id: ownerId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'enrollment-create-failed' }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    enrollmentId: data.id,
    enrollmentToken: token,
    expiresAt,
    oneTime: true,
  }, { status: 201, headers: { 'cache-control': 'no-store' } });
}
