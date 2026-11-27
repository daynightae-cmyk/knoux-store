import { chromium } from '@playwright/test';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadTypeScript } from '../tests/load.mjs';

const base = process.env.KNOUX_MATRIX_BASE;
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error('Set KNOUX_MATRIX_BASE to an explicitly owned loopback server.');
const phase = process.env.KNOUX_MATRIX_PHASE ?? 'after';
if (!['before', 'after'].includes(phase)) throw new Error('Invalid evidence phase.');
const directory = path.resolve('docs/evidence/owner-continuation-20261124', phase);
await mkdir(directory, { recursive: true });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
const { publicRoutes } = await loadTypeScript('../e2e/routes.ts');
async function staticRoutes(root, prefix = '') {
  const entries = await readdir(root, { withFileTypes: true });
  const routes = entries.some((entry) => entry.isFile() && /^page\.[tj]sx?$/.test(entry.name)) ? [prefix || '/'] : [];
  for (const entry of entries) if (entry.isDirectory() && !/^[.@[(]/.test(entry.name) && entry.name !== 'api' && entry.name !== 'auth') routes.push(...await staticRoutes(path.join(root, entry.name), prefix + '/' + entry.name));
  return routes;
}
const journeys = ['studio', 'themes', 'plugins', 'domain', 'identity', 'canvas', 'launch', 'hosting', 'build', 'operate'].map((hash) => '/wordpress#' + hash);
const inventory = [...new Set([...publicRoutes(), ...await staticRoutes(path.resolve('src/app')), ...journeys, '/build#workspace'])].sort();
const selected = process.env.KNOUX_MATRIX_ROUTES?.split(',').filter(Boolean);
const routes = selected ?? inventory;
const six = process.env.KNOUX_MATRIX_SIX === '1';
const sizes = six ? [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 800]] : [[1440, 900], [390, 844]];
const head = git('rev-parse', 'HEAD');
const source = createHash('sha256');
for (const file of [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'src').split('\n'))].sort()) {
  source.update(file); source.update(await readFile(file));
}
const report = {
  phase, base, captureSourceHead: head, captureSourceDirty: Boolean(git('status', '--porcelain', '--untracked-files=no')),
  captureSourceSha256: source.digest('hex'),
  servedRevision: process.env.KNOUX_MATRIX_SERVED_REVISION ?? 'UNVERIFIED historical server; capture source is not server provenance',
  startedAt: new Date().toISOString(), inventory, results: [],
};
if (process.env.NEXT_DIST_DIR) {
  const dist = path.resolve(process.env.NEXT_DIST_DIR);
  report.buildId = (await readFile(path.join(dist, 'BUILD_ID'), 'utf8')).trim();
  const html = await (await fetch(base + '/build')).text();
  const css = html.match(/href="(\/_next\/static\/[^"?]+\.css)/)?.[1];
  if (!css) throw new Error('No stylesheet to verify server/build identity.');
  const served = Buffer.from(await (await fetch(base + css)).arrayBuffer());
  const emitted = await readFile(path.join(dist, css.slice('/_next/'.length)));
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
  if (sha(served) !== sha(emitted)) throw new Error('Server stylesheet differs from named build.');
  report.assetProvenance = { css, sha256: sha(served), matched: true };
}
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', isMobile: width <= 430, hasTouch: width <= 430 });
    const page = await context.newPage();
    for (const route of routes) {
      const errors = [], failedRequests = [];
      const pageError = (error) => errors.push(error.message);
      const requestError = (request) => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) failedRequests.push({ url: request.url(), error: request.failure()?.errorText }); };
      page.on('pageerror', pageError); page.on('requestfailed', requestError);
      const result = { route, width, height, errors, failedRequests };
      try {
        // A fresh document also ensures hash-only navigation has a real HTTP receipt.
        await page.goto('about:blank');
        const response = await page.goto(base + route, { waitUntil: 'load', timeout: 35_000 });
        result.status = response?.status() ?? null;
        if (route.startsWith('/wordpress#')) await page.locator('dialog#studio[open]').waitFor({ timeout: 15_000 });
        if (route === '/build#workspace') await page.locator('#build-workspace').waitFor({ timeout: 15_000 });
        await page.evaluate(() => document.fonts.ready);
        result.url = page.url();
        result.geometry = await page.evaluate(() => ({
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          h1: [...document.querySelectorAll('h1')].filter((heading) => heading.checkVisibility()).map((heading) => heading.textContent),
          main: document.querySelectorAll('main').length,
          direction: document.documentElement.dir,
          openDialogs: [...document.querySelectorAll('dialog[open]')].map((dialog) => dialog.getAttribute('aria-label') ?? dialog.id),
        }));
        const filename = `${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${width}x${height}.png`;
        await page.screenshot({ path: path.join(directory, filename), timeout: 20_000 });
        result.screenshot = filename;
      } catch (error) { result.error = error.message; }
      page.off('pageerror', pageError); page.off('requestfailed', requestError);
      report.results.push(result);
      await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ route, width, status: result.status, overflow: result.geometry?.overflow, errors, error: result.error?.slice(0, 250) }));
    }
    await context.close();
  }
} finally {
  await browser.close();
  report.completedAt = new Date().toISOString();
  await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
}
const failures = report.results.filter((row) => row.error || row.status >= 500 || row.status === 404 || row.geometry?.overflow > 1 || row.errors.length);
console.log(JSON.stringify({ head, sourceSha256: report.captureSourceSha256, captures: report.results.length, failures: failures.length, report: path.join(directory, 'report.json') }));
if (failures.length) process.exitCode = 1;
