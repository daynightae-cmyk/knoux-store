import { allEntities } from '@/data/composer-rules';
import { divisions } from '@/lib/entities';
import { clientAddress, rateLimit } from '@/lib/http/rate-limit';
import { publicBuildGuide } from '@/lib/sentinel/public-build-guide';
import { publicCatalog, PUBLIC_READ_TOOLS } from '@/lib/sentinel/guide';

const catalog = [...publicCatalog([...allEntities, ...divisions.map(division => ({ id: `division-${division.id}`, name: division.label, shortName: division.label, summary: division.statement, route: division.route, division: division.id, kind: 'route' as const, code: division.index, slug: division.id, status: 'active' as const, categories: [], searchTerms: [division.label, division.id], capabilities: [], relatedIds: [] }))]), ...publicBuildGuide];

/** Anonymous PUBLIC_READ only. No model, gateway, bridge, account or database imports. */
export function GET(request: Request) {
  const url = new URL(request.url);
  if (request.url.length > 1024 || Number(request.headers.get('content-length') ?? 0) > 0) return Response.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413 });
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  // Next may rebuild request.url against an internal host during `next start`,
  // so the origin a browser addressed is taken from the request host instead.
  const expectedOrigin = host ? `${request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')}://${host}` : url.origin;
  if (url.search || (origin && origin !== expectedOrigin)) return Response.json({ error: 'PUBLIC_CATALOG_ONLY' }, { status: 403 });
  // The payload is identical static registry data for every caller: the ceiling
  // bounds forced work per minute, not access. 30/min was tripped by ordinary
  // browsing bursts and by the CI browser matrix behind one address.
  const global = rateLimit('sentinel:catalog:global', { max: 1200 });
  const caller = rateLimit(`sentinel:catalog:${clientAddress(request.headers)}`, { max: 120 });
  if (!global.allowed || !caller.allowed) return Response.json({ error: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': String(Math.max(global.retryAfterSeconds, caller.retryAfterSeconds)) } });
  return Response.json({ mode: 'REGISTRY_GUIDE', capabilities: PUBLIC_READ_TOOLS, entries: catalog, audit: { source: 'published-registries', providerCalls: 0, privateTools: 0 } }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', 'X-Content-Type-Options': 'nosniff' } });
}
