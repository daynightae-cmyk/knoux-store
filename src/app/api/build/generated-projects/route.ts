import { NextResponse, NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { GENERATED_PROJECT_CONFIRMATION } from '@/lib/build/generated-project-contract';
import { executeGeneratedProject, generatedProjectsRoot } from '@/lib/build/generated-project-executor';

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
      { enabled: false, message: 'Static execution is disabled on this host. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 to enable.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ enabled: true, message: 'Trusted static execution is enabled for this allowlisted operator.' });
}

/**
 * POST /api/build/generated-projects — apply a reviewed static project.
 *
 * Execution is the bounded in-process pipeline: validated source, measured
 * build, deterministic export, and a real loopback preview process with a
 * measured readiness probe. Receipts are durable per operation; nothing here
 * invents a success state.
 */
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

  if (process.env.KNOUX_WRITE_EXECUTOR_ENABLED !== '1') {
    return NextResponse.json(
      { error: 'executor-disabled', message: 'Static execution is disabled on this host. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 to enable.' },
      { status: 503 },
    );
  }

  let body: { operationId?: unknown; artifact?: unknown; confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with operationId, artifact, and confirmation.' },
      { status: 400 },
    );
  }

  if (body.confirmation !== GENERATED_PROJECT_CONFIRMATION) {
    return NextResponse.json(
      { error: 'invalid-confirmation', message: `Confirmation must be exactly: ${GENERATED_PROJECT_CONFIRMATION}` },
      { status: 403 },
    );
  }

  try {
    const receipt = await executeGeneratedProject({
      root: generatedProjectsRoot(),
      ownerId,
      operationId: String(body.operationId ?? ''),
      artifact: body.artifact,
      parentOrigin: request.nextUrl.origin,
      sourceSignal: AbortSignal.timeout(110_000),
    });
    return NextResponse.json({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generated project execution failed.';
    const invalid = /required|invalid|must|exceeds|Duplicate|outside|Only|escaped|UUID|confirmation/i.test(message);
    return NextResponse.json(
      { error: invalid ? 'invalid-artifact' : 'execution-failed', message },
      { status: invalid ? 400 : 500 },
    );
  }
}