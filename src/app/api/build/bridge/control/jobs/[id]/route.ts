import { NextResponse } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardBuildApi(request, { scope: 'bridge-control-job' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from('knoux_bridge_jobs')
    .select('id,tool,args,status,created_at,claimed_at,completed_at,result,error,duration_ms,machine_id')
    .eq('owner_id', ownerId)
    .eq('id', id)
    .maybeSingle();

  if (error || !job) return NextResponse.json({ error: 'job-not-found' }, { status: 404 });

  return NextResponse.json({
    id: job.id,
    tool: job.tool,
    args: job.args,
    status: job.status,
    createdAt: job.created_at,
    claimedAt: job.claimed_at,
    completedAt: job.completed_at,
    result: job.result,
    error: job.error,
    durationMs: job.duration_ms,
    machineId: job.machine_id,
  }, { headers: { 'cache-control': 'no-store' } });
}
