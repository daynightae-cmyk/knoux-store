import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * Honest route capture: pre-scrolls (so data-reveal content is actually
 * revealed in full-page shots), waits for network settle, and captures
 * viewport/full/mobile/tablet plus named interaction states per route.
 *
 * Usage: node scripts/visual-capture.mjs <outDir> <routeName=route>...
 * Route spec: label=path[:stateName=selectorAction]  (state = JSON actions file optional)
 */
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const outDirRaw = process.argv[2] ?? 'visual-audit/capture';
const outDir = resolve(outDirRaw);
if (basename(outDir).startsWith('.')) throw new Error('Invalid output directory');
const targets = process.argv.slice(3);
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['tablet', { width: 820, height: 1180 }],
  ['mobile', { width: 390, height: 844 }],
];

const errors = [];
const browser = await chromium.launch();

async function capture(name, path, states = []) {
  for (const [vname, viewport] of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`${name}:${vname}: ${msg.text().slice(0, 260)}`);
    });
    try {
      await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2600);
      // Pre-scroll through the page so reveal-gated content is visible, then return to top.
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${outDir}/${name}-${vname}-viewport.png` });
      await page.screenshot({ path: `${outDir}/${name}-${vname}-full.png`, fullPage: true });
      for (const [sname, actions] of states) {
        try {
          await actions(page);
          await page.waitForTimeout(700);
          await page.screenshot({ path: `${outDir}/${name}-${vname}-state-${sname}.png` });
        } catch (e) {
          errors.push(`${name}:${vname}:state:${sname}: ${e.message?.slice(0, 200)}`);
        }
      }
    } catch (e) {
      errors.push(`${name}:${vname}: NAV FAIL ${e.message?.slice(0, 200)}`);
    }
    await page.close();
  }
}

const hover = (locator) => async (page) => {
  await page.locator(locator).first().hover({ timeout: 8000 });
};
const click = (locator) => async (page) => {
  await page.locator(locator).first().click({ timeout: 8000 });
};

const jobs = [];
for (const spec of targets) {
  const eq = spec.indexOf('=');
  const label = spec.slice(0, eq);
  const rest = spec.slice(eq + 1);
  const [path, ...stateSpecs] = rest.split(';');
  const states = [];
  for (const ss of stateSpecs) {
    const sep = ss.indexOf('::');
    const sname = ss.slice(0, sep);
    const [action, locator] = ss.slice(sep + 2).split('|');
    if (action === 'hover') states.push([sname, hover(locator)]);
    if (action === 'click') states.push([sname, click(locator)]);
  }
  jobs.push(capture(label, path, states));
}
await Promise.all(jobs);
await browser.close();
console.log('ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none');
