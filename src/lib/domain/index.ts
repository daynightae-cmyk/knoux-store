import 'server-only';

import { cloudflareProvider, type CloudflareConfig } from './providers/cloudflare';
import { namecheapProvider, type NamecheapConfig } from './providers/namecheap';
import { whmcsProvider, type WhmcsConfig } from './providers/whmcs';
import { checkedNow, type DomainCheck } from './shared';
import type { DomainProvider } from './provider';

/**
 * Which registrar answers, decided entirely by server configuration.
 *
 * A repository search of this codebase found no configured registrar, and this
 * module is written on the assumption that is still true: by default there is
 * no provider, and the product must remain useful while saying so honestly.
 *
 * The selection rules, in order:
 *
 *   1. A provider is chosen only when *every* variable it needs is present.
 *      A half-configured provider is treated as absent, because a provider that
 *      is missing one credential fails at the first request — and a first
 *      request is a real user staring at an error instead of a clear message.
 *   2. Exactly one provider is active. Two configured providers would mean two
 *      different answers to the same question, and this product shows one
 *      result field with one provider named on it.
 *   3. Nothing here is ever exposed to the browser. The route returns states
 *      and provider *names*; credentials stay on this side of the boundary.
 *
 * The alternative — hardwiring Cloudflare because its documentation was the
 * first one read — is precisely what the provider architecture reference
 * forbids, and it would make every other backend a fork.
 */

export type ProviderId = 'cloudflare' | 'namecheap' | 'whmcs';

type Env = Record<string, string | undefined>;

/**
 * Reads an operator-declared TLD list, e.g. `KNOUX_DOMAIN_CLOUDFLARE_TLDS`.
 *
 * Comma or whitespace separated. An absent or empty value yields an empty list,
 * which every consumer reads as "this provider makes no claim about which
 * extensions it carries" — so a deployment that has not declared one keeps
 * checking everything, and a stale one can never manufacture a false
 * "unsupported".
 *
 * This is configuration rather than a constant on purpose. Registrar TLD
 * catalogues change without notice, and a hardcoded list in the source would
 * start denying extensions the registrar sells — a false negative shown to a
 * customer as a fact. Whoever owns the registrar account owns the list.
 */
function readTlds(env: Env, name: string): string[] {
  const raw = env[name];
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((tld) => tld.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);
}

function readConfig(env: Env): { provider: DomainProvider | null; candidates: ProviderId[]; reason: string } {
  const cloudflare: CloudflareConfig | null =
    env.KNOUX_DOMAIN_CLOUDFLARE_ACCOUNT_ID && env.KNOUX_DOMAIN_CLOUDFLARE_TOKEN
      ? {
          accountId: env.KNOUX_DOMAIN_CLOUDFLARE_ACCOUNT_ID,
          token: env.KNOUX_DOMAIN_CLOUDFLARE_TOKEN,
          supportedTlds: readTlds(env, 'KNOUX_DOMAIN_CLOUDFLARE_TLDS'),
        }
      : null;

  const namecheap: NamecheapConfig | null =
    env.KNOUX_DOMAIN_NAMECHEAP_API_USER && env.KNOUX_DOMAIN_NAMECHEAP_API_KEY
      ? {
          apiUser: env.KNOUX_DOMAIN_NAMECHEAP_API_USER,
          apiKey: env.KNOUX_DOMAIN_NAMECHEAP_API_KEY,
          clientIp: env.KNOUX_DOMAIN_NAMECHEAP_CLIENT_IP,
          supportedTlds: readTlds(env, 'KNOUX_DOMAIN_NAMECHEAP_TLDS'),
        }
      : null;

  const whmcs: WhmcsConfig | null =
    env.KNOUX_DOMAIN_WHMCS_BASE_URL && env.KNOUX_DOMAIN_WHMCS_API_IDENTIFIER && env.KNOUX_DOMAIN_WHMCS_API_SECRET
      ? {
          baseUrl: env.KNOUX_DOMAIN_WHMCS_BASE_URL,
          apiIdentifier: env.KNOUX_DOMAIN_WHMCS_API_IDENTIFIER,
          apiSecret: env.KNOUX_DOMAIN_WHMCS_API_SECRET,
          availabilityUrl: env.KNOUX_DOMAIN_WHMCS_AVAILABILITY_URL,
          supportedTlds: readTlds(env, 'KNOUX_DOMAIN_WHMCS_TLDS'),
        }
      : null;

  // A provider that is partly configured is *named* so the operator can see
  // what is missing, but it is never selected.
  const candidates: ProviderId[] = [];
  if (env.KNOUX_DOMAIN_CLOUDFLARE_ACCOUNT_ID || env.KNOUX_DOMAIN_CLOUDFLARE_TOKEN) candidates.push('cloudflare');
  if (env.KNOUX_DOMAIN_NAMECHEAP_API_USER || env.KNOUX_DOMAIN_NAMECHEAP_API_KEY) candidates.push('namecheap');
  if (
    env.KNOUX_DOMAIN_WHMCS_BASE_URL ||
    env.KNOUX_DOMAIN_WHMCS_API_IDENTIFIER ||
    env.KNOUX_DOMAIN_WHMCS_API_SECRET
  ) {
    candidates.push('whmcs');
  }

  // WhMCS wins if set, because it is a reseller surface that would be
  // configured last and deliberately override a direct registrar.
  if (whmcs) return { provider: whmcsProvider(whmcs), candidates, reason: 'Configured: WHMCS' };
  if (cloudflare) return { provider: cloudflareProvider(cloudflare), candidates, reason: 'Configured: Cloudflare' };
  if (namecheap) return { provider: namecheapProvider(namecheap), candidates, reason: 'Configured: Namecheap' };

  return { provider: null, candidates, reason: 'No registrar credentials are configured in this environment.' };
}

export function activeDomainProvider(env: Env = process.env): {
  provider: DomainProvider | null;
  status: 'configured' | 'unconfigured' | 'partially-configured';
  /** Safe to show a visitor: names and counts, never values. */
  explanation: string;
} {
  const { provider, candidates, reason } = readConfig(env);

  if (provider) {
    return { provider, status: 'configured', explanation: 'A registrar is configured for this deployment.' };
  }

  if (candidates.length > 0) {
    const names = candidates.join(', ');
    return {
      provider: null,
      status: 'partially-configured',
      explanation: `Credentials for ${names} are present but incomplete. Every variable a provider needs must be set before it can be used.`,
    };
  }

  return { provider: null, status: 'unconfigured', explanation: reason };
}

/**
 * Runs a check through whichever provider is configured, or reports honestly
 * that none is.
 *
 * The unconfigured result is a real `DomainCheck` with `failure: 'unconfigured'`
 * rather than a thrown error, because "this deployment has no registrar" is a
 * state the product renders on purpose, not a fault.
 */
export async function runDomainCheck(
  domains: readonly string[],
  env: Env = process.env,
): Promise<DomainCheck> {
  const { provider } = activeDomainProvider(env);

  if (!provider) {
    return { ok: false, results: [], failure: 'unconfigured', checkedAt: checkedNow() };
  }

  return provider.check(domains);
}
