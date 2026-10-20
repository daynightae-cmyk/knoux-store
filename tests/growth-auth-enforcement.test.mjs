import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

const { growthAuthEnforced, growthAgentBoundaryRequired } = await import('../src/lib/growth/auth/enforcement.ts');

test('Growth auth enforcement is opt-in until persistence is provisioned', () => {
  assert.equal(growthAuthEnforced({}), false);
  assert.equal(growthAuthEnforced({ KNOUX_GROWTH_AUTH_ENFORCED: 'false' }), false);
  assert.equal(growthAuthEnforced({ KNOUX_GROWTH_AUTH_ENFORCED: ' true ' }), true);
  assert.equal(growthAuthEnforced({ KNOUX_GROWTH_DATA_SOURCE: 'supabase', KNOUX_GROWTH_AUTH_ENFORCED: 'false' }), true);
});

test('the tenant flag stays honoured in any environment, including a store-less production', () => {
  // The public labelled fixture Command Center is the documented product stage:
  // production without a durable store keeps serving it, and the flag decides.
  assert.equal(growthAuthEnforced({ VERCEL_ENV: 'production' }), false);
  assert.equal(growthAuthEnforced({ VERCEL_ENV: 'production', KNOUX_GROWTH_AUTH_ENFORCED: 'false' }), false);
  assert.equal(growthAuthEnforced({ VERCEL_ENV: 'production', KNOUX_GROWTH_AUTH_ENFORCED: 'true' }), true);
  assert.equal(growthAuthEnforced({ VERCEL_ENV: 'preview', KNOUX_GROWTH_AUTH_ENFORCED: 'false' }), false);
});

test('agent-backed calls fail closed in production even when the flag was forgotten', () => {
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'production', KNOUX_AGENT_ENDPOINT: 'https://agent.example.com', KNOUX_GROWTH_AUTH_ENFORCED: 'false' }), true);
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'production', KNOUX_AGENT_ENDPOINT: ' https://agent.example.com ' }), true);
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'production', KNOUX_AGENT_TOKEN: 'secret' }), true);
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'production', KNOUX_GROWTH_AUTH_ENFORCED: 'true' }), true);
});

test('the agent boundary stays flag-driven outside production and when no agent is configured', () => {
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'production' }), false);
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'production', KNOUX_AGENT_ENDPOINT: '' }), false);
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'production', KNOUX_GROWTH_DATA_SOURCE: 'fixture' }), false);
  assert.equal(growthAgentBoundaryRequired({ VERCEL_ENV: 'preview', KNOUX_AGENT_ENDPOINT: 'https://agent.example.com', KNOUX_GROWTH_AUTH_ENFORCED: 'false' }), false);
  assert.equal(growthAgentBoundaryRequired({}), false);
});

test('the reconciled routes preserve existing guards and wire the boundaries that protect them', async () => {
  const root = process.cwd();
  const intelligence = await fs.readFile(path.join(root, 'src/app/api/intelligence/route.ts'), 'utf8');
  const probe = await fs.readFile(path.join(root, 'src/app/api/growth/intelligence/probe/route.ts'), 'utf8');
  const capabilities = await fs.readFile(path.join(root, 'src/app/api/growth/capabilities/route.ts'), 'utf8');
  const layout = await fs.readFile(path.join(root, 'src/app/command/layout.tsx'), 'utf8');

  assert.match(intelligence, /guardGrowthProviderAccess/);
  assert.match(intelligence, /readBoundedJson/);
  assert.match(intelligence, /randomUUID/);
  assert.match(intelligence, /growthAgentBoundaryRequired/);
  assert.match(intelligence, /permission: 'intelligence\.use'/);
  assert.match(intelligence, /clientId/);

  assert.match(probe, /guardGrowthProviderAccess/);
  assert.match(probe, /growthAgentBoundaryRequired/);
  assert.match(probe, /guardGrowth/);

  assert.match(capabilities, /growthAgentBoundaryRequired/);
  assert.match(capabilities, /permission: 'connection\.view'/);

  assert.match(layout, /growthAuthEnforced/);
  assert.match(layout, /resolvePrincipal/);
  assert.ok(layout.indexOf('await connection()') < layout.indexOf('if (growthAuthEnforced())'), 'workspace selection must occur after the request-time boundary, never in a prerendered fixture shell');
  assert.ok(!layout.includes('growthAgentBoundaryRequired'), 'the workspace switch keeps serving the labelled demo to a store-less production by design');
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
