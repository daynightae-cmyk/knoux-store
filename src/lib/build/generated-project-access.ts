import { NextResponse } from 'next/server';
import { checkRequestOrigin, publicRequestOrigin } from '../contact/intake-guard';
import { clientAddress, rateLimit } from '../http/rate-limit';
import { resolveBuildOwnerId } from './api-guard';
import { isBuildOperator } from './operator';

export function generatedProjectResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('cache-control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

export async function authorizeGeneratedProject(request: Request): Promise<
  { allowed: true; ownerId: string; origin: string } | { allowed: false; response: Response }
> {
  const origin = publicRequestOrigin(request);
  if (request.method !== 'GET' && (request.headers.get('origin') !== origin || !checkRequestOrigin(request.headers, origin).ok)) {
    return { allowed: false, response: generatedProjectResponse(
      { error: 'origin-not-permitted', message: 'Generated project changes require a same-origin request.' },
      { status: 403 },
    ) };
  }

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return { allowed: false, response: generatedProjectResponse(
      { error: 'unauthorized', message: 'Sign in to use generated project execution.' },
      { status: 401 },
    ) };
  }
  if (!isBuildOperator(ownerId)) {
    return { allowed: false, response: generatedProjectResponse(
      { error: 'operator-required', message: 'Generated projects require an allowlisted Build operator.' },
      { status: 403 },
    ) };
  }

  const limit = rateLimit(`build-generated-project:${ownerId}:${clientAddress(request.headers)}`);
  if (!limit.allowed) {
    return { allowed: false, response: generatedProjectResponse(
      { error: 'rate-limited', message: 'Wait before retrying generated project execution.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    ) };
  }

  return { allowed: true, ownerId, origin };
}
