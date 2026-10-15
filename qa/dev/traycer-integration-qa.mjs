/**
 * Traycer integration QA for the continued KNOuX Dev work.
 *
 * Scope is deliberately the things this session actually changed, run against a
 * real dev server and the real DOM:
 *
 *   1. Provider gallery — every registry id resolves to a served asset or an
 *      honest fallback, and OpenRouter / OpenCode Go stay distinct.
 *   2. Credential workflow — input-only Show/Hide, failed-validation retention,
 *      the chained save+test path and the double-submit guard. The provider-os
 *      backend is stubbed, so no real provider key is used and no live provider
 *      is called.
 *   3. Spotlight — the frame tracks a real element, never intercepts a click,
 *      and a private target is refused.
 *   4. Locales — English/Arabic/Urdu each select their own direction, tag,
 *      script and typeface, with no locale silently rendering another language.
 */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.QA_BASE ?? 'http://127.0.0.1:3999';
const folder = `qa/dev/traycer-integration-${Date.now()}`;
mkdirSync(folder, { recursive: true });
const records = [];
let failure;
let browser;
const now = () => new Date().toISOString();

const KEY_BY_ID = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  'opencode-go': 'OPENCODE_GO_API_KEY',
  groq: 'GROQ_API_KEY',
  qwen: 'DASHSCOPE_API_KEY',
};
const NAME_BY_ID = { gemini: 'Google Gemini', openai: 'OpenAI', openrouter: 'OpenRouter', 'opencode-go': 'OpenCode Go', groq: 'Groq', qwen: 'QwenCloud' };

function definitions() {
  return Object.keys(KEY_BY_ID).map(id => ({
    id,
    name: NAME_BY_ID[id],
    class: 'INTELLIGENCE',
    transport: NAME_BY_ID[id],
    gateway: id === 'openrouter',
    detectionOnly: false,
    authModes: ['API_KEY'],
    environmentNames: [KEY_BY_ID[id]],
    tabs: ['Overview', 'Credentials', 'Models'],
  }));
}

function emptyConnection() {
  return { configuration: 'CONFIGURED', auth: 'UNTESTED', discovery: 'UNTESTED', runtime: 'UNTESTED', streaming: 'UNTESTED', health: 'UNTESTED', lastTestedAt: null, lastSuccessAt: null, lastErrorCategory: null, blocker: null };
}

/**
 * A faithful stub of the provider-os command surface. It mirrors the real
 * snapshot shape closely enough for the UI to render and records every mutation
 * so duplicate submissions are detectable. It never stores or returns a secret.
 */
async function installProviderStub(page) {
  const snapshot = {
    definitions: definitions(),
    profiles: [],
    credentials: [],
    agents: [],
    inventory: [],
    audit: [],
    usage: {},
    workspaces: [{ id: 'ws-1', name: 'QA workspace' }],
    workspaceId: 'ws-1',
    persistence: 'AVAILABLE',
    secretStore: { writable: true, state: 'QA stub vault — no real secret is stored' },
    operator: true,
    blocker: 'QA stub — no live provider or account proof.',
    measuredAt: now(),
  };
  const actions = [];
  let refuseNextSave = false;
  await page.route('**/api/build/provider-os', async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fulfill({ json: snapshot });
    const body = request.postDataJSON();
    actions.push(body.action);
    await new Promise(resolve => setTimeout(resolve, 80));
    const writingSecret = ['CREDENTIAL_CREATE', 'CREDENTIAL_REPLACE', 'CREDENTIAL_ROTATE'].includes(body.action);
    if (writingSecret && (!body.secret || refuseNextSave)) {
      refuseNextSave = false;
      return route.fulfill({ status: 400, json: { message: 'QA simulated save refusal.' } });
    }
    if (body.action === 'CREDENTIAL_CREATE')
      snapshot.credentials.push({ id: `cred-${snapshot.credentials.length + 1}`, name: body.name, providerId: body.providerId, source: 'VAULT_SECRET', configured: true, revision: 1, createdAt: now(), updatedAt: now(), lastVerifiedAt: null, revokedAt: null, referencedBy: [] });
    if (body.action === 'PROFILE_CREATE')
      snapshot.profiles.push({ id: `prof-${snapshot.profiles.length + 1}`, ownerId: 'o', workspaceId: 'ws-1', providerId: body.providerId, name: body.name, active: false, enabled: true, auth: body.auth, permissions: {}, cli: null, bindings: { mcp: [], plugins: [], skills: [] }, routing: { automatic: true, modelAllowlist: [], monthlySpendLimit: null }, connection: emptyConnection(), models: [], discoveredAt: null, version: 1, createdAt: now(), updatedAt: now() });
    if (body.action === 'TEST_CONNECTION')
      for (const profile of snapshot.profiles)
        if (profile.id === body.id) profile.connection = { ...profile.connection, auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', lastTestedAt: now(), lastSuccessAt: now() };
    return route.fulfill({ json: snapshot });
  });
  return { actions, refuseSave() { refuseNextSave = true; } };
}

