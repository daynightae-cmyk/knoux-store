import { NextResponse } from 'next/server';
import { authenticateMachineRequest, recordControlEvent } from '@/lib/build/control-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await authenticateMachineRequest(request);
  if (!auth) return NextResponse.json({ error: 'machine-unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'invalid-body' }, { status: 400 }); }

  const jobId = typeof body.jobId === 'string' ? body.jobId : '';
  const ok = body.ok === true;
  const durationMs = Number.isFinite(body.durationMs) && Number(body.durationMs) >= 0
    ? Math.min(Number(body.durationMs), 86400000)
    : null;
  const errorText = typeof body.error === 'string' ? body.error.slice(0, 2000) : null;
  const result = body.result === undefined ? null : body.result;

  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return NextResponse.json({ error: 'invalid-job-id' }, { status: 400 });

  const admin = createAdminClient();
  const { data: job } = await admin
    .from('knoux_bridge_jobs')
    .select('id,owner_id,machine_id,status')
    .eq('id', jobId)
    .eq('machine_id', auth.machine.id)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: 'job-not-found' }, { status: 404 });
  if (!['claimed', 'running'].includes(job.status)) {
    return NextResponse.json({ error: 'job-not-claimable' }, { status: 409 });
  }

  const completedAt = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: ok ? 'succeeded' : 'failed',
    completed_at: completedAt,
    result: ok ? result : null,
    error: ok ? null : (errorText ?? 'The local bridge reported a failure.'),
    duration_ms: durationMs,
  };
  if (job.status === 'claimed') update.started_at = completedAt;

  await admin.from('knoux_bridge_jobs').update(update).eq('id', job.id);

  await recordControlEvent({
    ownerId: auth.session.owner_id,
    machineId: auth.machine.id,
    sessionId: auth.session.id,
    jobId: job.id,
    event: ok ? 'job.succeeded' : 'job.failed',
    detail: { durationMs },
  });

  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
