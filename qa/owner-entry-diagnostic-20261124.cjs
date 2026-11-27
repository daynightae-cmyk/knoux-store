const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const out = path.join(process.cwd(), 'references', 'owner-curation-20261124', 'qa-entry-repair-20261124', 'diagnostic');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const evidence = { base: 'http://127.0.0.1:3001', pages: {} };
  let current = evidence.pages;
  page.on('pageerror', (error) => (current.errors ??= []).push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      (current.errors ??= []).push({ type: message.type(), text: message.text() });
    }
  });
  page.on('requestfailed', (request) => (current.failedRequests ??= []).push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (/\.js(?:\?|$)|_next\/static/.test(response.url())) {
      (current.scriptResponses ??= []).push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] });
    }
  });

  for (const route of ['/wordpress', '/build']) {
    current = evidence.pages[route] = {};
    const response = await page.goto(`http://127.0.0.1:3001${route}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(7500);
    current.httpStatus = response?.status();
    current.before = await page.evaluate(() => ({
      url: location.href,
      readyState: document.readyState,
      scripts: [...document.scripts].map((script) => ({ src: script.src, type: script.type, async: script.async, defer: script.defer, noModule: script.noModule })),
      resources: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/_next/')).map((entry) => ({ name: entry.name, duration: entry.duration, transferSize: entry.transferSize })),
      hasNext: Boolean(window.next),
      wpPhase: document.querySelector('[data-wordpress-experience]')?.getAttribute('data-phase'),
      wpDialog: document.querySelector('dialog#studio')?.outerHTML.slice(0, 500),
      buildButtons: [...document.querySelectorAll('button')].filter((button) => button.textContent.includes('Build')).map((button) => ({ text: button.textContent.trim(), html: button.outerHTML.slice(0, 800) })),
      activeElement: document.activeElement?.outerHTML.slice(0, 400),
    }));
    await page.screenshot({ path: path.join(out, `${route === '/wordpress' ? 'wordpress' : 'build'}-before.png`) });
    const selector = route === '/wordpress' ? '[data-enter-studio]' : 'button:has-text("Build")';
    current.clicked = await page.locator(selector).first().evaluate((element) => element.outerHTML);
    await page.locator(selector).first().click({ timeout: 12000 });
    await page.waitForTimeout(2500);
    current.after = await page.evaluate(() => ({
      url: location.href,
      wpPhase: document.querySelector('[data-wordpress-experience]')?.getAttribute('data-phase'),
      wpDialogOpen: document.querySelector('dialog#studio')?.open,
      wpArrivalHidden: document.querySelector('.wp-experience__arrival')?.hidden,
      activeElement: document.activeElement?.outerHTML.slice(0, 400),
      bodyText: document.body.innerText.slice(0, 1200),
    }));
    await page.screenshot({ path: path.join(out, `${route === '/wordpress' ? 'wordpress' : 'build'}-after.png`) });
  }
  fs.writeFileSync(path.join(out, 'diagnostic.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
