import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * KNOuX: THE AWAKENING — browser evidence.
 *
 * The state machine, registry projection, fracture geometry, choreography and
 * copy catalogue are proven in `tests/awakening.test.mjs`. This file proves the
 * parts only a browser can: that the hero dock is a large, centred installation,
 * that the trigger opens the performance, that the shout reaches the glass and
 * the published routes, that the overlay releases scroll and focus, that the
 * sequence advances on real timers, skips and replays, that RTL mirrors without
 * overflow, and that the reveal has no blocking axe violation.
 *
 * The project config asks for reduced motion. Cinematic tests opt back into
 * motion explicitly, so the default suite still measures the static reveal a
 * reduced-motion visitor actually receives.
 */

const PRODUCT_ROUTES = [
  '/products/knoux-one',
  '/products/kforge',
  '/products/knoux-repair',
  '/products/knoux-rec',
  '/products/knoux-x',
];

const PRODUCT_NAMES = ['KNOUX ONE', 'KNOuX Forge', 'KNOuX Repair', 'KNOuX REC', 'KNOuX Player X'];

async function openFromHero(page: Page) {
  const key = page.locator('.awakening-key');
  await expect(key).toBeVisible();
  await key.click();
  const stage = page.locator('.awakening-stage');
  await expect(stage).toBeVisible();
  return stage;
}

test('the hero dock is a large, centred installation between the wordmark and the mark', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the dock geometry is a desktop composition');

  await page.goto('/');
  const key = await page.locator('.awakening-key').boundingBox();
  expect(key, 'the hero key must be laid out').not.toBeNull();

  // The key is a physical object, not a footnote: at least 100 x 84 CSS pixels
  // on the reference desktop, and always taller than the old 64 px chip.
  expect(key!.width).toBeGreaterThanOrEqual(100);
  expect(key!.height).toBeGreaterThanOrEqual(84);

  const dock = await page.locator('.awakening-dock').boundingBox();
  expect(dock, 'the dock must be laid out').not.toBeNull();
  const dockCenter = dock!.x + dock!.width / 2;
  const viewport = page.viewportSize()!;
  expect(Math.abs(dockCenter - viewport.width / 2)).toBeLessThan(40);

  // The mascot sits above the key, and the whole dock floats inside the first
  // screen instead of hanging beneath the call-to-action row. Its tail is
  // designed to tuck into the key, so the boxes may overlap by a few pixels —
  // but the mascot must start above the key and never swallow it.
  const figure = await page.locator('.awakening-dock__figure').boundingBox();
  expect(figure, 'the mascot must be laid out').not.toBeNull();
  expect(figure!.y).toBeLessThan(key!.y);
  expect(key!.y - (figure!.y + figure!.height)).toBeGreaterThanOrEqual(-20);
  expect(key!.y + key!.height).toBeLessThan(viewport.height * 0.8);

  // The installation floats clear of the wordmark rather than sitting on it.
  const wordmark = await page.locator('.arrival-copy h1').boundingBox();
  expect(wordmark, 'the wordmark must be laid out').not.toBeNull();
  expect(dock!.y + dock!.height).toBeLessThan(wordmark!.y);
});

