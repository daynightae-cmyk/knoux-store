import { readFile } from 'node:fs/promises';
import { expect, test, type Locator } from '@playwright/test';

async function expectVisiblePreview(iframe: Locator) {
  await expect.poll(() => iframe.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const viewport = element.parentElement!.getBoundingClientRect();
    return {
      width: frame.width,
      visible: Math.max(0, Math.min(frame.right, viewport.right) - Math.max(frame.left, viewport.left)),
    };
  }).then(({ width, visible }) => width > 0 && visible >= width - 1)).toBe(true);
}

test('Web starter edits persist per system, preview fits all device modes and download contains the edited document', async ({ page }, info) => {
  await page.goto('/web?system=corporate-site#systems');
  const workbench = page.locator('#systems section').filter({ has: page.locator('iframe[srcdoc]') });
  const iframe = workbench.locator('iframe');
  const document = workbench.frameLocator('iframe');
  const longName = 'W'.repeat(80);
  await workbench.getByLabel('Site name', { exact: true }).fill(longName);
  await workbench.getByRole('textbox', { name: 'Introduction', exact: true }).fill('D'.repeat(500));
  await expect(workbench.getByRole('status')).toHaveText('Saved in this browser');
  await expect(document.getByRole('heading', { level: 1 })).toHaveText(longName);

  for (const device of ['desktop', 'tablet', 'mobile']) {
    const index = ['desktop', 'tablet', 'mobile'].indexOf(device);
    await workbench.getByRole('group').getByRole('button').nth(index).click();
    await expect(workbench.locator('[data-web-device]')).toHaveAttribute('data-web-device', device);
    await expectVisiblePreview(iframe);
    await expect.poll(() => document.locator('html').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  }

  await page.reload();
  await expect(workbench.getByLabel('Site name', { exact: true })).toHaveValue(longName);
  await page.locator('#systems .option-grid').getByRole('button', { name: /^Store / }).click();
  await expect(page).toHaveURL(/system=ecommerce/);
  await expect(workbench.getByLabel('Site name', { exact: true })).toHaveValue('E-Commerce');
  await workbench.getByLabel('Site name', { exact: true }).fill('A separate store');
  await page.locator('#systems .option-grid').getByRole('button', { name: /^Website / }).click();
  await expect(workbench.getByLabel('Site name', { exact: true })).toHaveValue(longName);

  for (const language of ['ar', 'ur', 'en']) {
    await page.locator('header select').selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(document.locator('html')).toHaveAttribute('lang', language);
    await expect(document.locator('html')).toHaveAttribute('dir', language === 'en' ? 'ltr' : 'rtl');
    // Desktop/tablet previews exceed narrow containers and expose RTL positioning errors.
    for (const index of [0, 1, 2]) {
      await workbench.getByRole('group').getByRole('button').nth(index).click();
      await expectVisiblePreview(iframe);
    }
  }

  const editedName = '<script>alert(1)</script>';
  await workbench.getByLabel('Site name', { exact: true }).fill(editedName);
  await workbench.getByRole('textbox', { name: 'Introduction', exact: true }).fill('Local editable HTML, not an installed backend.');
  await workbench.getByLabel('Accent color', { exact: true }).fill('#090513');
  await expect(document.getByRole('heading', { level: 1 })).toHaveText(editedName);
  const actionColors = await document.locator('.action').evaluate(element => {
    const style = getComputedStyle(element);
    return { text: style.color, background: style.backgroundColor };
  });
  expect(actionColors.text).not.toBe(actionColors.background);
  const downloadEvent = page.waitForEvent('download');
  await workbench.getByRole('button', { name: /Download HTML/ }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('knoux-corporate-site-starter.html');
  const path = await download.path();
  expect(path).not.toBeNull();
  const html = await readFile(path!, 'utf8');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).toContain('Local editable HTML, not an installed backend.');
  expect(html).toContain("default-src 'none'");
  await page.screenshot({ path: info.outputPath('web-starter-functional.png'), fullPage: false });
});

test('Web starter remains editable and downloadable when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
  });
  await page.goto('/web?system=corporate-site#systems');
  const workbench = page.locator('#systems section').filter({ has: page.locator('iframe[srcdoc]') });
  await workbench.getByLabel('Site name', { exact: true }).fill('Unsaved browser preview');
  await expect(workbench.getByRole('status')).toHaveText('Storage unavailable; your edits remain in this preview');
  await expect(workbench.frameLocator('iframe').getByRole('heading', { level: 1 })).toHaveText('Unsaved browser preview');
  const downloadEvent = page.waitForEvent('download');
  await workbench.getByRole('button', { name: /Download HTML/ }).click();
  expect((await downloadEvent).suggestedFilename()).toBe('knoux-corporate-site-starter.html');
});
