import 'server-only';
import type { CredentialValidationProviderId, CredentialValidationResult } from '../ai/provider-os/types';
import { EnvironmentSecretStore } from './secret-store';

export type ProviderProbeTarget = {
  url: string;
  headers: Record<string, string>;
  /** What this probe actually measures, rendered into the result detail. */
  note: string;
};

const PROBE_TIMEOUT_MS = 10000;

/**
 * Official read-only endpoints that authenticate with the pasted credential.
 * Each target mirrors the adapter's own probe URL and header format, so a
 * credential that validates here is the credential the registry would use.
 */
function probeTarget(
  providerId: CredentialValidationProviderId,
  secret: string,
  accountId?: string,
): ProviderProbeTarget | null {
  switch (providerId) {
    case 'openai':
      return { url: 'https://api.openai.com/v1/models', headers: { authorization: `Bearer ${secret}` }, note: 'Authenticated models endpoint answered.' };
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/models?limit=1',
        headers: { 'x-api-key': secret, 'anthropic-version': '2023-06-01' },
        note: 'Authenticated models endpoint answered.',
      };
    case 'gemini':
      return { url: 'https://generativelanguage.googleapis.com/v1beta/models', headers: { 'x-goog-api-key': secret }, note: 'Authenticated models endpoint answered.' };
    case 'openrouter':
      // The public catalog does not require a key, so use the authenticated
      // key-info endpoint instead.
      return { url: 'https://openrouter.ai/api/v1/auth/key', headers: { authorization: `Bearer ${secret}` }, note: 'Authenticated key-info endpoint answered.' };
    case 'groq':
      return { url: 'https://api.groq.com/openai/v1/models', headers: { authorization: `Bearer ${secret}` }, note: 'Authenticated models endpoint answered.' };
    case 'deepseek':
      return { url: 'https://api.deepseek.com/v1/models', headers: { authorization: `Bearer ${secret}` }, note: 'Authenticated models endpoint answered.' };
    case 'moonshot':
      return { url: 'https://api.moonshot.ai/v1/models', headers: { authorization: `Bearer ${secret}` }, note: 'Authenticated models endpoint answered.' };
    // NVIDIA NIM deliberately has no entry: integrate.api.nvidia.com/v1/models
    // is a public catalog (HTTP 200 for anonymous and invalid keys), so it
    // cannot authenticate a key, and a chat probe would be paid inference.
    case 'cloudflare':
      if (!/^[a-z0-9]{8,32}$/.test(accountId ?? '')) return null;
      return {
        url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models`,
        headers: { authorization: `Bearer ${secret}` },
        note: 'Authenticated Workers AI models endpoint answered.',
      };
    case 'opencode-console-v2':
      if (!secret.startsWith('oc_sk_')) return null;
      return {
        url: 'https://opencode.ai/console/api/v2/config',
        headers: { authorization: `Bearer ${secret}` },
        note: 'Workspace-bound Console configuration authenticated.',
      };
  }
}

/**
 * Validate a pasted credential against the provider's official endpoint.
 * Never returns credential material or upstream response bodies.
 */
export async function validateProviderCredential(
  providerId: CredentialValidationProviderId,
  secret: string,
  {
    accountId,
    fetcher = fetch,
    signal,
  }: { accountId?: string; fetcher?: typeof fetch; signal?: AbortSignal } = {},
): Promise<CredentialValidationResult> {
  const result = (status: CredentialValidationResult['status'], httpStatus: number | null, detail: string): CredentialValidationResult => ({
    providerId, status, httpStatus, detail, at: new Date().toISOString(),
  });

  const target = probeTarget(providerId, secret, accountId);
  if (!target) {
    if (providerId === 'opencode-console-v2') {
      return result('refused', null, 'A workspace-bound Console service-account token is required. Legacy Zen keys are not accepted.');
    }
    return result('refused', null, 'A Cloudflare account ID is required alongside the API token.');
  }
  try {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(PROBE_TIMEOUT_MS);
    const response = await fetcher(target.url, {
      headers: target.headers,
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: 'no-store',
    });
    await response.body?.cancel();
    if (response.ok) return result('authenticated', response.status, `${target.note} Generation is not tested.`);
    return result('refused', response.status, `Provider endpoint refused (${response.status}). Check the credential and its permissions server-side.`);
  } catch {
    if (signal?.aborted) return result('cancelled', null, 'Credential validation was cancelled.');
    return result('unreachable', null, 'Provider endpoint could not be reached within the probe timeout.');
  }
}

export async function validateOpenAICredential(
  credential: string,
  { fetcher, signal }: { fetcher?: typeof fetch; signal?: AbortSignal } = {},
): Promise<CredentialValidationResult> {
  return validateProviderCredential('openai', credential, { fetcher, signal });
}

export async function probeOpenAI(fetcher: typeof fetch = fetch, store = new EnvironmentSecretStore()) {
  const credential = await store.read('OPENAI_API_KEY');
  if (!credential) return { status: 'blocked' as const, detail: 'Set OPENAI_API_KEY on the server.', at: new Date().toISOString() };
  const validation = await validateOpenAICredential(credential, { fetcher });
  return { status: validation.status === 'authenticated' ? 'tested' as const : 'failed' as const, detail: validation.detail, at: validation.at };
}
