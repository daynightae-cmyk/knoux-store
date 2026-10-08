import 'server-only';
import { validateWordPressOperation, type WordPressOperationState } from './operations';

export function wordpressExecutorConfig(env: Record<string, string | undefined>) {
  const siteIds = (env.KNOUX_WORDPRESS_SITE_IDS ?? '').split(',').map((id) => id.trim()).filter((id) => /^[a-zA-Z0-9_-]{1,80}$/.test(id));
  let url: URL | null = null;
  try { const candidate = new URL(env.KNOUX_WORDPRESS_EXECUTOR_URL ?? ''); if (candidate.protocol === 'https:' && !candidate.username && !candidate.password && !candidate.search && !candidate.hash) url = candidate; } catch { /* unconfigured */ }
  const configured = !!url && !!env.KNOUX_WORDPRESS_EXECUTOR_TOKEN?.trim() && siteIds.length > 0;
  return { url, siteIds, configured, state: (configured ? 'EXECUTOR_NOT_CONNECTED' : 'NOT_CONFIGURED') as WordPressOperationState };
}

export type WordPressExecutorResult = { state: WordPressOperationState; requestId: string | null; externalReference: string | null; version: string | null; items: { slug: string; version: string | null; active: boolean | null }[]; message: string; measuredAt: string; };
const identifier = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,120}$/.test(value) ? value : null;

export async function runWordPressOperation(raw: unknown, ownerId: string, env: Record<string, string | undefined>, fetcher: typeof fetch = fetch): Promise<WordPressExecutorResult> {
  const config = wordpressExecutorConfig(env);
  const empty = { requestId: null, externalReference: null, version: null, items: [], measuredAt: new Date().toISOString() };
  if (!config.configured || !config.url) return { ...empty, state: 'NOT_CONFIGURED', message: 'Configure a trusted WordPress executor, site allowlist and server credential.' };
  const operation = validateWordPressOperation(raw, config.siteIds);
  try {
    const response = await fetcher(new URL('v1/wordpress/operations', config.url.href.endsWith('/') ? config.url : `${config.url.href}/`), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'content-type': 'application/json', authorization: `Bearer ${env.KNOUX_WORDPRESS_EXECUTOR_TOKEN}`, 'idempotency-key': operation.requestId }, body: JSON.stringify({ ...operation, ownerId }) });
    if (response.status === 401 || response.status === 403) return { ...empty, requestId: operation.requestId, state: 'AUTH_REQUIRED', message: 'The trusted executor refused authorization.' };
    if (!response.ok) return { ...empty, requestId: operation.requestId, state: 'FAILED', message: 'The trusted executor refused or failed the operation.' };
    const value = await response.json() as Record<string, unknown>;
    const safeIdentifier = (field: unknown) => typeof field === 'string' && field.includes(env.KNOUX_WORDPRESS_EXECUTOR_TOKEN!) ? null : identifier(field);
    // A transport 200 is not operation success. Require matching identity and explicit result.
    if (value.requestId !== operation.requestId || value.siteId !== operation.siteId || value.action !== operation.action || !['READY', 'RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED'].includes(String(value.state))) return { ...empty, requestId: operation.requestId, state: 'FAILED', message: 'The executor returned an invalid operation receipt.' };
    const reference = safeIdentifier(value.externalReference);
    if (['RUNNING', 'SUCCEEDED'].includes(String(value.state)) && !reference) return { ...empty, requestId: operation.requestId, state: 'FAILED', message: 'The executor supplied no durable receipt reference.' };
    const items = Array.isArray(value.items) ? value.items.slice(0, 500).flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      return typeof record.slug === 'string' && !record.slug.includes(env.KNOUX_WORDPRESS_EXECUTOR_TOKEN!) && /^[a-z0-9][a-z0-9-]{0,79}$/.test(record.slug) ? [{ slug: record.slug, version: safeIdentifier(record.version), active: typeof record.active === 'boolean' ? record.active : null }] : [];
    }) : [];
    return { state: value.state as WordPressOperationState, requestId: operation.requestId, externalReference: reference, version: safeIdentifier(value.version), items, message: 'Result reported by the configured trusted executor. No provider log or credential is exposed.', measuredAt: new Date().toISOString() };
  } catch { return { ...empty, requestId: operation.requestId, state: 'EXECUTOR_NOT_CONNECTED', message: 'The trusted executor could not be reached. Do not repeat a mutation with a new request ID until its receipt is reconciled.' }; }
}
