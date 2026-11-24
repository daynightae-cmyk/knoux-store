import { expect, test } from '@playwright/test';

test('the existing Build editor reviews saves and retains the draft on a revision conflict', async ({ page }, info) => {
  const path = 'src/example.ts';
  const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
  const original = 'export const example = "original";';
  const external = 'export const example = "external";';
  const draft = 'export const example = "reviewed";';
  let content = original;
  let revision = 0;
  let writes = 0;
  await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Build a real project'));
  await page.route('**/api/build/bridge/status', (route) => route.fulfill({
    json: { reachable: true, capabilities: { filesystem: true }, handshake: { root: '/fixture', hostname: 'fixture' } },
  }));
  await page.route(/\/api\/build\/project(?:\?|$)/, (route) => route.fulfill({
    json: {
      adapter: { id: 'bridge-fixture', label: 'Browser contract fixture', environment: 'local', capabilities: { 'project.files': 'available', 'project.write': 'available' }, blockers: {} },
      snapshot: { name: 'fixture', root: '/fixture/project', framework: null, packageManager: null, routes: [], apiRoutes: [], files: [{ path, language: 'typescript', bytes: original.length, lines: 1, role: 'library' }], tests: [], scripts: [], dependencies: [], graph: { nodes: [], edges: [], unavailableDomains: [] } },
    },
  }));
  await page.route('**/api/build/file?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get('project')).toBe('project');
    if (route.request().method() === 'GET') {
      expect(params.get('path')).toBe(path);
      return route.fulfill({ json: { path, content, hash: hashes[revision], readOnly: false, language: 'typescript', bytes: content.length, lines: 1 } });
    }
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toEqual({ path, content: draft, expectedHash: hashes[revision] });
    writes++;
    if (writes === 1) {
      content = external;
      revision = 1;
      return route.fulfill({ status: 409, json: { message: 'The file changed since it was read.' } });
    }
    content = draft;
    revision = 2;
    return route.fulfill({ json: { ok: true, hash: hashes[revision], bytes: draft.length } });
  });

  await page.goto('/build');
  if (page.viewportSize()!.width <= 1024) await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  await page.getByRole('button', { name: 'New build', exact: true }).click();
  const launcher = page.getByRole('dialog', { name: 'Project launcher' });
  await launcher.getByLabel('Project folder relative to trusted root').fill('project');
  await launcher.getByRole('button', { name: 'INSPECT & OPEN', exact: true }).click();
  await expect(launcher).toHaveCount(0);
  await page.getByRole('group', { name: 'Workspace view' }).getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByRole('complementary', { name: 'Project files' }).getByRole('button', { name: /src\/example\.ts/ }).click();
  const editor = page.getByRole('textbox', { name: 'Edit ' + path });
  await expect(editor).toHaveValue(original);
  await editor.fill(draft);
  await expect(page.getByRole('button', { name: 'Save file', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  let review = page.getByRole('region', { name: 'Review file changes' });
  await expect(review).toContainText(original);
  await expect(review).toContainText(draft);
  await review.getByRole('button', { name: 'Save file', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'The file changed since it was read.' })).toBeVisible();
  await expect(editor).toHaveValue(draft);

  await page.getByRole('button', { name: 'Reload saved version', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'The file changed since it was read.' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  review = page.getByRole('region', { name: 'Review file changes' });
  await expect(review).toContainText(external);
  await expect(review).toContainText(draft);
  await page.screenshot({ path: info.outputPath('build-review-browser-fixture.png') });
  await review.getByRole('button', { name: 'Save file', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review changes', exact: true })).toBeDisabled();
  await expect(editor).toHaveValue(draft);
  expect(writes).toBe(2);
  const restored = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/build/project' && url.searchParams.get('project') === 'project';
  });
  await page.reload();
  expect((await restored).status()).toBe(200);
  await page.getByRole('group', { name: 'Workspace view' }).getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByRole('complementary', { name: 'Project files' }).getByRole('button', { name: /src\/example\.ts/ }).click();
  await expect(editor).toHaveValue(draft);
});
