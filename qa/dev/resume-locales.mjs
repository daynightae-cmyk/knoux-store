import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const folder=`qa/dev/resume-locales-${Date.now()}`;mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const lang of ['en','ar','ur'])for(const [width,height] of [[1440,900],[820,1180],[390,844]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'});
 await context.addInitScript(l=>localStorage.setItem('knoux.sentinel.language',l),lang);
 await context.route('**/api/sentinel/session',r=>r.fulfill({status:503,body:'{}'}));
 await context.route('**/api/sentinel/reply',r=>r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/build/providers','/products','/contact','/solutions','/engineering','/']){
 const name=`${lang}-${width}-${path.replaceAll('/','_')||'home'}`;const record={lang,width,path,status:'FAIL'};
 try {await page.goto(`http://127.0.0.1:4321${path}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(l=>document.documentElement.lang===l,lang);await page.locator('main h1').first().waitFor();
 const state=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('main h1')?.textContent,sentinels:document.querySelectorAll('[data-knoux-sentinel]').length,starfields:document.querySelectorAll('.store-starfield').length}));record.state=state;
 assert.equal(state.dir,lang==='en'?'ltr':'rtl');assert.equal(state.scrollWidth,state.width);assert.equal(state.sentinels,1);assert.equal(state.starfields,1);
 if(lang!=='en'&&path!=='/')assert.match(state.heading,/[\u0600-\u06ff]/);
 assert.deepEqual(errors,[]);record.status='PASS';
 }catch(e){record.error=String(e);}
 await page.screenshot({path:`${folder}/${name}.png`});writeFileSync(`${folder}/${name}.txt`,await page.locator('body').innerText());results.push(record);
 }
 await context.close();
} }finally{await browser.close();writeFileSync(`${folder}/report.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({folder,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status!=='PASS')},null,2));if(results.some(x=>x.status!=='PASS'))process.exitCode=1;}
