import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const folder=`qa/dev/render-diagnostic-${Date.now()}`;mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('**/api/sentinel/session',r=>r.fulfill({status:503,json:{message:'No live inference in diagnostic'}}));
 await page.addInitScript(() => localStorage.setItem('knoux.sentinel.language','ar'));
 await page.goto('http://127.0.0.1:3999/products');
 await page.locator('[data-sentinel-launcher][lang=ar]').waitFor();
 await page.addStyleTag({content:'html[dir=rtl] .visually-hidden {margin:0;left:0;right:auto;clip-path:inset(50%);overflow:hidden;}'});
 await page.waitForTimeout(1000);
 const images=await page.locator('[class*="providerList"] img').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),complete:n.complete,naturalWidth:n.naturalWidth,rect:n.getBoundingClientRect().toJSON(),display:getComputedStyle(n).display,opacity:getComputedStyle(n).opacity,visibility:getComputedStyle(n).visibility,parentDisplay:getComputedStyle(n.parentElement).display})));
 await page.locator('[data-sentinel-launcher] .ks-trigger').click();
 await page.getByRole('button',{name:'المصادر والإعدادات',exact:true}).click();
 const panel=page.locator('#sentinel-guide-panel');await panel.waitFor();await page.waitForTimeout(1000);
 await page.screenshot({path:`${folder}/guide.png`});
 await panel.screenshot({path:`${folder}/panel.png`});
 const state=await panel.evaluate(n=>({rect:n.getBoundingClientRect().toJSON(),display:getComputedStyle(n).display,opacity:getComputedStyle(n).opacity,visibility:getComputedStyle(n).visibility,transform:getComputedStyle(n).transform,animation:getComputedStyle(n).animation,html:n.outerHTML,scrollX,scrollY,htmlWidth:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.left < -0.1 || r.right>innerWidth+0.1;}).slice(0,20).map(e=>({tag:e.tagName,cls:e.className,rect:e.getBoundingClientRect().toJSON()})),htmlRect:document.documentElement.getBoundingClientRect().toJSON(),bodyRect:document.body.getBoundingClientRect().toJSON()}));
 writeFileSync(`${folder}/dom.json`,JSON.stringify({images,state},null,2));console.log(JSON.stringify({folder,images,panel:{...state,html:undefined}},null,2));
}finally{await browser.close();}
