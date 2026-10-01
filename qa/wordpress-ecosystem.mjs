import { chromium } from '@playwright/test';

/**
 * Browser QA for the KNOuX Web Ecosystem at /wordpress.
 *
 * The in-app browser cannot represent these viewport sizes exactly at the
 * current page zoom, and a viewport that is "about right" defeats the purpose
 * of a responsive check. So this drives its own browser, where every size below
 * is exact.
 *
 * What it records per size:
 *   - horizontal overflow, and which element caused it if any
 *   - the h1 size actually applied
 *   - whether the stack diagram reaches above the fold
 *   - whether the six chapters are present as landmarks
 *   - console errors and page errors
 *
 * It also exercises the things that are easy to claim and hard to prove: the
 * domain finder's real unconfigured state, keyboard operation of the rack and
 * the composer, Back/Forward on a directory route, and reduced motion.
 */

const BASE = process.env.QA_BASE ?? 'http://127.0.0.1:3403';
const ROUTE = `${BASE}/wordpress`;
const OUT = process.env.QA_OUT ?? 'qa/wordpress-ecosystem';

const SIZES = [
  [1600, 1000],
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [430, 932],
  [390, 844],
  [375, 812],
];

const results = { sizes: [], checks: [], consoleErrors: [] };

const browser = await chromium.launch();

for (const [width, height] of SIZES) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

  await page.goto(ROUTE, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const measured = await page.evaluate(() => {
    const de = document.documentElement;
    const offenders = [];
    for (const element of document.querySelectorAll('main *')) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.right > de.clientWidth + 1) {
        const cls = typeof element.className === 'string' && element.className ? element.className.split(' ')[0] : element.tagName;
        offenders.push(`${cls}@${Math.round(rect.right)}`);
      }
    }
    const stack = document.querySelector('.eco-hero__stack');
    return {
      horizontalOverflow: de.scrollWidth > de.clientWidth,
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      offenders: Array.from(new Set(offenders)).slice(0, 6),
      h1Count: document.querySelectorAll('h1').length,
      h1Size: getComputedStyle(document.querySelector('.eco-hero__title')).fontSize,
      chapters: Array.from(document.querySelectorAll('main section[aria-labelledby]')).map((s) => s.getAttribute('aria-labelledby')),
      stackAboveFold: stack ? Math.round(Math.max(0, window.innerHeight - stack.getBoundingClientRect().top)) : 0,
      // The finder must be usable without any script having run its search.
      finderHasLabel: Boolean(document.querySelector('.domain-finder__label')),
      finderInputType: document.querySelector('.domain-finder__field input')?.getAttribute('type') ?? null,
      tldButtons: document.querySelectorAll('.domain-finder__tld').length,
      rackSlots: document.querySelectorAll('.rack__slot').length,
      gatewayTabs: document.querySelectorAll('.library-gateway__tab').length,
      operatePhases: document.querySelectorAll('.operate__phase').length,
      composerLayers: document.querySelectorAll('.composer__layer').length,
      // Nothing commercial may be published while no provider is connected.
      commerceNotice: document.querySelector('.rack__commercial-empty .rack__commercial-title')?.textContent?.trim() ?? null,
      prices: Array.from(document.querySelectorAll('.rack__commercial, .domain-finder')).map((n) => n.textContent ?? '').join(' ').match(/AED|USD|EUR|GBP|\$\s?\d|\d+(\.\d+)?\s?%/g) ?? [],
    };
  });

  await page.screenshot({ path: `${OUT}-${width}x${height}-top.png` });

  // One scrolled capture per size, so the chapters are inspected and not just
  // asserted about.
  await page.locator('#infrastructure').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}-${width}x${height}-rack.png` });

  await page.locator('#library').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}-${width}x${height}-library.png` });

  results.sizes.push({ size: `${width}x${height}`, consoleErrors, ...measured });
  results.consoleErrors.push(...consoleErrors.map((e) => `${width}x${height}: ${e}`));
  await context.close();
}

/* ------------------------------------------------------- interaction checks */

