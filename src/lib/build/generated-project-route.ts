import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { generatedOperationId } from '@/lib/build/generated-project-contract';

/**
 * Shared plumbing for the generated-project API routes.
 *
 * Every route performs the same three steps — same-origin write guard, owner
 * identity, operation-id validation — and answers the same missing or foreign
 * operation cases. Keeping them in one place makes the authorization contract
 * identical across the status, cancel, deploy and bundle routes instead of
 * being restated (and slowly drifting) in each handler.
 */

/** Root of the generated-project store: operator-configured, else beside the app. */
export function getGeneratedProjectsRoot(): string {
  const envRoot = process.env.KNOUX_GENERATED_PROJECTS_ROOT;
  if (envRoot) return envRoot;
  return path.resolve(process.cwd(), '..', 'knoux-generated-projects');
}

export type BuildOwner =
  | { ok: true; ownerId: string }
  | { ok: false; response: Response };

/**
 * Same-origin write guard plus owner identity.
 *
 * `unauthorizedMessage` keeps each route's exact 401 wording while the guard
 * and the owner lookup stay in one place.
 */
export async function authorizeBuildOwner(
  request: NextRequest,
  unauthorizedMessage: string,
): Promise<BuildOwner> {
  const denied = await guardBuildApi(request, { scope: 'write' });
  if (denied) return { ok: false, response: denied };

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'unauthorized', message: unauthorizedMessage },
        { status: 401 },
      ),
    };
  }
  return { ok: true, ownerId };
}

/** Validate the operation id carried by the route parameters. */
export async function resolveOperationId(
  params: Promise<{ operationId: string }>,
): Promise<string> {
  const { operationId: rawId } = await params;
  return generatedOperationId(rawId);
}

/** The operation does not exist for this owner. */
export function operationNotFound(): NextResponse {
  return NextResponse.json(
    { error: 'not-found', message: 'Generated project operation not found.' },
    { status: 404 },
  );
}

/** The operation exists but belongs to another owner. */
export function operationForbidden(): NextResponse {
  return NextResponse.json(
    { error: 'forbidden', message: 'You do not own this operation.' },
    { status: 403 },
  );
}
