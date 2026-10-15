import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

test.beforeEach(async ({ page }, info) => {
  await page.setViewportSize(info.project.name === 'mobile' ? { width: 390, height: 844 } : info.project.name === 'tablet' ? { width: 820, height: 1180 } : { width: 1440, height: 900 });
});

test('one canonical Sentinel, keyboard guide, bilingual sources and bounded layouts', async ({ page }, info) => {
  const errors: string[] = [];
  const privateCalls: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/mcp|\/bridge|\/api\/ai|\/provider-os/.test(request.url())) privateCalls.push(request.url()); });
  await page.goto('/solutions');
  await expect(page.locator('[data-knoux-sentinel]')).toHaveCount(1);
  await expect(page.locator('.store-starfield')).toHaveCount(1);
  const launcher = page.locator('[data-sentinel-launcher] button').first();
  await launcher.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'Sources & settings',exact:true}).click();
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('status').first()).toContainText('Solutions');
  const close = panel.getByRole('button', { name: 'Close guide' });
  await expect(close).toBeFocused();
  const character = panel.locator('.ks-trigger');
  await expect(character).toBeVisible();
  await expect(page.locator('[data-knoux-sentinel]')).toHaveCount(1);
  await character.focus(); await page.keyboard.press('Shift+Tab');
  await expect(panel.getByRole('link', { name: 'Composer' })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(character).toBeFocused();
  const folder = `qa/sentinel/guide-${process.env.KNOUX_CAPTURE_ID ?? 'local'}`;
  mkdirSync(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/solutions-${page.viewportSize()!.width}-english.png` });
  await panel.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(panel).toHaveAttribute('dir', 'rtl');
  await expect(panel.getByRole('status').first()).toContainText('ابدأ من احتياج العمل');
  await panel.getByLabel('ما الذي تحتاجه؟').fill('متجر');
  await panel.getByRole('button', { name: 'ابحث عن خدمة' }).click();
  await expect(panel.getByRole('navigation', { name: 'المصدر المنشور' }).getByRole('link').first()).toBeVisible();
  for (const link of await panel.locator('a').all()) expect(await link.getAttribute('href')).toMatch(/^\/(?!\/)[a-z0-9/-]*$/);
  const audit = await new AxeBuilder({ page }).include('#sentinel-guide-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: `${folder}/solutions-${page.viewportSize()!.width}-arabic.png` });
  const geometry = await panel.evaluate(element => { const rect = element.getBoundingClientRect(); return { right: rect.right, width: rect.width, overflow: element.scrollWidth-element.clientWidth, pageOverflow: document.documentElement.scrollWidth-innerWidth }; });
  expect(geometry.right).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  expect(geometry.overflow).toBeLessThanOrEqual(1); expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape'); await expect(panel).not.toBeVisible(); await expect(launcher).toBeFocused();
  await launcher.click(); await page.getByRole('button',{name:/Sources & settings|المصادر والإعدادات/}).click(); await panel.getByRole('button', {name:'الوضع الهادئ',exact:true}).click();
  await expect(page.locator('[data-knoux-sentinel]')).toBeVisible();
  await page.keyboard.press('Escape'); await page.reload();
  await launcher.click(); await page.getByRole('button',{name:/Sources & settings|المصادر والإعدادات/}).click(); await expect(page.getByRole('dialog')).toHaveAttribute('lang', 'ar');
  await expect(panel.getByRole('button',{name:'الوضع الهادئ',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Escape');
  expect(privateCalls).toEqual([]); expect(errors).toEqual([]);
  writeFileSync(`${folder}/solutions-${page.viewportSize()!.width}-report.json`, JSON.stringify({ geometry, axe: audit.violations, errors, privateCalls, project: info.project.name }, null, 2));
});

test('explicit browser speech: no autoplay/microphone, stop, replay, mute and route cancellation', async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { spoken: [] as { text: string; lang: string }[], cancels: 0, microphones: 0 };
    const utterances: SpeechSynthesisUtterance[] = [];
    Object.assign(window, { sentinelEndPrevious: () => utterances[0]?.onend?.(new Event('end') as SpeechSynthesisEvent), sentinelVoiceError: () => utterances.at(-1)?.onerror?.(new Event('error') as SpeechSynthesisErrorEvent) });
    Object.assign(window, { sentinelSpeechProbe: probe });
    Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [], cancel: () => probe.cancels++, speak: (utterance: SpeechSynthesisUtterance) => { utterances.push(utterance); probe.spoken.push({ text: utterance.text, lang: utterance.lang }); } } });
    navigator.mediaDevices.getUserMedia = async () => { probe.microphones++; throw new Error('Microphone must not be requested'); };
  });
  const probe = () => page.evaluate(() => (window as unknown as { sentinelSpeechProbe: { spoken: { text: string; lang: string }[]; microphones: number; cancels: number } }).sentinelSpeechProbe);
  await page.goto('/contact'); await page.locator('[data-sentinel-launcher] button').first().click(); await page.getByRole('button',{name:/Sources & settings|المصادر والإعدادات/}).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('button', { name: 'Read aloud', exact: true })).toBeEnabled();
  expect((await probe()).spoken).toHaveLength(0);
  await panel.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
  await panel.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Replay', exact: true }).click();
  expect((await probe()).spoken).toHaveLength(2);
  await page.evaluate(() => (window as unknown as { sentinelEndPrevious: () => void }).sentinelEndPrevious());
  await expect(panel.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
  await panel.getByRole('button', { name: 'Mute', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Replay', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Mute', exact: true }).click();
  await panel.getByRole('button', { name: 'العربية', exact: true }).click();
  await panel.getByRole('button', { name: 'إعادة القراءة', exact: true }).click();
  expect((await probe()).spoken.at(-1)!.lang).toBe('ar-AE');
  await page.evaluate(() => (window as unknown as { sentinelVoiceError: () => void }).sentinelVoiceError());
  await expect(panel.getByText('النطق غير متاح في هذا المتصفح.')).toBeVisible();
  await panel.getByRole('link', { name: 'استكشف الحلول' }).click();
  await expect(page).toHaveURL(/\/solutions$/); await expect(panel.getByRole('status').first()).toContainText('ابدأ من احتياج العمل');
  expect((await probe()).microphones).toBe(0);
  expect((await probe()).cancels).toBeGreaterThan(3);
});

test('visible-section read excludes hidden prose and private controls; typing stays local', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/sentinel/')) sent.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`); });
  await page.goto('/contact');
  await page.locator('[data-sentinel-launcher] button').first().click(); await page.getByRole('button',{name:/Sources & settings|المصادر والإعدادات/}).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('button', { name: 'Find a service' })).toBeDisabled();
  await panel.getByLabel('What do you need?').fill('SECRET_TYPED_LOCAL');
  await page.evaluate(() => {
    const fixture = document.createElement('section');
    fixture.style.cssText = 'position:fixed;top:90px;left:24px;background:#111;z-index:2';
    fixture.innerHTML = '<h2>Public section</h2><p>Visible published prose.<span style="display:none">SECRET_HIDDEN</span></p><form><p>SECRET_PRIVATE_FORM</p><input type="password" value="SECRET_PASSWORD"><textarea>SECRET_TEXTAREA</textarea></form><p aria-hidden="true">SECRET_ARIA</p><p style="opacity:0">SECRET_TRANSPARENT</p><p data-private>SECRET_PRIVATE_DATA</p>';
    document.querySelector('main')!.prepend(fixture);
  });
  await expect(page.locator('main').getByRole('heading', { name: 'Public section', includeHidden: true })).toHaveCount(1);
  await panel.getByRole('button', { name: 'Read this section', exact: true }).click();
  await expect(panel.getByRole('status').first()).toContainText('Visible published prose');
  await expect(panel.getByRole('status').first()).not.toContainText('SECRET_');
  expect(sent.every(request => !request.includes('SECRET_') && !/mcp|bridge/.test(request))).toBe(true);
});

