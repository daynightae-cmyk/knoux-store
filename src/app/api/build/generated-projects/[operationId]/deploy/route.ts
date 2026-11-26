import { NextResponse, type NextRequest } from 'next/server';
import path from 'node:path';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  generatedDeployConfirmation,
  generatedDeployTarget,
  generatedOperationId,
} from '@/lib/build/generated-project-contract';
import { deployGeneratedProject } from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';

function getGeneratedProjectsRoot(): string {
  const envRoot = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (envRoot) return envRoot;
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

/** POST /api/build/generated-projects/[operationId]/deploy — deploy compiled output. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
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
  const operationId = generatedOperationId(rawId);

  let body: { target: string; confirmation: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with target and confirmation.' },
      { status: 400 },
    );
  }

  let target: string;
  let confirmation: string;
  try {
    target = generatedDeployTarget(body.target);
    confirmation = generatedDeployConfirmation(body.confirmation);
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid-params', message: err instanceof Error ? err.message : 'Invalid deploy parameters.' },
      { status: 400 },
    );
  }

  try {
    const receipt = await deployGeneratedProject(
      getGeneratedProjectsRoot(),
      ownerId,
      operationId,
      target,
      confirmation,
    );
    return NextResponse.json({ receipt });
  } catch (err) {
    return NextResponse.json(
      { error: 'deploy-failed', message: err instanceof Error ? err.message : 'Deployment failed.' },
      { status: 400 },
    );
  }
}
