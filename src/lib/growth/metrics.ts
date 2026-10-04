/**
 * KNOuX Growth — canonical metrics and provider normalisation.
 *
 * The whole point of this module is that a provider's vocabulary and KNOuX's
 * canonical vocabulary are different things, and the conversion between them
 * is the only place where that translation is allowed to happen. After
 * normalisation, nothing above this layer knows what an `actions` or a
 * `cost_per_lead` is.
 *
 * Two rules are load-bearing:
 *
 *  1. Absence is preserved. Meta reports `reach` and no `revenue`; Google Ads
 *     reports `revenue` and no `reach` for Search. A missing metric stays
 *     missing. It never becomes 0, and it is never derived from a sibling.
 *  2. Provenance travels with the number. `Sourced` means a fixture cannot be
 *     rendered as a provider fact even if a caller forgets to check.
 */

import { fixture, live, type DataOrigin, type Sourced } from './states';
import type { CanonicalMetrics, DerivedMetrics } from './types';

/** Providers KNOuX normalises from. Anything else is not yet a data source. */
export const PROVIDERS = ['meta', 'google_ads', 'google_business', 'ga4', 'search_console', 'whatsapp', 'knox'] as const;

export type ProviderId = (typeof PROVIDERS)[number];

export type ProviderNormaliser = {
  provider: ProviderId;
  /** Platform ids this normaliser covers. */
  platforms: readonly string[];
  /**
   * Maps one provider row into canonical metrics. Must return only the fields
   * the provider genuinely supplied; omitting a key is the correct way to say
   * "this provider does not report that".
   */
  normalise(row: Record<string, unknown>, context: { origin: DataOrigin; evidence?: string }): CanonicalMetrics;
};

const SOURCES = {
  meta: { origin: 'LIVE' as const, evidence: 'meta.marketing_api.insights' },
  google_ads: { origin: 'LIVE' as const, evidence: 'googleads.googleapis.ads.search' },
  google_business: { origin: 'LIVE' as const, evidence: 'mybusiness.googleapis.performance' },
  ga4: { origin: 'LIVE' as const, evidence: 'analyticsdata.googleapis.runReport' },
  search_console: { origin: 'LIVE' as const, evidence: 'searchconsole.googleapis.searchAnalytics' },
  whatsapp: { origin: 'LIVE' as const, evidence: 'graph.facebook.com.whatsapp_business' },
};

type Numeric = number;

function num(value: unknown): Numeric | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function wrap(context: { origin: DataOrigin; evidence?: string }) {
  return (value: Numeric): Sourced<Numeric> =>
    context.origin === 'LIVE' ? live(value, context.evidence ?? 'provider') : fixture(value);
}

/**
 * Meta Marketing API insights.
 *
 * Note the deliberate omissions: Meta never supplies `revenue` or `sales`, and
 * `reach` and `impressions` are distinct there (one is people, one is
 * impressions). A Meta row therefore produces no `roas` input at all.
 */
const metaNormaliser: ProviderNormaliser = {
  provider: 'meta',
  platforms: ['facebook', 'instagram', 'meta_ads'],
  normalise(row, context) {
    const s = wrap(context);
    const out: CanonicalMetrics = {};

    const spend = num(row.spend ?? row.amount_spent);
    if (spend !== undefined) out.spend = s(spend);

    const impressions = num(row.impressions);
    if (impressions !== undefined) out.impressions = s(impressions);

    const reach = num(row.reach);
    if (reach !== undefined) out.reach = s(reach);

    const clicks = num(row.clicks ?? row.inline_link_clicks);
    if (clicks !== undefined) out.clicks = s(clicks);

    const leads = num(row.leads ?? row.action_values?.[1]?.value);
    if (leads !== undefined) out.leads = s(leads);

    const calls = num(row.calls);
    if (calls !== undefined) out.calls = s(calls);

    const whatsappStarts = num(row.whatsapp_starts ?? row.action_values?.[0]?.value);
    if (whatsappStarts !== undefined) out.whatsappStarts = s(whatsappStarts);

    return out;
  },
};

