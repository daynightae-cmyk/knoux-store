import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startOwnedServer, stopOwnedServer } from '../scripts/css-integrity.mjs';
const phase = process.argv[2] ?? 'before';
const folder = `qa/sentinel/${phase}-${Date.now()}`;
mkdirSync(folder, { recursive: true });
const server = await startOwnedServer(process.cwd(), 4550);
const browser = await chromium.launch({ channel: 'chrome' });
const records = [];
try {
  for (const viewport of [{width:1440,height:900},{width:820,height:1180},{width:390,height:844}]) {
    const context = await browser.newContext({viewport,reducedMotion:'reduce',isMobile:viewport.width===390,hasTouch:viewport.width===390});
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const scripts = new Map(); const pending = [];
    page.on('response', response => { if(response.request().resourceType()==='script') pending.push(response.body().then(body=>scripts.set(response.url(),body.length)).catch(()=>{})); });
    await page.goto(server.base); await page.locator('main h1').waitFor(); await page.waitForTimeout(5000); await Promise.all(pending);
    await page.evaluate(() => window.scrollTo(0, 0));
    const bytes = [...scripts.values()].reduce((a,b)=>a+b,0);
    await page.screenshot({path:`${folder}/home-${viewport.width}-top.png`});
    await page.screenshot({path:`${folder}/home-${viewport.width}-full.png`,fullPage:true});
    await page.locator('[data-sentinel-launcher] button').first().click();
    await page.getByRole('button',{name:'Sources & settings'}).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({path:`${folder}/guide-${viewport.width}-english.png`});
    await page.getByRole('dialog').getByRole('button',{name:'العربية',exact:true}).click();
    await page.screenshot({path:`${folder}/guide-${viewport.width}-arabic.png`});
    const geometry = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth-innerWidth,stars:document.querySelectorAll('.store-starfield').length,sentinels:document.querySelectorAll('[data-knoux-sentinel]').length,scrollY,heading:document.querySelector('main h1')?.textContent}));
    records.push({viewport,decodedScriptBytes:bytes,within1800KiB:bytes<=1800*1024,geometry,errors});
    await context.close();
  }
} finally { await browser.close(); await stopOwnedServer(server.child); }
writeFileSync(`${folder}/report.json`,JSON.stringify({phase,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildId:readFileSync('.next/BUILD_ID','utf8').trim(),root:process.cwd(),pid:server.child.pid,records},null,2));
console.log(folder,JSON.stringify(records));
