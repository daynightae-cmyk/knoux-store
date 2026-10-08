import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { intelligenceFixture, generateContract, decision } from './fixtures/build-generator';
import { incrementalPlanFixture } from './fixtures/incremental-plan';

const widths = [[1904,880],[1600,1000],[1440,900],[1366,768],[1280,800],[1024,1366],[820,1180],[768,1024],[430,932],[390,844],[375,812],[360,800]] as const;
for (const [width,height] of widths) test(`generator visual contract ${width}x${height}`, async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'This test supplies its own twelve exact viewports.');
  test.setTimeout(120000);
  await page.setViewportSize({width,height}); await intelligenceFixture(page);
  const product = ['delivery platform','ecommerce store','academy portal','CRM workspace'][widths.findIndex((v) => v[0] === width) % 4];
  const directory = path.resolve('references/build-generator/qa', `${width}x${height}`); await mkdir(directory,{recursive:true});
  const shots: string[] = [];
  const capture = async (state: string) => { const file = path.join(directory, `${state}.png`); await page.screenshot({path:file}); shots.push(path.relative(process.cwd(),file).replaceAll('\\','/')); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); };
  await page.goto('/build'); await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage','LISTENING'); await capture('idle-auto');
  await page.getByRole('button',{name:/INTELLIGENCE/}).click(); const search=page.getByRole('combobox',{name:'Search intelligence'}); await search.fill('gemini'); if(width<=640){const popupWidth=await search.locator('..').evaluate(element=>element.getBoundingClientRect().width);expect(popupWidth).toBeGreaterThan(width*.8);} await capture('navigator-search'); await search.press('ArrowDown'); await search.press('Enter');
  await expect(page.getByLabel('Routing',{exact:true})).toHaveValue('manual');
  for (const profile of ['FAST','BALANCED','DEEP','MAX']) { await page.getByRole('radio',{name:profile,exact:true}).check(); await capture(`manual-${profile.toLowerCase()}`); }
  const trigger = page.getByRole('button',{name:/INTELLIGENCE/}); await page.keyboard.press('Tab'); await trigger.focus();
  const focus = await trigger.evaluate((element) => { const css=getComputedStyle(element);return {style:css.outlineStyle,width:css.outlineWidth,color:css.outlineColor,height:element.getBoundingClientRect().height}; });
  expect(focus.style).not.toBe('none'); expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2); expect(focus.height).toBeGreaterThanOrEqual(44);
  await page.getByLabel('Routing',{exact:true}).selectOption('auto');
  let resolvePrepare!:()=>void; const preparing=new Promise<void>((resolve)=>{resolvePrepare=resolve;});
  await page.route('**/api/build/ai/prepare',async(route)=>{await preparing;await route.fulfill({json:{decision}});});
  const stream=await incrementalPlanFixture(page,product);
  try {
    await generateContract(page,`Build a ${product}`); await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage','RESOLVING'); await capture('resolving');
    resolvePrepare(); await stream.ready; await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage','ROUTING'); await capture('routing'); stream.open(); await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage','GENERATING'); await capture('generating-open');
    stream.first(); await expect(page.getByRole('region',{name:'Draft architecture formation',exact:true})).toBeVisible(); await expect(page.getByRole('region',{name:'Engineering plan',exact:true})).toHaveCount(0); await capture('generating-draft');
    stream.finish(); await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage','PLANNED');
    const map=page.getByRole('region',{name:'Plan system map',exact:true}); await map.getByRole('heading').scrollIntoViewIfNeeded(); await capture('planned-sections');
    await page.screenshot({path:path.join(directory,'map-sections.png')}); shots.push(`references/build-generator/qa/${width}x${height}/map-sections.png`);
    await map.getByRole('button',{name:'Product topology',exact:true}).click(); await capture('planned-product');
    await page.screenshot({path:path.join(directory,'map-product.png')}); shots.push(`references/build-generator/qa/${width}x${height}/map-product.png`);
    const bounds=await map.getByRole('list',{name:'Source-derived product nodes'}).getByRole('button').evaluateAll((elements)=>elements.map((el)=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
    for(let i=0;i<bounds.length;i++) for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];expect(a.x+a.w<=b.x+1||b.x+b.w<=a.x+1||a.y+a.h<=b.y+1||b.y+b.h<=a.y+1).toBe(true);}
    await page.getByRole('button',{name:'Review plan',exact:true}).click(); await page.getByRole('button',{name:'Check execution availability',exact:true}).click(); await page.getByLabel('Execution review',{exact:true}).scrollIntoViewIfNeeded(); await capture('executor-not-connected');
  } finally { await stream.close(); }
  for (const [state,status] of [['AUTH_REQUIRED',401],['CONFIG_REQUIRED',200],['PROVIDER_BLOCKED',200]] as const) {
    await page.route('**/api/build/ai/prepare',(route)=>route.fulfill({status,json:{state,decision:{selected:null,blocker:`Explicit ${state} contract fixture`}}}));
    await generateContract(page); await expect(page.locator('.dev-engine')).toHaveAttribute('data-stage',state); await capture(state.toLowerCase());
  }
  if(width<=820){await page.getByRole('button',{name:'Open workspace navigation'}).click();await capture('mobile-navigation');await page.locator('.dev-sidebar__close').click();}
  await writeFile(path.join(directory,'evidence.json'),JSON.stringify({kind:'EXPLICIT CONTRACT FIXTURE — not live provider proof',viewport:{width,height},product,focus,noHorizontalOverflow:true,productNodesDoNotOverlap:true,screenshots:shots},null,2));
});
