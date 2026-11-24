import type { ExternalQueryResult, WordPressCatalogRequest } from './external';
import {
  isWordPressDraftDocument, isWordPressDraftId,
  type WordPressDraft, type WordPressDraftCreate, type WordPressDraftSave,
  type WordPressDraftSelection, type WordPressDraftSummary,
} from './site-drafts';

export class WordPressStudioRequestError extends Error {
  readonly status: number;
  readonly revision?: number;

  constructor(status: number, message: string, revision?: number) {
    super(message);
    this.status = status;
    this.revision = revision;
  }
}

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok || body === null) {
    throw new WordPressStudioRequestError(
      response.status,
      body?.message ?? body?.note ?? 'WordPress Studio request could not be confirmed.',
      typeof body?.revision === 'number' ? body.revision : undefined,
    );
  }
  return body as T;
}

export function readStudioCatalog(query: WordPressCatalogRequest, signal?: AbortSignal): Promise<ExternalQueryResult> {
  const params = new URLSearchParams({ kind: query.kind });
  for (const key of ['search', 'tag', 'page', 'perPage'] as const) {
    if (query[key] !== undefined) params.set(key, String(query[key]));
  }
  return json('/api/wordpress/catalog?' + params, { signal });
}

export function listStudioDrafts(offset = 0, signal?: AbortSignal): Promise<{ drafts: WordPressDraftSummary[]; nextOffset: number | null }> {
  return json('/api/wordpress/drafts?' + new URLSearchParams({ offset: String(offset) }), { signal });
}

function checkedDraft(record: WordPressDraft, id: string): WordPressDraft {
  if (!record || !isWordPressDraftId(record.id) || record.id !== id.toLowerCase()
    || !Number.isSafeInteger(record.revision) || record.revision < 1 || !isWordPressDraftDocument(record.document)) {
    throw new WordPressStudioRequestError(502, 'WordPress draft receipt could not be verified.');
  }
  return record;
}

export async function openStudioDraft(id: string, signal?: AbortSignal): Promise<WordPressDraft> {
  const result = await json<{ draft: WordPressDraft }>('/api/wordpress/drafts?' + new URLSearchParams({ id }), { signal });
  return checkedDraft(result.draft, id);
}

export async function writeStudioDraft(input: WordPressDraftCreate | WordPressDraftSave, signal?: AbortSignal): Promise<WordPressDraft> {
  const result = await json<{ draft: WordPressDraft }>('/api/wordpress/drafts', {
    method: 'expectedRevision' in input ? 'PUT' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  return checkedDraft(result.draft, input.id);
}

export function restoreStudioSelection(draft: WordPressDraft): WordPressDraftSelection & { themeSlug: string | null } {
  const { selection, themeSlug, pluginSlugs } = draft.document;
  return { ...(selection ?? { kind: 'site', pluginSlug: pluginSlugs.at(-1) ?? null }), themeSlug };
}
