import { NextResponse } from 'next/server';
import { authenticateMachineRequest, recordControlEvent } from '@/lib/build/control-auth';
import { getControlToolSpec } from '@/lib/build/control-tools';
import { loadBridgeKeys } from '@/lib/build/bridge-keys';
import { mintTicket } from '@/lib/build/bridge-tickets';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await authenticateMachineRequest(request);
  if (!auth) return NextResponse.json({ error: 'machine-unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await Promise.all([
    admin.from('knoux_bridge_machines').update({
      status: 'online',
      last_seen_at: now,
      updated_at: now,
    }).eq('id', auth.machine.id),
    admin.from('knoux_bridge_sessions').update({ last_seen_at: now }).eq('id', auth.session.id),
  ]);

  const { data, error } = await admin.rpc('knoux_bridge_claim_job', {
    p_machine_id: auth.machine.id,
    p_session_id: auth.session.id,
  });

  if (error) return NextResponse.json({ error: 'job-claim-failed' }, { status: 503 });

  const job = Array.isArray(data) ? data[0] : null;
  if (!job) return new Response(null, { status: 204 });

  const spec = getControlToolSpec(job.tool);
  if (!spec || spec.mutating) {
    await admin.from('knoux_bridge_jobs').update({
      status: 'failed',
      completed_at: now,
      error: 'Control-plane v1 refuses unregistered or mutating tools.',
    }).eq('id', job.id);
    return NextResponse.json({ error: 'job-not-allowlisted' }, { status: 409 });
  }

  const keys = loadBridgeKeys();
  if (!keys) {
    await admin.from('knoux_bridge_jobs').update({
      status: 'queued',
      claimed_session_id: null,
      claimed_at: null,
    }).eq('id', job.id);
    return NextResponse.json({ error: 'bridge-signing-key-unconfigured' }, { status: 503 });
  }

  const ticket = mintTicket({
    userId: auth.session.owner_id,
    sid: 'cloud-job-' + job.id,
    scopes: spec.scopes,
    bridgeId: auth.machine.bridge_id,
  }, keys);

  await recordControlEvent({
    ownerId: auth.session.owner_id,
    machineId: auth.machine.id,
    sessionId: auth.session.id,
    jobId: job.id,
    event: 'job.claimed',
    detail: { tool: job.tool },
  });

  return NextResponse.json({
    ok: true,
    job: { id: job.id, tool: job.tool, args: job.args ?? {}, expiresAt: job.expires_at },
    bridgeTicket: ticket,
  }, { headers: { 'cache-control': 'no-store' } });
}