test('pointer mascot remains decorative and normal page clicks work; unavailable speech is honest', async ({ page }, info) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { value: undefined }); Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined }); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/contact');
  const sentinel = page.locator('[data-knoux-sentinel]');
  expect(await sentinel.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
  if (info.project.name !== 'mobile') { await page.mouse.move(250, 200); await expect(sentinel).toHaveAttribute('data-ready', 'true'); }
  else { await expect(sentinel).toHaveAttribute('data-guide-docked', 'true'); await expect(sentinel).toBeVisible(); }
  await page.locator('input[name="name"]').fill('Normal page interaction');
  await expect(page.locator('input[name="name"]')).toHaveValue('Normal page interaction');
  await page.locator('[data-sentinel-launcher] button').first().click(); await page.getByRole('button',{name:/Sources & settings|المصادر والإعدادات/}).click();
  await expect(page.getByRole('dialog').getByText('Speech is unavailable in this browser.')).toBeVisible();
});

test('motion is bounded, pauses when hidden, honors reduced motion and leaves layout stable', async ({ browser, page }, info) => {
  const folder = `qa/continuation/motion-${process.env.KNOUX_CAPTURE_ID ?? 'local'}`;
  mkdirSync(folder, { recursive: true });
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: page.viewportSize()!, reducedMotion: 'no-preference', isMobile: info.project.name === 'mobile', hasTouch: info.project.name === 'mobile', recordVideo: { dir: folder, size: { width: 960, height: 600 } } });
  const motion = await context.newPage();
  const started = performance.now();
  await motion.goto('/contact');
  const sentinel = motion.locator('[data-knoux-sentinel]');
  const main = motion.locator('main');
  const before = await main.boundingBox();
  if (info.project.name !== 'mobile') {
    await motion.mouse.move(250, 200);
    await expect(sentinel).toHaveAttribute('data-ready', 'true');
    await expect(sentinel).toHaveAttribute('data-settled', 'true');
    for (const [x, y] of [[650, 300], [900, 450], [100, 250]]) {
      await motion.mouse.move(Math.min(x, page.viewportSize()!.width - 80), y, { steps: 12 });
      await expect(sentinel).toHaveAttribute('data-settled', 'true');
      const rect = await sentinel.boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.x + rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 2);
      await motion.waitForTimeout(250);
    }
    await motion.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(sentinel).toHaveAttribute('data-motion', 'paused');
    expect(await sentinel.locator('.ks-shard').first().evaluate(element => getComputedStyle(element).animationPlayState)).toBe('paused');
    const still = await sentinel.evaluate(element => element.getAttribute('style'));
    await motion.waitForTimeout(350); expect(await sentinel.getAttribute('style')).toBe(still);
    await motion.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  } else {
    await expect(sentinel).toBeVisible();
    const position = await sentinel.boundingBox(); await motion.mouse.move(100, 200); expect(await sentinel.boundingBox()).toEqual(position);
  }
  await motion.emulateMedia({ reducedMotion: 'reduce' });
  await expect(sentinel).toHaveAttribute('data-guide-docked', 'true');
  await expect(sentinel).toBeVisible();
  expect(await sentinel.locator('.ks-shell').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await main.boundingBox()).toEqual(before);
  await motion.emulateMedia({ reducedMotion: 'no-preference' });
  await motion.locator('[data-sentinel-launcher] button').first().click();await motion.getByRole('button',{name:'Sources & settings'}).click();
  await expect(motion.getByRole('dialog')).toBeVisible();
  await expect(sentinel).toBeVisible();
  await expect(sentinel).toHaveCount(1);
  await expect(motion.getByRole('dialog').locator('.ks-trigger')).toBeVisible();
  await motion.keyboard.press('Escape');
  await expect(motion.getByRole('dialog')).not.toBeVisible();
  const video = motion.video(); await context.close();
  writeFileSync(`${folder}/${info.project.name}-report.json`, JSON.stringify({ viewport: page.viewportSize(), mainBefore: before, elapsedMs: performance.now() - started, video: await video?.path(), reducedMotion: true, hiddenPause: info.project.name !== 'mobile' }, null, 2));
});

