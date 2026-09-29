import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';
import { startServer, waitForServer } from './server.mjs';

const port = Number(process.env.KNOUX_TEST_PORT ?? 32219);
const origin = `http://127.0.0.1:${port}`;
const server = startServer({ port });
after(() => server.kill());

const wait = () => waitForServer(server, origin);

const ROUTES = [
  '/',
  '/products',
  '/products/knoux-one',
  '/products/kforge',
  '/products/knoux-repair',
  '/products/knoux-smartorganizer',
  '/products/knoux-rec',
  '/products/knoux-x',
  '/products/knoux-clipboard-ai',
  '/wordpress',
  '/wordpress/themes',
  '/wordpress/plugins',
  '/wordpress/blocks',
  '/wordpress/starter-sites',
  '/wordpress/solutions',
  '/web',
  '/web/corporate-site',
  '/web/ecommerce',
  '/web/web-application',
  '/web/customer-portal',
  '/web/admin-dashboard',
  '/web/interactive-experience',
  '/growth',
  '/growth/google-ads',
  '/growth/meta-ads',
  '/growth/social',
  '/growth/content',
  '/growth/seo',
  '/creative',
  '/creative/brand-identity',
  '/creative/ui-ux',
  '/creative/art-direction',
  '/creative/campaign-creative',
  '/creative/social-content',
  '/creative/motion',
  '/creative/product-visuals',
  '/creative/presentation',
  '/solutions',
  '/solutions/start-a-business',
  '/solutions/launch-a-new-product',
  '/solutions/build-an-online-store',
  '/solutions/digitise-operations',
  '/solutions/create-a-customer-portal',
  '/solutions/promote-a-local-business',
  '/solutions/build-an-academy-platform',
  '/solutions/modernise-an-existing-website',
  '/build',
  '/labs',
  '/work',
  '/engineering',
  '/about',
  '/contact',
  '/sitemap.xml',
  '/robots.txt',
];

test('the canonical mark geometry is the single source of truth', () => {
  const svg = readFileSync(join(root, 'knoux-mark-canonical.svg'), 'utf8');
  const markModule = readFileSync(join(root, 'src', 'lib', 'knouxMark.ts'), 'utf8');

  const viewBox = svg.match(/viewBox="([^"]+)"/);
  assert.ok(viewBox, 'canonical mark must declare a viewBox');
  assert.ok(
    markModule.includes(`'${viewBox[1]}'`) || markModule.includes(`${viewBox[1].split(' ')[2]}`),
    'knouxMark.ts must carry the canonical viewBox',
  );

  const svgPaths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
  const modulePaths = [...markModule.matchAll(/\bd:\s*'([^']+)'/g)].map((match) => match[1]);
  assert.equal(svgPaths.length, 4, 'the KNOuX mark has four components');
  assert.deepEqual(modulePaths, svgPaths, 'knouxMark.ts has drifted from knoux-mark-canonical.svg');
});

test('the protected arrival baseline is intact', () => {
  const css = readFileSync(join(root, 'src', 'app', 'globals.css'), 'utf8');
  for (const selector of [
    '.arrival-rail',
    '.arrival-sticky',
    '.arrival-copy',
    '.arrival-copy.is-revealed',
    '.mark-canvas',
    '.mark-fallback',
    '.starfield',
    '.pulse-dot',
  ]) {
    assert.ok(css.includes(selector), `the arrival baseline requires ${selector}`);
  }
  assert.match(css, /prefers-reduced-motion/, 'reduced motion must be honoured');
});

