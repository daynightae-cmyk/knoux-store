const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const out = path.join(process.env.TEMP || '.', 'knoux-owner-review-20261124');
  fs.mkdirSync(out,{recursive:true});
  for (const [route,name] of [['/wordpress#studio','wordpress-studio'],['/build/apps','apps'],['/growth','growth'],['/build#workspace','build-workspace']]) {
    try {
      const response = await page.goto('http://127.0.0.1:3001'+route,{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForTimeout(1900);
      await page.screenshot({path:path.join(out,name+'.png')});
      console.log('CAPTURE',name,response?.status(),path.join(out,name+'.png'));
    } catch (error) { console.error('CAPTURE_FAILED',name,error.message); }
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
