import { expect, test } from '@playwright/test';

test('the read-only document reader preserves code and follows only safe links', async ({ page }) => {
  const readme = [
    '# Project reader',
    'See [Integration](docs/build/INTEGRATION_SETUP.md) and [Upstream](https://example.com/reference).',
    '[Unsafe](javascript:example)',
    '<em data-doc-raw>literal markup</em>',
    '## Verification',
    '```sh',
    'npm run typecheck',
    '```',
  ].join('\n');
  await page.route('**/api/build/file?**', async (route) => {
    const path = new URL(route.request().url()).searchParams.get('path');
    await route.fulfill({ json: { content: path === 'README.md' ? readme : '## Integration setup reference' } });
  });

  await page.goto('/build/docs?file=README.md');
  const article = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Project reader' }) });
  await expect(article).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Document outline' }).getByRole('link', { name: 'Verification' })).toHaveAttribute('href', /#doc-section-/);
  await expect(article.locator('pre')).toHaveText('npm run typecheck');
  await expect(article.getByRole('link', { name: 'Upstream' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(article.getByRole('link', { name: 'Unsafe' })).toHaveCount(0);
  await expect(article.locator('[data-doc-raw]')).toHaveCount(0);
  await expect(article).not.toContainText('literal markup');

  await page.getByRole('button', { name: 'Source', exact: true }).click();
  await expect(page.locator('.dev-doc-content')).toHaveText(readme);
  await page.getByRole('button', { name: 'Reader', exact: true }).click();
  await article.getByRole('button', { name: 'Integration', exact: true }).click();
  await expect(page).toHaveURL(/file=docs%2Fbuild%2FINTEGRATION_SETUP\.md/);
  await expect(page.getByRole('heading', { name: 'Integration setup reference' })).toBeVisible();

  await page.getByLabel('Search index').fill('no-result-example');
  await expect(page.getByText('No documents match this search.')).toBeVisible();
});