test('production routes, deep links, sitemap and honest contact delivery', async () => {
  await wait();

  for (const path of ROUTES) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `GET ${path}`);
  }

  assert.equal((await fetch(origin + '/missing-page')).status, 404, 'unknown routes return 404');
  assert.equal((await fetch(origin + '/products/not-a-product')).status, 404, 'unknown product slugs return 404');
  assert.equal((await fetch(origin + '/web/not-a-system')).status, 404, 'unknown web system slugs return 404');
  assert.equal((await fetch(origin + '/creative/not-a-discipline')).status, 404, 'unknown creative discipline slugs return 404');
  assert.equal((await fetch(origin + '/growth/not-a-channel')).status, 404, 'unknown growth slugs return 404');
  assert.equal((await fetch(origin + '/solutions/not-a-solution')).status, 404, 'unknown solution slugs return 404');

  // Every stylesheet and script the homepage references must actually resolve,
  // otherwise the page renders as unstyled markup.
  const home = await (await fetch(origin + '/')).text();
  const assets = [...home.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(assets.some((asset) => asset.endsWith('.css')), 'homepage must ship a stylesheet');
  assert.ok(assets.some((asset) => asset.endsWith('.js')), 'homepage must ship scripts');
  for (const asset of new Set(assets)) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200, `asset ${asset}`);
  }

  // The identity must be crawlable in the DOM, not only inside WebGL.
  assert.match(home, /<h1[^>]*>KNOuX/);
  assert.match(home, /ENGINEERING DIGITAL SYSTEMS/);
  assert.match(home, /application\/ld\+json/);
  assert.match(home, /rel="canonical"/);

  // Divisions must be discoverable from the homepage in crawlable markup.
  for (const division of ['Software', 'WordPress', 'Web', 'Growth', 'Creative', 'Solutions']) {
    assert.ok(home.includes(division), `homepage must expose the ${division} division in the DOM`);
  }
  for (const product of ['KNOUX ONE', 'KNOuX Forge', 'KNOuX Repair', 'KNOuX SmartOrganizer', 'KNOuX REC']) {
    assert.ok(home.includes(product), `homepage must list ${product}`);
  }

  // Command interface affordance must be reachable without a pointer.
  assert.match(home, /aria-label="Open search"/, 'a labelled search control must exist in the header');
});

test('division pages render their registry honestly', async () => {
  await wait();

  // The WordPress division now carries two layers. The protective intent of the
  // old assertion is kept in full: the KNOuX-owned registry must still report
  // zero, no demo URL may be invented, and no price may appear. What changes is
  // that the division also serves live third-party discovery, so the copy that
  // claimed the whole catalogue was empty is no longer true and is gone.
  for (const [route, noun] of [
    ['/wordpress/themes', /0 themes published by KNOuX/i],
    ['/wordpress/plugins', /0 plugins published by KNOuX/i],
    ['/wordpress/blocks', /0 blocks published by KNOuX/i],
  ]) {
    const html = await (await fetch(origin + route)).text();
    // React separates interpolated text nodes with empty comment markers, so
    // the rendered sentence is not contiguous in the markup.
    const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(text, noun, `${route} must still report that KNOuX has released nothing`);
    assert.ok(!/demo\.knoux\./.test(html), `no demo URL may be invented on ${route}`);
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    assert.ok(!/\$[0-9]/.test(visible), `no price may be shown on ${route}`);
  }

  // External discovery must be attributed, never presented as KNOuX output.
  for (const route of ['/wordpress/plugins', '/wordpress/themes', '/wordpress/patterns']) {
    const html = await (await fetch(origin + route)).text();
    const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(text, /Source: WordPress\.org/, `${route} must attribute the external source`);
    assert.match(text, /WORDPRESS\.ORG DISCOVERY/i, `${route} must label the external layer`);
  }

  const growth = await (await fetch(origin + '/growth')).text();
  assert.match(growth, /CAMPAIGN BUDGET/i, 'the growth entry must accept a campaign budget');
  assert.ok(!/ROAS|CPC|CPA|conversion rate of/i.test(growth), 'growth must not project a result');

  const web = await (await fetch(origin + '/web')).text();
  assert.match(web, /CAPABILITY MATRIX/i, 'web must publish the capability matrix');
  const webText = web.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  assert.ok(!/\$\d/.test(webText), 'web must not publish prices');

  const work = await (await fetch(origin + '/work')).text();
  const workText = work.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(workText, /CASE FILES \/ VERIFIED PRODUCTS/i, 'the work archive must identify verified product case files');
  assert.match(workText, /repository evidence/i, 'the work archive must keep its evidence-first contract visible');
  assert.ok(!/<blockquote\b|"@type":"Review"/i.test(work), 'no testimonials may be shown');

  const creative = await (await fetch(origin + '/creative')).text();
  assert.match(creative, /No project archive is published/i, 'creative must not imply a portfolio');
});

