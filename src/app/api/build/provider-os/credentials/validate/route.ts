import type { NextRequest } from 'next/server';
import type { CredentialValidationRequest } from '@/lib/ai/provider-os/types';
import { validSecret } from '@/lib/ai/provider-os/policy';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { validateOpenAICredential } from '@/lib/build/provider-probe';
import { checkRequestOrigin, publicRequestOrigin, readBoundedJson } from '@/lib/contact/intake-guard';
import { rateLimit } from '@/lib/http/rate-limit';

export const dynamic = 'force-dynamic';

function reply(body: unknown, status = 200, headers?: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
  });
}

export async function POST(request: NextRequest) {
  const origin = publicRequestOrigin(request);
  if (request.headers.get('origin') !== origin || !checkRequestOrigin(request.headers, origin).ok) {
    return reply({ message: 'Same-origin credential validation required.' }, 403);
  }
  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) return reply({ message: 'Sign in to validate a provider credential.' }, 401);
  const denied = await guardBuildApi(request, { scope: 'provider-credential-validation', session: async () => ({ id: ownerId }) });
  if (denied) return denied;

  const limit = rateLimit(`credential-validation:${ownerId}`, { max: 8 });
  if (!limit.allowed) return reply({ message: 'Too many validation attempts.' }, 429, { 'retry-after': String(limit.retryAfterSeconds) });

  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return reply({ message: 'Credential validation request was refused.' }, parsed.reason === 'body-too-large' ? 413 : 400);
  const input = parsed.value as Partial<CredentialValidationRequest> | null;
  if (!input || input.providerId !== 'openai') {
    return reply({ message: 'Pre-save validation is available for OpenAI keys.' }, 400);
  }
  if (!validSecret(input.secret) || !/^[\x21-\x7e]+$/.test(input.secret)) {
    return reply({ message: 'Paste an OpenAI credential without whitespace.' }, 400);
  }

  return reply(await validateOpenAICredential(input.secret, { signal: request.signal }));
}
