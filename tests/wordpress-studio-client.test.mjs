import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypeScript } from './load.mjs';

const { readStudioCatalog, openStudioDraft, writeStudioDraft, restoreStudioSelection } =
  await loadTypeScript('../src/lib/wordpress/studio-client.ts');
const id = 'aaaa0000-bbbb-4ccc-8ddd-000000000001';
const document = { schema: 1, identity: null, blocks: [], themeSlug: 'twentytwentyfive', pluginSlugs: ['wordpress-seo'], selection: { kind: 'plugin', pluginSlug: 'wordpress-seo' } };
const existing = { id, title: 'Studio', revision: 2, updatedAt: '2026-11-24T00:00:00Z', document };

test('studio transport preserves the selected WordPress pane and slugs across save, conflict and reload', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, options.method ?? 'GET']);
    if (url.startsWith('/api/wordpress/catalog')) return Response.json({ state: 'ok', items: [] });
    if (options.method === 'PUT') {
      const input = JSON.parse(options.body);
      if (input.expectedRevision === 1) return Response.json({ message: 'Revision conflict', revision: 2 }, { status: 409 });
      assert.deepEqual(input.document, document);
      return Response.json({ draft: { ...existing, revision: 3 } });
    }
    return Response.json({ draft: existing });
  });
  await readStudioCatalog({ kind: 'plugin', tag: 'seo', page: 2 });
  const input = { id, title: 'Studio', document };
  assert.equal((await writeStudioDraft(input)).revision, 2);
  await assert.rejects(writeStudioDraft({ ...input, expectedRevision: 1 }), { status: 409, revision: 2 });
  assert.deepEqual(restoreStudioSelection(await openStudioDraft(id)), {
    kind: 'plugin', pluginSlug: 'wordpress-seo', themeSlug: 'twentytwentyfive',
  });
  assert.equal((await writeStudioDraft({ ...input, expectedRevision: 2 })).revision, 3);
  assert.deepEqual(calls.map(([url, method]) => [url, method]), [
    ['/api/wordpress/catalog?kind=plugin&tag=seo&page=2', 'GET'],
    ['/api/wordpress/drafts', 'POST'], ['/api/wordpress/drafts', 'PUT'],
    ['/api/wordpress/drafts?id=' + id, 'GET'], ['/api/wordpress/drafts', 'PUT'],
  ]);
});