test('the mobile hero stacks mark, dock and wordmark without collisions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the stacking contract is the phone composition');

  await page.goto('/');
  // The particle mark is a client-only dynamic import. Wait for the real
  // component (not its loading placeholder) before reading geometry.
  await expect(page.getByRole('img', { name: /Living Mark/ })).toBeVisible();
  const mark = await page.locator('.mark-stage').boundingBox();
  const dock = await page.locator('.awakening-dock').boundingBox();
  const wordmark = await page.locator('.arrival-copy h1').boundingBox();
  expect(mark, 'the particle mark must be laid out').not.toBeNull();
  expect(dock, 'the dock must be laid out').not.toBeNull();
  expect(wordmark, 'the wordmark must be laid out').not.toBeNull();

  // Mark above the installation, installation above the wordmark: on a phone
  // the three objects must never share pixels.
  expect(dock!.y).toBeGreaterThanOrEqual(mark!.y + mark!.height);
  expect(dock!.y + dock!.height).toBeLessThanOrEqual(wordmark!.y);
  expect(dock!.x).toBeGreaterThanOrEqual(0);
  expect(dock!.x + dock!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('the hero key opens the real product reveal and returns focus', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  const stage = await openFromHero(page);

  await expect(stage).toHaveAttribute('data-state', 'explore');
  await expect(stage).toHaveAttribute('data-reduced', 'true');
  await expect(stage).toHaveAttribute('data-revealed', 'true');
  await expect(stage.getByRole('heading', { name: 'Eng Sadek elgazar' })).toBeVisible();
  await expect(stage.locator('.shout-final__tagline')).toHaveText('THE UNIVERSE COMES ALIVE.');
  await expect(stage.locator('.shout-final__portrait-image')).toBeVisible();
  await expect(stage.locator('.final-narration blockquote')).toContainText('refusal to ship a lie');

  const cards = stage.locator('.shout-final__products a');
  await expect(cards).toHaveCount(5);
  const hrefs = await cards.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(hrefs).toEqual(PRODUCT_ROUTES);

  const names = await stage.locator('.shout-final__id strong').allTextContents();
  expect(names).toEqual(PRODUCT_NAMES);

  // Body scroll is locked only while the hall is open.
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  expect(await page.evaluate(() => document.documentElement.dataset.awakening)).toBe('open');

  // No horizontal overflow at this project's viewport.
  expect(await stage.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  // The whole overlay is above the site header, so no header control can be
  // clicked through it.
  expect(await stage.evaluate((element) => getComputedStyle(element).zIndex)).toBe('90');

  await page.keyboard.press('Escape');
  await expect(stage).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.awakening ?? null)).toBeNull();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await expect(page.locator('.awakening-key')).toBeFocused();
  expect(errors).toEqual([]);

  await page.locator('.awakening-key').click();
  await expect(page.locator('.awakening-stage')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('awakening-reveal.png'), fullPage: false });
});

test('a product card opens the dossier the registry publishes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one real navigation is enough per suite');
  await page.goto('/');
  const stage = await openFromHero(page);
  await stage.locator('.shout-final__products a').first().click();
  await expect(page).toHaveURL(/\/products\/knoux-one$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the K shortcut and the header key share one trigger', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the header control is a desktop affordance');

  await page.goto('/');
  await page.locator('#main-content').focus();
  await page.keyboard.press('k');
  const stage = page.locator('.awakening-stage');
  await expect(stage).toHaveAttribute('data-state', 'explore');
  await expect(stage).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(stage).toHaveCount(0);

  await page.locator('.awakening-header').click();
  await expect(stage).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(stage).toHaveCount(0);
});

test('the header key on another route hands off to the homepage and cleans the query', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the header control is a desktop affordance');

  await page.goto('/products');
  await page.locator('.awakening-header').click();
  await expect(page).toHaveURL(/\/$/);
  const stage = page.locator('.awakening-stage');
  await expect(stage).toHaveAttribute('data-state', 'explore');
  await expect(stage).toHaveAttribute('data-revealed', 'true');
  expect(await page.evaluate(() => window.location.search)).toBe('');

  await page.keyboard.press('Escape');
  await expect(stage).toHaveCount(0);
  await expect(page.locator('.awakening-header')).toBeFocused();
});

test('the mobile panel opens the same hall and closes itself', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'panel navigation is the mobile entry point');

  await page.goto('/');
  await page.locator('.mobile-toggle').click();
  const entry = page.locator('.awakening-menu');
  await expect(entry).toBeVisible();
  await entry.click();

  await expect(page.locator('.mobile-panel')).toHaveCount(0);
  await expect(page.locator('.awakening-stage')).toHaveAttribute('data-state', 'explore');
});

test('the phone conversation keeps the reply and question inside the stage', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one explicit phone viewport is enough evidence');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const stage = await openFromHero(page);

  await expect(stage.locator('.dialogue-reply__text')).toBeVisible({ timeout: 10_000 });
  await expect(stage.locator('.dialogue-reply')).toBeInViewport();

  const layout = await stage.evaluate((element) => {
    const reply = element.querySelector<HTMLElement>('.dialogue-reply');
    const figure = element.querySelector<HTMLElement>('.dialogue-figure');
    const question = element.querySelector<HTMLElement>('.dialogue-question');
    const rect = (node: HTMLElement | null) =>
      node
        ? {
            top: node.getBoundingClientRect().top,
            bottom: node.getBoundingClientRect().bottom,
            left: node.getBoundingClientRect().left,
            right: node.getBoundingClientRect().right,
          }
        : null;
    const replyBox = rect(reply);
    const figureBox = rect(figure);
    const questionBox = rect(question);
    const overlaps =
      figureBox !== null &&
      questionBox !== null &&
      figureBox.left < questionBox.right &&
      questionBox.left < figureBox.right &&
      figureBox.top < questionBox.bottom &&
      questionBox.top < figureBox.bottom;
    return { replyBox, figureBox, questionBox, overlaps };
  });

  expect(layout.replyBox?.left).toBeGreaterThanOrEqual(0);
  expect(layout.replyBox?.right).toBeLessThanOrEqual(390);
  expect(layout.overlaps).toBe(false);
});

