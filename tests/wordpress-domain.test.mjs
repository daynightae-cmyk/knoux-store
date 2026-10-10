import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTypeScript } from './load.mjs';
import { root } from './helpers.mjs';

/**
 * The domain layer, asserted on the rules it exists to enforce.
 *
 * Everything here is about one failure mode: a product that looks confident
 * about a domain it never asked anyone about. The three ways that happens, and
 * the three tests that close them:
 *
 *   1. A transport failure reported as "taken". The visitor then pays for a
 *      domain that was free, or worse, decides the name is bad when it is not.
 *   2. A price, a premium flag or a currency that no provider returned.
 *   3. A provider selected when its credentials are not actually all present.
 *
 * The suite is offline, like every other file here. That matters more than usual
 * for this one: a test that could only pass by reaching a registrar would be a
 * test that passes exactly when there is something to be wrong about.
 */

const { parseQuery, assertFQDN, formatMoney, money, partitionCandidates, reconcileCandidates } =
  await loadTypeScript('../src/lib/domain/shared.ts');
const { activeDomainProvider } = await loadTypeScript('../src/lib/domain/index.ts');

const AT = '2026-10-01T12:00:00.000Z';
const PROVIDER = 'Test Registrar';

/** A provider answer, built only from facts a provider could have returned. */
function answered(domain, state, extra = {}) {
  return {
    domain,
    state,
    premium: false,
    registration: null,
    renewal: null,
    provider: PROVIDER,
    checkedAt: AT,
    ...extra,
  };
}

/**
 * Source with comments removed but string literals intact.
 *
 * `codeOnly` from the shared helpers also blanks every literal, which is right
 * for a test about structure and wrong for this file: the whole question here
 * is which *words* a component is capable of rendering, so the words have to
 * survive. Comments still have to go, because these sources explain at length
 * why a number must not appear, and an assertion would otherwise match the
 * explanation of the rule instead of a violation of it.
 */
