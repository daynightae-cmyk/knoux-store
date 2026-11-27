import { NextResponse, type NextRequest } from 'next/server';
import {
  generatedDeployConfirmation,
  generatedDeployTarget,
} from '@/lib/build/generated-project-contract';
import { deployGeneratedProject } from '@/lib/build/generated-project-executor';
import {
  authorizeBuildOwner,
  getGeneratedProjectsRoot,
  resolveOperationId,
} from '@/lib/build/generated-project-route';

export const dynamic = 'force-dynamic';

/** POST /api/build/generated-projects/[operationId]/deploy — deploy compiled output. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const owner = await authorizeBuildOwner(request, 'Sign in to deploy generated projects.');
  if (!owner.ok) return owner.response;

  const operationId = await resolveOperationId(params);

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
      owner.ownerId,
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
