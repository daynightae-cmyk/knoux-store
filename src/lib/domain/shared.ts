/**
 * Domain availability: the shape every layer agrees on.
 *
 * This module is deliberately isomorphic. It holds the vocabulary, the
 * normalisation rules and the display formatting, and it is imported by both
 * the server adapters and the browser's Domain Finder.
 *
 * It is split out of `provider.ts` — which is `server-only` — because the result
 * field has to render provider facts on the client, and a client module cannot
 * import a server-only one. Sharing one definition rather than two also means
 * the state a visitor sees and the state a provider produces cannot drift into
 * two vocabularies.
 *
 * The vocabulary is the important part. `available`, `unavailable` and
 * `premium` are claims about the public DNS/registry world, so they may only
 * ever come from a provider that actually asked. `unsupported`, `unknown`,
 * `unconfigured` and `error` are claims about *us* — about what we could not
 * establish.
 *
 * They are separate states on purpose, and the reason is stated once here
 * because it is the rule the whole feature rests on:
 *
 *   A network timeout is not "unavailable".
 *
 * Collapsing those two is how a registrar outage turns thousands of real
 * domains into false negatives in front of a customer who is about to spend
 * money on one. A visitor must be able to tell "this is taken" apart from "we
 * could not check", and this type is what makes that distinction impossible to
 * lose downstream.
 */

/** What the provider said, or what we know about our own failure to ask. */
export type DomainState =
  /** The provider answered and the name is registerable. */
  | 'available'
  /** The provider answered and the name is already registered. */
  | 'unavailable'
  /** The provider answered; the name is registerable at a premium price. */
  | 'premium'
  /** The provider does not carry this TLD at all. */
  | 'unsupported'
  /** The provider answered but not about this name. No claim either way. */
  | 'unknown'
  /** No provider is configured in this deployment. */
  | 'unconfigured'
  /** The provider was asked and the request failed. */
  | 'error';

/**
 * Prices are minor units in the provider's own currency, verbatim.
 *
 * They are never converted, never rounded into a marketing figure, and never
 * invented. `null` means the provider did not return a price, which is a
 * different statement from a price of zero.
 */
export type Money = {
  /** Minor units: 1250 with a 2-decimal currency is 12.50. */
  amount: number;
  currency: string;
  /** Decimal places the provider's currency actually uses. */
  exponent: number;
};

export type DomainAvailability = {
  /** The exact name that was checked, already normalised. */
  domain: string;
  state: DomainState;
  premium: boolean;
  registration: Money | null;
  renewal: Money | null;
  /** Human-readable provider name, e.g. "Cloudflare Registrar". */
  provider: string;
  /** ISO-8601 instant the check was made. */
  checkedAt: string;
  /** Why, in the visitor's language. Present for every non-`available` state. */
  reason?: string;
};

/** The outcome of asking one provider about a bounded set of names. */
export type DomainCheck = {
  ok: boolean;
  results: DomainAvailability[];
  /**
   * Set when the whole request failed, as opposed to individual results
   * carrying `state: 'error'`. The UI treats both as "could not check".
   */
  failure?: 'unconfigured' | 'error';
  provider?: string;
  checkedAt: string;
};

/* ------------------------------------------------------------ normalisation */

/**
 * Input handling, shared by every adapter and by the public route.
 *
 * Two separate jobs, deliberately not merged:
 *
 *   `parseQuery`  turns what a person typed into a candidate set. It accepts a
 *                 bare phrase ("my brand"), a name with no TLD, and a full
 *                 domain. It is permissive because a person is mid-typing.
 *
 *   `assertFQDN`  is the last gate before anything is sent upstream. It is
 *                 strict, because from here on the string is used to ask a
 *                 registrar about a real asset.
 */

const LABEL_MAX = 63;
const DOMAIN_MAX = 253;
const MAX_CANDIDATES = 12;

/**
 * TLDs offered as one-tap shortcuts.
 *
 * Selecting one is a request to check that extension, never a claim that it is
 * available or that a registrar carries it.
 */
export const TLD_SHORTCUTS: readonly string[] = ['com', 'ae', 'net', 'org', 'dev', 'store', 'io', 'co'];

/** A label is ASCII, no hyphen at either end, and within the DNS length limit. */
const LABEL_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD_PATTERN = /^[a-z]{2,24}$/;

/**
 * Folds accented input down to ASCII, and keeps existing punycode intact.
 *
 * A person typing "knöux" should reach `knoux`, not an error. Punycode is
 * already a real, resolvable label that registrars accept, so an explicit
 * `xn--` label is passed through rather than mangled.
 */
