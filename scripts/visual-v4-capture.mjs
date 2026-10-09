import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile, realpath, readdir, readlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { inspectBuild, startOwnedServer, stopOwnedServer, verifyServedAsset } from './css-integrity.mjs';

const phase = process.argv[2] ?? 'before';
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const root = process.cwd();
const git = process.platform === 'win32' ? 'C:\\Program Files\\Git\\cmd\\git.exe' : '/usr/bin/git';
const quick = process.argv.includes('--quick');
const directory = join(root, 'references/visual-v4-verified', phase + (quick ? '-quick' : ''));
await mkdir(directory, { recursive: true });
const viewports = [[1904,880],[1600,1000],[1440,900],[1366,768],[1280,800],[1024,1366],[820,1180],[768,1024],[430,932],[390,844],[375,812],[360,800]];
const routes = ['/', '/products', '/products/knoux-one', '/build', '/build/providers', '/build/ai/models', '/build/ai/router', '/build/terminal', '/build/engineering', '/command', '/command/analytics', '/command/google', '/command/social', '/command/campaigns', '/command/reports', '/command/leads', '/command/clients', '/command/connections', '/command/communities', '/command/automations', '/command/intelligence', '/command/creative', '/command/settings', '/growth', '/wordpress', '/creative', '/creative/art-direction', '/creative/brand-identity', '/web', '/engineering', '/solutions', '/login', '/register', '/account'];
const buildDirectory = resolve(root, '.next');
const disk = await inspectBuild(buildDirectory);
const server = await startOwnedServer(root, Number(process.env.KNOUX_V4_PORT ?? 4470));
const browser = await chromium.launch({channel: 'chrome'});
const report = { phase, head: server.provenance.head, buildId: (await readFile(join(buildDirectory, 'BUILD_ID'), 'utf8')).trim(), measuredAt: new Date().toISOString(), provenance: server.provenance, disk, records: [] };
const checkedAssets = new Map();
// These authenticated read endpoints explicitly refuse the anonymous capture context.
const anonymousEndpoints = new Set(['/api/build/ai/models','/api/build/ai/providers','/api/build/bridge/status',
  '/api/build/context','/api/build/environment','/api/build/git','/api/build/integrations',
  '/api/build/project','/api/build/provider-os','/api/wordpress/operations']);
