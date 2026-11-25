import type { NextRequest } from 'next/server';
import type { CredentialValidationRequest } from '@/lib/ai/provider-os/types';
import { validSecret } from '@/lib/ai/provider-os/policy';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { validateProviderCredential } from '@/lib/build/provider-probe';
import type { CredentialValidationProviderId } from '@/lib/ai/provider-os/types';

const VALIDATION_PROVIDERS: readonly CredentialValidationProviderId[] = [
  'openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'deepseek', 'moonshot', 'cloudflare', 'opencode-console-v2',
];
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
  if (!input || typeof input.providerId !== 'string' || !VALIDATION_PROVIDERS.includes(input.providerId as CredentialValidationProviderId)) {
    return reply({ message: 'Pre-save validation is not available for that provider.' }, 400);
  }
  if (!validSecret(input.secret) || !/^[\x21-\x7e]+$/.test(input.secret)) {
    return reply({ message: 'Paste the credential without whitespace.' }, 400);
  }
  if (input.accountId !== undefined
    && (typeof input.accountId !== 'string' || !/^[a-z0-9]{8,32}$/.test(input.accountId))) {
    return reply({ message: 'Cloudflare requires a lowercase account ID, distinct from the API token.' }, 400);
  }

  return reply(await validateProviderCredential(input.providerId as CredentialValidationProviderId, input.secret, {
    accountId: input.accountId,
    signal: request.signal,
  }));
}