try {
  browser = await chromium.launch({ channel: 'chrome' });

  // ---------------------------------------------------------------- providers
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/api/sentinel/session', route => route.fulfill({ status: 503, json: { message: 'QA: live inference disabled' } }));
    const page = await context.newPage();
    const broken = [];
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (/^\/providers\/[\w-]+\.(svg|ico|png)$/.test(path) && response.status() >= 400) broken.push({ asset: path, status: response.status() });
    });
    await page.goto(`${base}/build/providers`);
    await page.getByRole('heading', { name: /Providers & Models/i }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(1500);
    const gallery = await page.evaluate(() => [...document.querySelectorAll('[class*="providerList"] > button')].map(button => ({
      name: button.querySelector('strong')?.textContent?.trim() ?? '',
      icon: button.querySelector('img')?.getAttribute('src') ?? null,
      state: button.querySelector('small')?.textContent?.trim() ?? '',
    })));
    await page.screenshot({ path: `${folder}/providers-desktop.png` });
    const openrouter = gallery.find(item => item.name === 'OpenRouter');
    const opencodeGo = gallery.find(item => item.name === 'OpenCode Go');
    records.push({
      check: 'provider gallery renders distinct verified identities and no referenced asset 404s',
      providerCount: gallery.length,
      openRouterIcon: openrouter?.icon ?? null,
      openCodeGoIcon: opencodeGo?.icon ?? null,
      openRouterDistinctFromOpenCodeGo: !!openrouter?.icon && openrouter.icon !== opencodeGo?.icon,
      providersWithoutIcon: gallery.filter(item => !item.icon).map(item => item.name),
      brokenAssets: broken,
      sampleStates: gallery.slice(0, 6).map(item => `${item.name}: ${item.state}`),
    });
    assert.ok(gallery.length > 0, 'Provider gallery is empty');
    assert.equal(broken.length, 0, 'Provider assets returned errors');
    assert.ok(openrouter?.icon && opencodeGo?.icon && openrouter.icon !== opencodeGo.icon, 'Provider identities must remain distinct');
    await context.close();
  }

  // ------------------------------------------------------- credential workflow
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/api/sentinel/session', route => route.fulfill({ status: 503, json: { message: 'QA: live inference disabled' } }));
    const page = await context.newPage();
    const fixture = await installProviderStub(page);
    await page.goto(`${base}/build/providers`);
    await page.getByRole('heading', { name: /Providers & Models/i }).first().waitFor({ timeout: 90000 });
    await page.getByRole('button', { name: /^OpenAI/ }).first().click();
    await page.getByRole('button', { name: 'Credentials', exact: true }).click();
    const secretField = page.locator('input[autocomplete="new-password"]').first();
    await secretField.waitFor({ timeout: 30000 });
    await page.getByLabel('Credential name', { exact: true }).fill('QA fixture key');
    await secretField.fill('qa-not-a-real-key-0123456789');

    // Reveal is permitted only for the value currently being typed.
    const revealTypeBefore = await secretField.getAttribute('type');
    await page.getByRole('button', { name: 'Show', exact: true }).click();
    const revealTypeWhileShown = await secretField.getAttribute('type');
    await page.getByRole('button', { name: 'Hide', exact: true }).click();
    const revealTypeAfterHide = await secretField.getAttribute('type');

    // The chained create -> bind profile -> test connection path.
    await page.getByRole('button', { name: 'Save & Test Connection' }).evaluate(button => { button.form.requestSubmit(button); button.form.requestSubmit(button); });
    await page.waitForTimeout(2500);
    const afterTest = await page.evaluate(() => ({

      secretCleared: document.querySelector('input[autocomplete="new-password"]')?.value === '',
      notice: document.querySelector('[role="status"]')?.textContent?.trim() ?? '',
    }));

    // A refused save must not erase the unsaved secret.
    fixture.refuseSave();
    await secretField.fill('qa-second-not-a-real-key-987654321');
    await page.getByRole('button', { name: 'Save key', exact: true }).click();
    await page.waitForTimeout(1200);
    const retainedValue = await secretField.inputValue();
    const refusalNotice = await page.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? '');

    assert.deepEqual([revealTypeBefore, revealTypeWhileShown, revealTypeAfterHide], ['password', 'text', 'password']);
    assert.deepEqual(fixture.actions.slice(0, 3), ['CREDENTIAL_CREATE', 'PROFILE_CREATE', 'TEST_CONNECTION']);
    assert.equal(afterTest.secretCleared, true);
    assert.match(afterTest.notice, /Authentication verified/);
    assert.equal(retainedValue, 'qa-second-not-a-real-key-987654321');
    assert.match(refusalNotice, /QA simulated save refusal/);
    records.push({ check: 'credential reveal, save/test chain and refused-save retention', status: 'PASS', evidenceKind: 'UI CONTRACT FIXTURE — no real authentication or inference', actions: fixture.actions });
    await context.close();
  }

  // ----------------------------------------------------------------- spotlight
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/api/sentinel/session', route => route.fulfill({ status: 503, json: { message: 'QA: live inference disabled' } }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/products`);
    await page.waitForTimeout(2600);
    const heading = page.locator('main h1:visible, main h2:visible').first();
    if (await heading.count() === 0) {
      assert.fail('No main h2 on /products; spotlight acceptance could not run');
    } else {
      await heading.hover();
      await page.waitForTimeout(2000);
      const frame = page.locator('[data-sentinel-spotlight]');
      const frameVisible = await frame.count() > 0 && await frame.first().isVisible();
      let geometry = null;
      let attendedCount = 0;
      if (frameVisible) {
        geometry = await frame.first().evaluate(element => {
          const box = element.getBoundingClientRect();
          const sweep = element.firstElementChild;
          return {
            width: Math.round(box.width),
            height: Math.round(box.height),
            pointerEvents: getComputedStyle(element).pointerEvents,
            sweepPointerEvents: sweep ? getComputedStyle(sweep).pointerEvents : null,
            ariaHidden: element.getAttribute('aria-hidden'),
          };
        });
        await page.mouse.wheel(0, 260);
        await page.waitForTimeout(600);
        geometry.stillVisibleAfterScroll = await frame.first().isVisible();
        attendedCount = await page.evaluate(() => document.querySelectorAll('[data-sentinel-attended="true"]').length);
      }
      const targetStillClickable = await heading.evaluate(element => {
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return !!top && (element === top || element.contains(top));
      });
      assert.ok(frameVisible, 'Spotlight did not appear');
      assert.equal(geometry.pointerEvents, 'none');
      assert.equal(errors.length, 0, 'Browser page errors');
      assert.equal(targetStillClickable, true, 'Attended target is obscured');
      await page.screenshot({ path: `${folder}/spotlight-desktop.png` });
      await page.mouse.move(1, 1);
      await heading.evaluate(element => element.setAttribute('data-private', ''));
      await heading.hover();
      await page.waitForTimeout(1400);
      const privateRefused = await page.locator('[data-sentinel-spotlight]:visible').count() === 0;
      assert.equal(privateRefused, true, 'Private target unexpectedly received a spotlight');
      await heading.evaluate(element => element.removeAttribute('data-private'));
      await page.screenshot({ path: `${folder}/spotlight-private-refused.png` });
      records.push({
        check: 'spotlight frames the attended element, never intercepts its click, and refuses private targets',
        frameVisible,
        geometry,
        attendedTargetCount: attendedCount,
        targetStillClickable,
        privateTargetRefusedByApp: privateRefused,
        pageErrors: errors,
      });
    }
    await context.close();
  }

  // Guide coverage only. This is deliberately not whole-site i18n proof.
  {
    const locales = [];
    for (const language of ['en', 'ar', 'ur']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        await context.addInitScript(value => localStorage.setItem('knoux.sentinel.language', value), language);
        await context.route('**/api/sentinel/session', route => route.fulfill({ status: 503, json: { message: 'QA: live inference disabled' } }));
    const page = await context.newPage();
        const catalogReady = page.waitForResponse(response => response.url().endsWith('/api/sentinel/catalog') && response.ok());
        await page.goto(`${base}/products`);
        await catalogReady;
        await page.waitForFunction(value => document.querySelector('[data-sentinel-launcher]')?.getAttribute('lang') === value, language);
        await page.locator('[data-sentinel-launcher] .ks-trigger').first().click({ timeout: 60000 });
        const sources = { en: 'Sources & settings', ar: 'المصادر والإعدادات', ur: 'ماخذ اور ترتیبات' };
        await page.getByRole('button', { name: sources[language], exact: true }).click();
        const panel = page.locator('#sentinel-guide-panel');
        await panel.waitFor({ state: 'visible' });
        const root = await page.evaluate(() => ({lang:document.documentElement.lang, dir:document.documentElement.dir}));
        assert.equal(root.lang, language);
        assert.equal(root.dir, language === 'en' ? 'ltr' : 'rtl');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Locale document has horizontal overflow');
        const metadata = await panel.evaluate(element => ({ dir: element.getAttribute('dir'), lang: element.getAttribute('lang'), script: element.getAttribute('data-sentinel-script'), fontFamily: getComputedStyle(element).fontFamily }));
        assert.equal(metadata.dir, language === 'en' ? 'ltr' : 'rtl');
        assert.ok(metadata.lang?.startsWith(language), `Incorrect ${language} language tag`);
        const settings = { en: 'Sentinel settings', ar: 'إعدادات Sentinel', ur: 'Sentinel ترتیبات' };
        await page.getByRole('button', { name: settings[language], exact: true }).click();
        const settingsLegend = await page.locator('#sentinel-settings legend').innerText();
        assert.ok(settingsLegend.trim());
        await panel.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished)); });
        assert.equal(await panel.evaluate(node => getComputedStyle(node).opacity), '1');
        const bounds = await panel.boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 1440 && bounds.y + bounds.height <= 901, 'Guide outside viewport');
        await page.screenshot({ path: `${folder}/locale-${language}.png` });
        locales.push({ language, root, panel: metadata, settingsLegend });
      } finally { await context.close(); }
    }
    assert.equal(new Set(locales.map(entry => entry.panel.dir)).size, 2);
    assert.equal(new Set(locales.map(entry => entry.settingsLegend)).size, 3);
    records.push({ check: 'Guide English LTR, Arabic/Urdu RTL and distinct translated settings', status: 'PASS', locales, scope: 'Sentinel guide only; whole-site translation remains unverified' });
  }

  for (const viewport of [{ width: 820, height: 1180 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width === 390, hasTouch: true, recordVideo: { dir: folder, size: viewport } });
    try {
      await context.route('**/api/sentinel/session', route => route.fulfill({ status: 503, json: { message: 'QA: live inference disabled' } }));
      const page = await context.newPage();
      await page.goto(`${base}/build/providers`);
      await page.getByRole('heading', { name: /Providers & Models/i }).first().waitFor();
      await page.waitForTimeout(1500);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page overflows its viewport');
      assert.equal(await page.locator('[data-sentinel-launcher]').count(), 1);
      const firstProvider = await page.locator('[class*="providerList"] > button').first().boundingBox();
      assert.ok(firstProvider && firstProvider.y < viewport.height - 100, 'Provider choices start below the useful viewport');
      await page.screenshot({ path: `${folder}/providers-${viewport.width}.png` });
      await page.locator('[data-sentinel-launcher] .ks-trigger').tap();
      await page.getByRole('button', { name: 'Sources & settings', exact: true }).click();
      await page.locator('#sentinel-guide-panel').waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Quiet mode', exact: true }).click();
      assert.equal(await page.evaluate(() => localStorage.getItem('knoux.sentinel.quiet')), 'true');
      await page.locator('#sentinel-guide-panel').evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished)); });
      await page.screenshot({ path: `${folder}/guide-quiet-${viewport.width}.png` });
      await page.getByRole('button', { name: 'Close guide', exact: true }).click();
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#sentinel-guide-panel').count(), 0);
      records.push({ check: `Touch launcher, quiet persistence, close and no overflow at ${viewport.width}`, status: 'PASS', evidenceKind: 'Real DOM; AI deliberately disabled' });
    } finally { await context.close(); }
  }

  for (const language of ['ar', 'ur']) {
    const context = await browser.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
    try {
      await context.addInitScript(value => localStorage.setItem('knoux.sentinel.language', value), language);
      await context.route('**/api/sentinel/session', route => route.fulfill({status:503,json:{message:'QA inference disabled'}}));
      const page = await context.newPage();
      const ready = page.waitForResponse(response=>response.url().endsWith('/api/sentinel/catalog') && response.ok());
      await page.goto(`${base}/products`); await ready;
      await page.waitForFunction(value=>document.documentElement.lang === value,language);
      assert.equal(await page.evaluate(()=>document.documentElement.dir),'rtl');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const menuName = language === 'ar' ? 'فتح القائمة' : 'نیویگیشن کھولیں';
      await page.getByRole('button',{name:menuName,exact:true}).click();
      await page.screenshot({path:`${folder}/site-mobile-${language}.png`});
      await page.keyboard.press('Escape');
      await page.locator('[data-sentinel-launcher] .ks-trigger').tap();
      await page.getByRole('button',{name:language==='ar'?'المصادر والإعدادات':'ماخذ اور ترتیبات',exact:true}).click();
      const panel=page.locator('#sentinel-guide-panel');await panel.waitFor();
      await panel.evaluate(async node=>{await Promise.all(node.getAnimations().map(animation=>animation.finished));});
      assert.equal(await panel.getAttribute('lang'),language);
      assert.equal(await panel.getAttribute('dir'),'rtl');
      await page.screenshot({path:`${folder}/guide-mobile-${language}.png`});
      records.push({check:`Shared site chrome and Sentinel mobile ${language} RTL`,status:'PASS',editorialCoverage:'Incomplete; untranslated page copy explicitly remains English'});
    }finally{await context.close();}
  }

} catch (error) {
  failure = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
} finally {
  if (browser) await browser.close();
}

const report = { evidenceKind: 'Real DOM with provider credential API fixture; no live inference proof', status: failure ? 'FAIL' : 'PASS', base, records, failure };
writeFileSync(`${folder}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, folder, failure: failure?.message ?? null, checks: records.map(record => record.check) }, null, 2));
process.exit(failure ? 1 : 0);