test('searchable routes expose metadata and structured data', async () => {
  await wait();

  for (const path of ['/', '/products', '/wordpress', '/web', '/growth', '/creative', '/solutions', '/build', '/about', '/contact', '/products/knoux-one', ...ROUTES.filter((route) => route.startsWith('/web/') || route.startsWith('/creative/'))]) {
    const html = await (await fetch(origin + path)).text();
    assert.match(html, /rel="canonical"/, `${path} must declare a canonical URL`);
    assert.match(html, /<title>[^<]{10,}<\/title>/, `${path} must have a meaningful title`);
    assert.match(html, /name="description"/, `${path} must have a meta description`);
    assert.match(html, /property="og:title"/, `${path} must be Open Graph ready`);
    assert.ok(!/<h1[^>]*>\s*<\/h1>/.test(html), `${path} must have exactly one non-empty h1`);
  }
});

test('sitemap and robots describe the real site', async () => {
  await wait();

  const robots = await (await fetch(origin + '/robots.txt')).text();
  assert.match(robots, /Sitemap:/);

  const sitemap = await (await fetch(origin + '/sitemap.xml')).text();
  for (const path of [
    '/',
    '/products',
    '/wordpress',
    '/wordpress/themes',
    '/web',
    '/growth',
    '/creative',
    '/solutions',
    '/build',
    '/labs',
    '/work',
    '/about',
    '/contact',
  ]) {
    assert.ok(sitemap.includes(`https://knoux.store${path}<`), `sitemap must list ${path}`);
  }
  for (const path of ROUTES.filter((route) => route.startsWith('/web/') || route.startsWith('/creative/'))) {
    assert.ok(sitemap.includes(`https://knoux.store${path}<`), `sitemap must list ${path}`);
  }
  for (const product of ['knoux-one', 'kforge', 'knoux-repair', 'knoux-x', 'knoux-clipboard-ai']) {
    assert.ok(sitemap.includes(`/products/${product}<`), `sitemap must list /products/${product}`);
  }
  for (const slug of ['google-ads', 'meta-ads', 'social', 'content', 'seo']) {
    assert.ok(sitemap.includes(`/growth/${slug}<`), `sitemap must list /growth/${slug}`);
  }
});

test('the contact endpoint never claims delivery without a configured service', async () => {
  await wait();

  assert.equal((await fetch(origin + '/api/contact', { method: 'GET' })).status, 405, 'contact endpoint rejects other methods');

  const malformed = await fetch(origin + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json',
  });
  assert.equal(malformed.status, 400, 'contact endpoint rejects malformed bodies');

  const invalid = await fetch(origin + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: 'bad', message: 'x' }),
  });
  assert.equal(invalid.status, 422, 'contact endpoint validates fields');

  const honeypot = await fetch(origin + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com', message: 'A valid project request.', website: 'bot.example' }),
  });
  assert.equal(honeypot.status, 200, 'honeypot stays silent');
  assert.equal((await honeypot.json()).delivered, false, 'a silent honeypot must never report delivery');

  const shortMessage = await fetch(origin + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com', message: 'Too short' }),
  });
  assert.equal(shortMessage.status, 422, 'contact endpoint rejects short messages');

  if (!process.env.CONTACT_WEBHOOK_URL) {
    const valid = await fetch(origin + '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'A valid request for a new project.',
        requestType: 'web',
      }),
    });
    assert.equal(valid.status, 503, 'must never claim delivery without a configured service');
    const body = await valid.json();
    assert.equal(body.delivered, false, 'an unconfigured delivery must say so');
  }
});
