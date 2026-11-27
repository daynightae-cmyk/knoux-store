import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
await page.goto('http://localhost:3101/wordpress', { waitUntil: 'load' });
await page.waitForTimeout(2000);
const out = await page.evaluate(() => {
  const el = document.querySelector('[class*="satelliteLeft"]');
  const cs = getComputedStyle(el);
  const matches = [];
  for (const sheet of document.styleSheets) {
    let list; try { list = sheet.cssRules; } catch { continue; }
    const walk = (rules, media) => {
      for (const r of rules) {
        if (r.cssRules && r.conditionText !== undefined) walk(r.cssRules, r.conditionText);
        else if (r.cssRules) walk(r.cssRules, media);
        if (!r.selectorText) continue;
        try { if (!el.matches(r.selectorText)) continue; } catch { continue; }
        if (r.style && (r.style.width || r.style.height || r.style.minWidth || r.style.maxWidth || r.style.flex || r.style.inset)) {
          matches.push({ sel: r.selectorText, media: media ?? null, width: r.style.width, height: r.style.height, minWidth: r.style.minWidth, maxWidth: r.style.maxWidth, flex: r.style.flex });
        }
      }
    };
    walk(list, null);
  }
  return {
    width: cs.width, height: cs.height, minWidth: cs.minWidth, maxWidth: cs.maxWidth, boxSizing: cs.boxSizing,
    padding: cs.padding, position: cs.position, flex: cs.flex, zoom: cs.zoom, scale: cs.scale, transform: cs.transform,
    offsetWidth: el.offsetWidth, clientWidth: el.clientWidth, inline: el.getAttribute('style'),
    parent: el.parentElement.className, matches,
    svg: (() => { const s = el.querySelector('svg'); if (!s) return null; const r = s.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: getComputedStyle(s).display }; })(),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
