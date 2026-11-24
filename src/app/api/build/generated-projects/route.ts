import type { NextRequest } from 'next/server';
import { readBoundedJson } from '@/lib/contact/intake-guard';
import { authorizeGeneratedProject, generatedProjectResponse } from '@/lib/build/generated-project-access';
import { GENERATED_PROJECT_CONFIRMATION } from '@/lib/build/generated-project-contract';
import { executeGeneratedProject, generatedProjectsRoot } from '@/lib/build/generated-project-executor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** GET /api/build/generated-projects — check if execution is enabled. */
export async function GET(request: NextRequest) {
  const access = await authorizeGeneratedProject(request);
  if (!access.allowed) return access.response;

  const enabled = process.env.KNOUX_WRITE_EXECUTOR_ENABLED === '1';
  if (!enabled) {
    return generatedProjectResponse(
      { enabled: false, message: 'Static execution is disabled on this host. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 to enable.' },
      { status: 503 },
    );
  }

  return generatedProjectResponse({ enabled: true, message: 'Trusted static execution is enabled for this allowlisted operator.' });
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
  const access = await authorizeGeneratedProject(request);
  if (!access.allowed) return access.response;

  if (process.env.KNOUX_WRITE_EXECUTOR_ENABLED !== '1') {
    return generatedProjectResponse(
      { error: 'executor-disabled', message: 'Static execution is disabled on this host. Set KNOUX_WRITE_EXECUTOR_ENABLED=1 to enable.' },
      { status: 503 },
    );
  }

  const parsed = await readBoundedJson(request, 768 * 1024);
  if (!parsed.ok) {
    return generatedProjectResponse({ error: parsed.reason, message: 'Expected a JSON object within the request size limit.' }, { status: parsed.reason === 'body-too-large' ? 413 : 400 });
  }
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return generatedProjectResponse({ error: 'invalid-body', message: 'Expected a JSON object.' }, { status: 400 });
  }
  const body = parsed.value as { operationId?: unknown; artifact?: unknown; confirmation?: unknown };

  if (body.confirmation !== GENERATED_PROJECT_CONFIRMATION) {
    return generatedProjectResponse(
      { error: 'invalid-confirmation', message: `Confirmation must be exactly: ${GENERATED_PROJECT_CONFIRMATION}` },
      { status: 403 },
    );
  }

  try {
    const receipt = await executeGeneratedProject({
      root: generatedProjectsRoot(),
      ownerId: access.ownerId,
      operationId: typeof body.operationId === 'string' ? body.operationId : '',
      artifact: body.artifact,
      parentOrigin: access.origin,
      sourceSignal: AbortSignal.timeout(110_000),
    });
    return generatedProjectResponse({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generated project execution failed.';
    if (message === 'Operation UUID is already bound to a different generated artifact.') {
      return generatedProjectResponse({ error: 'operation-conflict', message }, { status: 409 });
    }
    const invalid = /required|invalid|must|exceeds|Duplicate|outside|Only|escaped|UUID|confirmation/i.test(message);
    return generatedProjectResponse(
      { error: invalid ? 'invalid-artifact' : 'execution-failed', message: invalid ? 'The generated artifact or operation ID was refused.' : 'Generated project execution failed.' },
      { status: invalid ? 400 : 500 },
    );
  }
}