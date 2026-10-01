import { rateLimit, clientAddress } from '@/lib/http/rate-limit';
import {
  checkedNow,
  parseQuery,
  partitionCandidates,
  reconcileCandidates,
  TLD_SHORTCUTS,
} from '@/lib/domain/shared';
import { activeDomainProvider, runDomainCheck } from '@/lib/domain';

/**
 * Public domain availability endpoint.
 *
 * The browser never holds a registrar credential. It asks this route, and this
 * route asks the configured provider server-side. That is the whole reason the
 * route exists rather than a server action: the Domain Finder has to work for
 * an anonymous visitor, and an anonymous visitor cannot be trusted with an API
 * key.
 *
 * What the endpoint is for, precisely: discovery. It returns what a registrar
 * reports about a name and nothing else. It does not register, purchase, add to
 * a cart, or hold a name, and there is no branch in it that could. Availability
 * is a volatile fact — a name can be taken between this response and a
 * checkout — so any future purchase route must re-check authoritatively at the
 * moment of purchase rather than trusting a value cached in a browser.
 *
 * Controls:
 *   - GET only; nothing here changes state
 *   - bounded batch, so one request cannot fan out into a registrar bill
 *   - per-address rate limit, because every request costs a provider call
 *   - no-store, because an availability answer goes stale within minutes
 *   - no credentials, hostnames, or configuration values in any response body
 *
 * The response is reconciled: one row per requested name, always. A registrar
 * can answer about fewer names than it was asked about, and forwarding its array
 * unchanged would report a short search as a complete one.
 */

export const dynamic = 'force-dynamic';

const RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW_MS = 60_000;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

export async function GET(request: Request) {
  const limit = rateLimit(`domain:${clientAddress(request.headers)}`, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!limit.allowed) {
    return json(
      {
        state: 'rate-limited',
        message: 'Too many availability checks from this connection. Wait a moment and try again.',
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      429,
      { 'retry-after': String(limit.retryAfterSeconds) },
    );
  }

  const params = new URL(request.url).searchParams;
  const rawInput = (params.get('q') ?? '').slice(0, 253);
  const tlds = (params.getAll('tld').length ? params.getAll('tld') : params.getAll('tld[]'))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);

  const parsed = parseQuery(rawInput, tlds.length ? tlds : [TLD_SHORTCUTS[0] ?? 'com']);

  if (parsed.invalid || parsed.candidates.length === 0) {
    return json({ state: 'invalid', message: parsed.invalid ?? 'Enter a name to search for.' }, 400);
  }

  // The unconfigured state is answered before any provider call is attempted,
  // because there is no provider to call. It is a real, renderable answer.
  const active = activeDomainProvider();

  if (!active.provider) {
    // 200, not 503. "No registrar is configured" is a state this deployment
    // renders on purpose, so it is a successful answer to a question that was
    // successfully asked — not a server fault.
    return json(
      {
        state: 'unconfigured',
        message:
          'Live availability is not configured on this deployment. KNOuX will check a name and confirm registration on request once a registrar connection is in place.',
        candidates: parsed.candidates,
        provider: null,
        status: active.status,
      },
      200,
    );
  }

  // A name the provider does not carry is answered here, from the declared TLD
  // list, and never forwarded. Asking a reseller about an extension it does not
  // sell gets an answer that reads exactly like "taken", which is the one thing
  // this endpoint must never produce.
  const provider = active.provider;
  const { checkable } = partitionCandidates(parsed.candidates, provider.supportedTlds);

  if (checkable.length === 0) {
    // Every name is outside the declared catalogue. Nothing failed and nothing
    // was asked, so this is a successful answer rather than an error.
    const checkedAt = checkedNow();
    return json(
      {
        state: 'checked',
        provider: provider.name,
        checkedAt,
        results: reconcileCandidates(parsed.candidates, [], {
          provider: provider.name,
          checkedAt,
          supportedTlds: provider.supportedTlds,
        }),
      },
      200,
    );
  }

  const result = await runDomainCheck(checkable);

  if (result.failure === 'error' || (!result.ok && result.results.length === 0)) {
    return json(
      {
        state: 'error',
        message:
          'The registrar could not be reached. This is a temporary failure to check, not a statement that the name is taken.',
        provider: result.provider ?? null,
      },
      502,
    );
  }

  const providerName = result.provider ?? provider.name;

  // Every name the visitor asked about comes back, including the ones the
  // registrar did not answer. A partial batch is reported as partial, because
  // passing the provider's array straight through would render "2 names checked"
  // for a three-name search and leave the missing one indistinguishable from a
  // name that had been checked and found available.
  return json(
    {
      state: 'checked',
      provider: providerName,
      checkedAt: result.checkedAt,
      results: reconcileCandidates(parsed.candidates, result.results, {
        provider: providerName,
        checkedAt: result.checkedAt,
        supportedTlds: provider.supportedTlds,
      }),
    },
    200,
  );
}