/**
 * Google Ads search campaigns.
 *
 * Google Ads reports conversions and cost in micro-units (1e6) and in the
 * account's own currency, which is why the API layer must divide before it
 * reaches here. `reach` has no meaning for Search and is simply not produced.
 */
const googleAdsNormaliser: ProviderNormaliser = {
  provider: 'google_ads',
  platforms: ['google_ads', 'google_search', 'google_maps'],
  normalise(row, context) {
    const s = wrap(context);
    const out: CanonicalMetrics = {};

    const spend = num(row.cost_micros !== undefined ? num(row.cost_micros) / 1e6 : row.cost);
    if (spend !== undefined) out.spend = s(spend);

    const impressions = num(row.impressions);
    if (impressions !== undefined) out.impressions = s(impressions);

    const clicks = num(row.clicks);
    if (clicks !== undefined) out.clicks = s(clicks);

    const conversions = num(row.conversions);
    if (conversions !== undefined) out.leads = s(conversions);

    const revenue = num(row.conversions_value);
    if (revenue !== undefined) out.revenue = s(revenue);

    const calls = num(row.all_conversions);
    if (calls !== undefined && conversions === undefined) out.calls = s(calls);

    return out;
  },
};

const googleBusinessNormaliser: ProviderNormaliser = {
  provider: 'google_business',
  platforms: ['google_business'],
  normalise(row, context) {
    const s = wrap(context);
    const out: CanonicalMetrics = {};

    const websiteClicks = num(row.websiteClicks ?? row.website_clicks);
    if (websiteClicks !== undefined) out.clicks = s(websiteClicks);

    const calls = num(row.calls);
    if (calls !== undefined) out.calls = s(calls);

    const directions = num(row.directions ?? row.directionRequests);
    if (directions !== undefined) out.leads = s(directions);

    const bookingIntervals = num(row.bookings ?? row.bookingIntervals);
    if (bookingIntervals !== undefined) out.bookings = s(bookingIntervals);

    return out;
  },
};

const ga4Normaliser: ProviderNormaliser = {
  provider: 'ga4',
  platforms: ['ga4'],
  normalise(row, context) {
    const s = wrap(context);
    const out: CanonicalMetrics = {};

    const sessions = num(row.sessions);
    if (sessions !== undefined) out.clicks = s(sessions);

    const screenPageViews = num(row.screenPageViews);
    if (screenPageViews !== undefined) out.impressions = s(screenPageViews);

    const conversions = num(row.keyEvents ?? row.conversions);
    if (conversions !== undefined) out.leads = s(conversions);

    const revenue = num(row.totalRevenue);
    if (revenue !== undefined) out.revenue = s(revenue);

    return out;
  },
};

const searchConsoleNormaliser: ProviderNormaliser = {
  provider: 'search_console',
  platforms: ['search_console'],
  normalise(row, context) {
    const s = wrap(context);
    const out: CanonicalMetrics = {};

    const impressions = num(row.impressions);
    if (impressions !== undefined) out.impressions = s(impressions);

    const clicks = num(row.clicks);
    if (clicks !== undefined) out.clicks = s(clicks);

    return out;
  },
};

const whatsappNormaliser: ProviderNormaliser = {
  provider: 'whatsapp',
  platforms: ['whatsapp'],
  normalise(row, context) {
    const s = wrap(context);
    const out: CanonicalMetrics = {};

    const starts = num(row.starts ?? row.conversation_started);
    if (starts !== undefined) out.whatsappStarts = s(starts);

    const leads = num(row.leads);
    if (leads !== undefined) out.leads = s(leads);

    return out;
  },
};

export const NORMALISERS: readonly ProviderNormaliser[] = [
  metaNormaliser,
  googleAdsNormaliser,
  googleBusinessNormaliser,
  ga4Normaliser,
  searchConsoleNormaliser,
  whatsappNormaliser,
];

