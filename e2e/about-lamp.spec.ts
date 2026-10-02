import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const screenshot = await page.screenshot({ path: testInfo.outputPath(name) });
  const directory = 'references/visual-audit/closure';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${testInfo.project.name}-${name}`, screenshot);
}

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`real Origin Room wakes and remains operable with ${motion} motion`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: motion });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/about');
    const room = page.locator('.origin-room');
    const canvas = room.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(room).toHaveClass(/origin-room--closed/);
    await capture(page, testInfo, `about-${motion}-closed.png`);
    await page.getByRole('button', { name: /ENTER KNOuX/ }).click();
    if (motion === 'no-preference') {
      await expect(room).toHaveClass(/origin-room--waking/);
      await capture(page, testInfo, 'about-lamp-waking.png');
    }
    await expect(room).toHaveClass(/origin-room--ready/, { timeout: 45_000 });
    await capture(page, testInfo, `about-${motion}-lit.png`);
    const records = page.getByRole('group', { name: 'Inspect the institution' });
    await expect(records.getByRole('button')).toHaveCount(5);
    if (motion === 'no-preference') {
      await records.getByRole('button', { name: /Who we are/ }).click();
      await expect(page.getByRole('complementary', { name: 'Who we are details' })).toBeVisible();
      await page.keyboard.press('Escape');
    }
    // The animated wake and spatial selection have been exercised above.
    // Use static rendering for the exhaustive DOM/keyboard/accessibility audit.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const title of ['Who we are', 'What we build', 'Verified work', 'How we build', 'Founder']) {
      const button = records.getByRole('button', { name: new RegExp(title) });
      await button.scrollIntoViewIfNeeded();
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('complementary', { name: `${title} details` })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(accessibility.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#about-point-of-view').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /Make the complex/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The countable state.' })).toBeAttached();
    expect(errors).toEqual([]);
  });
}

test('room and header fit the 768px boundary', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/about');
  await page.getByRole('button', { name: /ENTER KNOuX/ }).click();
  await expect(page.locator('.origin-room')).toHaveClass(/origin-room--ready/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, testInfo, 'about-lamp-768.png');
});
