import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { startOwnedServer, stopOwnedServer } from '../scripts/css-integrity.mjs';
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Use before or after');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const folder = `qa/engineering/${phase}-${Date.now()}`;
await mkdir(folder, { recursive: true });
const server = await startOwnedServer(process.cwd(), 4514);
const browser = await chromium.launch({ channel: 'chrome' });
const records = [];
try {
  for (const [width, height] of [[1440,900],[820,1180],[390,844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${server.base}/engineering`);
    await page.locator('.engineering-dossier').first().waitFor();
    await page.screenshot({ path: `${folder}/${width}-top.png` });
    await page.screenshot({ path: `${folder}/${width}-full.png`, fullPage: true });
    const geometry = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      starfields: document.querySelectorAll('.store-starfield').length,
      regions: [...document.querySelectorAll('main > section, .engineering-dossier')].map(el => {
        const b = el.getBoundingClientRect(); return { class: el.className, top: b.top, height: b.height, width: b.width };
      }),
    }));
    if (phase === 'after') {
      for (const name of ['01 Interface', '02 Runtime', '03 Data', '04 Delivery']) {
        await page.getByRole('tab', {name}).click();
        await page.locator('[role="tabpanel"]').screenshot({path:`${folder}/${width}-${name.slice(3).toLowerCase()}.png`});
      }
    }
    records.push({ width, height, status: response.status(), errors, geometry });
    await page.close();
    if (response.status() !== 200 || errors.length || geometry.scrollWidth > width || geometry.starfields !== 1) throw new Error(`Capture failed at ${width}px`);
  }
  if (execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== head) throw new Error('HEAD changed during capture');
  await writeFile(`${folder}/report.json`, JSON.stringify({ head, phase, buildId:(await readFile('.next/BUILD_ID','utf8')).trim(), provenance:server.provenance, records }, null, 2));
  console.log(folder);
} finally { await browser.close(); await stopOwnedServer(server.child); }