test('AI composer is nonmodal, bilingual, honest when unconfigured and keeps one mascot', async ({page}) => {
  await page.goto('/engineering');const mascot=page.locator('[data-knoux-sentinel]');
  await mascot.locator('.ks-trigger').click();const bubble=page.locator('[data-companion-bubble]');
  await expect(bubble).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
  await bubble.getByLabel('Ask your companion').fill('What does engineering support?');await bubble.getByRole('button',{name:'Ask',exact:true}).click();
  await expect(bubble).toContainText('AI is unavailable');await expect(mascot).toHaveCount(1);await expect(mascot).toBeVisible();
  await bubble.getByRole('button',{name:'Sources & settings'}).click();const panel=page.getByRole('dialog');
  await panel.getByRole('button',{name:'العربية',exact:true}).click();await expect(panel).toHaveAttribute('dir','rtl');
  await panel.getByRole('button',{name:'الوضع الهادئ',exact:true}).click();await expect(mascot).toBeVisible();
  await page.keyboard.press('Escape');await mascot.locator('.ks-trigger').click();await expect(page.getByLabel('اسأل رفيقك')).toBeVisible();
});

test('context never interrupts private typing and dismissed thought cannot reappear', async ({page}) => {
  const leaked: string[]=[];
  page.on('request',request => {if((request.postData() ?? '').includes('SENTINEL_PRIVATE_TYPING')) leaked.push(request.url());});
  await page.goto('/contact');
  await page.locator('input[name="name"]').fill('SENTINEL_PRIVATE_TYPING');
  await page.waitForTimeout(3500);
  await expect(page.locator('[data-sentinel-bubble]')).toHaveCount(0);
  await expect(page.locator('input[name="name"]')).toHaveValue('SENTINEL_PRIVATE_TYPING');
  await page.goto('/engineering');
  const bubble=page.locator('[data-sentinel-bubble]');
  await page.waitForTimeout(3500);await expect(bubble).toHaveCount(0);await page.locator('.ks-trigger').click();await expect(bubble).toBeVisible();await bubble.getByRole('button',{name:'Dismiss hint'}).click();
  await page.waitForTimeout(3000);await expect(bubble).toHaveCount(0);
  const mascot=page.locator('[data-knoux-sentinel]');await mascot.locator('.ks-trigger').click();await page.getByRole('button',{name:'Sources & settings'}).click();
  const panel=page.getByRole('dialog');await panel.getByRole('button',{name:'Sentinel settings',exact:true}).click();
  await panel.getByLabel('Show mascot',{exact:true}).uncheck();await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Open Sentinel guide',exact:true})).toBeVisible();await expect(mascot).toHaveCount(0);
  await page.getByRole('button',{name:'Open Sentinel guide',exact:true}).click();await page.getByRole('button',{name:'Sources & settings'}).click();await expect(mascot).toHaveCount(1);await expect(mascot).toBeVisible();
  await panel.getByRole('button',{name:'Sentinel settings',exact:true}).click();await panel.getByLabel('Show mascot',{exact:true}).check();
  await page.keyboard.press('Escape');await expect(mascot).toBeVisible();expect(leaked).toEqual([]);
});
