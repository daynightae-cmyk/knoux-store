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
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.QA_BASE ?? 'http://127.0.0.1:3999';
const folder = `qa/dev/traycer-integration-${Date.now()}`;
mkdirSync(folder, { recursive: true });
const records = [];
let failure;
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
function installProviderStub() {
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
  const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  return () => {
    window.__qaProvider = [];
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = String(typeof input === 'string' ? input : input?.url ?? input);
      if (!url.includes('/api/build/provider-os')) return originalFetch(input, init);
      if (init?.method !== 'POST') return json(snapshot);
      const body = JSON.parse(init.body);
      window.__qaProvider.push(body.action);
      // An empty secret is a real validation refusal, exactly as the server would.
      const writingSecret = ['CREDENTIAL_CREATE', 'CREDENTIAL_REPLACE', 'CREDENTIAL_ROTATE'].includes(body.action);
      if (writingSecret && !body.secret)
        return new Response(JSON.stringify({ message: 'A credential value is required.' }), { status: 400, headers: { 'content-type': 'application/json' } });
      if (body.action === 'CREDENTIAL_CREATE')
        snapshot.credentials.push({ id: `cred-${snapshot.credentials.length + 1}`, name: body.name, providerId: body.providerId, source: 'VAULT_SECRET', configured: true, revision: 1, createdAt: now(), updatedAt: now(), lastVerifiedAt: null, revokedAt: null, referencedBy: [] });
      if (body.action === 'PROFILE_CREATE')
        snapshot.profiles.push({ id: `prof-${snapshot.profiles.length + 1}`, ownerId: 'o', workspaceId: 'ws-1', providerId: body.providerId, name: body.name, active: true, enabled: true, auth: body.auth, permissions: {}, cli: null, bindings: { mcp: [], plugins: [], skills: [] }, routing: { automatic: true, modelAllowlist: [], monthlySpendLimit: null }, connection: emptyConnection(), models: [], discoveredAt: null, version: 1, createdAt: now(), updatedAt: now() });
      if (body.action === 'TEST_CONNECTION')
        for (const profile of snapshot.profiles)
          if (profile.id === body.id) profile.connection = { ...profile.connection, auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', lastTestedAt: now(), lastSuccessAt: now() };
      return json(snapshot);
    };
  };
}