function toAsciiLabel(input: string): string | null {
  const normalised = input
    .normalize('NFKD')
    // Combining marks left behind by decomposition.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  const ascii = normalised.replace(/[^a-z0-9.-]/g, '');
  return ascii || null;
}

export type ParsedQuery = {
  /** Candidates to actually check, normalised and de-duplicated. */
  candidates: string[];
  /** TLDs requested, after the input was interpreted. */
  tlds: string[];
  /** Non-fatal notes about what was interpreted, shown to the visitor. */
  notes: string[];
  /** Why the input cannot be used, if it cannot. */
  invalid?: string;
};

/**
 * Interprets a typed query into concrete candidates.
 *
 * A bare phrase becomes one candidate per requested TLD. A full domain becomes
 * that domain plus the same TLD list, because "knoux.com" almost always means
 * "knoux.com and something better".
 */
export function parseQuery(rawInput: string, rawTlds?: readonly string[]): ParsedQuery {
  const notes: string[] = [];
  const requested = (rawTlds ?? [])
    .map((tld) => tld.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);
  const tlds = (requested.length ? requested : ['com']).filter((tld) => TLD_PATTERN.test(tld));

  if (tlds.length === 0) {
    return { candidates: [], tlds: [], notes, invalid: 'Choose at least one extension.' };
  }

  const cleaned = rawInput
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .replace(/\.+$/, '');

  if (!cleaned) {
    return { candidates: [], tlds, notes, invalid: 'Enter a name to search for.' };
  }

  if (cleaned.length > DOMAIN_MAX) {
    return { candidates: [], tlds, notes, invalid: 'That is longer than a domain name can be.' };
  }

  const label = toAsciiLabel(cleaned);
  if (!label) {
    return { candidates: [], tlds, notes, invalid: 'Use letters and numbers only.' };
  }

  // A single label means "find this name", not "check this one domain".
  if (!label.includes('.')) {
    if (!LABEL_PATTERN.test(label)) {
      return { candidates: [], tlds, notes, invalid: 'That name is not a valid domain label.' };
    }
    if (label.length < 2) {
      return { candidates: [], tlds, notes, invalid: 'Use at least two characters.' };
    }
    notes.push('Name interpreted as a domain label across the selected extensions.');
    return { candidates: tlds.map((tld) => `${label}.${tld}`).slice(0, MAX_CANDIDATES), tlds, notes };
  }

  const parts = label.split('.');
  const labelPart = parts[0] ?? '';
  const inputTld = parts[parts.length - 1] ?? '';

  if (!LABEL_PATTERN.test(labelPart)) {
    return { candidates: [], tlds, notes, invalid: 'That name is not a valid domain label.' };
  }

  if (!TLD_PATTERN.test(inputTld)) {
    return { candidates: [], tlds, notes, invalid: 'That extension is not a valid top-level domain.' };
  }

  // The typed domain is checked first. It is what the visitor actually meant.
  const exact = `${labelPart}.${inputTld}`;
  const others = tlds.filter((tld) => tld !== inputTld).map((tld) => `${labelPart}.${tld}`);

  return {
    candidates: [exact, ...others].slice(0, MAX_CANDIDATES),
    tlds: [inputTld, ...tlds.filter((tld) => tld !== inputTld)],
    notes,
  };
}

/**
 * The last gate before a string is sent to a registrar.
 *
 * `parseQuery` is permissive because it is parsing human intent. This is not:
 * everything after this point is a request about a real domain name, so an
 * unresolvable name is refused rather than forwarded.
 */
export function assertFQDN(domain: string): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof domain !== 'string') return { ok: false, reason: 'Not a domain name.' };
  const value = domain.trim().toLowerCase();
  if (!value || value.length > DOMAIN_MAX) return { ok: false, reason: 'Not a domain name.' };

  // A trailing root dot is legal in DNS but never what a registrar contract wants.
  const bare = value.endsWith('.') ? value.slice(0, -1) : value;
  const parts = bare.split('.');
  if (parts.length < 2) return { ok: false, reason: 'A domain needs an extension.' };

  const tld = parts[parts.length - 1] ?? '';
  if (!TLD_PATTERN.test(tld)) return { ok: false, reason: 'That extension is not supported.' };

  for (const part of parts) {
    if (part.length > LABEL_MAX) return { ok: false, reason: 'Part of that name is too long.' };
    if (!LABEL_PATTERN.test(part)) return { ok: false, reason: 'That name is not a valid domain name.' };
  }

  return { ok: true, value: bare };
}

/* ------------------------------------------- accounting for every name asked */

