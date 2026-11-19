import { expect, test } from '@playwright/test';

const FILM_ID = 'NOhO02YeGg4';
const FILM_IFRAME = `iframe[title^="KNOuX Store"]`;

test.describe('KNOuX Store film', () => {
  test('sits between the protected hero and divisions', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const order = await page
      .locator('main > section.arrival-rail, main > #knoux-film, main > section.home-divisions')
      .evaluateAll((elements) => elements.map((element) => element.id || element.className));

    expect(order).toEqual(['arrival-rail', 'knoux-film', 'home-divisions shell']);
  });

  test('loads the exact film only after an explicit play action', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const player = page.locator(FILM_IFRAME);
    await expect(player).toHaveCount(0);

    const play = page.getByRole('button', { name: 'Play the film', exact: true });
    await play.click();

    await expect(player).toHaveCount(1);
    await expect(player).toHaveAttribute('src', new RegExp(`youtube-nocookie\\.com/embed/${FILM_ID}\\?`));
    await expect(player).toHaveAttribute('src', /controls=1/);
    await expect(player).toHaveAttribute('allow', /autoplay/);
    await expect(player).toHaveAttribute('allow', /fullscreen/);
    await expect(player).toHaveAttribute('allowfullscreen', '');
  });

  test('closes the film, stops the embed and restores focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const play = page.getByRole('button', { name: 'Play the film', exact: true });
    await play.click();
    await expect(page.locator(FILM_IFRAME)).toHaveCount(1);

    await page.getByRole('button', { name: 'Close film', exact: true }).click();
    await expect(page.locator(FILM_IFRAME)).toHaveCount(0);
    await expect(play).toBeFocused();
  });

  test('is keyboard operable and exposes the native player to focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const play = page.getByRole('button', { name: 'Play the film', exact: true });
    await play.focus();
    await page.keyboard.press('Enter');

    const player = page.locator(FILM_IFRAME);
    await expect(player).toHaveCount(1);
    await expect(player).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close film', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(FILM_IFRAME)).toHaveCount(0);
    await expect(play).toBeFocused();
  });

  test('links to the canonical YouTube film safely', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const watch = page.getByRole('link', { name: /Watch on YouTube/i });
    await expect(watch).toHaveAttribute('href', `https://youtu.be/${FILM_ID}`);
    await expect(watch).toHaveAttribute('target', '_blank');
    await expect(watch).toHaveAttribute('rel', /noopener/);
    await expect(watch).toHaveAttribute('rel', /noreferrer/);
  });

  test('localizes, mirrors and fits without horizontal overflow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const cases = [
      { language: 'en', direction: 'ltr', heading: 'The Awakening' },
      { language: 'ar', direction: 'rtl', heading: 'الانطلاقة' },
      { language: 'ur', direction: 'rtl', heading: 'ایک نئی ابتدا' },
    ] as const;

    for (const item of cases) {
      await page.locator('header select').selectOption(item.language);
      await expect(page.locator('html')).toHaveAttribute('dir', item.direction);
      await expect(page.locator('#home-cinema-heading')).toContainText(item.heading);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow in ${item.language}`).toBeLessThanOrEqual(1);
    }
  });
});
