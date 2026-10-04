import { NextResponse } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { getControlToolSpec, validateControlToolArgs } from '@/lib/build/control-tools';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await guardBuildApi(request, { scope: 'bridge-control-job' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'invalid-body' }, { status: 400 }); }

  const bridgeId = typeof body.bridgeId === 'string' ? body.bridgeId.trim() : '';
  const tool = typeof body.tool === 'string' ? body.tool.trim() : '';
  const spec = getControlToolSpec(tool);
  if (!spec) return NextResponse.json({ error: 'tool-not-allowlisted' }, { status: 400 });
  if (spec.mutating) return NextResponse.json({ error: 'approval-required' }, { status: 403 });

  const validated = validateControlToolArgs(tool, body.args);
  if (!validated.ok) {
    return NextResponse.json({ error: 'invalid-tool-args', message: validated.error }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: machine, error: machineError } = await supabase
    .from('knoux_bridge_machines')
    .select('id,bridge_id,last_seen_at,status')
    .eq('owner_id', ownerId)
    .eq('bridge_id', bridgeId)
    .maybeSingle();

  if (machineError || !machine) return NextResponse.json({ error: 'machine-not-found' }, { status: 404 });

  const ageMs = Date.now() - Date.parse(machine.last_seen_at);
  if (machine.status === 'revoked' || ageMs > 90000) {
    return NextResponse.json({ error: 'machine-offline' }, { status: 409 });
  }

  const idempotencyKey = typeof body.idempotencyKey === 'string'
    ? body.idempotencyKey.trim().slice(0, 160)
    : null;

  const admin = createAdminClient();
  const { data: job, error: jobError } = await admin
    .from('knoux_bridge_jobs')
    .insert({
      owner_id: ownerId,
      machine_id: machine.id,
      tool,
      args: validated.args,
      required_scopes: spec.scopes,
      mutating: false,
      idempotency_key: idempotencyKey || null,
      expires_at: new Date(Date.now() + 300000).toISOString(),
    })
    .select('id,status,created_at,expires_at')
    .single();

  if (jobError || !job) return NextResponse.json({ error: 'job-create-failed' }, { status: 503 });

  return NextResponse.json({
    ok: true,
    job: { id: job.id, status: job.status, createdAt: job.created_at, expiresAt: job.expires_at },
  }, { status: 202, headers: { 'cache-control': 'no-store' } });
}
