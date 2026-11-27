const { chromium }=require('@playwright/test'); const path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1440,height:900}});
p.on('pageerror',e=>console.log('PAGE_ERROR',e.message.slice(0,180)));
p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE_ERROR',m.text().slice(0,180))});
const dir=path.join(process.env.TEMP||'.','knoux-owner-review-20261124');
for(const {route,select,name} of [
 {route:'/wordpress',select:'[data-enter-studio]',name:'wordpress-entered'},
 {route:'/build',select:'button:has-text("Build")',name:'build-entered'}
]){try{
 await p.goto('http://127.0.0.1:3001'+route,{waitUntil:'domcontentloaded',timeout:35000});
 await p.waitForTimeout(7500);
 console.log('BEFORE',route,await p.locator(select).count(),p.url());
 await p.locator(select).first().click({timeout:12000});
 await p.waitForTimeout(3500);
 const out=path.join(dir,name+'.png');
 await p.screenshot({path:out});
 console.log('AFTER',name,p.url(),'wp-dialog-open',await p.locator('dialog#studio[open]').count(),out);
}catch(e){console.log('CLICK_ERROR',route,e.message.slice(0,350))}}
await b.close()})().catch(e=>{console.error(e);process.exitCode=1});
