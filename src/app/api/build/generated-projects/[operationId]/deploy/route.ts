import type { NextRequest } from 'next/server';
import { readBoundedJson } from '@/lib/contact/intake-guard';
import { authorizeGeneratedProject, generatedProjectResponse } from '@/lib/build/generated-project-access';
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
  const access = await authorizeGeneratedProject(request);
  if (!access.allowed) return access.response;

  const { operationId: rawId } = await params;

  const parsed = await readBoundedJson(request, 8 * 1024);
  if (!parsed.ok) {
    return generatedProjectResponse({ error: parsed.reason, message: 'Expected a JSON object within the request size limit.' }, { status: parsed.reason === 'body-too-large' ? 413 : 400 });
  }
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return generatedProjectResponse({ error: 'invalid-body', message: 'Expected a JSON object.' }, { status: 400 });
  }
  const body = parsed.value as { target?: unknown; confirmation?: unknown };

  try {
    const receipt = await deployGeneratedProject(
      generatedProjectsRoot(),
      access.ownerId,
      generatedOperationId(rawId),
      body.target,
      body.confirmation,
    );
    return generatedProjectResponse({ receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deployment failed.';
    const notFound = /not found/i.test(message);
    const invalid = /required|invalid|must|Unsupported|confirmation|disabled|operator|already|No export/i.test(message);
    return generatedProjectResponse(
      { error: notFound ? 'not-found' : invalid ? 'deploy-refused' : 'deploy-failed', message: notFound ? 'Operation not found.' : invalid ? 'The local publish request was refused.' : 'Local publish failed.' },
      { status: notFound ? 404 : invalid ? 400 : 500 },
    );
  }
}