export function normaliserFor(provider: ProviderId): ProviderNormaliser | undefined {
  return NORMALISERS.find((entry) => entry.provider === provider);
}

export function normaliseRow(
  provider: ProviderId,
  row: Record<string, unknown>,
  context: { origin: DataOrigin; evidence?: string },
): CanonicalMetrics {
  const normaliser = normaliserFor(provider);
  if (!normaliser) return {};
  return normaliser.normalise(row, context);
}

/* ------------------------------------------------------------------ derived */

/**
 * A derived ratio exists only when both of its inputs exist and its divisor is
 * non-zero. Anything else yields `null`, which the UI renders as an explicit
 * "not reported" rather than as `0` or `—`.
 */
function ratio(
  numerator: Sourced<number> | undefined,
  denominator: Sourced<number> | undefined,
  fn: (n: number, d: number) => number,
): Sourced<number> | null {
  if (!numerator || !denominator) return null;
  if (denominator.value === 0) return null;
  // Never mix a live number with a fixture number into a single ratio.
  if (numerator.origin !== denominator.origin) return null;

  const value = fn(numerator.value, denominator.value);
  if (!Number.isFinite(value)) return null;

  return {
    value,
    origin: numerator.origin,
    evidence: numerator.origin === 'LIVE' ? `derived from ${numerator.evidence}` : undefined,
  };
}

export function deriveMetrics(metrics: CanonicalMetrics): DerivedMetrics {
  const { spend, clicks, impressions, leads, qualifiedLeads, bookings, revenue } = metrics;

  return {
    ctr: ratio(clicks, impressions, (c, i) => (c / i) * 100),
    cpc: ratio(spend, clicks, (sp, c) => sp / c),
    cpm: ratio(spend, impressions, (sp, i) => (sp / i) * 1000),
    roas: ratio(revenue, spend, (r, sp) => r / sp),
    costPerLead: ratio(spend, leads, (sp, l) => sp / l),
    costPerQualifiedLead: ratio(spend, qualifiedLeads, (sp, q) => sp / q),
    costPerBooking: ratio(spend, bookings, (sp, b) => sp / b),
  };
}

/** Merges canonical metrics, refusing to blend different provenances. */
export function mergeMetrics(sets: CanonicalMetrics[]): CanonicalMetrics {
  const out: CanonicalMetrics = {};
  for (const set of sets) {
    for (const [key, value] of Object.entries(set) as [keyof CanonicalMetrics, Sourced<number>][]) {
      if (!value) continue;
      const existing = out[key];
      if (existing && existing.origin !== value.origin) continue;
      out[key] = value;
    }
  }
  return out;
}

/** Sum of a sourced metric across rows, preserving provenance or refusing. */
export function sumSourced(values: (Sourced<number> | undefined)[]): Sourced<number> | null {
  const present = values.filter((value): value is Sourced<number> => Boolean(value));
  if (present.length === 0) return null;
  const origin = present[0].origin;
  if (present.some((value) => value.origin !== origin)) return null;
  const total = present.reduce((acc, value) => acc + value.value, 0);
  return { value: total, origin, evidence: origin === 'LIVE' ? present[0].evidence : undefined };
}

/** Formats a possibly-absent metric for display without inventing a value. */
export function formatMetric(
  value: Sourced<number> | null | undefined,
  options: { kind?: 'currency' | 'percent' | 'number'; currency?: string; digits?: number } = {},
): { text: string; origin: DataOrigin | null; available: boolean } {
  if (!value) return { text: 'Not reported', origin: null, available: false };

  const digits = options.digits ?? 2;
  const { kind = 'number', currency = 'AED' } = options;

  let text: string;
  if (kind === 'currency') {
    text = `${currency} ${value.value.toFixed(digits)}`;
  } else if (kind === 'percent') {
    text = `${value.value.toFixed(digits)}%`;
  } else {
    text = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(value.value);
  }

  return { text, origin: value.origin, available: true };
}