function sourceOf(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/* --------------------------------------- a failure is never a negative result */

test('an unconfigured deployment is a state, not an error and not a verdict', () => {
  // The empty environment is the real default for this repository: no registrar
  // has been configured. The product must stay useful while saying so.
  const active = activeDomainProvider({});
  assert.equal(active.provider, null, 'no provider may be selected from an empty environment');
  assert.equal(active.status, 'unconfigured');
  assert.ok(active.explanation.length > 10, 'the unconfigured state must explain itself');
});

test('a partly configured provider is named but never selected', () => {
  // A provider missing one credential fails at its first request. Selecting it
  // anyway would convert an operator's configuration mistake into a visitor
  // staring at an error page, so it is treated as absent and named instead.
  const partial = activeDomainProvider({ KNOUX_DOMAIN_CLOUDFLARE_TOKEN: 'set-but-account-is-not' });
  assert.equal(partial.provider, null, 'a half-configured provider must not be selected');
  assert.equal(partial.status, 'partially-configured');
  assert.match(partial.explanation, /cloudflare/, 'the operator is told which provider is incomplete');
  // And critically: the explanation must not echo the value that was set.
  assert.doesNotMatch(partial.explanation, /set-but-account-is-not/, 'no environment value may appear in output');
});

test('a fully configured provider is selected, and its name is the only thing exposed', () => {
  const active = activeDomainProvider({
    KNOUX_DOMAIN_CLOUDFLARE_ACCOUNT_ID: 'acct-123',
    KNOUX_DOMAIN_CLOUDFLARE_TOKEN: 'super-secret-token-value',
  });
  assert.ok(active.provider, 'a complete provider configuration must be selected');
  assert.equal(active.status, 'configured');
  // The whole point of the boundary: a name crosses it, a credential does not.
  const serialised = JSON.stringify(active);
  assert.doesNotMatch(serialised, /super-secret-token-value/, 'a token must never be serialised into a status');
  assert.doesNotMatch(serialised, /acct-123/, 'an account id must never be serialised into a status');
});

/* ------------------------------------------------------ no provider selected */

test('exactly one provider is active when two are configured', () => {
  const active = activeDomainProvider({
    KNOUX_DOMAIN_CLOUDFLARE_ACCOUNT_ID: 'acct-123',
    KNOUX_DOMAIN_CLOUDFLARE_TOKEN: 'token',
    KNOUX_DOMAIN_NAMECHEAP_API_USER: 'user',
    KNOUX_DOMAIN_NAMECHEAP_API_KEY: 'key',
  });
  // Two providers would mean two different answers to the same question, and
  // the result field shows one answer with one provider named on it.
  assert.ok(active.provider, 'a provider is selected');
  assert.ok(['Cloudflare Registrar', 'Namecheap'].includes(active.provider.name));
});

/* --------------------------------------------------------- input handling */

test('a bare phrase becomes one candidate per selected extension', () => {
  const parsed = parseQuery('my brand', ['com', 'ae']);
  assert.deepEqual(parsed.candidates, ['mybrand.com', 'mybrand.ae']);
  assert.equal(parsed.invalid, undefined);
});

test('a full domain is checked first, then the same name on other extensions', () => {
  const parsed = parseQuery('knoux.com', ['net', 'dev']);
  assert.equal(parsed.candidates[0], 'knoux.com', 'the typed domain is what the visitor meant');
  assert.ok(parsed.candidates.includes('knoux.net'));
  assert.ok(parsed.candidates.includes('knoux.dev'));
});

test('a protocol, a path and a www prefix are stripped rather than refused', () => {
  for (const input of ['https://knoux.com/path?q=1', 'www.knoux.com', 'knoux.com/']) {
    const parsed = parseQuery(input, ['com']);
    assert.equal(parsed.candidates[0], 'knoux.com', `${input} must resolve to knoux.com`);
  }
});

test('accented input folds to ascii instead of erroring', () => {
  const parsed = parseQuery('knöux', ['com']);
  assert.equal(parsed.candidates[0], 'knoux.com');
});

test('existing punycode is preserved rather than mangled', () => {
  const parsed = parseQuery('xn--knoux-5qa.com', ['com']);
  assert.equal(parsed.candidates[0], 'xn--knoux-5qa.com');
});

test('unusable input is refused with a reason, not silently emptied', () => {
  for (const input of ['', '   ', 'a', 'has space.com/x'.slice(0, 3)]) {
    const parsed = parseQuery(input, ['com']);
    if (input.trim() === '') {
      assert.ok(parsed.invalid, 'an empty query must say why it is empty');
      assert.deepEqual(parsed.candidates, []);
    }
  }
  assert.ok(parseQuery('a', ['com']).invalid, 'a single character is not a domain label');
  assert.ok(parseQuery('ab', ['.123']).invalid, 'an invalid extension is refused');
});

test('the candidate list is bounded', () => {
  const many = Array.from({ length: 20 }, (_, index) => `tld${index}`);
  const parsed = parseQuery('knoux', many);
  assert.ok(parsed.candidates.length <= 12, 'a visitor cannot make us check an unbounded list');
});

/* ------------------------------------------ the last gate before a registrar */

test('assertFQDN refuses everything that is not a real domain name', () => {
  for (const bad of ['', 'knoux', 'knoux.', '..', 'a'.repeat(64) + '.com', 'knoux.123', '-knoux.com', 'knoux-.com']) {
    assert.equal(assertFQDN(bad).ok, false, `${bad} must be refused before it reaches a registrar`);
  }
  assert.equal(assertFQDN('knoux.com').ok, true);
  assert.equal(assertFQDN('KNOUX.com').value, 'knoux.com', 'a name is lower-cased, not rejected for case');
});

/* ------------------------------------- every name asked about is accounted for */

test('a name the registrar did not answer about is reported, not dropped', () => {
  // The failure this closes. A registrar asked about three names can answer
  // about two — it drops an unresolvable name, it truncates a batch. Passing its
  // array straight through renders "2 names checked" for a three-name search,
  // and the missing name becomes indistinguishable from one that was checked
  // and found available. A visitor reads that absence as a fact.
  const requested = ['knoux.com', 'knoux.ae', 'knoux.dev'];
  const results = reconcileCandidates(
    requested,
    [answered('knoux.com', 'unavailable'), answered('knoux.ae', 'available')],
    { provider: PROVIDER, checkedAt: AT },
  );

  assert.equal(results.length, requested.length, 'every requested name must come back');
  assert.deepEqual(
    results.map((r) => r.domain),
    requested,
    'and in the order they were asked',
  );

  const missed = results[2];
  assert.equal(missed.state, 'unknown', 'an unanswered name makes no claim either way');
  assert.equal(missed.registration, null, 'an unanswered name has no price');
  assert.ok(missed.reason, 'and says why it is blank rather than leaving a hole');
});

test('a synthesised result never becomes a verdict', () => {
  // The specific trap: filling the gap with the tidiest-looking answer.
  const results = reconcileCandidates(['knoux.com', 'knoux.ae'], [answered('knoux.com', 'unavailable')], {
    provider: PROVIDER,
    checkedAt: AT,
  });
  const gap = results[1];
  assert.notEqual(gap.state, 'available', 'a gap must not be reported as registerable');
  assert.notEqual(gap.state, 'unavailable', 'a gap must not be reported as taken');
  assert.notEqual(gap.state, 'error', 'a gap is not a failure to ask; it is an answer that did not come');
  assert.equal(gap.state, 'unknown');
});

test("a provider's own answer always wins over anything derived", () => {
  // Reconciliation fills gaps and only gaps. If the registrar answered, that
  // answer is a fact and the derived state must not overwrite it.
  const results = reconcileCandidates(['knoux.com'], [answered('knoux.com', 'premium', { premium: true })], {
    provider: PROVIDER,
    checkedAt: AT,
  });
  assert.equal(results[0].state, 'premium', 'a real verdict is passed through untouched');
  assert.equal(results[0].premium, true);
  assert.equal(results[0].reason, undefined, 'and keeps the reason the provider gave it');
});

/* -------------------------------------------------------- unsupported TLDs */

test('an extension the provider does not carry is unsupported, and is never sent upstream', () => {
  const requested = ['knoux.com', 'knoux.ae', 'knoux.zzzzz'];
  const declared = ['com', 'ae'];

  const { checkable, unsupported } = partitionCandidates(requested, declared);
  assert.deepEqual(checkable, ['knoux.com', 'knoux.ae'], 'only carried extensions reach the registrar');
  assert.deepEqual(unsupported, ['knoux.zzzzz'], 'the rest are answered from the declared list');

  // Nothing was asked about it, so it must not acquire a verdict from nowhere.
  const results = reconcileCandidates(requested, [answered('knoux.com', 'unavailable'), answered('knoux.ae', 'available')], {
    provider: PROVIDER,
    checkedAt: AT,
    supportedTlds: declared,
  });
  const refused = results[2];
  assert.equal(refused.state, 'unsupported');
  assert.equal(refused.registration, null, 'an unsupported extension has no price to publish');
  assert.ok(refused.reason, 'and states which provider declined it');
});

test('an undeclared TLD list makes no claim, so nothing is refused', () => {
  // This is the direction that matters. A hardcoded registrar catalogue goes
  // stale, and a stale list can only ever produce a false "unsupported" — a
  // name the registrar would have checked, refused in the interface. So an
  // absent or empty declaration has to mean silence, and the default
  // deployment must keep checking everything.
  const requested = ['knoux.com', 'knoux.zzzzz'];
  for (const declared of [undefined, []]) {
    const { checkable, unsupported } = partitionCandidates(requested, declared);
    assert.deepEqual(checkable, requested, `declared=${JSON.stringify(declared)} must not refuse anything`);
    assert.deepEqual(unsupported, []);

    const results = reconcileCandidates(requested, [], {
      provider: PROVIDER,
      checkedAt: AT,
      supportedTlds: declared,
    });
    assert.equal(results[1].state, 'unknown', 'an undeclared list yields unknown, never unsupported');
  }
});

test('a declared TLD list is matched case-insensitively and accepts dotted entries', () => {
  const { checkable, unsupported } = partitionCandidates(['knoux.com', 'knoux.AE'], ['.COM', ' ae ']);
  assert.deepEqual(checkable, ['knoux.com', 'knoux.AE']);
  assert.deepEqual(unsupported, []);
});

/* ------------------------------------------------------------------ money */
test('money is rendered exactly as reported, or not at all', () => {
  assert.equal(formatMoney(money(1250, 'usd', 2)), '12.50 USD');
  assert.equal(formatMoney(null), null, 'an absent price is an absence, not a zero');
  assert.equal(formatMoney(undefined), null);
});

test('an implausible price is refused at the boundary', () => {
  assert.equal(money(-1, 'USD', 2), null, 'a negative amount is not a price');
  assert.equal(money(Number.NaN, 'USD', 2), null);
  assert.equal(money(1000, 'DOLLARS', 2), null, 'a currency must be an ISO code');
});

/* ------------------------------------------- the source states its honesty */

test('the finder cannot render a verdict it was not given', () => {
  const finder = sourceOf('src/components/wordpress/DomainFinder.tsx');
  // Every non-positive state is rendered from the provider's own vocabulary,
  // through one declared table. A verdict assembled ad hoc in JSX is a verdict
  // the browser produced rather than received, which is the failure this layer
  // exists to prevent.
  assert.match(finder, /STATE_COPY/, 'result states must come from one declared table');
  assert.match(
    finder,
    /Record<DomainAvailability\['state'\]/,
    'the table must be keyed by the provider state union, so a new state cannot render unlabelled',
  );
  // And the failure branches must be visibly distinct from a negative result.
  assert.match(finder, /phase: 'unconfigured'/, 'unconfigured is a state of its own');
  assert.match(finder, /phase: 'error'/, 'an upstream failure is a state of its own');
  // A missing price says so in words, rather than leaving a blank a reader
  // would be free to fill in with a guess.
  assert.match(finder, /Not published/, 'an absent price is stated, not left blank');
});

test('the API route never answers "unavailable" for a failed check', () => {
  const route = sourceOf('src/app/api/domain/search/route.ts');
  assert.match(route, /state: 'unconfigured'/, 'the unconfigured state is a real answer');
  assert.match(route, /state: 'error'/, 'a provider failure is reported as a failure');
  // The route never invents the vocabulary a registrar owns. A result state is
  // either passed through from the adapter or absent.
  assert.doesNotMatch(route, /state: 'unavailable'/, 'the route must not invent a verdict vocabulary');
  assert.doesNotMatch(route, /state: 'available'/, 'the route must not invent a verdict vocabulary');
});

test('a description list holds only descriptions, not stray block elements', () => {
  /*
   * The same defect class as the paragraph-in-paragraph this page already fixed,
   * one level down and much quieter. A `div` group inside a `<dl>` may contain
   * only `dt` followed by `dd`. A `<span>` after the `dd` breaks that rule, and
   * because the stylesheet gives it `display:block` it is a block element sitting
   * exactly where only a description may sit.
   *
   * Nothing reports it. React does not validate `dl` content models, so there is
   * no hydration warning; every browser renders it identically, so it cannot be
   * found by looking. It is only wrong in the specification, which is why it has
   * to be asserted rather than discovered.
   */
  const page = sourceOf('src/app/wordpress/page.tsx');

  const ledger = page.slice(page.indexOf('<dl className="eco-ledger"'));
  assert.ok(ledger.length > 0, 'the ledger is a description list');

  // Every ledger group is exactly a term followed by one or more descriptions.
  for (const group of ledger.split('<div>').slice(1)) {
    const body = group.slice(0, group.indexOf('</div>'));
    const tags = body.match(/<(dt|dd|span|p|div|ul)\b/g) ?? [];
    const kinds = [...new Set(tags.map((t) => t.slice(1)))];
    assert.equal(tags[0], '<dt', 'a ledger group starts with its term');
    for (const kind of kinds) {
      assert.ok(
        kind === 'dt' || kind === 'dd',
        `a <dl> group may contain only dt and dd; found <${kind}> in "${body.replace(/\s+/g, ' ').trim().slice(0, 90)}"`,
      );
    }
    // And the description carrying the caption is a real <dd>, not a styled span.
    assert.match(body, /<dd className="eco-ledger__note">/, 'the ledger caption is a second description');
  }
});

test('the search route reconciles every candidate instead of forwarding the provider array', () => {
  const route = sourceOf('src/app/api/domain/search/route.ts');
  assert.match(route, /reconcileCandidates/, 'every requested name must be accounted for');
  assert.match(route, /partitionCandidates/, 'and an uncarried extension refused before it is asked about');

  // The shape this replaces: the provider's array handed straight to the client,
  // which renders a short answer as a complete one.
  assert.doesNotMatch(
    route,
    /results:\s*result\.results\s*[,}]/,
    "the provider's array must never be forwarded unreconciled",
  );
});

