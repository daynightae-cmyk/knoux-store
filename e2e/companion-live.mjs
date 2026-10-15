// Deliberate LIVE verification. No interception, mock provider or simulated text.
import { chromium,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const base=process.env.KNOUX_COMPANION_PREVIEW_URL??'http://127.0.0.1:4554';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Local preview only.');
const folder=`qa/companion/live-${Date.now()}`;mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),records=[];
try {
 for(const viewport of [{width:1440,height:900},{width:820,height:1180},{width:390,height:844}]) {
  const context=await browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390,reducedMotion:'no-preference',recordVideo:{dir:folder,size:viewport}});
  await context.addInitScript(()=>localStorage.setItem('knoux.sentinel.quiet','true'));
  const page=await context.newPage(),errors=[],requests=[],replies=[],pending=[],scripts=[],answers=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/api/sentinel/'))requests.push({method:request.method(),url:new URL(request.url()).pathname,body:request.postData()});if(/\/mcp|\/bridge|\/api\/ai|\/provider-os/.test(request.url()))errors.push('PRIVATE_REQUEST');});
  page.on('response',response=>{if(response.url().endsWith('/api/sentinel/reply'))pending.push(response.text().then(body=>replies.push({status:response.status(),events:body.split('\n').filter(line=>line.startsWith('data: ')).map(line=>JSON.parse(line.slice(6)))})).catch(error=>replies.push({status:response.status(),error:String(error),events:[]})));if(response.request().resourceType()==='script')pending.push(response.text().then(source=>scripts.push(source)));});
  await page.goto(`${base}/engineering`);const mascot=page.locator('[data-knoux-sentinel]');await expect(mascot).toBeVisible();await page.screenshot({path:`${folder}/${viewport.width}-idle.png`});
  const before=requests.filter(request=>request.url==='/api/sentinel/reply').length;
  await page.mouse.move(50,200);await page.mouse.move(300,400,{steps:40});await page.waitForTimeout(1200);
  if(requests.filter(request=>request.url==='/api/sentinel/reply').length!==before)throw new Error('Mouse movement sent a request while quiet');
  await mascot.locator('.ks-trigger').click();const bubble=page.locator('[data-companion-bubble]');await expect(page.getByRole('dialog')).toHaveCount(0);
  await bubble.getByLabel('Ask your companion').fill('What does this Engineering page actually establish, and where can I review its source?');
  await bubble.getByRole('button',{name:'Ask',exact:true}).click();await expect(bubble).toHaveAttribute('data-ai-state','done',{timeout:55000});
  await expect(bubble.locator('[data-companion-answer]')).not.toBeEmpty();await expect(bubble).toHaveAttribute('data-ai-model',/gemini/);answers.push({language:'en',model:await bubble.getAttribute('data-ai-model'),text:await bubble.locator('[data-companion-answer]').innerText()});await expect(mascot).toBeVisible();await expect(mascot).toHaveCount(1);
  await page.screenshot({path:`${folder}/${viewport.width}-gemini-en.png`});await page.waitForTimeout(250);await Promise.all(pending);
  const audit=await new AxeBuilder({page}).include('[data-companion-bubble]').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();if(audit.violations.length)throw new Error(JSON.stringify(audit.violations));
  await bubble.getByRole('button',{name:'Sources & settings'}).click();const panel=page.getByRole('dialog');await panel.getByRole('button',{name:'العربية',exact:true}).click();await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();
  await mascot.locator('.ks-trigger').click();await bubble.getByLabel('اسأل رفيقك').fill('اشرح لي باختصار ما الذي تثبته صفحة الهندسة، دون اختراع أسعار أو ضمانات.');await bubble.getByRole('button',{name:'اسأل',exact:true}).click();
  await expect(bubble).toHaveAttribute('data-ai-state','done',{timeout:55000});await expect(bubble).toHaveAttribute('dir','rtl');await expect(bubble.locator('[data-companion-answer]')).toContainText(/[\u0600-\u06ff]/);
  await expect(bubble).toHaveAttribute('data-ai-model',/gemini/);answers.push({language:'ar',model:await bubble.getAttribute('data-ai-model'),text:await bubble.locator('[data-companion-answer]').innerText()});await page.screenshot({path:`${folder}/${viewport.width}-gemini-ar.png`});await page.waitForTimeout(250);await Promise.all(pending);
  const geometry=await page.evaluate(()=>{const rect=document.querySelector('[data-companion-bubble]').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth-innerWidth,mascots:document.querySelectorAll('[data-knoux-sentinel]').length,stars:document.querySelectorAll('.store-starfield').length,bubble:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}};});
  if(geometry.overflow || geometry.bubble.left<0 || geometry.bubble.right>viewport.width+1 || geometry.bubble.top<0 || geometry.bubble.bottom>viewport.height+1)throw new Error('Companion viewport collision');
  await Promise.all(pending);
  if(replies.length!==2 || replies.some(reply=>reply.status!==200) || answers.length!==2 || answers.some(answer=>!answer.model.includes('gemini') || !answer.text))throw new Error('Real provider verification failed');
  if(scripts.some(source=>/AIza[\w-]{30,}|sb_secret_|BEGIN PRIVATE KEY|GEMINI_API_KEY|KNOUX_COMPANION_SESSION_SECRET/.test(source)))throw new Error('Server credential material in browser bundle');
  if(await page.evaluate(()=>document.cookie.includes('knoux-companion')))throw new Error('Session cookie is not HttpOnly');
  const video=page.video();await context.close();records.push({viewport,geometry,errors,requests,replies,answers,axeViolations:audit.violations,video:await video.path()});
 }
} finally {await browser.close();writeFileSync(`${folder}/report.json`,JSON.stringify({base,root:process.cwd(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildId:readFileSync('.next/BUILD_ID','utf8').trim(),status:records.length===3?'VERIFIED':'BLOCKED',records},null,2));}
console.log(folder,JSON.stringify(records.map(({viewport,geometry,replies,errors,video})=>({viewport,geometry,errors,video,providerReplies:replies.length}))));
