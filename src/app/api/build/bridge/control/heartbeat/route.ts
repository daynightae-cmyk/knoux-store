import { NextResponse } from 'next/server';
import { authenticateMachineRequest } from '@/lib/build/control-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await authenticateMachineRequest(request);
  if (!auth) return NextResponse.json({ error: 'machine-unauthorized' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {}

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const machineUpdate: Record<string, unknown> = {
    status: 'online',
    last_seen_at: now,
    updated_at: now,
  };

  if (typeof body.version === 'string' && body.version.length <= 64) machineUpdate.bridge_version = body.version;
  if (typeof body.capabilities === 'object' && body.capabilities !== null) machineUpdate.capabilities = body.capabilities;

  await Promise.all([
    admin.from('knoux_bridge_machines').update(machineUpdate).eq('id', auth.machine.id),
    admin.from('knoux_bridge_sessions').update({ last_seen_at: now }).eq('id', auth.session.id),
  ]);

  return NextResponse.json({
    ok: true,
    machineId: auth.machine.id,
    serverTime: now,
    sessionExpiresAt: auth.session.expires_at,
  }, { headers: { 'cache-control': 'no-store' } });
}
