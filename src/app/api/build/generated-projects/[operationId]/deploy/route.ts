import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { generatedOperationId } from '@/lib/build/generated-project-contract';
import { deployGeneratedProject, generatedProjectsRoot } from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';

/**
 * POST /api/build/generated-projects/[operationId]/deploy — local publish.
 *
 * The executor enforces the exact confirmation, the enabled flag, the
 * operator allowlist and the configured publish root. A failed or refused
 * deployment is reported as such, never as applied.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to deploy generated projects.' },
      { status: 401 },
    );
  }

  const { operationId: rawId } = await params;

  let body: { target?: unknown; confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with target and confirmation.' },
      { status: 400 },
    );
  }

  try {
    const receipt = await deployGeneratedProject(
      generatedProjectsRoot(),
      ownerId,
      generatedOperationId(rawId),
      body.target,
      body.confirmation,
    );
    return NextResponse.json({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deployment failed.';
    const notFound = /not found/i.test(message);
    const invalid = /required|invalid|must|Unsupported|confirmation|disabled|operator|already|No export/i.test(message);
    return NextResponse.json(
      { error: notFound ? 'not-found' : invalid ? 'deploy-refused' : 'deploy-failed', message },
      { status: notFound ? 404 : invalid ? 400 : 500 },
    );
  }
}