test('the conversation speaks, answers with the registry, skips and replays', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'timing is one browser contract, not three');
  test.setTimeout(60_000);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const stage = await openFromHero(page);

  await expect(stage).toHaveAttribute('data-reduced', 'false');
  await expect(stage).toHaveAttribute('data-state', /ignition|awakening|first-emission/);

  // The stage is the conversation: the Sentinel, the live question, the registry
  // rail and one polite live region carrying the same line as the caption.
  await expect(stage.locator('.shout-figure .forge-sentinel')).toHaveCount(1);
  await expect(stage.locator('.dialogue-question')).toBeVisible();
  await expect(stage.locator('.dialogue-registry li')).toHaveCount(5);
  await expect(stage.locator('[aria-live="polite"]')).toHaveCount(1);

  // The first answer arrives in the Sentinel's mouth and as visible text.
  await expect(stage.locator('.dialogue-reply__text')).toBeVisible({ timeout: 10_000 });
  await expect(stage.locator('.dialogue-reply__text')).not.toBeEmpty();
  await expect(stage.locator('.forge-sentinel')).toHaveAttribute('data-speaking', 'true');
  await expect(stage.locator('.dialogue-reply__context')).toContainText('@nour.builds');

  // The first product answer adds the real registry chip and moves the rail.
  await expect(stage.locator('.dialogue-product')).toBeVisible({ timeout: 10_000 });
  await expect(stage.locator('.dialogue-product__verified')).toContainText('Registry verified');
  await expect(stage.locator('.dialogue-product__id strong')).toHaveText('KNOUX ONE');

  await stage.getByRole('button', { name: 'Skip to the reveal' }).click();
  await expect(stage).toHaveAttribute('data-state', 'skipped');
  await expect(stage.locator('.shout-final__products a')).toHaveCount(5);
  await expect(stage.getByRole('heading', { name: 'Eng Sadek elgazar' })).toBeVisible();
  // The final keeps the glass aloft as a drifting backdrop, still inert.
  await expect(stage.locator('.awakening-fracture[data-mode="drift"]')).toHaveCount(1);

  await stage.getByRole('button', { name: 'Replay the awakening' }).first().click();
  await expect(stage).toHaveAttribute('data-state', 'ignition');
  await expect(stage).toHaveAttribute('data-beat', '0');
  await page.keyboard.press('Escape');
  await expect(stage).toHaveCount(0);
});