function ownerInspector() {
  if(process.platform!=='win32')return {observe:async()=>server.provenance,close:async()=>{}};
  const code=`$ErrorActionPreference='Stop'; while($captureCommand=[Console]::ReadLine()){if($captureCommand -eq 'QUIT'){break}; $verifiedProcess=Get-CimInstance Win32_Process -Filter 'ProcessId=${server.child.pid}'; $verifiedListener=Get-NetTCPConnection -LocalPort ${server.provenance.port} -State Listen -ErrorAction Stop; [pscustomobject]@{pid=$verifiedProcess.ProcessId; startedAt=$verifiedProcess.CreationDate.ToUniversalTime().ToString('o'); commandLine=$verifiedProcess.CommandLine; owner=$verifiedListener.OwningProcess} | ConvertTo-Json -Compress | ForEach-Object {[Console]::WriteLine($_)}}`;
  const worker=spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-Command',code],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  const lines=createInterface({input:worker.stdout});
  let pending;
  lines.on('line',line=>{if(pending){const {accept,reject,timer}=pending;pending=null;clearTimeout(timer);try{accept(JSON.parse(line))}catch(error){reject(error)}}});
  worker.once('exit',()=>{if(pending){clearTimeout(pending.timer);pending.reject(new Error('Provenance inspector exited'));pending=null}});
  return {observe:()=>new Promise((accept,reject)=>{const timer=setTimeout(()=>reject(new Error('Provenance inspector timeout')),30000);pending={accept,reject,timer};worker.stdin.write('OBSERVE\n')}),close:async()=>{lines.close();worker.kill()}};
}
const inspector=ownerInspector();
const observeOwner = async () => {
  if (server.child.exitCode !== null) throw new Error('Intended server exited');
  const head = execFileSync(git, ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
  if (head !== report.head) throw new Error('HEAD changed during capture');
  if((await readFile(join(buildDirectory,'BUILD_ID'),'utf8')).trim()!==report.buildId)throw new Error('Build replaced during capture');
  if(execFileSync(git,['status','--porcelain','--','src'],{encoding:'utf8'}).trim())throw new Error('Uncommitted application source during capture');
  if (process.platform !== 'win32') {
    const processDirectory = `/proc/${server.child.pid}`;
    const [checkout, command, descriptors, sockets, stat] = await Promise.all([
      realpath(`${processDirectory}/cwd`), readFile(`${processDirectory}/cmdline`, 'utf8'),
      readdir(`${processDirectory}/fd`), readFile('/proc/net/tcp', 'utf8'), readFile(`${processDirectory}/stat`, 'utf8'),
    ]);
    const links = await Promise.all(descriptors.map(async descriptor => {
      try { return await readlink(`${processDirectory}/fd/${descriptor}`); } catch { return ''; }
    }));
    const portHex = server.provenance.port.toString(16).toUpperCase().padStart(4,'0');
    const owner = sockets.split('\n').slice(1).map(line => line.trim().split(/\s+/))
      .some(columns => columns[1]?.endsWith(`:${portHex}`) && columns[3] === '0A' && links.includes(`socket:[${columns[9]}]`));
    if (!owner || checkout !== await realpath(root) || !command.includes(server.provenance.entry)) throw new Error('Linux capture server ownership changed');
    return {...server.provenance, checkout, commandLine:command.replaceAll('\0',' '),
      kernelStartTicks:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19], owner:server.child.pid, observedAt:new Date().toISOString()};
  }
  const observed = await inspector.observe();
  if (observed.owner !== server.child.pid || observed.pid !== server.child.pid || !observed.commandLine.includes(server.provenance.entry)) throw new Error('Capture server ownership changed');
  return {...observed, checkout:root, head, port:server.provenance.port, observedAt:new Date().toISOString()};
};
try {
  for (const asset of disk.assets) checkedAssets.set(asset.href, await verifyServedAsset(server.base, buildDirectory, asset.href));
  for (const route of routes.filter(route => !quick || ['/', '/products/knoux-one', '/command', '/command/connections', '/creative', '/growth', '/wordpress', '/build/providers'].includes(route))) {
    const context = await browser.newContext({reducedMotion:'reduce',deviceScaleFactor:1});
    for (const [width,height] of viewports.filter(([width])=>!quick||[1440,390].includes(width))) {
      const owner = await observeOwner();
      const page = await context.newPage();
      await page.setViewportSize({width,height});
      const consoleErrors = [], pageErrors = [], failedResponses = [];
      page.on('console', event => {
        if(event.type()==='error') {
          let pathname = '';
          try { pathname = new URL(event.location().url).pathname; } catch { /* Non-resource console messages have no URL. */ }
          consoleErrors.push({text:event.text(),pathname});
        }
      });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('response', response => {if(response.status()>=400)failedResponses.push({url:new URL(response.url()).pathname,status:response.status()});});
      const response = await page.goto(server.base+route,{waitUntil:'load',timeout:30000});
      if(route.startsWith('/products/'))await page.locator('.product-arrival').waitFor({state:'hidden',timeout:10000});
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(accept=>requestAnimationFrame(()=>requestAnimationFrame(accept)));});
      const hrefs = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(node=>new URL(node.href).pathname));
      if (!hrefs.length || response?.status()!==200) throw new Error(`Unstyled or unavailable route ${route}`);
      const css = [];
      for(const href of hrefs){const proof=await verifyServedAsset(server.base,buildDirectory,href);checkedAssets.set(href,proof);css.push(proof);}
      const metrics = await page.evaluate(()=>{
        const bounds=document.documentElement;
        const elements=[...document.querySelectorAll('main *')].filter(node=>node instanceof HTMLElement&&node.getBoundingClientRect().width>0);
        const boxed=elements.filter(node=>{const style=getComputedStyle(node);return ['Top','Right','Bottom','Left'].every(edge=>parseFloat(style[`border${edge}Width`])>0)&&node.getBoundingClientRect().width>80;}).map(node=>({tag:node.tagName,className:node.className}));
        const tiny=elements.filter(node=>node.children.length===0&&node.textContent.trim().length>2&&parseFloat(getComputedStyle(node).fontSize)<12).map(node=>({className:node.className,fontSize:getComputedStyle(node).fontSize,text:node.textContent.trim().slice(0,70)}));
        return {overflow:Math.max(0,bounds.scrollWidth-bounds.clientWidth),docHeight:bounds.scrollHeight,boxed,tiny,starfieldCount:document.querySelectorAll('canvas[data-store-starfield],canvas.store-starfield,canvas[data-testid="store-starfield"]').length};
      });
      const file=(route==='/'?'home':route.slice(1).replaceAll('/','-'))+`-${width}x${height}.png`;
      await page.screenshot({path:join(directory,file),fullPage:false});
      const authRefusals = failedResponses.filter(response=>response.status===401&&anonymousEndpoints.has(response.url));
      const unexpectedResponses = failedResponses.filter(response=>!authRefusals.includes(response));
      const unexpectedConsoleErrors = consoleErrors.filter(error=>!(error.text==='Failed to load resource: the server responded with a status of 401 (Unauthorized)'&&authRefusals.some(response=>response.url===error.pathname)));
      report.records.push({route,finalRoute:new URL(page.url()).pathname,viewport:{width,height},status:response.status(),file,owner,buildId:report.buildId,cssIntegrity:'PASS',css,...metrics,consoleErrors,pageErrors,failedResponses,authRefusals,unexpectedResponses,unexpectedConsoleErrors});
      await page.close();
      await writeFile(join(directory,'capture-matrix.json'),JSON.stringify(report,null,2)+'\n');
      console.log(`${phase} ${route} ${width}x${height} HTTP200 CSS_PASS overflow=${metrics.overflow} boxes=${metrics.boxed.length} tiny=${metrics.tiny.length}`);
    }
    await context.close();
  }
} finally {await inspector.close();await browser.close();await stopOwnedServer(server.child);}
console.log(`${phase} captured ${report.records.length}; overflow=${report.records.filter(record=>record.overflow>0).length}, pageErrors=${report.records.filter(record=>record.pageErrors.length>0).length}`);
if(report.records.some(record=>record.overflow>1||record.pageErrors.length||record.unexpectedConsoleErrors.length||record.unexpectedResponses.length||record.starfieldCount!==1))throw new Error('Visual matrix contains a geometry, runtime, stylesheet or global sky regression');
