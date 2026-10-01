import 'server-only';

import { assertFQDN, checkedNow, money, type DomainAvailability, type DomainCheck } from '../shared';
import type { DomainProvider } from '../provider';

/**
 * WHMCS adapter.
 *
 * Contract: the WHMCS API `GET /api.php?action=domains&...`, or a configured
 * reseller base URL. Availability for a reseller storefront is resolved by
 * WHMCS itself from the registered registrar module.
 * https://developers.whmcs.com/domain-registrars/availability-checks
 *
 * WHMCS is the adapter that makes a reseller or a hosting commerce backend
 * possible later without touching this product again. It is a different shape
 * from the direct registrar adapters in two ways that matter:
 *
 *   - The base URL is deployment-specific, so it is configuration.
 *   - It answers with a numeric `status`, and only `status === 1` means
 *     available. Every other status is refused, because WHMCS reserves numbers
 *     it has not defined and treating an unknown status as "taken" would
 *     manufacture a negative answer out of a gap in a spec.
 *
 * One boundary is enforced here that is easy to miss: a WHMCS purchase URL is
 * never constructed. This surface is discovery, and the reference run prompt
 * is explicit that purchase, register and other irreversible actions stay out
 * until a commerce route exists to own them.
 */

const TIMEOUT_MS = 8000;
const MAX_BATCH = 20;

/**
 * Ceiling on the whole batch, not on one call.
 *
 * WHMCS is checked one name at a time, and a per-call timeout multiplied by a
 * twelve-name candidate list is a ninety-six second request if the reseller is
 * unreachable — a slowloris that costs one connection per visitor and holds it
 * open for a minute and a half. The per-call timeout is kept, and this budget
 * sits above it: the first names get the full timeout, and once the budget is
 * spent the rest are reported as failures rather than left hanging.
 *
 * Being refused the remaining names is the correct outcome anyway. A name this
 * adapter could not reach is a name it knows nothing about, so `error` is the
 * truth — and a fast truthful failure beats a slow one.
 */
const BATCH_BUDGET_MS = 15_000;

export type WhmcsConfig = {
  /** The reseller's own API base, e.g. https://billing.example.com/api.php. */
  baseUrl: string;
  /** WHMCS API identity header value. */
  apiIdentifier: string;
  /** WHMCS API secret. Server-only, never serialised to a client. */
  apiSecret: string;
  /** WHMCS availability check URL, when it is not the default endpoint. */
  availabilityUrl?: string;
  /**
   * Extensions the reseller actually sells. Empty means undeclared, so nothing
   * is refused — see the note on `CloudflareConfig.supportedTlds`.
   */
  supportedTlds?: readonly string[];
};

/**
 * The only two fields of a WHMCS availability response this adapter reads.
 *
 * The API also returns `avail`, `premium_price`, `premium_renewal_price` and a
 * currency symbol. They are deliberately not declared here: declaring them
 * implies they are surfaced, and a premium name reported at a price this code
 * never looks at is worse than one reported without a price at all. Adding them
 * is the moment a premium figure starts appearing, and that needs a decision
 * about renewal rather than a type annotation.
 */
type WhmcsResponse = {
  status?: unknown;
  register_availability?: unknown;
};

