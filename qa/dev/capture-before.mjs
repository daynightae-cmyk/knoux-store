import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const folder=`qa/dev/before-${Date.now()}`;mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),records=[];
try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){const context=await browser.newContext({viewport});await context.addInitScript(()=>{sessionStorage.setItem('knoux-dev-entry-intent','Build a web app');localStorage.setItem('knoux.sentinel.quiet','true');});const page=await context.newPage();for(const route of ['/build','/build/providers','/build/ai/models']){await page.goto(`http://127.0.0.1:4554${route}`);await page.waitForTimeout(1200);const file=`${folder}/${viewport.width}-${route.replaceAll('/','-')}.png`;await page.screenshot({path:file});records.push({route,viewport,file,overflow:await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)});}await context.close();}}finally{await browser.close();}
writeFileSync(`${folder}/report.json`,JSON.stringify({source:'Original verified Sentinel preview, untouched by Dev changes',base:'http://127.0.0.1:4554',records},null,2));console.log(folder);