/**
 * Which names may be sent upstream, and which the provider cannot carry.
 *
 * The distinction is drawn from a declared TLD list rather than inferred from a
 * failed request, because a registrar that does not carry an extension answers a
 * query about it the same way a registrar that is having a bad minute does: with
 * something that looks like "no". Reading that as "taken" would be a lie with a
 * real cost — the visitor concludes a name is gone when nobody ever established
 * that it was for sale.
 *
 * An empty or absent list means the provider makes no claim about which
 * extensions it carries, and the only correct reading of that is silence: every
 * name stays checkable and none is reported as unsupported. That default is the
 * safe direction, because an out-of-date list can only ever produce a *false*
 * "unsupported" — a name the registrar would happily have checked.
 */
export function partitionCandidates(
  requested: readonly string[],
  supportedTlds: readonly string[] | undefined,
): { checkable: string[]; unsupported: string[] } {
  const carried = normaliseTlds(supportedTlds);
  if (!carried) return { checkable: [...requested], unsupported: [] };

  const checkable: string[] = [];
  const unsupported: string[] = [];
  for (const domain of requested) {
    const tld = domain.slice(domain.lastIndexOf('.') + 1).toLowerCase();
    (carried.has(tld) ? checkable : unsupported).push(domain);
  }
  return { checkable, unsupported };
}

/**
 * One result per name asked about, in the order they were asked.
 *
 * This is the guarantee the result field rests on, and it exists because the
 * alternative fails quietly. A registrar asked about three names can answer
 * about two — it drops an unresolvable name, it truncates a batch, one call
 * fails while the others succeed. Passing the provider's array straight through
 * renders "2 names checked" for a three-name search, and the missing name is
 * then indistinguishable from a name that was checked and found available. A
 * visitor reads the absence as a fact.
 *
 * So every requested name gets a row, and a name the registrar did not answer
 * about gets `unknown` with the reason stated. `unknown` is the honest state
 * here, and it is not a fallback chosen for convenience: it is the only one of
 * the six that means "we asked and it did not come back". `unavailable` would be
 * a fabricated negative, and a synthesised `available` would be worse.
 *
 * A provider's own answer always wins over anything derived here. This function
 * only ever fills gaps.
 */
export function reconcileCandidates(
  requested: readonly string[],
  answered: readonly DomainAvailability[],
  context: { provider: string; checkedAt: string; supportedTlds?: readonly string[] },
): DomainAvailability[] {
  const answeredByName = new Map(answered.map((result) => [result.domain, result]));
  const carried = normaliseTlds(context.supportedTlds);

  return requested.map((domain) => {
    const hit = answeredByName.get(domain);
    if (hit) return hit;

    const checked = assertFQDN(domain);
    const name = checked.ok ? checked.value : domain;
    const tld = name.slice(name.lastIndexOf('.') + 1).toLowerCase();

    // Only a *declared* list can refuse a name. An undeclared list means the
    // operator said nothing, and saying nothing must never become a refusal.
    const refused = carried !== null && !carried.has(tld);

    const reason = refused
      ? `${context.provider} does not carry .${tld}, so no availability answer was requested for it.`
      : 'The registrar returned no answer for this name, so no claim is made either way.';

    return {
      domain: name,
      state: refused ? 'unsupported' : 'unknown',
      premium: false,
      registration: null,
      renewal: null,
      provider: context.provider,
      checkedAt: context.checkedAt,
      reason,
    } satisfies DomainAvailability;
  });
}

/**
 * A declared TLD list, or `null` when the provider has declared none.
 *
 * `null` and `[]` are deliberately the same value here. An operator who has not
 * said which extensions a registrar carries has said nothing, and nothing must
 * not be read as "none of them".
 */
function normaliseTlds(supportedTlds: readonly string[] | undefined): Set<string> | null {
  if (!supportedTlds || supportedTlds.length === 0) return null;
  const carried = supportedTlds
    .map((tld) => tld.trim().replace(/^\./, '').toLowerCase())
    .filter((tld) => TLD_PATTERN.test(tld));
  return carried.length === 0 ? null : new Set(carried);
}

/* ----------------------------------------------------------------- helpers */

export function money(amount: number, currency: string, exponent: number): Money | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (!/^[A-Z]{3}$/i.test(currency)) return null;
  return { amount, currency: currency.toUpperCase(), exponent };
}

/**
 * Formats provider money for display, exactly as the provider reported it.
 *
 * No conversion, no currency assumption, no "from" price. If the provider said
 * 12.50 USD it reads 12.50 USD; if it said nothing, nothing is shown.
 */
export function formatMoney(value: Money | null | undefined): string | null {
  if (!value) return null;
  const { amount, currency, exponent } = value;
  const major = amount / 10 ** exponent;
  const rendered = major.toLocaleString('en-US', {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
  return `${rendered} ${currency}`;
}

export function checkedNow(): string {
  return new Date().toISOString();
}
