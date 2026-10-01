import { NextResponse } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const ONLINE_WINDOW_MS = 90000;

export async function GET(request: Request) {
  const denied = await guardBuildApi(request, { scope: 'bridge-control-status' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('knoux_bridge_machines')
    .select('id,bridge_id,hostname,platform,arch,bridge_version,capabilities,status,last_seen_at,registered_at')
    .eq('owner_id', ownerId)
    .order('last_seen_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'machine-status-failed' }, { status: 503 });

  const now = Date.now();
  const machines = (data ?? []).map((machine) => {
    const ageMs = Math.max(0, now - Date.parse(machine.last_seen_at));
    const online = machine.status !== 'revoked' && ageMs <= ONLINE_WINDOW_MS;
    return {
      id: machine.id,
      bridgeId: machine.bridge_id,
      hostname: machine.hostname,
      platform: machine.platform,
      arch: machine.arch,
      version: machine.bridge_version,
      capabilities: machine.capabilities,
      status: machine.status === 'revoked' ? 'revoked' : (online ? 'online' : 'offline'),
      lastSeenAt: machine.last_seen_at,
      lastSeenAgeMs: ageMs,
      registeredAt: machine.registered_at,
    };
  });

  return NextResponse.json({
    localMachineConnected: machines.some((machine) => machine.status === 'online'),
    machines,
    measuredAt: new Date(now).toISOString(),
  }, { headers: { 'cache-control': 'no-store' } });
}
