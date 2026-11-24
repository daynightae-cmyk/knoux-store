import 'server-only';
import type { CredentialValidationResult } from '../ai/provider-os/types';
import { EnvironmentSecretStore } from './secret-store';

export async function validateOpenAICredential(
  credential: string,
  { fetcher = fetch, signal }: { fetcher?: typeof fetch; signal?: AbortSignal } = {},
): Promise<CredentialValidationResult> {
  const result = (status: CredentialValidationResult['status'], httpStatus: number | null, detail: string) => ({
    providerId: 'openai' as const, status, httpStatus, detail, at: new Date().toISOString(),
  });
  try {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(10000);
    const response = await fetcher('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${credential}` },
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: 'no-store',
    });
    await response.body?.cancel();
    if (response.ok) return result('authenticated', response.status, 'Authenticated models endpoint answered. Generation is not tested.');
    return result('refused', response.status, `Models endpoint refused (${response.status}). Check credential permissions server-side.`);
  } catch {
    if (signal?.aborted) return result('cancelled', null, 'Credential validation was cancelled.');
    return result('unreachable', null, 'Models endpoint could not be reached within the probe timeout.');
  }
}

export async function probeOpenAI(fetcher: typeof fetch = fetch, store = new EnvironmentSecretStore()) {
  const credential = await store.read('OPENAI_API_KEY');
  if (!credential) return { status: 'blocked' as const, detail: 'Set OPENAI_API_KEY on the server.', at: new Date().toISOString() };
  const validation = await validateOpenAICredential(credential, { fetcher });
  return { status: validation.status === 'authenticated' ? 'tested' as const : 'failed' as const, detail: validation.detail, at: validation.at };
}
