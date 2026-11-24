import { clientAddress, rateLimit } from '@/lib/http/rate-limit';
import type { ExternalQueryResult, WordPressCatalogRequest } from '@/lib/wordpress/external';
import { queryPlugins, queryThemes } from '@/lib/wordpress/wordpress-org';

export const dynamic = 'force-dynamic';

function boundedInteger(value: string | null, fallback: number, max: number): number | null {
  if (value === null) return fallback;
  if (!/^[1-9][0-9]{0,2}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed <= max ? parsed : null;
}

function json(body: ExternalQueryResult | { message: string }, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  const search = params.get('search')?.trim();
  const tag = params.get('tag')?.trim().toLowerCase() || undefined;
  const page = boundedInteger(params.get('page'), 1, 200);
  const perPage = boundedInteger(params.get('perPage'), 12, 24);

  if ((kind !== 'theme' && kind !== 'plugin') || page === null || perPage === null
    || (search && (search.length > 120 || [...search].some((character) => character.charCodeAt(0) < 32)))
    || (tag && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(tag))) {
    return json({ message: 'Provide a theme or plugin catalog, a supported search or tag, and a valid page size.' }, 400);
  }

  const limit = rateLimit(`wordpress-catalog:${clientAddress(request.headers)}`, { max: 45 });
  if (!limit.allowed) {
    return json({ message: 'Too many catalog requests. Wait a moment and try again.' }, 429, { 'retry-after': String(limit.retryAfterSeconds) });
  }

  const query: WordPressCatalogRequest = { kind, search, tag, page, perPage };
  const queryDirectory = query.kind === 'theme' ? queryThemes : queryPlugins;
  const result = await queryDirectory({ ...query, signal: request.signal });
  return json(result, result.state === 'unavailable' ? 503 : 200);
}
