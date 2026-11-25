import { expect, test } from '@playwright/test';
import type { WordPressDraft, WordPressDraftCreate, WordPressDraftSave } from '../src/lib/wordpress/site-drafts';

for (const storageUnavailable of [false, true]) {
  test(`modular Studio saves and restores its actual document${storageUnavailable ? ' without browser storage' : ''}`, async ({ page }, info) => {
    let saved: WordPressDraft | undefined;
    const catalogQueries: string[] = [];
    if (storageUnavailable) {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
      });
    }
    await page.route('**/api/wordpress/catalog?*', async (route) => {
      const query = new URL(route.request().url()).searchParams;
      const kind = query.get('kind');
      const secondPage = query.get('page') === '2';
      const slug = `${secondPage ? 'other' : 'phase-three'}-${kind}`;
      const name = `${secondPage ? 'Other' : 'Phase Three'} ${kind === 'theme' ? 'Theme' : 'Plugin'}`;
      catalogQueries.push(query.toString());
      await route.fulfill({ json: {
        state: 'ok', page: Number(query.get('page')), perPage: 9, totalPages: 2, totalItems: 2, totalKnown: true,
        items: [{ kind, slug, name, source: 'wordpress.org', author: 'Test fixture', tags: [], shortDescription: 'Catalog contract fixture', sourceUrl: `https://wordpress.org/${kind === 'theme' ? 'themes' : 'plugins'}/${slug}/` }],
      } });
    });
    await page.route(/\/api\/wordpress\/drafts(?:\?|$)/, async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        const payload = route.request().postDataJSON() as WordPressDraftCreate;
        expect(payload.document.themeSlug).toBe('phase-three-theme');
        expect(payload.document.pluginSlugs).toEqual(['phase-three-plugin']);
        expect(payload.document.selection).toEqual({ kind: 'plugin', pluginSlug: 'phase-three-plugin' });
        expect(payload.document.identity?.name).toBe('Restorable Studio');
        expect(payload.document.blocks.map(({ type }) => type)).toEqual(['hero', 'features', 'cta', 'gallery']);
        saved = { ...payload, revision: 1, updatedAt: '2026-11-24T00:00:00Z' };
      }
      if (method === 'PUT') {
        const payload = route.request().postDataJSON() as WordPressDraftSave;
        expect(payload.id).toBe(saved?.id);
        expect(payload.expectedRevision).toBe(1);
        await route.fulfill({ status: 409, json: { message: 'Revision conflict', revision: 2 } });
        return;
      }
      const id = new URL(route.request().url()).searchParams.get('id');
      if (method === 'GET' && !id) {
        await route.fulfill({ json: { drafts: saved ? [saved] : [], nextOffset: null } });
        return;
      }
      await route.fulfill({ json: { draft: saved }, status: saved ? 200 : 404 });
    });

    await page.goto('/wordpress#themes');
    const studio = page.getByRole('region', { name: 'WordPress Studio', exact: true });
    async function journey(name: string) {
      await studio.getByRole('button', { name: 'Studio journeys', exact: true }).click();
      await studio.getByRole('dialog', { name: 'Studio journeys', exact: true }).getByRole('button', { name, exact: true }).click();
    }
    async function brandName(value?: string) {
      await studio.getByRole('button', { name: 'Brand Controls', exact: true }).click();
      const panel = studio.getByRole('dialog', { name: 'Brand Controls', exact: true });
      if (value !== undefined) await panel.getByLabel('Brand name', { exact: true }).fill(value);
      else await expect(panel.getByLabel('Brand name', { exact: true })).toHaveValue('Restorable Studio');
      await panel.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await studio.getByRole('searchbox', { name: 'Search themes', exact: true }).fill('phase');
    await expect.poll(() => catalogQueries.some(query => query.includes('kind=theme') && query.includes('search=phase'))).toBe(true);
    await studio.getByRole('button', { name: /Phase Three Theme/ }).click();
    const controls = studio.getByRole('group', { name: 'Theme catalog pages' });
    await controls.getByRole('button', { name: 'Next page' }).click();
    await expect(controls.getByRole('status')).toHaveText('Page 2');
    await expect(studio.getByRole('complementary', { name: 'Selected theme' })).toContainText('Phase Three Theme');
    await journey('Plugin Intelligence');
    await studio.getByRole('searchbox', { name: 'Search plugins', exact: true }).fill('phase');
    await studio.getByRole('button', { name: /Phase Three Plugin Test fixture/ }).click();
    await expect(studio.getByRole('button', { name: 'Remove Phase Three Plugin from the selection tray', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await journey('Site Identity');
    await brandName('Restorable Studio');
    await journey('Visual Composer');
    await studio.getByRole('button', { name: 'Components', exact: true }).click();
    const components = studio.getByRole('dialog', { name: 'Components', exact: true });
    await components.getByRole('button', { name: /Gallery/ }).click();
    await components.getByRole('button', { name: 'Close', exact: true }).click();
    await studio.getByRole('button', { name: 'Account drafts', exact: true }).click();
    const account = studio.getByRole('dialog', { name: 'Account drafts', exact: true });
    const drafts = account.getByRole('region', { name: 'WordPress draft storage' });
    await drafts.getByRole('button', { name: 'Save site draft', exact: true }).click();
    await expect(drafts.getByRole('status')).toHaveText('Draft saved.');
    await account.getByRole('button', { name: 'Close', exact: true }).click();
    await journey('Site Identity');
    await brandName('Unsaved changes');

    if (!storageUnavailable) {
      // Remove local content to prove account restoration rather than a local-storage echo.
      await page.evaluate(() => {
        sessionStorage.removeItem('knoux-wp-identity-draft');
        sessionStorage.removeItem('knoux-wp-composer-draft');
      });
      await page.reload();
    }
    await studio.getByRole('button', { name: 'Account drafts', exact: true }).click();
    if (storageUnavailable) {
      await drafts.getByRole('button', { name: 'List saved drafts', exact: true }).click();
      await drafts.getByRole('button', { name: 'Open Restorable Studio', exact: true }).click();
    }
    await expect(drafts.getByRole('status')).toHaveText('Saved draft restored.');
    await drafts.getByRole('button', { name: 'Save site draft', exact: true }).click();
    await expect(drafts.getByRole('status')).toHaveText('Revision conflict');
    await expect(drafts.getByRole('button', { name: 'Save site draft', exact: true })).toBeDisabled();
    await drafts.getByRole('button', { name: 'Discard local changes and reload saved draft', exact: true }).click();
    await expect(drafts.getByRole('status')).toHaveText('Saved draft restored.');
    await account.getByRole('button', { name: 'Close', exact: true }).click();
    await brandName();
    await journey('Visual Composer');
    await expect(studio.locator('[data-type="gallery"]')).toBeVisible();
    await studio.getByRole('button', { name: 'Preview orbit', exact: true }).click();
    await expect(studio.locator('[data-wordpress-cockpit]')).toHaveAttribute('data-preview-kind', 'plugin');
    await expect(studio.getByRole('heading', { name: 'Phase Three Plugin', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('wordpress-studio-draft-browser-fixture.png') });
  });
}
