import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * Metric normalisation and derivation — behavioural.
 *
 * The contract under test is that absence is preserved. A provider that does not
 * report revenue must produce a null ROAS, not zero and not a borrowed number,
 * because both of those would be a false statement about a client's advertising.
 */

const {
  normaliseRow,
  deriveMetrics,
  mergeMetrics,
  sumSourced,
  formatMetric,
  NORMALISERS,
  PROVIDERS,
} = await import('../src/lib/growth/metrics.ts');

const { fixture, live } = await import('../src/lib/growth/states.ts');

const LIVE = { origin: 'LIVE', evidence: 'test' };
const META = { origin: 'LIVE', evidence: 'meta.marketing_api.insights' };

/* ------------------------------------------------------------- meta rows */

test('a Meta row normalises reach but never produces revenue', () => {
  const metrics = normaliseRow(
    'meta',
{ spend: 1000, impressions: 200000, reach: 64000, clicks: 3000, leads: 30, calls: 12 },
    META,
  );

  assert.equal(metrics.spend.value, 1000);
  assert.equal(metrics.reach.value, 64000);
  assert.equal(metrics.leads.value, 30);
  assert.equal(
    metrics.revenue,
    undefined,
    'Meta does not report conversion value, so the key must be absent rather than zero',
  );
  assert.equal(metrics.spend.origin, 'LIVE');
  assert.match(metrics.spend.evidence, /meta/, 'a live metric must carry the call that produced it');
});

test('Meta conversions are matched by action type, not array position', () => {
  const metrics = normaliseRow(
    'meta',
    {
      action_values: [
        { action_type: 'link_click', value: 3000 },
        { action_type: 'lead', value: 17 },
        { action_type: 'purchase', value: 2 },
      ],
    },
    LIVE,
  );
  assert.equal(metrics.leads.value, 17);
  assert.equal(metrics.clicks.value, 3000, 'link_click must land in clicks, not be skipped');
});

test('a missing Meta field is absent, not zero', () => {
  const metrics = normaliseRow('meta', { clicks: 500 }, LIVE);
  assert.equal(metrics.spend, undefined);
  assert.equal(metrics.reach, undefined);
  assert.equal(metrics.leads, undefined);
});

/* -------------------------------------------------------- google ads rows */

test('Google Ads cost is read from micro-units', () => {
  const metrics = normaliseRow('google_ads', { cost_micros: 12_500_000 }, LIVE);
  assert.equal(metrics.spend.value, 12.5, 'micros must be divided by 1e6');
});

test('an absent micro value falls through rather than becoming NaN', () => {
  const withCost = normaliseRow('google_ads', { cost: 42.5 }, LIVE);
  assert.equal(withCost.spend.value, 42.5);

  const withNeither = normaliseRow('google_ads', { impressions: 100 }, LIVE);
  assert.equal(withNeither.spend, undefined, 'no cost field at all must yield an absent metric');
});

test('Google Ads reports conversion value, which gives ROAS an input', () => {
  const metrics = normaliseRow('google_ads', { cost_micros: 10_000_000, conversions_value: 40 }, LIVE);
  assert.equal(metrics.revenue.value, 40);
  const derived = deriveMetrics(metrics);
  assert.ok(derived.roas, 'revenue and spend both present, so ROAS must compute');
  assert.equal(derived.roas.value, 4);
});

test('Google Ads Search reports no reach', () => {
  const metrics = normaliseRow('google_ads', { impressions: 1000, clicks: 80 }, LIVE);
  assert.equal(metrics.reach, undefined);
  assert.ok(metrics.impressions);
});

/* ------------------------------------------------------------- derivation */

test('a derived ratio is null when either input is absent', () => {
  const metrics = normaliseRow('meta', { impressions: 1000 }, LIVE);
  const derived = deriveMetrics(metrics);
  assert.equal(derived.ctr, null, 'clicks are absent');
  assert.equal(derived.cpc, null, 'spend is absent');
  assert.equal(derived.cpm, null, 'spend is absent');
  assert.equal(derived.roas, null, 'no revenue and no spend');
});

test('a derived ratio is null when the divisor is zero', () => {
  const derived = deriveMetrics({
    clicks: live(10, 'x'),
    impressions: live(0, 'x'),
  });
  assert.equal(derived.ctr, null, 'a zero denominator must yield null rather than Infinity');
});

test('a ratio never mixes a live number with a fixture number', () => {
  const derived = deriveMetrics({
    clicks: live(100, 'meta'),
    impressions: fixture(1000),
  });
  assert.equal(
    derived.ctr,
    null,
    'a live-over-fixture ratio is not a metric and must be refused',
  );
});

test('a live ratio records that it was derived rather than reported', () => {
  const derived = deriveMetrics({
    spend: live(100, 'meta.marketing_api.insights'),
    leads: live(4, 'meta.marketing_api.insights'),
  });
  assert.equal(derived.costPerLead.value, 25);
  assert.equal(derived.costPerLead.origin, 'LIVE');
  assert.match(derived.costPerLead.evidence, /derived/);
});

/* ----------------------------------------------------------------- merging */

test('merging refuses to blend provenances and keeps the single-population value', () => {
  const merged = mergeMetrics([
    { clicks: live(10, 'meta'), spend: live(100, 'meta') },
    { clicks: fixture(5), leads: fixture(2) },
  ]);
  assert.equal(merged.clicks.origin, 'LIVE', 'the first value stands; the fixture must not overwrite');
  assert.equal(merged.leads.origin, 'FIXTURE');
});

test('summing a mixed population returns null rather than a blended total', () => {
  const mixed = sumSourced([live(10, 'a'), fixture(20)]);
  assert.equal(mixed, null, 'a total spanning live and fixture data is not a real total');

  const uniform = sumSourced([live(10, 'a'), live(20, 'a')]);
  assert.equal(uniform.value, 30);
  assert.equal(uniform.origin, 'LIVE');

  assert.equal(sumSourced([]), null);
});

/* ---------------------------------------------------------------- display */

test('an absent metric formats as not reported, never as zero', () => {
  const formatted = formatMetric(null);
  assert.equal(formatted.available, false);
  assert.equal(formatted.text, 'Not reported');
  assert.equal(formatted.origin, null);
});

test('a present metric formats with its provenance attached', () => {
  const liveValue = formatMetric(live(1234.5, 'meta'), { kind: 'currency' });
  assert.equal(liveValue.available, true);
  assert.equal(liveValue.origin, 'LIVE');

  const demoValue = formatMetric(fixture(1234.5), { kind: 'currency' });
  assert.equal(demoValue.available, true);
  assert.equal(demoValue.origin, 'FIXTURE');
});

/* -------------------------------------------------------------- registry */

test('every declared provider has a normaliser', () => {
  for (const provider of PROVIDERS) {
    assert.ok(
      NORMALISERS.some((entry) => entry.provider === provider),
      `${provider} is declared but cannot be normalised`,
    );
  }
});

test('an unknown provider normalises to nothing rather than throwing', () => {
  assert.deepEqual(normaliseRow('not_a_provider', { spend: 1 }, LIVE), {});
});
