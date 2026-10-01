import 'server-only';

import { assertFQDN, checkedNow, money, type DomainAvailability, type DomainCheck } from '../shared';
import type { DomainProvider } from '../provider';

/**
 * Cloudflare Registrar adapter.
 *
 * Contract: Cloudflare Registrar API, `POST
 * /client/v4/accounts/{account_id}/registrar/domains/check`.
 * https://developers.cloudflare.com/registrar/registrar-api/
 *
 * Two Cloudflare endpoints are commonly confused, and picking the wrong one is
 * how a "live availability" surface ends up reporting a registrar's catalogue
 * search as an availability answer:
 *
 *   Search  — discovery. It finds names similar to what you typed.
 *   Check   — the authoritative pre-registration answer for a specific name.
 *
 * Only Check is used here. Search is a suggestion engine, and its results are
 * not availability claims; routing them into this type would be exactly the
 * fabrication the product forbids.
 *
 * Price fields are passed through in the provider's currency. Cloudflare bills
 * Cloudflare Registrar names in USD and returns the number, so nothing is
 * converted or rounded here.
 */

const ENDPOINT = 'https://api.cloudflare.com/client/v4/accounts';
const TIMEOUT_MS = 6000;
const MAX_BATCH = 20;

type CloudflareResult = {
  id?: unknown;
  available?: unknown;
  premium?: unknown;
  price?: unknown;
  currency?: unknown;
  premium_price?: unknown;
  // Cloudflare returns a reason string on some failure shapes.
  message?: unknown;
};

export type CloudflareConfig = {
  accountId: string;
  token: string;
  /**
   * Extensions the account can actually register.
   *
   * Empty means undeclared, not "none": Cloudflare's catalogue is large and
   * changes often enough that a list frozen into this source would eventually
   * refuse extensions the account sells. So it is declared by whoever owns the
   * account, and until they do, nothing is refused.
   */
  supportedTlds?: readonly string[];
};

function readNumber(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string' && input.trim() !== '') {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Cloudflare reports price as a decimal major amount, not minor units.
 * The shared `Money` type is minor units, so the exponent is fixed at 2 and the
 * value is converted once, here, at the edge.
 */
function toMoney(value: unknown, currency: unknown) {
  const amount = readNumber(value);
  if (amount === undefined) return null;
  return money(Math.round(amount * 100), typeof currency === 'string' ? currency : 'USD', 2);
}

function normalise(entry: CloudflareResult, provider: string, checkedAt: string): DomainAvailability | null {
  const domain = typeof entry.id === 'string' ? entry.id : null;
  if (!domain) return null;
  const checked = assertFQDN(domain);
  if (!checked.ok) return null;

  const premium = entry.premium === true;
  const available = entry.available === true;

  if (!available && !premium) {
    return {
      domain: checked.value,
      state: 'unavailable',
      premium: false,
      registration: null,
      renewal: null,
      provider,
      checkedAt,
    };
  }

  const registration = toMoney(premium ? entry.premium_price : entry.price, entry.currency);

  return {
    domain: checked.value,
    state: premium ? 'premium' : 'available',
    premium,
    registration,
    // Cloudflare's check response carries no renewal price. It is shown as
    // absent rather than copied from the registration price, because a renewal
    // rate is a different commercial fact and guessing it would be a lie a
    // customer could act on.
    renewal: null,
    provider,
    checkedAt,
    reason: premium ? 'Registerable at a premium price reported by the registrar.' : undefined,
  };
}

export function cloudflareProvider(config: CloudflareConfig): DomainProvider {
  return {
    id: 'cloudflare',
    name: 'Cloudflare Registrar',
    supportedTlds: config.supportedTlds ?? [],

    async check(domains): Promise<DomainCheck> {
      const checkedAt = checkedNow();

      const valid: string[] = [];
      for (const domain of domains.slice(0, MAX_BATCH)) {
        const parsed = assertFQDN(domain);
        if (parsed.ok) valid.push(parsed.value);
      }
      if (valid.length === 0) {
        return { ok: false, results: [], failure: 'error', provider: 'Cloudflare Registrar', checkedAt };
      }

      let response: Response;
      try {
        response = await fetch(`${ENDPOINT}/${encodeURIComponent(config.accountId)}/registrar/domains/check`, {
          method: 'POST',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ domains: valid }),
        });
      } catch {
        // Transport failure. Deliberately `error`, never `unavailable`.
        return { ok: false, results: [], failure: 'error', provider: 'Cloudflare Registrar', checkedAt };
      }

      if (!response.ok) {
        return { ok: false, results: [], failure: 'error', provider: 'Cloudflare Registrar', checkedAt };
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return { ok: false, results: [], failure: 'error', provider: 'Cloudflare Registrar', checkedAt };
      }

      if (!payload || typeof payload !== 'object') {
        return { ok: false, results: [], failure: 'error', provider: 'Cloudflare Registrar', checkedAt };
      }

      const root = payload as { success?: unknown; result?: unknown; errors?: unknown };
      if (root.success !== true || !Array.isArray(root.result)) {
        return { ok: false, results: [], failure: 'error', provider: 'Cloudflare Registrar', checkedAt };
      }

      const results = (root.result as CloudflareResult[])
        .map((entry) => normalise(entry, 'Cloudflare Registrar', checkedAt))
        .filter((entry): entry is DomainAvailability => entry !== null);

      if (results.length === 0) {
        return { ok: false, results: [], failure: 'error', provider: 'Cloudflare Registrar', checkedAt };
      }

      return { ok: true, results, provider: 'Cloudflare Registrar', checkedAt };
    },

    /**
     * Cloudflare's own catalogue search is a discovery surface, not an
     * availability answer, and this product keeps those two apart. So the
     * suggestion step is syntactic and is labelled as such wherever it
     * appears.
     */
    async suggest(input) {
      const parsed = assertFQDN(`${input.replace(/\./g, '')}.com`);
      if (!parsed.ok) return [];
      const label = parsed.value.split('.')[0] ?? '';
      return [label, `${label}s`, `${label}hq`, `get${label}`].filter((value) => value.length > 1);
    },
  };
}