test('the full cinematic reaches the reveal and breaks the real screen glass', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one full run is enough evidence');
  test.setTimeout(150_000);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const stage = await openFromHero(page);

  // The 112-second performance is sampled while the 2.8 s fracture is live:
  // seeded cracks, inert pointer layer, then the founder reveal.
  const fractureSafe = page
    .waitForFunction(
      () => {
        const hall = document.querySelector('.awakening-stage');
        const layer = document.querySelector('.awakening-fracture[data-mode="break"]');
        return (
          Boolean(hall?.getAttribute('data-phase') === 'fracture') &&
          layer !== null &&
          getComputedStyle(layer).pointerEvents === 'none'
        );
      },
      null,
      { timeout: 130_000, polling: 200 },
    )
    .then(() => true)
    .catch(() => false);

  const breakWord = page.locator('.awakening-stage > .shout-words .shout-word--break');
  const breakVisible = page
    .waitForFunction(
      () => {
        const word = document.querySelector<HTMLElement>('.awakening-stage > .shout-words .shout-word--break');
        const words = document.querySelector<HTMLElement>('.awakening-stage > .shout-words');
        const fracture = document.querySelector<HTMLElement>('.awakening-fracture[data-mode="break"]');
        const flash = document.querySelector<HTMLElement>('.shout-scene .shout-flash');
        if (!word || !words || !fracture || !flash) return false;
        const style = getComputedStyle(word);
        const box = word.getBoundingClientRect();
        const animation = word.getAnimations()[0] as CSSAnimation | undefined;
        const effect = animation?.effect as KeyframeEffect | null | undefined;
        const keyframes = effect?.getKeyframes() ?? [];
        const firstFrame = keyframes[0];
        const finalFrame = keyframes[keyframes.length - 1];
        const heldFrame = keyframes.find(
          (frame) => Number(frame.offset) >= 0.8 && Number(frame.opacity) === 1,
        );
        return (
          word.textContent?.trim() === 'BREAK!' &&
          Number(style.opacity) > 0.9 &&
          style.animationName === 'shout-word-break-hit' &&
          style.animationDuration === '2.8s' &&
          Number(firstFrame?.opacity) === 1 &&
          Number(finalFrame?.opacity) === 1 &&
          Boolean(heldFrame) &&
          box.width > 0 &&
          box.height > 0 &&
          Number(getComputedStyle(words).zIndex) > Number(getComputedStyle(fracture).zIndex) &&
          Number(getComputedStyle(words).zIndex) > Number(getComputedStyle(flash).zIndex)
        );
      },
      null,
      { timeout: 130_000, polling: 100 },
    )
    .then(() => true)
    .catch(() => false);

  await expect(stage).toHaveAttribute('data-state', 'explore', { timeout: 130_000 });
  await expect(stage).toHaveAttribute('data-revealed', 'true');
  expect(await fractureSafe).toBe(true);
  expect(await breakVisible).toBe(true);
  expect(await breakWord.count()).toBe(0);
  await expect(stage.getByRole('heading', { name: 'Eng Sadek elgazar' })).toBeVisible();
  await expect(stage.locator('.shout-final__products a')).toHaveCount(5);
  const visibleProducts = await stage
    .locator('.shout-final__products li')
    .evaluateAll((items) =>
      items.filter((item) => getComputedStyle(item).display !== 'none').length,
    );
  expect(visibleProducts).toBe(5);
  expect(
    await stage
      .locator('.awakening-fracture')
      .evaluate((element) => getComputedStyle(element).pointerEvents),
  ).toBe('none');
  expect(
    await stage
      .locator('.awakening-stage__grain')
      .evaluate((element) => getComputedStyle(element).pointerEvents),
  ).toBe('none');
});

test('RTL mirrors the hall without overflow and leaves product tokens intact', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('knoux.sentinel.language', 'ar');
    } catch {
      // A read-only store simply means the page stays English.
    }
  });
  await page.goto('/');
  const stage = await openFromHero(page);

  await expect(stage).toHaveAttribute('dir', 'rtl');
  await expect(stage.getByRole('heading', { name: 'Eng Sadek elgazar' })).toBeVisible();
  await expect(stage.locator('.shout-final__tagline')).toHaveText('الكون ينبض بالحياة.');
  await expect(stage.locator('.final-narration blockquote')).toContainText('الآلة تكتب');
  await expect(stage.locator('.shout-final__id strong').first()).toHaveText('KNOUX ONE');
  expect(await stage.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('the reveal has no blocking automated accessibility violation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'axe findings do not depend on viewport');
  await page.goto('/');
  const stage = await openFromHero(page);
  await expect(stage).toHaveAttribute('data-state', 'explore');

  const results = await new AxeBuilder({ page })
    .include('.awakening-stage')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();

  const blocking = results.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact ?? 'none'),
  );
  const summary = blocking
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes[0]?.target?.join(' ')}`)
    .join('\n');
  expect(blocking, `awakening reveal violations:\n${summary}`).toEqual([]);

  // The dialog names itself; its live caption belongs to the live performance,
  // which the cinematic test above already proves.
  await expect(stage).toHaveAttribute('aria-modal', 'true');
  await expect(stage).toHaveAttribute('aria-labelledby', 'awakening-title');
  await expect(page.locator('#awakening-title')).toBeVisible();
});

test('the open hall contains focus until it closes', async ({ page }) => {
  await page.goto('/');
  const stage = await openFromHero(page);
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.awakening-stage')))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(stage).toHaveCount(0);
});
