import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

const { growthAuthEnforced } = await import('../src/lib/growth/auth/enforcement.ts');

test('Growth auth enforcement is opt-in until persistence is provisioned', () => {
  assert.equal(growthAuthEnforced({}), false);
  assert.equal(growthAuthEnforced({ KNOUX_GROWTH_AUTH_ENFORCED: 'false' }), false);
  assert.equal(growthAuthEnforced({ KNOUX_GROWTH_AUTH_ENFORCED: ' true ' }), true);
});

test('the reconciled routes preserve existing guards and wire the tenant boundary', async () => {
  const root = process.cwd();
  const intelligence = await fs.readFile(path.join(root, 'src/app/api/intelligence/route.ts'), 'utf8');
  const probe = await fs.readFile(path.join(root, 'src/app/api/growth/intelligence/probe/route.ts'), 'utf8');
  const capabilities = await fs.readFile(path.join(root, 'src/app/api/growth/capabilities/route.ts'), 'utf8');
  const layout = await fs.readFile(path.join(root, 'src/app/command/layout.tsx'), 'utf8');

  assert.match(intelligence, /guardGrowthProviderAccess/);
  assert.match(intelligence, /readBoundedJson/);
  assert.match(intelligence, /randomUUID/);
  assert.match(intelligence, /growthAuthEnforced/);
  assert.match(intelligence, /permission: 'intelligence\.use'/);
  assert.match(intelligence, /clientId/);

  assert.match(probe, /guardGrowthProviderAccess/);
  assert.match(probe, /growthAuthEnforced/);
  assert.match(probe, /guardGrowth/);

  assert.match(capabilities, /growthAuthEnforced/);
  assert.match(capabilities, /permission: 'connection\.view'/);

  assert.match(layout, /growthAuthEnforced/);
  assert.match(layout, /resolvePrincipal/);
});

test('Next 16 uses proxy session refresh for Growth routes, not a legacy middleware file', async () => {
  const root = process.cwd();
  const proxy = await fs.readFile(path.join(root, 'proxy.ts'), 'utf8');

  assert.match(proxy, /'\/command\/:path\*'/);
  assert.match(proxy, /'\/api\/intelligence\/:path\*'/);
  assert.match(proxy, /'\/api\/growth\/:path\*'/);

  await assert.rejects(
    fs.access(path.join(root, 'src/middleware.ts')),
    /ENOENT/,
  );
});
