import { chromium } from '@playwright/test';

const BASE = process.env.QA_BASE ?? 'http://127.0.0.1:3403';
const browser = await chromium.launch();

for (const [w, h] of [
  [1440, 900],
  [375, 812],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/wordpress`, { waitUntil: 'networkidle' });
  const ledger = page.locator('.eco-ledger');
  await ledger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const shape = await page.evaluate(() => {
    const dl = document.querySelector('.eco-ledger');
    const groups = [...dl.querySelectorAll(':scope > div')].map((g) => ({
      childTags: [...g.children].map((c) => c.tagName.toLowerCase()),
      dt: g.querySelector('dt')?.textContent?.trim(),
      value: g.querySelector('dd:not(.eco-ledger__note)')?.textContent?.trim(),
      note: g.querySelector('.eco-ledger__note')?.textContent?.trim().slice(0, 44),
    }));
    // Does any caption still escape its cell?
    let overflow = 0;
    for (const note of dl.querySelectorAll('.eco-ledger__note')) {
      if (note.scrollWidth > note.clientWidth + 1) overflow++;
    }
    const strayBackticks = (dl.textContent ?? '').match(/`/g) ?? [];
    return { groups, noteOverflow: overflow, strayBackticks: strayBackticks.length };
  });

  console.log(`\n=== ${w}x${h} ===`);
  console.log(`  notes overflowing their cell : ${shape.noteOverflow}`);
  console.log(`  literal backticks in ledger  : ${shape.strayBackticks}`);
  for (const g of shape.groups) {
    console.log(`  [${g.childTags.join(',')}] ${g.dt} = ${g.value} :: ${g.note}`);
  }
  await ledger.screenshot({ path: `qa/ledger-${w}x${h}.png` });
  await ctx.close();
}

await browser.close();