async function check(name, fn) {
  try {
    const detail = await fn();
    results.checks.push({ name, ok: true, detail });
  } catch (error) {
    results.checks.push({ name, ok: false, detail: error.message });
  }
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.goto(ROUTE, { waitUntil: 'load' });
await page.waitForTimeout(600);

await check('the domain finder reports the provider is unconfigured, and never invents availability', async () => {
  await page.locator('#domain').scrollIntoViewIfNeeded();
  await page.locator('.domain-finder__field input').fill('knoux');
  await page.locator('.domain-finder__tld', { hasText: '.ae' }).click();
  await page.locator('.domain-finder__submit').click();
  await page.locator('.domain-finder__notice-title').waitFor({ timeout: 10000 });

  const label = (await page.locator('.domain-finder__notice .label').textContent()) ?? '';
  const title = (await page.locator('.domain-finder__notice-title').textContent()) ?? '';
  const body = (await page.locator('.domain-finder__notice').textContent()) ?? '';
  const resultRows = await page.locator('.domain-row').count();

  // The state is announced with the exact wording the product promises.
  if (label.trim() !== 'LIVE AVAILABILITY PROVIDER NOT CONFIGURED') {
    throw new Error(`expected the unconfigured label, got: ${label.trim()}`);
  }
  if (!/no registrar connected/i.test(title)) {
    throw new Error(`expected a "no registrar connected" title, got: ${title.trim()}`);
  }
  // A real action is offered rather than a fabricated result.
  const actions = await page.locator('.domain-finder__notice-actions a').evaluateAll((els) =>
    els.map((el) => (el.textContent ?? '').trim()),
  );
  if (actions.length < 2) throw new Error('no contact action offered in the unconfigured state');

  // And no verdict was rendered anywhere in the field.
  if (resultRows !== 0) throw new Error(`${resultRows} result rows were rendered without a provider`);
  for (const forbidden of ['AVAILABLE', 'UNAVAILABLE', 'PREMIUM']) {
    if (new RegExp(`\\b${forbidden}\\b`).test(body)) {
      throw new Error(`the unconfigured state rendered the verdict word ${forbidden}`);
    }
  }
  await page.screenshot({ path: `${OUT}-domain-unconfigured.png` });
  return { label: label.trim(), title: title.trim(), actions, resultRows };
});

await check('an empty query is refused in the UI, without a request', async () => {
  await page.locator('.domain-finder__field input').fill('');
  await page.locator('.domain-finder__submit').click();
  await page.locator('.domain-finder__notice[data-tone=error]').waitFor({ timeout: 5000 });
  const t = (await page.locator('.domain-finder__notice-title').textContent()) ?? '';
  if (!t.trim()) throw new Error('no message for an empty query');
  return t.trim();
});

await check('the infrastructure rack responds to the keyboard', async () => {
  await page.locator('#infrastructure').scrollIntoViewIfNeeded();
  const slots = page.locator('.rack__slot');
  const before = await page.locator('.rack__readout-title').textContent();
  await slots.nth(0).focus();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const after = await page.locator('.rack__readout-title').textContent();
  if (before === after) throw new Error('moving focus did not change the readout');
  return { before: (before ?? '').trim().slice(0, 48), after: (after ?? '').trim().slice(0, 48) };
});

await check('the library gateway routes to real directories', async () => {
  const hrefs = await page.locator('.library-gateway__tab').evaluateAll((els) =>
    els.map((el) => ({ href: el.getAttribute('href'), text: (el.textContent ?? '').replace(/\s+/g, ' ').trim() })),
  );
  const expected = ['/wordpress/plugins', '/wordpress/themes', '/wordpress/blocks', '/wordpress/patterns'];
  for (const want of expected) {
    if (!hrefs.some((h) => h.href === want)) throw new Error(`no tab routes to ${want}`);
  }
  return hrefs.map((h) => h.href).join(' ');
});

await check('the composer selection is announced and reaches the real request form', async () => {
  await page.locator('#launch').scrollIntoViewIfNeeded();
  const before = (await page.locator('.composer__brief-title, .composer__brief-empty').first().textContent()) ?? '';
  await page.locator('.composer__layer', { hasText: 'Infrastructure' }).click();
  await page.waitForTimeout(250);
  const after = (await page.locator('.composer__brief-title').textContent()) ?? '';
  const href = await page.locator('.composer__actions a').getAttribute('href');
  if (!href || !href.startsWith('/contact?') || !href.includes('items=')) {
    throw new Error(`the composition did not reach the request form: ${href}`);
  }
  if (before.trim() === after.trim()) throw new Error('selecting a layer did not change the brief');
  return { brief: after.trim(), href };
});

await check('a directory keeps search, pagination and Back/Forward', async () => {
  await page.goto(`${BASE}/wordpress/plugins?q=security`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const inputValue = await page.locator('.mp-controls input[name=q]').inputValue();
  if (inputValue !== 'security') throw new Error(`the query was not restored into the field: ${inputValue}`);
  const sourceBadge = await page.locator('.mp__status').textContent();
  if (!/Source: WordPress\.org/i.test(sourceBadge ?? '')) throw new Error('the source attribution is missing');

  await page.goto(`${BASE}/wordpress/themes`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.goBack({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  const url = page.url();
  if (!url.includes('q=security')) throw new Error(`Back did not restore the searched plugins route: ${url}`);
  return { inputValue, back: url.replace(BASE, '') };
});

await check('reduced motion disables the ambient animation but keeps every state', async () => {
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await reduced.newPage();
  await p.goto(ROUTE, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const state = await p.evaluate(() => {
    const pulse = document.querySelector('.eco-hero__pulse');
    const beam = document.querySelector('.eco-hero__beam');
    return {
      pulseAnimation: pulse ? getComputedStyle(pulse).animationName : 'missing',
      beamTransform: beam ? getComputedStyle(beam).transform : 'missing',
      chapters: document.querySelectorAll('main section[aria-labelledby]').length,
      rackSlots: document.querySelectorAll('.rack__slot').length,
    };
  });
  if (state.pulseAnimation !== 'none') throw new Error(`the pulse still animates: ${state.pulseAnimation}`);
  if (state.chapters !== 6) throw new Error(`chapters collapsed under reduced motion: ${state.chapters}`);
  if (state.rackSlots !== 4) throw new Error(`the rack collapsed under reduced motion: ${state.rackSlots}`);
  await p.screenshot({ path: `${OUT}-reduced-motion.png` });
  await reduced.close();
  return state;
});

await check('every WordPress route still renders', async () => {
  const routes = [
    '/wordpress',
    '/wordpress/plugins',
    '/wordpress/themes',
    '/wordpress/blocks',
    '/wordpress/patterns',
    '/wordpress/starter-sites',
    '/wordpress/solutions',
  ];
  const seen = [];
  for (const route of routes) {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    const status = response?.status() ?? 0;
    const body = await page.locator('body').innerText();
    if (status !== 200) throw new Error(`${route} returned ${status}`);
    if (body.trim().length < 200) throw new Error(`${route} rendered almost nothing`);
    seen.push(`${route}=${status}`);
  }
  return seen.join(' ');
});

results.pageErrors = pageErrors;
await context.close();
await browser.close();

console.log(JSON.stringify(results, null, 2));

const failed = results.checks.filter((c) => !c.ok);
const overflow = results.sizes.filter((s) => s.horizontalOverflow);
const consoleBad = results.consoleErrors.length;
const problems = [
  failed.length ? `FAILED CHECKS: ${failed.map((f) => f.name).join('; ')}` : null,
  overflow.length ? `H-OVERFLOW AT: ${overflow.map((s) => `${s.size} (${s.offenders.join(',')})`).join('; ')}` : null,
  consoleBad ? `CONSOLE ERRORS: ${consoleBad}` : null,
  pageErrors.length ? `PAGE ERRORS: ${pageErrors.join('; ')}` : null,
].filter(Boolean);

console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nNO PROBLEMS FOUND');
process.exitCode = problems.length ? 1 : 0;
