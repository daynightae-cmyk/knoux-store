import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { inspectBuild, startOwnedServer, stopOwnedServer, verifyServedAsset } from './css-integrity.mjs';

const phase = process.argv[2] ?? 'after';
if (!['before','after'].includes(phase)) throw new Error('Use before or after');
const root = process.cwd();
const head = execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8' }).trim();
const evidenceHead = phase === 'before' ? 'b1fe8d4fa9233903fa3da88876bd935582a32ad1' : head;
const output = resolve(root, 'qa/production-recovery', `${phase}-${evidenceHead.slice(0,12)}-${Date.now()}`);
await mkdir(output, { recursive:true });
const server = phase === 'after' ? await startOwnedServer(root, 4492) : null;
const base = server?.base ?? 'https://knoux.store';
const report = { phase, head: phase === 'before' ? 'b1fe8d4fa9233903fa3da88876bd935582a32ad1' : head, measuredAt:new Date().toISOString(), provenance:server?.provenance ?? { deployment:'dpl_7k7aXz9ZXyHh2LVRLZgqMVf9QiRA', base }, buildId: phase === 'after' ? (await readFile('.next/BUILD_ID','utf8')).trim() : null, disk: phase === 'after' ? await inspectBuild(resolve(root,'.next')) : null, records:[] };
const browser = await chromium.launch({channel:'chrome'});
try {
  for (const route of ['/growth','/wordpress','/signal','/engineering','/products']) {
    for (const [width,height] of [[1440,900],[1920,1080],[820,1180],[390,844],[360,800]]) {
      if (server && execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim() !== head) throw new Error('HEAD changed');
      const context = await browser.newContext({ viewport:{width,height}, reducedMotion:'reduce' });
      const page = await context.newPage();
      const errors=[], failures=[], expectedAuth=[];
      const expected = url => server && new URL(url).pathname === '/api/wordpress/operations';
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',e=>{if(e.type()==='error' && !(e.text().includes('401') && expected(e.location().url || base)))errors.push(e.text())});
      page.on('response',r=>{if(r.status()>=400)(r.status()===401 && expected(r.url()) ? expectedAuth : failures).push({url:r.url(),status:r.status()})});
      const response = await page.goto(base+route,{waitUntil:'networkidle',timeout:60000});
      await page.evaluate(()=>document.fonts.ready);
      const sheets = await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));
      const css=[];
      for(const href of sheets) {
        if(server)css.push(await verifyServedAsset(base,resolve(root,'.next'),href));
        else {
          try { css.push({href,status:(await page.request.get(base+href,{timeout:15000})).status()}); }
          catch { css.push({href,status:null,error:'Asset verification timed out'}); }
        }
      }
      const geometry = await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,sky:document.querySelectorAll('.store-starfield').length,grids:[...document.querySelectorAll('.option-grid,.footer-index')].map(n=>({class:n.className,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,columns:getComputedStyle(n).gridTemplateColumns}))}));
      const name = `${route.slice(1)}-${width}x${height}`;
      await page.screenshot({path:resolve(output,name+'.png'),fullPage:true});
      await page.screenshot({path:resolve(output,name+'-top.png')});
      if(route==='/growth'){await page.locator('.goal-flow').screenshot({path:resolve(output,name+'-flow.png')})}
      const a11y = width===1440 ? (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})) : null;
      report.records.push({route,viewport:{width,height},status:response?.status(),css,geometry,errors,failures,expectedAuth,a11y,screenshot:name+'.png'});
      console.log(`${phase} ${route} ${width}: overflow=${geometry.scrollWidth-width}, errors=${errors.length}, a11y=${a11y?.length??'not sampled'}`);
      await context.close();
    }
  }
} finally { await browser.close(); if(server)await stopOwnedServer(server.child); await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)); }
console.log(`Evidence saved: ${output}`);
if(report.records.some(r=>r.status!==200||r.geometry.scrollWidth>r.viewport.width+1||r.geometry.sky!==1||r.errors.length||r.failures.length||r.a11y?.length))process.exitCode=1;