function readNumber(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string' && input.trim() !== '') {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function whmcsProvider(config: WhmcsConfig): DomainProvider {
  return {
    id: 'whmcs',
    name: 'WHMCS',
    supportedTlds: config.supportedTlds ?? [],

    async check(domains): Promise<DomainCheck> {
      const checkedAt = checkedNow();
      const provider = 'WHMCS';

      const valid: string[] = [];
      for (const domain of domains.slice(0, MAX_BATCH)) {
        const parsed = assertFQDN(domain);
        if (parsed.ok) valid.push(parsed.value);
      }
      if (valid.length === 0) {
        return { ok: false, results: [], failure: 'error', provider, checkedAt };
      }

      // One name per request. WHMCS availability is a single-domain check, and
      // wrapping the batch in a loop is what keeps this adapter honest about
      // being a batch of authoritative single answers rather than one fuzzy
      // answer for a list.
      const results: DomainAvailability[] = [];
      const deadline = Date.now() + BATCH_BUDGET_MS;

      for (const domain of valid) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
          results.push({
            domain,
            state: 'error',
            premium: false,
            registration: null,
            renewal: null,
            provider,
            checkedAt,
            reason: 'The commerce provider was not reachable within this request.',
          });
          continue;
        }

        const url = new URL(config.availabilityUrl ?? config.baseUrl);
        url.searchParams.set('action', 'domain_availability');
        url.searchParams.set('domain', domain);
        url.searchParams.set('api_identifier', config.apiIdentifier);
        url.searchParams.set('api_secret', config.apiSecret);

        let payload: WhmcsResponse | null = null;

        try {
          const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(Math.min(TIMEOUT_MS, remainingMs)),
            headers: { Accept: 'application/json' },
          });
          if (response.ok) {
            const parsed = (await response.json()) as unknown;
            if (parsed && typeof parsed === 'object') payload = parsed as WhmcsResponse;
          }
        } catch {
          payload = null;
        }

        if (!payload) {
          // This one name could not be checked. Recorded as `error` on the
          // result itself so it appears in the field as a failure, and never
          // as a claim that the name is taken.
          results.push({
            domain,
            state: 'error',
            premium: false,
            registration: null,
            renewal: null,
            provider,
            checkedAt,
            reason: 'The commerce provider could not be reached for this name.',
          });
          continue;
        }

        const status = readNumber(payload.status);

        // WHMCS reports its own failures in the body rather than the status
        // code: a rejected credential or a disabled command comes back as
        // `status: "error"` on an HTTP 200. That is a request that was made and
        // failed, which is `error` — not an answer about the name, and not the
        // softer `unknown` either. It is the same class as the unreachable case
        // above and is reported the same way.
        const declaredFailure =
          typeof payload.status === 'string' && /^(error|fault|denied)$/i.test(payload.status.trim());

        if (declaredFailure) {
          results.push({
            domain,
            state: 'error',
            premium: false,
            registration: null,
            renewal: null,
            provider,
            checkedAt,
            // Deliberately not the provider's own description. It is a remote
            // string rendered to a visitor, and the fixed wording says the same
            // thing without letting an upstream phrase a verdict for us.
            reason: 'The commerce provider rejected the request, so nothing was established about this name.',
          });
          continue;
        }

        // `readNumber` yields `undefined` for anything that is not a finite
        // number, so this is the "no status at all" branch. It tested `=== null`
        // before, which no shape of response can reach, and every one of these
        // answers fell through to the unrecognised-status message instead.
        if (status === undefined) {
          results.push({
            domain,
            state: 'unknown',
            premium: false,
            registration: null,
            renewal: null,
            provider,
            checkedAt,
            reason: 'The commerce provider did not return a recognised status.',
          });
          continue;
        }

        // WHMCS: 1 available, -1 unknown, 0 taken. Anything else is a status
        // this adapter has not been taught, and is refused rather than guessed.
        if (status === 1) {
          const registerPrice = readNumber(payload.register_availability);
          results.push({
            domain,
            state: 'available',
            premium: false,
            registration: registerPrice === undefined ? null : money(registerPrice, 'USD', 2),
            renewal: null,
            provider,
            checkedAt,
          });
        } else if (status === 0) {
          results.push({
            domain,
            state: 'unavailable',
            premium: false,
            registration: null,
            renewal: null,
            provider,
            checkedAt,
          });
        } else if (status === -1) {
          results.push({
            domain,
            state: 'unknown',
            premium: false,
            registration: null,
            renewal: null,
            provider,
            checkedAt,
            reason: 'The commerce provider reported an unknown status.',
          });
        } else {
          results.push({
            domain,
            state: 'unknown',
            premium: false,
            registration: null,
            renewal: null,
            provider,
            checkedAt,
            reason: 'The commerce provider returned an unrecognised status code.',
          });
        }
      }

      return { ok: true, results, provider, checkedAt };
    },

    async suggest(input) {
      const label = input.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (label.length < 2) return [];
      return [label, `${label}s`, `${label}.io`, `${label}.co`].filter((value) => value.length > 1);
    },
  };
}
