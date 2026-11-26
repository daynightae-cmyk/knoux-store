import { NextResponse, NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import {
  GENERATED_PROJECT_CONFIRMATION,
  parseGeneratedProject,
  type GeneratedProjectPlan,
} from '@/lib/build/generated-project-contract';
import { executeGeneratedProject } from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** GET /api/build/generated-projects — check if execution is enabled. */
export async function GET() {
  const denied = await guardBuildApi(new NextRequest('http://localhost'), { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { enabled: false, message: 'Sign in to use generated project execution.' },
      { status: 401 },
    );
  }

  const enabled = process.env.KNOUX_WRITE_EXECUTOR_ENABLED === '1';
  if (!enabled) {
    return NextResponse.json(
      {
        enabled: false,
        message: 'Static execution is disabled on this host. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 to enable.',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    enabled: true,
    message: 'Trusted static execution is enabled for this allowlisted operator.',
  });
}

/** POST /api/build/generated-projects — apply a reviewed static project. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to apply generated projects.' },
      { status: 401 },
    );
  }

  let body: { operationId: string; artifact: GeneratedProjectPlan; confirmation: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'invalid-body',
        message: 'Expected a JSON body with operationId, artifact, and confirmation.',
      },
      { status: 400 },
    );
  }

  if (body.confirmation !== GENERATED_PROJECT_CONFIRMATION) {
    return NextResponse.json(
      {
        error: 'invalid-confirmation',
        message: `Confirmation must be exactly: ${GENERATED_PROJECT_CONFIRMATION}`,
      },
      { status: 403 },
    );
  }

  let artifact: GeneratedProjectPlan;
  try {
    artifact = parseGeneratedProject(body.artifact);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'invalid-artifact',
        message: err instanceof Error ? err.message : 'Invalid generated project artifact.',
      },
      { status: 400 },
    );
  }

  try {
    const receipt = await executeGeneratedProject({
      root: process.env.KNOUX_GENERATED_PROJECTS_ROOT ?? '',
      ownerId,
      operationId: body.operationId,
      artifact,
      parentOrigin: new URL(request.url).origin,
    });
    return NextResponse.json({ receipt });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'execution-failed',
        message: err instanceof Error ? err.message : 'Generated project execution failed.',
      },
      { status: 500 },
    );
  }
}
