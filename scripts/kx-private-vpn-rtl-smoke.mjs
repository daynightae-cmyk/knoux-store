import { chromium } from '@playwright/test';
const base=process.env.KX_BASE_URL || 'http://127.0.0.1:3927';
const routes=['/software/kx-private-vpn','/docs/kx-private-vpn','/legal/kx-private-vpn/privacy','/support/kx-private-vpn','/software/kx-private-vpn/releases'];
const browser=await chromium.launch({channel:'chrome',headless:true});
let failed=0;let total=0;
try {
  for(const vp of [{width:1440,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport:vp,reducedMotion:'reduce'});
    await context.addInitScript(()=>{localStorage.setItem('knoux.sentinel.language','ar');localStorage.setItem('knoux.sentinel.quiet','true');});
    for(const route of routes){
      const page=await context.newPage();const errors=[];
      page.on('pageerror',error=>errors.push(error.message.slice(0,200)));
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
      await page.locator('main#main-content[dir="rtl"][lang="ar"]').waitFor({timeout:10000}).catch(()=>null);
      const result=await page.evaluate(()=>{
        const el=document.querySelector('main#main-content');
        return {dir:el?.getAttribute('dir'),lang:el?.getAttribute('lang'),heading:el?.querySelector('h1')?.textContent?.trim(),overflow:document.documentElement.scrollWidth>innerWidth+3};
      });
      total++;
      const ok=response?.status()===200 && result.dir==='rtl' && result.lang==='ar' && !!result.heading && !result.overflow && errors.length===0;
      if(!ok)failed++;
      console.log(JSON.stringify({route,viewport:vp.width,ok,...result,errors}));
      await page.close();
    }
    await context.close();
  }
} finally {await browser.close();}
console.log('RTL_SMOKE_TOTAL='+total+' FAILURES='+failed);
process.exitCode=failed?1:0;