test('the hosting surface publishes no invented commercial figure', () => {
  const rack = sourceOf('src/components/wordpress/HostingRack.tsx');

  // The rule is about *figures*, not about the word "price". Saying "no prices
  // are published here" is the honest version of this section and must not
  // fail a test whose purpose is to stop prices being published. So what is
  // banned is a number attached to a commercial claim, or a currency at all.
  assert.doesNotMatch(rack, /AED|USD|EUR|GBP|\bAED\b/, 'no currency may appear in a surface with no provider');
  assert.doesNotMatch(rack, /\b\d+(\.\d+)?\s?(GB|MB|TB|CPU|cores?|vCPU)\b/i, 'no resource limit may be invented');
  assert.doesNotMatch(rack, /\b\d{1,3}(\.\d+)?\s?%/, 'no percentage, including uptime, may be invented');
  assert.doesNotMatch(rack, /\b\d+(\.\d+)?\s?\/\s?(mo|month|yr|year|annum)\b/i, 'no billing period may be invented');
  assert.doesNotMatch(rack, /[$€£]\s?\d/, 'no currency symbol attached to an amount');
  assert.doesNotMatch(rack, /\b(save|off)\s+\d+|\d+% off/i, 'no discount may be invented');

  // The absence is stated rather than quietly omitted, and the boundary names
  // who is actually responsible for the uptime figure.
  assert.match(rack, /NOT CONFIGURED/, 'the absence of a commerce provider is stated');
  assert.match(rack, /No hosting commerce provider is connected/, 'and it is explained');
  assert.match(
    rack,
    /infrastructure provider supplies[\s\S]*uptime commitment/,
    'uptime is named as the provider\'s commitment, not a KNOuX promise',
  );
});

