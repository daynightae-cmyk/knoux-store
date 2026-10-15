import { chromium, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startOwnedServer, stopOwnedServer } from '../scripts/css-integrity.mjs';
const folder=`qa/sentinel/living-motion-${Date.now()}`;
mkdirSync(folder,{recursive:true});
const server=await startOwnedServer(process.cwd(),4550);
const browser=await chromium.launch({channel:'chrome'});
const records=[];
try {
  for(const viewport of [{width:1440,height:900},{width:820,height:1180},{width:390,height:844}]) {
    const context=await browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390,reducedMotion:'no-preference',recordVideo:{dir:folder,size:viewport}});
    const page=await context.newPage();const errors=[],privateCalls=[],scripts=new Map(),pending=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/\/mcp|\/bridge|\/api\/ai|\/provider-os/.test(request.url()))privateCalls.push(request.url());});
    page.on('response',response=>{if(response.request().resourceType()==='script')pending.push(response.body().then(body=>scripts.set(response.url(),body.length)).catch(()=>{}));});
    const shot=async name=>page.screenshot({path:`${folder}/${viewport.width}-${name}.png`});
    await page.goto(`${server.base}/engineering`);const mascot=page.locator('[data-knoux-sentinel]'),bubble=page.locator('[data-sentinel-bubble]');
    await expect(mascot).toBeVisible();await shot('idle');
    if(viewport.width!==390){await page.mouse.move(320,330,{steps:16});await expect(mascot).toHaveAttribute('data-settled','true');await shot('pointer');}
    await expect(bubble).toBeVisible({timeout:15000});await expect(mascot).toHaveAttribute('data-phase','speaking');await shot('bubble-en');
    await mascot.locator('.ks-trigger').click();const panel=page.getByRole('dialog');
    await expect(panel.locator('[data-knoux-sentinel]')).toBeVisible();await expect(mascot).toHaveCount(1);await shot('expanded-en');
    await panel.getByRole('button',{name:'العربية',exact:true}).click();await shot('expanded-ar');
    await panel.getByRole('button',{name:'إعدادات Sentinel',exact:true}).click();await panel.getByLabel('تقليل الحركة',{exact:true}).check();
    await panel.getByRole('button',{name:'الوضع الهادئ',exact:true}).click();await expect(mascot).toBeVisible();await shot('settings-quiet');
    await panel.getByRole('button',{name:'الوضع الهادئ',exact:true}).click();await panel.getByLabel('تقليل الحركة',{exact:true}).uncheck();
    await panel.getByRole('link',{name:'استكشف الحلول'}).click();await expect(page).toHaveURL(/\/solutions$/);
    await page.keyboard.press('Escape');await expect(mascot).toBeVisible();await expect(bubble).toContainText('الحلول المنشورة',{timeout:15000});await shot('bubble-ar');
    await bubble.getByRole('button',{name:'إخفاء التلميح'}).click();await page.waitForTimeout(1000);await shot('returned-idle');
    // New page gets a new route cooldown. Hover is a real published link, never fixture text.
    await page.goto(`${server.base}/engineering`);
    const product=page.locator('main a[href="/products"]').first();await product.scrollIntoViewIfNeeded();await product.hover();
    await expect(bubble).toContainText('المنتجات',{timeout:15000});await shot('intentional-hover');
    const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,mascots:document.querySelectorAll('[data-knoux-sentinel]').length,starfields:document.querySelectorAll('.store-starfield').length,cores:navigator.hardwareConcurrency}));
    await Promise.all(pending);const decodedScriptBytes=[...scripts.values()].reduce((a,b)=>a+b,0);
    const video=page.video();await context.close();
    records.push({viewport,geometry,errors,privateCalls,decodedScriptBytes,within1800KiB:decodedScriptBytes<=1800*1024,video:await video.path()});
  }
} finally {await browser.close();await stopOwnedServer(server.child);}
writeFileSync(`${folder}/report.json`,JSON.stringify({root:process.cwd(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildId:readFileSync('.next/BUILD_ID','utf8').trim(),provenance:server.provenance,records},null,2));
console.log(folder,JSON.stringify(records));
