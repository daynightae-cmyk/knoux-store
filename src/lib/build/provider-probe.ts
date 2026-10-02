import 'server-only';
import { EnvironmentSecretStore } from './secret-store';
export async function probeOpenAI(fetcher: typeof fetch = fetch, store = new EnvironmentSecretStore()) {
  const credential = await store.read('OPENAI_API_KEY');
  if (!credential) return { status: 'blocked' as const, detail: 'Set OPENAI_API_KEY on the server.', at: new Date().toISOString() };
  try {
    const response = await fetcher('https://api.openai.com/v1/models', { headers: { authorization: `Bearer ${credential}` }, redirect: 'error', signal: AbortSignal.timeout(10000), cache: 'no-store' });
    await response.body?.cancel();
    return { status: response.ok ? 'tested' as const : 'failed' as const, detail: response.ok ? 'Authenticated models endpoint answered. Generation is not tested.' : `Models endpoint refused (${response.status}). Check credential permissions server-side.`, at: new Date().toISOString() };
  } catch { return { status: 'failed' as const, detail: 'Models endpoint could not be reached within the probe timeout.', at: new Date().toISOString() }; }
}
