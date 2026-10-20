import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const folder=`qa/dev/resume-before-${Date.now()}`;mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {for(const lang of ['en','ar','ur']){const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.route('**/api/sentinel/session',r=>r.fulfill({status:503,body:'{}'}));await context.addInitScript(l=>localStorage.setItem('knoux.sentinel.language',l),lang);const page=await context.newPage();await page.goto('http://127.0.0.1:4321/build/providers');await page.waitForFunction(l=>document.documentElement.lang===l,lang);await page.screenshot({path:`${folder}/${lang}-providers.png`});writeFileSync(`${folder}/${lang}-dom.txt`,await page.locator('body').innerText());await context.close();}console.log(folder);}finally{await browser.close();}