test('the composer is a request, not a checkout', () => {
  const composer = sourceOf('src/components/wordpress/EcosystemComposer.tsx');

  // An affordance, not vocabulary. "not a checkout" is the copy that has to be
  // there, so banning the word would ban the disclosure. What must not exist is
  // a payment path: a form posting anywhere, a purchase verb on a control, or
  // a payment provider.
  assert.doesNotMatch(composer, /<form/i, 'the composer must not own a second intake form');
  assert.doesNotMatch(composer, /stripe|paypal|checkout\.com|braintree|square/i, 'no payment provider');
  assert.doesNotMatch(composer, /add to cart|buy now|order now|pay now|proceed to payment/i, 'no purchase affordance');

  // And the absence is disclosed, which is the part a visitor actually needs.
  assert.match(composer, /not a checkout/, 'the absence of checkout is stated');
  assert.match(composer, /no payment is taken here/, 'and that no payment is taken is stated');

  // It hands off to the one existing request path rather than adding a second
  // intake that would need its own delivery and validation.
  assert.match(composer, /\/contact\?/, 'the composition routes into the existing request form');
  assert.match(composer, /requestType: 'wordpress'/, 'and carries the request type that form already reads');
});

test('the server-only boundary is on the modules that hold credentials', () => {
  // The marker is what stops a registrar key being bundled for the browser, and
  // the test resolver deliberately selects the marker's no-op half in order to
  // execute these modules. So the property is asserted on the source instead of
  // being taken on trust.
  for (const relativePath of [
    'src/lib/domain/index.ts',
    'src/lib/domain/provider.ts',
    'src/lib/domain/providers/cloudflare.ts',
    'src/lib/domain/providers/namecheap.ts',
    'src/lib/domain/providers/whmcs.ts',
  ]) {
    assert.match(sourceOf(relativePath), /import ['"]server-only['"]/, `${relativePath} must be server-only`);
  }

  // The isomorphic module must NOT be marked, or the browser could not render a
  // provider result at all. Both directions are the same guarantee.
  assert.doesNotMatch(
    sourceOf('src/lib/domain/shared.ts'),
    /import ['"]server-only['"]/,
    'the shared result model must stay importable from a client component',
  );

  // A route handler is server-side by framework guarantee, so it carries no
  // marker of its own. What matters there is that it reaches the credentials
  // only through the marked module — never by reading a secret itself.
  const search = sourceOf('src/app/api/domain/search/route.ts');
  assert.match(search, /from '@\/lib\/domain'/, 'the search route reaches the provider through the boundary');
  assert.doesNotMatch(search, /process\.env/, 'the route must not read a credential directly');
  assert.doesNotMatch(search, /import 'server-only'/, 'a route handler needs no marker; it is server-side already');
});

test('no domain credential can reach the browser through a public variable', () => {
  const index = sourceOf('src/lib/domain/index.ts');
  for (const name of ['KNOUX_DOMAIN_CLOUDFLARE_TOKEN', 'KNOUX_DOMAIN_NAMECHEAP_API_KEY', 'KNOUX_DOMAIN_WHMCS_API_SECRET']) {
    assert.doesNotMatch(
      index,
      new RegExp(`NEXT_PUBLIC[\\w]*${name}`),
      `${name} must never be exposed through a NEXT_PUBLIC variable`,
    );
  }
  // Every credential read in this layer is an unprefixed server variable.
  const reads = index.match(/env\.(KNOUX_DOMAIN_\w+)/g) ?? [];
  assert.ok(reads.length > 0, 'the layer reads its configuration from the environment');
  for (const read of reads) {
    assert.doesNotMatch(read, /NEXT_PUBLIC/, 'no KNOuX_DOMAIN_* variable may be browser-visible');
  }

  // The status endpoint is the one place a client can read provider state, so it
  // is the one place that would leak if it over-reported.
  const status = sourceOf('src/app/api/domain/status/route.ts');
  assert.match(status, /active\.provider\?\.name/, 'only the provider name may cross to the client');
  assert.doesNotMatch(status, /accountId|apiKey|apiSecret|\.token|config\b/, 'no configuration value may cross');
});

test('the ecosystem page reads no provider configuration while statically generated', () => {
  const page = sourceOf('src/app/wordpress/page.tsx');
  // Reading process.env into a statically generated page bakes the answer in at
  // build time. The state has to be fetched at request time instead, or a
  // registrar connected after a build would go unmentioned.
  assert.doesNotMatch(
    page,
    /activeDomainProvider/,
    'the page must not read provider configuration during a static build',
  );
  assert.doesNotMatch(page, /process\.env/, 'the page must not read the environment');
});

test('the overview loads a bounded studio selection and leaves other directories on demand', () => {
  const page = sourceOf('src/app/wordpress/page.tsx');
  // One cached official request supplies the studio, never one per preview.
  assert.match(page, /queryThemes\(\{ perPage: 6 \}\)/, 'the studio receives a bounded official theme selection');
  assert.doesNotMatch(page, /queryPlugins|queryBlocks|queryPatterns/, 'other directories remain on-demand');
  assert.doesNotMatch(page, /featuredPlugins|featuredThemes/);
});

test('the gateway is a router and a report, and reads the real registry', () => {
  const gateway = sourceOf('src/components/wordpress/WordPressLibraryGateway.tsx');
  assert.match(gateway, /wordPressItems/, 'the KNOuX release count is read from the registry');
  assert.doesNotMatch(gateway, /queryPlugins|queryThemes/, 'the gateway must not preload a directory');
  // Provenance is stated in visible text, and the four external categories stay
  // separate from the KNOuX rail.
  assert.match(gateway, /Source: WordPress\.org/);
});

test('the six chapters are present and in the order the work happens', () => {
  const page = sourceOf('src/app/wordpress/page.tsx');
  const order = ['id="domain"', 'id="infrastructure"', 'id="library"', 'id="operate"', 'id="launch"'];
  let cursor = -1;
  for (const anchor of order) {
    const at = page.indexOf(anchor);
    assert.ok(at > cursor, `chapter ${anchor} must appear after the previous one`);
    cursor = at;
  }
  // Each chapter is a real section with an id, and the stylesheet reserves
  // room for the fixed header so an anchor does not land underneath it.
  for (const anchor of order) {
    assert.match(page, new RegExp(`<section[^>]*${anchor}`), `${anchor} must be a real section landmark`);
  }
  const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
  assert.match(css, /\.eco-section\s*\{[^}]*scroll-margin-top/, 'and the stylesheet offsets them from the header');
});

test('globals.css has one line-ending convention, or the build silently drops it', () => {
  /**
   * A trap this repository actually fell into while building this feature, kept
   * as a test because the symptom pointed nowhere near the cause.
   *
   * The stylesheet was edited with a tool that appended CRLF into a file that
   * was otherwise LF. `next build` then reported success — no warning, no error
   * — and emitted no CSS for the file at all. Every page rendered unstyled,
   * with the default Times New Roman body font and an 8px margin, while lint,
   * typecheck, the build and all 222 tests still reported green. The only thing
   * that revealed it was reading a computed style in a real browser.
   *
   * The source is perfectly valid CSS throughout, so no assertion about the
   * stylesheet's contents would ever have caught it. PostCSS parses the mixed
   * file without complaint; the bundler is what refuses it. So the invariant is
   * asserted directly, on the one file the whole site depends on.
   *
   * It lives here rather than in a build-tools file because this suite is the
   * one that was extended to cover the stylesheet the ecosystem chapters live
   * in, and a test that guards a file belongs beside the tests that read it.
   */
  const css = readFileSync(join(root, 'src', 'app', 'globals.css'), 'utf8');
  const crlf = (css.match(/\r\n/g) ?? []).length;
  const bareLf = (css.match(/\n/g) ?? []).length - crlf;

  assert.ok(
    bareLf === 0 || crlf === 0,
    `globals.css mixes line endings: ${crlf} CRLF and ${bareLf} bare LF. ` +
      'The bundler drops a stylesheet with mixed endings without reporting it, so the ' +
      'entire site renders unstyled while lint, typecheck, build and tests all pass. ' +
      'Normalise the file before building.',
  );
});
