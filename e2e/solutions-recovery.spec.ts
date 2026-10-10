import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { solutions } from '../src/data/solutions';

test('Solutions handoff: responsive geometry, real missions, keyboard and accessible layers', async ({ page }, testInfo) => {
  const viewport = testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : testInfo.project.name === 'tablet' ? { width: 820, height: 1180 } : { width: 1440, height: 900 };
  await page.setViewportSize(viewport);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/solutions');
  const stations = page.getByRole('navigation', { name: 'Choose a business mission' }).getByRole('button');
  await expect(stations).toHaveCount(8);
  await expect(stations.first()).toHaveAttribute('aria-pressed', 'true');
  const bounds = await stations.first().boundingBox();
  expect(bounds!.y).toBeLessThan(viewport.height - 60);
  expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height);
  for (const station of await stations.all()) {
    const box = await station.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  }
  const railContact = page.locator('.signal-rail a[href="/contact"]');
  const contactBounds = await railContact.boundingBox();
  expect(contactBounds!.x + contactBounds!.width).toBeLessThanOrEqual(viewport.width);
  const folder = `qa/solutions/after-${process.env.KNOUX_CAPTURE_ID ?? 'local'}`;
  mkdirSync(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/solutions-${viewport.width}-top.png` });
  await page.screenshot({ path: `${folder}/solutions-${viewport.width}-full.png`, fullPage: true });
  await stations.first().focus();
  await page.keyboard.press('End');
  await expect(stations.last()).toBeFocused();
  await expect(page.locator('#selected-mission-title')).toHaveText(solutions[7].title);
  await page.keyboard.press('ArrowRight');
  await expect(stations.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(stations.nth(1)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(stations.first()).toBeFocused();
  for (const [index, solution] of solutions.entries()) {
    await stations.nth(index).click();
    await expect(page.locator('#selected-mission-title')).toHaveText(solution.title);
    await expect(page.getByRole('link', { name: 'Explore this mission' })).toHaveAttribute('href', `/solutions/${solution.slug}`);
    const layers = page.locator('[aria-controls="solution-layer-detail"]');
    await expect(layers).toHaveCount(solution.core.length);
    for (const [layerIndex, layer] of solution.core.entries()) {
      await layers.nth(layerIndex).click();
      await expect(page.locator('#solution-layer-detail h4')).toHaveText(layer.label);
      await expect(page.locator('#solution-layer-detail > p')).toHaveText(layer.because);
    }
  }
  const summary = page.locator('details summary');
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('details')).toHaveAttribute('open', '');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${folder}/solutions-${viewport.width}-optional.png`, fullPage: true });
  await expect(page.getByRole('link', { name: 'Open the Composer' })).toHaveAttribute('href', '/build');
  await expect(page.getByRole('link', { name: 'Describe your situation' })).toHaveAttribute('href', '/contact?requestType=solution');
  const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, stars: document.querySelectorAll('.store-starfield').length, transition: getComputedStyle(document.querySelector('.mission-path__station')!).transitionDuration }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.stars).toBe(1);
  expect(parseFloat(geometry.transition)).toBeLessThanOrEqual(0.001);
  const audit = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
  writeFileSync(`${folder}/solutions-${viewport.width}-report.json`, JSON.stringify({ viewport, firstMission: bounds, contactBounds, geometry, violations: audit.violations, errors }, null, 2));
});
