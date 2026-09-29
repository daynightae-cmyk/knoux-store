import { chromium } from '@playwright/test';

const ROUTES = ['/', '/build', '/login', '/contact', '/products', '/wordpress/plugins', '/growth', '/creative'];
const out = [];

const browser = await chromium.launch();

// --- 1. Skip link: first stop, becomes visible on focus, moves focus to main ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3311/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  const beforeTop = await p.$eval('.skip-link', el => Math.round(el.getBoundingClientRect().top));
  await p.keyboard.press('Tab');
  const firstStop = await p.evaluate(() => {
    const el = document.activeElement;
    return { tag: el.tagName, text: (el.textContent||'').trim(), href: el.getAttribute('href') };
  });
  const focusedTop = await p.$eval('.skip-link', el => Math.round(el.getBoundingClientRect().top));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  const landed = await p.evaluate(() => ({
    hash: location.hash,
    focused: document.activeElement.id || document.activeElement.tagName,
  }));
  out.push(`SKIP LINK  hidden-top=${beforeTop}px  first-stop="${firstStop.text}" (${firstStop.tag} ${firstStop.href})  on-focus-top=${focusedTop}px  after-Enter hash=${landed.hash} focus=${landed.focused}`);
  await ctx.close();
}

// --- 2. Tab order and focus visibility on every representative route ---
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3311' + route, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  const stops = [];
  for (let i = 0; i < 25; i++) {
    await p.keyboard.press('Tab');
    stops.push(await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const noOutline = cs.outlineStyle === 'none' || cs.outlineWidth === '0px';
      const hasShadow = cs.boxShadow !== 'none' && cs.boxShadow !== '';
      return {
        tag: el.tagName.toLowerCase(),
        name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24).replace(/\s+/g, ' '),
        visible: !noOutline || hasShadow,
      };
    }));
  }
  const real = stops.filter(Boolean);
  const invisible = real.filter(s => !s.visible);
  const counts = real.reduce((a, s) => (a[s.tag] = (a[s.tag] || 0) + 1, a), {});
  out.push(`TAB ORDER  ${route.padEnd(20)} stops=${real.length} types=${JSON.stringify(counts)} invisible-focus=${invisible.length}`);
  out.push(`           first 8: ${real.slice(0, 8).map(s => s.tag + ':' + s.name).join(' -> ')}`);
  await ctx.close();
}

// --- 3. Search dialog: Escape closes, focus returns to the trigger ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3311/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  const trigger = await p.$('.header-search');
  if (trigger) {
    await trigger.focus();
    const before = await p.evaluate(() => document.activeElement.className);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(500);
    const opened = await p.evaluate(() => {
      const d = document.querySelector('.search-overlay, [role="dialog"]');
      return d ? { open: true, focusInside: !!d.contains(document.activeElement), label: d.getAttribute('aria-label') } : { open: false };
    });
    const tabbed = [];
    for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); tabbed.push(await p.evaluate(() => { const d=document.querySelector('.search-overlay,[role="dialog"]'); return d && d.contains(document.activeElement); })); }
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    const closed = await p.evaluate(() => !document.querySelector('.search-overlay, [role="dialog"]'));
    const after = await p.evaluate(() => document.activeElement.className);
    out.push(`DIALOG     trigger=${before} opened=${opened.open} focusInside=${opened.focusInside} focusStayedInDialog=${JSON.stringify(tabbed)} escape-closes=${closed} focusReturned=${after === before}`);
  } else {
    out.push('DIALOG     no .header-search trigger found');
  }
  await ctx.close();
}

// --- 4. Reduced motion honoured ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3311/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  const mq = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const durations = await p.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).slice(0, 400);
    const long = els.filter(el => { const d = getComputedStyle(el).transitionDuration; return d && d.split(',').some(v => parseFloat(v) > 0.05); }).length;
    return long;
  });
  out.push(`REDUCED    media-query-honoured=${mq} elements-with-transition>50ms=${durations}`);
  await ctx.close();
}

await browser.close();
console.log(out.join('\n'));
