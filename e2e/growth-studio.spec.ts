import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('draft edits, placements and client selection stay synchronized across routes', async ({ page }, testInfo) => {
  await page.goto('/command/creative');
  const theatre = page.getByRole('region', { name: 'Ad Preview Theatre' });
  await theatre.getByRole('textbox', { name: 'Headline', exact: true }).fill('A focused local revision');
  await theatre.getByRole('textbox', { name: 'Primary copy', exact: true }).fill('A useful message for the current client.');
  await theatre.getByRole('textbox', { name: 'Call to action', exact: true }).fill('Speak to us');
  await expect(theatre.getByRole('heading', { name: 'A focused local revision' })).toBeVisible();
  await theatre.getByRole('tab', { name: 'Google Search', exact: true }).click();
  await expect(theatre.getByRole('article', { name: 'Google Search design preview' })).toBeVisible();
  await expect(theatre.getByText('EMPTY ASSET SLOT')).toHaveCount(0);
  await expect(theatre.getByText('NOT SAVED · local edits')).toBeVisible();
  await theatre.getByRole('button', { name: 'Compare source', exact: true }).click();
  await expect(theatre.getByRole('article')).toHaveCount(2);
  await theatre.getByRole('button', { name: 'Compare source', exact: true }).click();
  await theatre.getByRole('combobox', { name: 'Zoom', exact: true }).selectOption('75');
  await theatre.getByRole('button', { name: 'Expand preview', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Expanded design preview' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(theatre.getByRole('combobox', { name: 'Zoom', exact: true })).toHaveValue('75');
  await theatre.getByRole('combobox', { name: 'Copy language' }).selectOption('ar');
  await theatre.getByRole('textbox', { name: 'Headline', exact: true }).fill('رسالة واضحة لعميلك');
  await expect(theatre.getByRole('article')).toHaveAttribute('dir', 'rtl');
  await page.screenshot({ path: testInfo.outputPath('creative-ar-search.png'), fullPage: true });
  const mobile = await page.getByRole('button', { name: /Workspace navigation for/ }).isVisible();
  async function navigate(label: string) {
    if (mobile) await page.getByRole('button', { name: /Workspace navigation for/ }).click();
    await page.getByRole('navigation', { name: mobile ? 'Mobile Command Center sections' : 'Command Center sections', exact: true }).getByRole('link', { name: label }).click();
  }
  await navigate('Campaigns');
  await expect(page.getByRole('heading', { name: 'رسالة واضحة لعميلك' })).toBeVisible();
  const builder = page.getByRole('region', { name: 'Campaign builder' });
  await builder.getByRole('textbox', { name: 'Landing destination' }).fill('https://example.org/growth');
  await builder.getByRole('button', { name: 'Prepare review snapshot' }).click();
  await expect(builder.getByText('Review snapshot frozen locally · not submitted')).toBeVisible();
  await builder.getByRole('spinbutton', { name: 'Media budget (integer minor units)' }).fill('81234');
  await expect(builder.getByText('REVIEW INVALIDATED · plan or creative changed')).toBeVisible();
  await expect(builder.getByRole('button', { name: /Launch/ })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('campaign-review.png'), fullPage: true });
  await navigate('Social');
  await expect(page.getByRole('region', { name: 'Ad Preview Theatre' }).getByRole('heading', { name: 'رسالة واضحة لعميلك' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Editorial board' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('social-board.png'), fullPage: true });
  await navigate('Campaigns');
  await expect(page.getByRole('spinbutton', { name: 'Media budget (integer minor units)' })).toHaveValue('81234');
  await page.getByRole('button', { name: 'Adult beginner — WhatsApp enquiries', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Ad Preview Theatre' }).getByRole('textbox', { name: 'Headline', exact: true })).toHaveValue('');
  await navigate('Creative Studio');
  await expect(theatre.getByRole('textbox', { name: 'Headline', exact: true })).toHaveValue('');
  if (mobile) await page.getByRole('button', { name: /Workspace navigation for/ }).click();
  const nav = page.getByRole('navigation', { name: mobile ? 'Mobile Command Center sections' : 'Command Center sections', exact: true });
  await nav.getByRole('button', { name: 'North Bay Clinic' }).click();
  if (mobile) await page.getByRole('button', { name: 'Close navigation ×' }).click();
  await expect(theatre.getByRole('textbox', { name: 'Headline', exact: true })).toHaveValue('North Bay Clinic — Marina');
  await expect(theatre.getByRole('heading', { name: 'رسالة واضحة لعميلك' })).toHaveCount(0);
});

test('mobile drawer traps focus, dismisses with Escape and restores the trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/command/creative');
  const trigger = page.getByRole('button', { name: /Workspace navigation for/ });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Workspace navigation', exact: true });
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 28; index++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(385, 420);
  await expect(dialog).not.toBeVisible();
});

test('Growth brief validates, reviews exact payload and reports an unavailable intake honestly', async ({ page }, testInfo) => {
  await page.goto('/growth');
  const brief = page.getByRole('region', { name: 'Growth qualification brief' });
  await brief.getByRole('button', { name: 'Review exact request' }).click();
  await expect(brief.getByText('This field is required.').first()).toBeVisible();
  for (const [name, value] of [['Your name', 'Review Operator'], ['Email', 'operator@example.org'], ['Business name', 'Review Business'], ['Business category', 'Education'], ['Market / country', 'UAE'], ['Target geography', 'Dubai'], ['Target languages', 'Arabic and English'], ['Current platforms', 'Instagram, Google']]) await brief.getByRole('textbox', { name, exact: true }).fill(value);
  await brief.getByRole('checkbox').check();
  await brief.getByRole('button', { name: 'Review exact request' }).click();
  await expect(brief.getByRole('heading', { name: 'Request summary' })).toBeVisible();
  await expect(brief.locator('pre')).toContainText('geography: Dubai');
  // growth-studio.config.ts explicitly disables both external transports.
  const intake = page.waitForResponse((response) => response.url().endsWith('/api/contact') && response.request().method() === 'POST');
  await brief.getByRole('button', { name: 'Send growth inquiry' }).click();
  const response = await intake;
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({ delivered: false });
  await expect(brief.getByRole('status')).toContainText('UNCONFIGURED');
  await expect(brief.getByRole('textbox', { name: 'Business name', exact: true })).toHaveValue('Review Business');
  await page.screenshot({ path: testInfo.outputPath('growth-brief.png'), fullPage: true });
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('حوّل');
  await page.screenshot({ path: testInfo.outputPath('growth-ar.png'), fullPage: true });
});

test('responsive Growth and theatre geometry and automated accessibility', async ({ page }, testInfo) => {
  for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    for (const route of ['/growth', '/command/creative', '/command/campaigns', '/command/social']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} at ${width}`).toBe(true);
      if (width === 360 || width === 1440) await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-')}-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'العربية', exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} Arabic at ${width}`).toBe(true);
      if (width === 360 || width === 1440) await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-')}-ar-${width}.png`), fullPage: true });
    }
  }
  const results = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(({ id, description }) => ({ id, description }))).toEqual([]);
});

test('remaining command routes retain source-aware screens under the shared shell', async ({ page }, testInfo) => {
  for (const route of ['/command', '/command/clients', '/command/analytics', '/command/reports', '/command/connections', '/command/communities', '/command/leads']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-')}.png`), fullPage: true });
  }
});
