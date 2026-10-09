import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { inspectBuild, assetPath, cssReferences, verifyServedAsset, startOwnedServer } from '../scripts/css-integrity.mjs';

test('stylesheet inspection discovers changing chunk names across every emitted document', async () => {
  const root = await mkdtemp(join(tmpdir(), 'knoux-css-'));
  try {
    await mkdir(join(root, 'server/app/deep'), { recursive: true });
    await mkdir(join(root, 'static/chunks'), { recursive: true });
    await writeFile(join(root, 'server/app/index.html'), '<link rel="stylesheet" href="/_next/static/chunks/arbitrary-A.css"/>');
    await writeFile(join(root, 'server/app/deep/route.html'), '<link rel="stylesheet" href="/_next/static/chunks/arbitrary-B.css"/>');
    await writeFile(join(root, 'static/chunks/arbitrary-A.css'), 'body{color:white}');
    await writeFile(join(root, 'static/chunks/arbitrary-B.css'), '.lane{display:flex}');
    const report = await inspectBuild(root);
    assert.equal(report.documents, 2);
    assert.equal(report.assets.length, 2);
    await rm(join(root, 'static/chunks/arbitrary-B.css'));
    await assert.rejects(inspectBuild(root), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('stylesheet paths reject traversal and foreign output roots', () => {
  for (const href of ['/_next/static/../private.css', '/_next/static/%2e%2e/private.css', '/_next/static/%5csecret.css', '/foreign/static/a.css']) assert.throws(() => assetPath(tmpdir(), href));
  assert.deepEqual(cssReferences('<link href="/_next/static/chunks/x.css?v=1&amp;a=2"><script>"/_next/static/chunks/y.css"</script>'), ['/_next/static/chunks/x.css?v=1&a=2', '/_next/static/chunks/y.css']);
});

test('HTTP integrity refuses success pages, stale bytes, redirects and empty CSS', async () => {
  const root = await mkdtemp(join(tmpdir(), 'knoux-css-http-'));
  await mkdir(join(root, 'static/chunks'), { recursive: true });
  await writeFile(join(root, 'static/chunks/current.css'), '.current{color:white}');
  let status = 200;
  let type = 'text/css';
  let body = '.current{color:white}';
  const server = createServer((_request, response) => { response.writeHead(status, { 'Content-Type': type }); response.end(body); });
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await verifyServedAsset(base, root, '/_next/static/chunks/current.css')).status, 200);
    body = '.stale{color:red}';
    await assert.rejects(verifyServedAsset(base, root, '/_next/static/chunks/current.css'), /differs/);
    body = '';
    await assert.rejects(verifyServedAsset(base, root, '/_next/static/chunks/current.css'), /differs/);
    type = 'text/html';
    await assert.rejects(verifyServedAsset(base, root, '/_next/static/chunks/current.css'), /content type/);
    type = 'text/css'; status = 302;
    await assert.rejects(verifyServedAsset(base, root, '/_next/static/chunks/current.css'), /302/);
    await assert.rejects(startOwnedServer(root, server.address().port), /EADDRINUSE/);
  } finally { await new Promise(accept => server.close(accept)); await rm(root, { recursive: true, force: true }); }
});
