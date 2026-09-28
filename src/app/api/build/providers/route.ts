import { NextResponse } from 'next/server';
import { FsProjectAdapter } from '@/lib/build/project-adapter';
import { routeModel, taskClasses } from '@/lib/build/model-router';
import { providerStatuses } from '@/lib/build/providers';
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
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
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

  const routing = routeModel(task, mode, providers, manual);

  const adapter = new FsProjectAdapter({ root: process.cwd(), environment: 'production', label: 'read-only' });
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
