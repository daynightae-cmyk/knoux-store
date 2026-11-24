'use client';

import { useEffect, useState } from 'react';
import type { ExternalItem, ExternalQueryResult, ExternalQueryState } from '@/lib/wordpress/external';
import { readStudioCatalog } from '@/lib/wordpress/studio-client';

/** Shared data controller for the existing Studio and the separately owned Cockpit. */
export function useStudioCatalog(
  kind: 'theme' | 'plugin', initial: readonly ExternalItem[], initialState: ExternalQueryState, enabled: boolean,
) {
  const [query, setQuery] = useState({ search: '', tag: '', page: 1 });
  const [result, setResult] = useState<ExternalQueryResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const { search, tag, page } = query;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const delay = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await readStudioCatalog({ kind, search, tag, page, perPage: 9 }, controller.signal);
        if (!controller.signal.aborted) setResult(next);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Catalog unavailable.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(delay); controller.abort(); };
  }, [enabled, kind, search, tag, page, refresh]);

  return {
    items: result?.items ?? initial, state: error ? 'unavailable' as const : result?.state ?? initialState,
    search, tag, page, totalPages: Math.min(result?.totalPages ?? 1, 200), loading, error,
    setSearch: (value: string) => setQuery((previous) => ({ ...previous, search: value, page: 1 })),
    setTag: (value: string) => setQuery((previous) => ({ ...previous, tag: value, page: 1 })),
    setPage: (value: number) => setQuery((previous) => ({ ...previous, page: value })),
    retry: () => setRefresh((previous) => previous + 1),
  };
}

export function StudioCatalogPaging({ catalog, label }: { catalog: ReturnType<typeof useStudioCatalog>; label: string }) {
  return (
    <div role="group" aria-label={label}>
      <label>Filter by WordPress.org tag
        <input type="search" value={catalog.tag} maxLength={80} onChange={(event) => catalog.setTag(event.target.value)} />
      </label>
      <button type="button" disabled={catalog.loading || catalog.page <= 1} onClick={() => catalog.setPage(catalog.page - 1)}>Previous page</button>
      <button type="button" disabled={catalog.loading || catalog.page >= catalog.totalPages} onClick={() => catalog.setPage(catalog.page + 1)}>Next page</button>
      <p role="status">{catalog.loading ? 'Loading WordPress.org…' : catalog.error ?? 'Page ' + catalog.page}</p>
      {catalog.error ? <button type="button" onClick={catalog.retry}>Retry catalog</button> : null}
    </div>
  );
}
