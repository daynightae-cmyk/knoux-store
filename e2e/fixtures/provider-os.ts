import type { Page } from '@playwright/test';
import type { ProviderWorkspaceSnapshot, ProviderProfile } from '../../src/lib/ai/provider-os/types';
import { defaultPermissions, EMPTY_CONNECTION } from '../../src/lib/ai/provider-os/policy';
import { CONTRACT_MODEL } from './build-generator';
const owner = '11111111-1111-4111-8111-111111111111', credential = '33333333-3333-4333-8333-333333333333', id = '22222222-2222-4222-8222-222222222222';
/** UI contracts only. SQL/runtime tests separately prove persistence and authorization. */
export async function providerFixture(page: Page) {
    const markFixture = () => {
        if (!document.body || document.getElementById('provider-contract-fixture-label'))
            return;
        const label = document.createElement('span');
        label.id = 'provider-contract-fixture-label';
        label.textContent = 'CONTRACT FIXTURE — UI ONLY';
        label.setAttribute('aria-hidden', 'true');
        label.style.cssText = 'position:fixed;right:8px;top:55px;z-index:999999;font:9px monospace;color:#eee7fa;background:#15111c;padding:4px 6px;pointer-events:none';
        document.body.append(label);
    };
    await page.addInitScript(`document.addEventListener('DOMContentLoaded', ${markFixture.toString()}, {once:true});`);
    await page.evaluate(markFixture);
    const registry = await (await page.request.get('/api/build/provider-os')).json();
    const now = new Date().toISOString();
    const profile = (profileId: string, name: string, active: boolean): ProviderProfile => ({ id: profileId, ownerId: owner, workspaceId: owner, providerId: 'groq', name, active, enabled: true, auth: { mode: 'VAULT_SECRET', credentialId: credential }, permissions: defaultPermissions(), cli: null, bindings: { mcp: [], plugins: [], skills: [] }, routing: { automatic: true, modelAllowlist: [], monthlySpendLimit: null }, connection: { ...EMPTY_CONNECTION, configuration: 'CONFIGURED', auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', blocker: null }, models: [{ ...CONTRACT_MODEL, providerId: 'groq', modelId: 'fixture-text', displayName: 'Text · CONTRACT FIXTURE', source: 'CACHED_LIVE' }, { ...CONTRACT_MODEL, providerId: 'groq', modelId: 'fixture-embedding', displayName: 'Embedding · CONTRACT FIXTURE', modalities: { ...CONTRACT_MODEL.modalities, text: false }, source: 'CACHED_LIVE', catalog: { categories: ['embedding'], gateway: false, authorNamespace: null, supportedParameters: [], free: null, buildEligible: false } }, { ...CONTRACT_MODEL, providerId: 'groq', modelId: 'fixture-free', displayName: 'Free · CONTRACT FIXTURE', source: 'CACHED_LIVE', pricing: { inputPerMillion: 0, outputPerMillion: 0, cachedInputPerMillion: null, currency: 'USD' } }] as ProviderProfile['models'], discoveredAt: now, version: 1, createdAt: now, updatedAt: now });
    const first = profile(id, 'Personal · CONTRACT FIXTURE', true), second = profile('44444444-4444-4444-8444-444444444444', 'Company · CONTRACT FIXTURE', false);
    const agent = { ...profile('55555555-5555-4555-8555-555555555555', 'CLI · CONTRACT FIXTURE', true), providerId: 'agent:codex', auth: { mode: 'CLI_PROFILE' as const, profileName: 'contract' }, connection: { ...EMPTY_CONNECTION, blocker: 'EXECUTOR_NOT_CONNECTED — CONTRACT FIXTURE' }, models: [] };
    const data: ProviderWorkspaceSnapshot = { ...registry, persistence: 'AVAILABLE', workspaceId: owner, workspaces: [{ id: owner, name: 'CONTRACT FIXTURE — UI ONLY' }], secretStore: { writable: true, state: 'CONTRACT FIXTURE — simulated writable server vault, no real secret stored' }, operator: true, profiles: [first, second, agent], credentials: [{ id: credential, name: 'Shared · CONTRACT FIXTURE', providerId: 'groq', source: 'VAULT_SECRET', configured: true, revision: 1, createdAt: now, updatedAt: now, lastVerifiedAt: null, revokedAt: null, referencedBy: [first.id, second.id] }], agents: [{ id: 'agent:codex', name: 'Codex · CONTRACT FIXTURE', binary: 'C:/contract/codex.exe', source: 'CUSTOM', version: '1.2.3', detected: true, authenticated: 'UNTESTED', executable: false, state: 'EXECUTOR_NOT_CONNECTED', measuredAt: now, capabilities: Object.keys(defaultPermissions()).map(id => ({ id: id as keyof ReturnType<typeof defaultPermissions>, supported: 'UNKNOWN', allowed: 'DENY', currentlyAvailable: false, reason: 'CONTRACT FIXTURE — executor absent' })) }], inventory: [{ id: 'mcp:contract', name: 'MCP · CONTRACT FIXTURE', kind: 'MCP', source: 'PROJECT', state: 'UNTESTED', measuredAt: now, environmentNames: ['API_KEY'] }, { id: 'plugin:contract', name: 'Plugin · CONTRACT FIXTURE', kind: 'PLUGIN', source: 'PROJECT', state: 'AVAILABLE', measuredAt: now, environmentNames: [] }, { id: 'skill:contract', name: 'Skill · CONTRACT FIXTURE', kind: 'SKILL', source: 'PROJECT', state: 'AVAILABLE', measuredAt: now, environmentNames: [] }], audit: [], blocker: 'CONTRACT FIXTURE — no live provider or account proof', measuredAt: now };
    data.definitions.push({ id: 'agent:codex', name: 'Codex · CONTRACT FIXTURE', class: 'CODING_AGENT', transport: 'CONTRACT FIXTURE', authModes: ['CLI_PROFILE'], environmentNames: [], tabs: ['Overview', 'Profiles & Limits', 'CLI & Args', 'Environment', 'Permissions', 'MCP', 'Plugins', 'Skills', 'Usage', 'Diagnostics'], gateway: false, detectionOnly: true });
    const requests: Record<string, unknown>[] = [];
    await page.route('**/api/build/provider-os', async (route) => {
        if (route.request().method() === 'POST') {
            const body = route.request().postDataJSON();
            requests.push(body);
            const current = data.profiles.find(profile => profile.id === body.id);
            if (body.action === 'PROFILE_SWITCH' && current) {
                for (const profile of data.profiles.filter(profile => profile.providerId === current.providerId)) {
                    profile.active = profile.id === current.id;
                    profile.version++;
                }
            }
            if (body.action === 'PROFILE_UPDATE' && current) {
                if (body.patch.permissions)
                    return route.fulfill({ status: 403, json: { message: 'Permission exceeds the operator’s server-side ceiling. CONTRACT FIXTURE refusal.' } });
                Object.assign(current, body.patch);
                current.version++;
            }
            if (['CREDENTIAL_ROTATE', 'CREDENTIAL_REPLACE'].includes(body.action)) {
                data.credentials[0].revision++;
                for (const profile of data.profiles.filter(profile => profile.providerId === 'groq')) {
                    profile.version++;
                    profile.connection = { ...EMPTY_CONNECTION };
                    profile.models = [];
                }
            }
            if (body.action === 'PROFILE_CREATE')
                data.profiles.push({ ...first, id: '66666666-6666-4666-8666-666666666666', name: body.name, active: false, auth: body.auth, connection: { ...EMPTY_CONNECTION }, models: [], version: 1 });
        }
        return route.fulfill({ json: data });
    });
    return { data, requests };
}
