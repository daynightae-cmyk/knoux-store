import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
await page.goto('http://localhost:3101/wordpress', { waitUntil: 'load' });
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const pick = (sel) => Array.from(document.querySelectorAll(sel)).map(el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { cls: el.className, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), width: cs.width, height: cs.height, z: cs.zIndex, display: cs.display, opacity: cs.opacity };
  });
  return {
    satellites: pick('[class*="satellite"]'),
    pylons: pick('[class*="pylon"]'),
    gateBody: pick('[class*="gateBody"]'),
    gateInner: pick('[class*="gateInner"]'),
    mark: pick('[class*="mark"]'),
    clouds: pick('[class*="clouds"]'),
    gateway: pick('[class*="gateway"]'),
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: 'references/store-20261123/qa/screen-01/debug-sat.png' });
await browser.close();
