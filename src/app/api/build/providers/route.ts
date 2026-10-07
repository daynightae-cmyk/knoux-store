import { NextResponse, type NextRequest } from 'next/server';
import { createProjectAdapter } from '@/lib/build/adapter-factory';
import { guardBuildApi } from '@/lib/build/api-guard';
import { taskClasses } from '@/lib/build/model-router';
import { providerStatuses, runtimeRouting } from '@/lib/build/providers';
import type { RoutingMode, TaskClass } from '@/lib/build/types';

export const dynamic = 'force-dynamic';

const MODES: RoutingMode[] = ['manual', 'auto'];

/**
 * Provider status and routing decisions.
 *
 * GET only. There is no POST, so there is no path from a request to a provider
 * call from this route. A provider with no credential is reported as
 * `unconfigured` with the variable that would enable it.
 */
export async function GET(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'providers' });
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const taskParam = params.get('task') ?? 'general';
  const modeParam = (params.get('mode') ?? 'auto') as RoutingMode;
  const task: TaskClass = (taskClasses() as string[]).includes(taskParam)
    ? (taskParam as TaskClass)
    : 'general';
  const mode: RoutingMode = MODES.includes(modeParam) ? modeParam : 'auto';

  const providers = providerStatuses(process.env);
  const manual =
    mode === 'manual' && params.get('provider') && params.get('model')
      ? { providerId: params.get('provider') as string, modelId: params.get('model') as string }
      : undefined;

  const routing = runtimeRouting(task, mode, process.env, manual);

  const adapter = createProjectAdapter();
  const execute = adapter.capabilities()['provider.execute'];

  return NextResponse.json(
    {
      providers,
      routing,
      executeCapability: execute,
      executeBlocker: adapter.blockerFor('provider.execute'),
      taskClasses: taskClasses(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
