import { chromium } from '@playwright/test';
import { writeFileSync,readFileSync } from 'node:fs';
const browser=await chromium.launch({channel:'chrome'}),records=[];
try{for(const viewport of [{width:1440,height:900},{width:820,height:1180},{width:390,height:844}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('knoux.sentinel.quiet','true'));
 const page=await context.newPage(),scripts=new Map(),pending=[];
 page.on('response',r=>{if(r.request().resourceType()==='script')pending.push(r.body().then(b=>scripts.set(r.url(),b.length)));});
 await page.goto('http://127.0.0.1:4554/');await page.waitForTimeout(3000);await Promise.all(pending);
 const bytes=[...scripts.values()].reduce((a,b)=>a+b,0);records.push({viewport,decodedScriptBytes:bytes,within1800KiB:bytes<=1800*1024});await context.close();
}}finally{await browser.close();}
writeFileSync('qa/companion/final-bundle.json',JSON.stringify({buildId:readFileSync('.next/BUILD_ID','utf8').trim(),records,status:records.length===3&&records.every(r=>r.within1800KiB)?'PASS':'FAIL'},null,2));
console.log(JSON.stringify(records));if(records.some(r=>!r.within1800KiB))process.exitCode=1;
