// Final acceptance uses the real local server and real Gemini, never route mocks.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const base='http://127.0.0.1:4554',folder=`qa/companion/acceptance-${Date.now()}`;
mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),records=[];
let failure;
try {
 for(const viewport of [{width:1440,height:900},{width:820,height:1180},{width:390,height:844}]) {
  const context=await browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390,recordVideo:{dir:folder,size:viewport}});
  await context.addInitScript(()=>{
   const originalFetch=window.fetch;
   window.__companionNetwork=[];
   window.fetch=async(...args)=>{
    const start=performance.now(),response=await originalFetch(...args);
    if(String(args[0]).endsWith('/api/sentinel/reply')&&response.body){
     const measurement={status:response.status,firstTokenMs:null,totalMs:null,deltaEvents:0};window.__companionNetwork.push(measurement);
     // Observe a clone of the actual stream. The visitor consumes the original.
     void(async()=>{const reader=response.clone().body.getReader(),decoder=new TextDecoder();let buffer='';try{while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let end;while((end=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);for(const line of frame.split('\n'))if(line.startsWith('data: ')){const event=JSON.parse(line.slice(6));if(event.type==='delta'&&event.text){measurement.firstTokenMs??=performance.now()-start;measurement.deltaEvents++;}if(event.type==='done')measurement.totalMs=performance.now()-start;}}}}catch{measurement.error='stream interrupted';}})();
    }return response;
   };
  });
  if(viewport.width!==1440)await context.addInitScript(()=>localStorage.setItem('knoux.sentinel.quiet','true'));
  const page=await context.newPage(),requests=[],errors=[],answers=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/sentinel/'))requests.push({path:new URL(r.url()).pathname,body:r.postData()});if(/\/mcp|\/bridge|\/provider-os/.test(r.url()))errors.push('PRIVATE_REQUEST');});
  await page.goto(`${base}/engineering`);
  const mascot=page.locator('[data-knoux-sentinel]'),bubble=page.locator('[data-companion-bubble]');
  await expect(mascot).toBeVisible();
  await page.screenshot({path:`${folder}/${viewport.width}-idle.png`});
  const before=requests.filter(r=>r.path.endsWith('/reply')).length;
  const transformBefore=await mascot.evaluate(e=>getComputedStyle(e).transform);
  for(let i=0;i<25;i++)await page.mouse.move(200+i*8,220+i*3);
  await page.waitForTimeout(450);
  const transformAfter=await mascot.evaluate(e=>getComputedStyle(e).transform);
  const movementRequests=requests.filter(r=>r.path.endsWith('/reply')).length-before;
  if(movementRequests>1)throw new Error('Pointer movement caused repeated inference');
  async function open(){if(await bubble.count()===0 || await bubble.getAttribute('data-proactive')==='true')await mascot.locator('.ks-trigger').click();}
  // Record live pointer presence first, then quiet proactive suggestions while
  // deliberately issuing several explicit questions within one minute.
  if(viewport.width===1440){await open();await bubble.getByRole('button',{name:'Sources & settings'}).click();const panel=page.getByRole('dialog');await panel.getByRole('button',{name:'Quiet mode',exact:true}).click();await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();}
  async function language(ar){await open();await bubble.getByRole('button',{name:/Sources & settings|المصادر والإعدادات/}).click();const panel=page.getByRole('dialog');await panel.getByRole('button',{name:ar?'العربية':'English',exact:true}).click();await page.screenshot({path:`${folder}/${viewport.width}-guide-${ar?'ar':'en'}.png`});await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();await open();}
  async function ask(route,question,ar=false){
   await page.goto(`${base}${route}`);
   const section=route==='/engineering'?'engineering-dossiers':route==='/products'?'ledger':'solution-handoff';
   const marker=page.locator(`#${section}`).locator('h2,h3').first();
   if(await marker.count())await marker.scrollIntoViewIfNeeded();else await page.locator(`#${section}`).scrollIntoViewIfNeeded();
   await page.waitForTimeout(1900);await open();if(ar)await language(true);
   await bubble.getByLabel(ar?'اسأل رفيقك':'Ask your companion').fill(question);
   await page.evaluate(()=>{window.__companionTiming={start:performance.now(),first:null,updates:[]};const t=window.__companionTiming;window.__companionObserver?.disconnect();window.__companionObserver=new MutationObserver(()=>{const b=document.querySelector('[data-companion-bubble]'),text=b?.querySelector('[data-companion-answer]')?.textContent;if(b?.dataset.aiState==='streaming'&&text){t.first??=performance.now();if(t.updates.at(-1)!==text)t.updates.push(text);}});window.__companionObserver.observe(document.querySelector('[data-companion-bubble]'),{subtree:true,childList:true,characterData:true,attributes:true});});
   await bubble.getByRole('button',{name:ar?'اسأل':'Ask',exact:true}).click();
   await expect(bubble).toHaveAttribute('data-ai-state',/done|error/,{timeout:55000});
   if(await bubble.getAttribute('data-ai-state')==='error') {
    // One visible, explicit retry only; retain the provider failure in evidence.
    errors.push(`Transient provider failure on ${route}; explicit retry`);
    await page.waitForTimeout(31000);await page.waitForTimeout(31000);
    await bubble.getByRole('button',{name:ar?'إعادة المحاولة':'Retry',exact:true}).click();
    await expect(bubble).toHaveAttribute('data-ai-state','done',{timeout:55000});
   }
   const timing=await page.evaluate(()=>({...window.__companionTiming,totalMs:performance.now()-window.__companionTiming.start}));
   await expect.poll(()=>page.evaluate(()=>window.__companionNetwork.at(-1)?.totalMs),{timeout:5000}).toBeTruthy();
   const network=await page.evaluate(()=>window.__companionNetwork.at(-1));
   const text=await bubble.locator('[data-companion-answer]').innerText(),model=await bubble.getAttribute('data-ai-model');
   if(!text||!model?.includes('gemini'))throw new Error('No genuine completed Gemini answer');
   if(ar&&!/[\u0600-\u06ff]/.test(text))throw new Error('Arabic answer absent');
   const submitted=JSON.parse(requests.filter(r=>r.path.endsWith('/reply')).at(-1).body);
   const allowedSections=route==='/solutions'?['solution-handoff','solution-layer-detail']:[section];
   // Hovering a selected mission may legitimately replace section attention
   // with its more specific published entity, rather than the generic route.
   const missionAttention=route==='/solutions'&&['link','button'].includes(submitted.context.role)&&submitted.context.target!=='route-solutions';
   if(!allowedSections.includes(submitted.context.section)&&!missionAttention)throw new Error(`Missing actual section context: ${section}; got ${JSON.stringify(submitted.context)}`);
   answers.push({route,section,context:submitted.context,language:ar?'ar':'en',text,model,firstTokenMs:network.firstTokenMs,totalMs:network.totalMs,clickToCompletionMs:timing.totalMs,firstRenderedStreamMs:timing.first===null?null:timing.first-timing.start,deltaEvents:network.deltaEvents,streamUpdates:timing.updates.length});
   await page.screenshot({path:`${folder}/${viewport.width}-${route.slice(1)}-${ar?'ar':'en'}.png`});
  }
  if(viewport.width===1440){
   await ask('/engineering','Explain the documented four-stage engineering workflow, without inventing delivery guarantees.');
   await language(false);
   await ask('/products','What does the software register establish? Does listing KNOuX Clipboard AI prove production readiness, or is its release maturity limited?');
   if(!/release.candidate|not .*ready|not .*readiness|does not .*readiness|cannot .*readiness|unverified/i.test(answers.at(-1).text))throw new Error('Product maturity qualification missing');
   await ask('/solutions','كيف يرتبط اختيار المهمة بالطبقات الأساسية والاختيارية والخطوة التالية؟',true);
  }else{
   await ask('/solutions','اشرح مسار تسليم الحلول باختصار من المصادر المنشورة فقط.',true);
   if(viewport.width===390){await language(false);await ask('/products','Does listing KNOuX Clipboard AI prove production readiness? Explain its documented release maturity.');if(!/release.candidate|not .*ready|not .*readiness|does not .*readiness|cannot .*readiness|unverified/i.test(answers.at(-1).text))throw new Error('Mobile maturity qualification missing');}
  }
  const axe=await new AxeBuilder({page}).include('[data-companion-bubble]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  if(axe.violations.length)throw new Error(JSON.stringify(axe.violations));
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,mascots:document.querySelectorAll('[data-knoux-sentinel]').length,stars:document.querySelectorAll('.store-starfield').length,bubble:document.querySelector('[data-companion-bubble]').getBoundingClientRect().toJSON()}));
  if(geometry.overflow||geometry.mascots!==1||geometry.stars!==1||geometry.bubble.left<0||geometry.bubble.right>viewport.width+1||geometry.bubble.bottom>viewport.height+1)throw new Error('Viewport/instance failure');
  await bubble.getByRole('button',{name:/Sources & settings|المصادر والإعدادات/}).click();
  const panel=page.getByRole('dialog'),quiet=panel.getByRole('button',{name:/Quiet mode|الوضع الهادئ/});
  if(await quiet.getAttribute('aria-pressed')!=='true')await quiet.click();
  await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();
  await page.reload();await expect(mascot).toBeVisible();await page.waitForTimeout(3500);
  if(await page.evaluate(()=>localStorage.getItem('knoux.sentinel.quiet'))!=='true')throw new Error('Quiet persistence failed');
  await page.screenshot({path:`${folder}/${viewport.width}-quiet.png`});
  const video=page.video();await context.close();records.push({viewport,answers,geometry,errors,movementRequests,transformBefore,transformAfter,requests,axeViolations:axe.violations,quietPersisted:true,video:await video.path()});
 }
}catch(error){failure=String(error);throw error;}finally{await browser.close();writeFileSync(`${folder}/report.json`,JSON.stringify({base,buildId:readFileSync('.next/BUILD_ID','utf8').trim(),status:records.length===3?'PASS':'BLOCKED',failure,records},null,2));console.log(folder);}
