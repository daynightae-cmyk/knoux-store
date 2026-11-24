import { expect, test } from '@playwright/test';
import type { WordPressDraft, WordPressDraftCreate } from '../src/lib/wordpress/site-drafts';

test('Studio uses its catalog and draft client in the committed application flow', async ({ page }, info) => {
  let saved: WordPressDraft | undefined;
  const catalogQueries: string[] = [];
  await page.route('**/api/wordpress/catalog?*', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const kind = query.get('kind');
    const slug = kind === 'theme' ? 'phase-three-theme' : 'phase-three-plugin';
    const name = kind === 'theme' ? 'Phase Three Theme' : 'Phase Three Plugin';
    catalogQueries.push(query.toString());
    await route.fulfill({ json: {
      state: 'ok', page: Number(query.get('page')), perPage: 9, totalPages: 2, totalItems: 2, totalKnown: true,
      items: [{ kind, slug, name, source: 'wordpress.org', author: 'Test fixture', tags: [], shortDescription: 'Catalog contract fixture', sourceUrl: 'https://wordpress.org/' }],
    } });
  });
  await page.route(/\/api\/wordpress\/drafts(?:\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as WordPressDraftCreate;
      expect(payload.document.themeSlug).toBe('phase-three-theme');
      expect(payload.document.pluginSlugs).toEqual(['phase-three-plugin']);
      expect(payload.document.identity?.name).toBe('Restorable Studio');
      saved = { ...payload, revision: 1, updatedAt: '2026-11-24T00:00:00Z' };
    }
    await route.fulfill({ json: { draft: saved }, status: saved ? 200 : 404 });
  });

  await page.goto('/wordpress');
  const studio = page.getByRole('region', { name: 'WordPress Studio', exact: true });
  const journeys = studio.getByRole('navigation', { name: 'Studio journeys' });
  await journeys.getByRole('button', { name: /Theme Explorer/ }).click();
  await studio.getByRole('searchbox', { name: 'Search WordPress themes' }).fill('phase');
  await expect.poll(() => catalogQueries.some(query => query.includes('kind=theme') && query.includes('search=phase'))).toBe(true);
  const theme = studio.getByRole('button', { name: /Phase Three Theme/ });
  await theme.click();
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  const controls = studio.getByRole('group', { name: 'Theme catalog pages' });
  await controls.getByRole('button', { name: 'Next page' }).click();
  await expect(controls.getByRole('status')).toHaveText('Page 2');
  await expect(theme).toHaveAttribute('aria-pressed', 'true');

  await journeys.getByRole('button', { name: /Plugin Intelligence/ }).click();
  await studio.getByRole('listitem').filter({ hasText: 'Phase Three Plugin' }).getByRole('button', { name: 'Add', exact: true }).click();
  await journeys.getByRole('button', { name: /Site Identity/ }).click();
  await studio.getByLabel('Site title', { exact: true }).fill('Restorable Studio');
  await studio.getByRole('button', { name: 'Save site draft', exact: true }).click();
  const drafts = studio.getByRole('region', { name: 'WordPress draft storage' });
  await expect(drafts.getByRole('status')).toHaveText('Draft saved.');

  await page.reload();
  await expect(studio.getByLabel('Site title', { exact: true })).toHaveValue('Restorable Studio');
  await expect(drafts.getByRole('status')).toHaveText('Saved draft restored.');
  await page.screenshot({ path: info.outputPath('wordpress-studio-draft-browser-fixture.png') });
});