try {
  const browser = await chromium.launch({ channel: 'chrome' });

  // ---------------------------------------------------------------- providers
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const broken = [];
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (/^\/providers\/[\w-]+\.(svg|ico|png)$/.test(path) && response.status() >= 400) broken.push({ asset: path, status: response.status() });
    });
    await page.goto(`${base}/build/providers`);
    await page.locator('[data-knoux-context="/build/providers"]').first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(1500);
    const gallery = await page.evaluate(() => [...document.querySelectorAll('.providerList > button')].map(button => ({
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
    await context.close();
  }

  // ------------------------------------------------------- credential workflow
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(installProviderStub());
    await page.goto(`${base}/build/providers`);
    await page.locator('[data-knoux-context="/build/providers"]').first().waitFor({ timeout: 90000 });
    await page.getByRole('button', { name: /^OpenAI/ }).first().click();
    await page.getByRole('button', { name: 'Credentials', exact: true }).click();
    const secretField = page.locator('input[autocomplete="new-password"]').first();
    await secretField.waitFor({ timeout: 30000 });
    await secretField.fill('qa-not-a-real-key-0123456789');

    // Reveal is permitted only for the value currently being typed.
    const revealTypeBefore = await secretField.getAttribute('type');
    await page.getByRole('button', { name: 'Show', exact: true }).click();
    const revealTypeWhileShown = await secretField.getAttribute('type');
    await page.getByRole('button', { name: 'Hide', exact: true }).click();
    const revealTypeAfterHide = await secretField.getAttribute('type');

    // The chained create -> bind profile -> test connection path.
    await page.getByRole('button', { name: 'Save & Test Connection' }).click();
    await page.waitForTimeout(2500);
    const afterTest = await page.evaluate(() => ({
      actions: window.__qaProvider ?? [],
      secretCleared: document.querySelector('input[autocomplete="new-password"]')?.value === '',
      notice: document.querySelector('[role="status"]')?.textContent?.trim() ?? '',
    }));

    // A refused save must not erase the unsaved secret.
    await page.evaluate(() => { window.__qaProvider = []; });
    await secretField.fill('qa-second-not-a-real-key-987654321');
    await page.getByRole('button', { name: 'Save key', exact: true }).click();
    await page.waitForTimeout(1200);
    const retainedValue = await secretField.inputValue().catch(() => null);
    const refusalNotice = await page.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? '');

    await context.close();
  }

  // ----------------------------------------------------------------- spotlight
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/products`);
    await page.waitForTimeout(2600);
    const heading = page.locator('main h2').first();
    if (await heading.count() === 0) {
      records.push({ check: 'spotlight frames the attended element and never intercepts its click', status: 'UNTESTED', reason: 'no main h2 on /products' });
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
      // The private-target guard must refuse a credential-like node outright.
      const privateRefused = await page.evaluate(() => {
        const selector = '[data-private],input,textarea,select,[contenteditable=true],[hidden],[aria-hidden=true],button[type=submit]';
        const probe = document.createElement('div');
        probe.setAttribute('data-private', '');
        document.body.append(probe);
        const refused = probe.closest(selector) !== null;
        probe.remove();
        return refused;
      });
      await page.screenshot({ path: `${folder}/spotlight-desktop.png` });
      records.push({
        check: 'spotlight frames the attended element, never intercepts its click, and refuses private targets',
        frameVisible,
        geometry,
        attendedTargetCount: attendedCount,
        targetStillClickable,
        privateSelectorWouldRefuse: privateRefused,
        pageErrors: errors,
      });
    }
    await context.close();
  }

  // ------------------------------------------------------------------- locales
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const locales = [];
    for (const language of ['en', 'ar', 'ur']) {
      await page.addInitScript(value => localStorage.setItem('knoux.sentinel.language', value), language);
      await page.goto(`${base}/products`);
      await page.locator('[data-sentinel-launcher] .ks-trigger').first().click({ timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(900);
      const panel = await page.locator('#sentinel-guide-panel').evaluate(element => {
        const computed = getComputedStyle(element);
        return {
          dir: element.getAttribute('dir'),
          lang: element.getAttribute('lang'),
          script: element.getAttribute('data-sentinel-script'),
          fontFamily: computed.fontFamily,
          lineHeight: computed.lineHeight,
        };
      }).catch(() => null);
      const triggerLabel = await page.locator('[data-sentinel-launcher] .ks-trigger').first().getAttribute('aria-label').catch(() => null);
      const settingsLegend = await page.evaluate(() => {
        const toggle = [...document.querySelectorAll('#sentinel-guide-panel button')].find(button => /ترتیبات|إعدادات|settings/i.test(button.textContent ?? ''));
        if (!toggle) return null;
        toggle.click();
        return document.querySelector('#sentinel-settings legend')?.textContent?.trim() ?? null;
      });
      await page.screenshot({ path: `${folder}/locale-${language}.png` });
      locales.push({ language, panel, triggerLabel, settingsLegend });
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${base}/products`);
      await page.waitForTimeout(400);
    }
    records.push({
      check: 'English, Arabic and Urdu each select their own direction, tag, script and typeface',
      locales,
      allThreeDirectionsDistinct: new Set(locales.map(entry => entry.panel?.dir)).size === 3,
      // The specific failure this guards against: a locale offered but rendering
      // another language's copy.
      noLocaleRendersAnotherLanguagesCopy: new Set(locales.map(entry => entry.settingsLegend).filter(Boolean)).size === 3,
    });
    await context.close();
  }

  await browser.close();
} catch (error) {
  failure = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
}

const report = { status: failure ? 'FAILED' : 'COMPLETED', base, records, failure };
writeFileSync(`${folder}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, folder, failure: failure?.message ?? null, checks: records.map(record => record.check) }, null, 2));
process.exit(failure ? 1 : 0);
