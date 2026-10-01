import 'server-only';

import { assertFQDN, checkedNow, money, type DomainAvailability, type DomainCheck } from '../shared';
import type { DomainProvider } from '../provider';

/**
 * Namecheap adapter.
 *
 * Contract: `namecheap.domains.check`.
 * https://www.namecheap.com/support/api/methods/domains/check/
 *
 * Namecheap answers in XML, not JSON, and two details of that response decide
 * whether this adapter is honest or merely confident:
 *
 *   - `available="false"` is the only thing that means "taken". A missing
 *     attribute means the request did not resolve, and is mapped to `unknown`.
 *   - A registered result may carry a `premiumregistration` child element. Its
 *     presence is what makes a name premium; its price is only quoted when
 *     Namecheap publishes one.
 *
 * A premium name that Namecheap does not price is reported as premium with a
 * null price. Filling that gap with the standard rate would be the exact
 * fabrication this boundary exists to prevent: a premium renewal is routinely a
 * multiple of the list price, and a customer would budget from it.
 */

const ENDPOINT = 'https://api.namecheap.com/xml.response';
const TIMEOUT_MS = 8000;
const MAX_BATCH = 20;

export type NamecheapConfig = {
  apiUser: string;
  apiKey: string;
  /**
   * Namecheap requires the caller's public IP with every request. On a server
   * that is this deployment's own address, so it is configuration rather than
   * something to guess from the incoming request — an incoming address is
   * client-controlled and would make every call fail intermittently.
   */
  clientIp?: string;
  /**
   * Extensions this account can register. Empty means undeclared, so nothing is
   * refused — see the note on `CloudflareConfig.supportedTlds`.
   */
  supportedTlds?: readonly string[];
};

type Entry = {
  domain: string;
  available: boolean | null;
  premium: boolean;
  price?: string;
  currency?: string;
};

function readNumber(input: unknown): number | undefined {
  if (typeof input !== 'string' || input.trim() === '') return undefined;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Pulls the `<DomainResult>` entries out of the response.
 *
 * Hand-rolled because the payload is XML and this project does not depend on an
 * XML parser. The extraction is narrow on purpose: only the four attributes and
 * the one child element documented for this method are read, and nothing is
 * passed through as markup.
 */
function parseEntries(xml: string): Entry[] {
  const entries: Entry[] = [];
  const pattern = /<DomainResult\b([^>]*?)(?:\/>|>([\s\S]*?)<\/DomainResult>)/gi;
  let match = pattern.exec(xml);

  while (match !== null) {
    const attributes = match[1] ?? '';
    const body = match[2] ?? '';

    const domain = /\bDomain="([^"]*)"/i.exec(attributes)?.[1] ?? '';
    const rawAvailable = /\bavailable="([^"]*)"/i.exec(attributes)?.[1];

    if (domain) {
      const premium = /<PremiumRegistration\b/i.test(body);
      entries.push({
        domain,
        // Only an explicit "false" is a negative answer. Anything else is an
        // absence, and an absence is not a claim.
        available: rawAvailable === undefined ? null : rawAvailable.toLowerCase() === 'true',
        premium,
        price: /<PremiumPrice\b[^>]*>([\d.]+)/i.exec(body)?.[1],
        currency: /<Currency\b[^>]*>([A-Za-z]{3})/i.exec(body)?.[1],
      });
    }

    match = pattern.exec(xml);
  }

  return entries;
}

function normalise(entry: Entry, checkedAt: string): DomainAvailability | null {
  const checked = assertFQDN(entry.domain);
  if (!checked.ok) return null;

  const provider = 'Namecheap';

  if (entry.available === null) {
    return {
      domain: checked.value,
      state: 'unknown',
      premium: false,
      registration: null,
      renewal: null,
      provider,
      checkedAt,
      reason: 'The registrar did not return a verdict for this name.',
    };
  }

  if (!entry.available) {
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

  if (entry.premium) {
    const amount = readNumber(entry.price);
    return {
      domain: checked.value,
      state: 'premium',
      premium: true,
      registration: amount === undefined ? null : money(Math.round(amount * 100), entry.currency ?? 'USD', 2),
      renewal: null,
      provider,
      checkedAt,
      reason: 'Premium registration. Renewal pricing is quoted by the registrar at checkout.',
    };
  }

  return {
    domain: checked.value,
    state: 'available',
    premium: false,
    // namecheap.domains.check returns no price for a standard name. It is
    // left absent; the registrar's own checkout is the price of record.
    registration: null,
    renewal: null,
    provider,
    checkedAt,
  };
}

export function namecheapProvider(config: NamecheapConfig): DomainProvider {
  return {
    id: 'namecheap',
    name: 'Namecheap',
    supportedTlds: config.supportedTlds ?? [],

    async check(domains): Promise<DomainCheck> {
      const checkedAt = checkedNow();

      const valid: string[] = [];
      for (const domain of domains.slice(0, MAX_BATCH)) {
        const parsed = assertFQDN(domain);
        if (parsed.ok) valid.push(parsed.value);
      }
      if (valid.length === 0) {
        return { ok: false, results: [], failure: 'error', provider: 'Namecheap', checkedAt };
      }

      const params = new URLSearchParams({
        ApiUser: config.apiUser,
        ApiKey: config.apiKey,
        UserName: config.apiUser,
        ClientIp: config.clientIp ?? '127.0.0.1',
        Command: 'namecheap.domains.check',
        DomainList: valid.join(','),
      });

      let response: Response;
      try {
        response = await fetch(`${ENDPOINT}?${params.toString()}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { Accept: 'application/xml' },
        });
      } catch {
        return { ok: false, results: [], failure: 'error', provider: 'Namecheap', checkedAt };
      }

      if (!response.ok) {
        return { ok: false, results: [], failure: 'error', provider: 'Namecheap', checkedAt };
      }

      let xml: string;
      try {
        xml = await response.text();
      } catch {
        return { ok: false, results: [], failure: 'error', provider: 'Namecheap', checkedAt };
      }

      // A Namecheap error response is a 200 with a status of ERROR, so the
      // transport succeeded while the API did not. Both are failures, and
      // neither is a verdict about any domain.
      if (/>\s*ERROR\s*</i.test(xml) || /Status="ERROR"/i.test(xml)) {
        return { ok: false, results: [], failure: 'error', provider: 'Namecheap', checkedAt };
      }

      const entries = parseEntries(xml);
      if (entries.length === 0) {
        return { ok: false, results: [], failure: 'error', provider: 'Namecheap', checkedAt };
      }

      const results = entries
        .map((entry) => normalise(entry, checkedAt))
        .filter((entry): entry is DomainAvailability => entry !== null);

      if (results.length === 0) {
        return { ok: false, results: [], failure: 'error', provider: 'Namecheap', checkedAt };
      }

      return { ok: true, results, provider: 'Namecheap', checkedAt };
    },

    async suggest(input) {
      const label = input.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (label.length < 2) return [];
      return [label, `${label}s`, `${label}hq`, `${label}.co`].filter((value) => value.length > 1);
    },
  };
}
