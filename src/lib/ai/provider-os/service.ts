import 'server-only';
import { randomUUID } from 'node:crypto';
import { ProviderRepository, ProviderStorageError } from './repository';
import { ScopedProviderSecretStore } from './secret-store';
import { providerDefinitions, credentialVariable } from './definitions';
import { agentInventory } from './agent-inventory';
import { AGENT_PERMISSIONS, type AuthSource, type Binding, type ProviderDefinition, type ProviderProfile, type ProviderWorkspaceSnapshot } from './types';
import { EMPTY_CONNECTION, defaultPermissions, validIdentifier, validName } from './policy';
import { endpointSyntax } from './endpoint';
import { scopedRuntime, environmentContext } from './request-runtime';
import { withProviderRuntime, providerModelAllowed } from './runtime-context';
import { recordUsage, getUsageRecords } from '../usage';
import { measuredUsage, unknownUsage, openRouterUsage } from './usage-projection';
import { getAdapter, updateHealth, setDiscoveryCache, buildProviderHealth } from '../registry';
import { refusal } from './refusal';
export class ProviderInputError extends Error {
    readonly status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}
type Input = Record<string, unknown>;
function object(value: unknown): Input {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new ProviderInputError('A structured configuration is required.');
    return value as Input;
}
function version(value: unknown): number {
    if (!Number.isSafeInteger(value) || Number(value) < 1)
        throw new ProviderInputError('Refresh the current configuration version.');
    return Number(value);
}
function identity(value: unknown): string {
    if (!validIdentifier(value))
        throw new ProviderInputError('Invalid configuration identity.');
    return value;
}
function name(value: unknown): string {
    if (!validName(value))
        throw new ProviderInputError('Use a name of 1–80 characters without control characters.');
    return value.trim();
}
function boolean(value: unknown): boolean {
    if (typeof value !== 'boolean')
        throw new ProviderInputError('A boolean setting is required.');
    return value;
}
/** Mutations accept explicit fields, never client-supplied connection facts, identity or capabilities. */
export class ProviderService {
    readonly store: ScopedProviderSecretStore;
    readonly repository: ProviderRepository;
    readonly operator: boolean;
    readonly env: Record<string, string | undefined>;
    private readonly inventoryReader: typeof agentInventory;
    private inventoryPromise: ReturnType<typeof agentInventory> | undefined;
    constructor(repository: ProviderRepository, operator: boolean, env: Record<string, string | undefined> = process.env, inventoryReader: typeof agentInventory = agentInventory) { this.repository = repository; this.operator = operator; this.env = env; this.store = new ScopedProviderSecretStore(repository, env); this.inventoryReader = inventoryReader; }
    private inventory() { return this.inventoryPromise ??= this.inventoryReader(this.repository.ownerId); }
    async snapshot(): Promise<ProviderWorkspaceSnapshot> {
        const local = await this.inventory();
        const profiles = (await this.repository.profiles()).map(profile => ({ ...profile, models: profile.models.map(model => ({ ...model, source: model.source === 'LIVE' ? 'CACHED_LIVE' as const : model.source })) }));
        const [credentials, audit, workspaces] = await Promise.all([this.repository.credentials(profiles), this.repository.audit(), this.repository.listWorkspaces()]);
        const context = environmentContext(this.env);
        context.namespace = `${this.repository.ownerId}:${this.repository.workspaceId}`;
        const usage = withProviderRuntime(context, () => Object.fromEntries(profiles.map(profile => [profile.id, [profile.providerUsage ?? unknownUsage('PROVIDER_REPORTED'), measuredUsage(getUsageRecords(10000).filter(record => record.profileId === profile.id)), unknownUsage('LOCAL_AGENT_REPORTED')]])));
        return { definitions: providerDefinitions(local.agents), profiles, credentials, agents: local.agents, inventory: local.inventory, audit, usage, workspaces, workspaceId: this.repository.workspaceId, persistence: 'AVAILABLE', secretStore: { writable: this.store.status().writable, state: this.store.status().reason }, operator: this.operator, blocker: local.blocker, measuredAt: new Date().toISOString() };
    }
    private async definition(id: unknown): Promise<ProviderDefinition> {
        const definitions = providerDefinitions((await this.inventory()).agents);
        const definition = definitions.find(entry => entry.id === id);
        if (!definition)
            throw new ProviderInputError('Provider is not registered.', 404);
        return definition;
    }
    private async auth(value: unknown, definition: ProviderDefinition): Promise<AuthSource> {
        const input = object(value);
        if (!definition.authModes.includes(input.mode as AuthSource['mode']))
            throw new ProviderInputError('This provider does not support that authentication mode.');
        if (input.mode === 'ENV_REFERENCE') {
            if (!this.operator || typeof input.variable !== 'string' || !definition.environmentNames.includes(input.variable))
                throw new ProviderInputError('Only an authorized operator can bind a declared environment reference.', 403);
            return { mode: 'ENV_REFERENCE', variable: input.variable };
        }
        if (input.mode === 'CLI_PROFILE')
            return { mode: 'CLI_PROFILE', profileName: name(input.profileName) };
        const credentialId = input.credentialId == null ? null : identity(input.credentialId);
        if (credentialId) {
            const row = await this.repository.credentialRow(credentialId);
            if (!row || row.provider_id !== definition.id || row.revoked_at)
                throw new ProviderInputError('Credential binding is unavailable in this workspace.', 403);
        }
        if (input.mode === 'LOCAL_ENDPOINT' || input.mode === 'CUSTOM_ENDPOINT') {
            const error = endpointSyntax(input.endpoint, input.mode === 'LOCAL_ENDPOINT');
            if (error)
                throw new ProviderInputError(error);
            return { mode: input.mode, endpoint: String(input.endpoint), credentialId };
        }
        return { mode: input.mode as 'API_KEY' | 'VAULT_SECRET', credentialId };
    }
    private async profile(id: unknown): Promise<ProviderProfile> {
        const profile = await this.repository.profile(identity(id));
        if (!profile)
            throw new ProviderInputError('Profile ownership refused.', 403);
        return profile;
    }
    async command(input: Input): Promise<void> {
        const action = input.action;
        if (action === 'WORKSPACE_SELECT')
            return; // Repository ownership was verified before dispatch.
        if (action === 'WORKSPACE_CREATE') {
            await this.repository.command('WORKSPACE_CREATE', { id: randomUUID(), name: name(input.name) });
            return;
        }
        if (action === 'CREDENTIAL_CREATE') {
            const definition = await this.definition(input.providerId);
            if (definition.class === 'CODING_AGENT')
                throw new ProviderInputError('CLI profiles do not accept an API secret.');
            const label = name(input.name);
            if (typeof input.secret !== 'string' || label.includes(input.secret))
                throw new ProviderInputError('Keep secret values out of credential names.');
            await this.store.create(definition.id, label, input.secret);
            return;
        }
        if (['CREDENTIAL_REPLACE', 'CREDENTIAL_ROTATE', 'CREDENTIAL_REVOKE', 'CREDENTIAL_DELETE'].includes(String(action))) {
            const id = identity(input.id), revision = version(input.version), row = await this.repository.credentialRow(id);
            if (!row)
                throw new ProviderInputError('Credential ownership refused.', 403);
            if (action === 'CREDENTIAL_REVOKE')
                await this.store.revoke(id, revision);
            else if (action === 'CREDENTIAL_DELETE')
                await this.store.delete(id, revision);
            else {
                if (typeof input.secret !== 'string' || row.name.includes(input.secret))
                    throw new ProviderInputError('Keep secret values out of credential names.');
                await this.store.replace(id, revision, input.secret, action === 'CREDENTIAL_ROTATE');
            }
            return;
        }
        if (action === 'PROFILE_CREATE') {
            const definition = await this.definition(input.providerId), now = new Date().toISOString(), id = randomUUID();
            const profile: ProviderProfile = { id, ownerId: this.repository.ownerId, workspaceId: this.repository.workspaceId, providerId: definition.id, name: name(input.name), enabled: true, active: false, auth: await this.auth(input.auth, definition), permissions: defaultPermissions(), cli: definition.class === 'CODING_AGENT' ? { source: 'PATH', binaryReference: null, arguments: { model: null, profile: null, workingDirectoryReference: null }, role: 'PRIMARY', autoSwitch: false } : null, bindings: { mcp: [], plugins: [], skills: [] }, routing: { automatic: true, modelAllowlist: [], monthlySpendLimit: null }, connection: { ...EMPTY_CONNECTION }, models: [], discoveredAt: null, version: 1, createdAt: now, updatedAt: now };
            await this.repository.command('PROFILE_CREATE', { id, profile });
            return;
        }
        const profile = await this.profile(input.id), expected = version(input.version);
        if (profile.version !== expected)
            throw new ProviderStorageError('CONFLICT');
        if (action === 'PROFILE_SWITCH' || action === 'PROFILE_DELETE') {
            await this.repository.command(action, { id: profile.id, version: expected });
            return;
        }
        if (action === 'TEST_CONNECTION') {
            await this.testConnection(profile);
            return;
        }
        if (action === 'RUN_LIVE_GENERATION_TEST') {
            if (input.billingAcknowledged !== true)
                throw new ProviderInputError('Explicit acknowledgement of possible provider charges is required.', 403);
            await this.liveTest(profile, input.streamingAcknowledged === true);
            return;
        }
        if (action !== 'PROFILE_UPDATE')
            throw new ProviderInputError('Unknown provider command.');
        const patch = object(input.patch), next = { ...profile };
        const allowed = ['name', 'enabled', 'auth', 'routing', 'permissions', 'bindings', 'cli'];
        if (Object.keys(patch).some(key => !allowed.includes(key)))
            throw new ProviderInputError('Configuration contains unsupported fields.');
        if ('name' in patch)
            next.name = name(patch.name);
        if ('enabled' in patch)
            next.enabled = boolean(patch.enabled);
        const definition = await this.definition(profile.providerId);
        if ('auth' in patch) {
            next.auth = await this.auth(patch.auth, definition);
            next.connection = { ...EMPTY_CONNECTION };
            next.models = [];
            next.discoveredAt = null;
            delete next.providerUsage;
            delete next.providerLimits;
            delete next.lastLiveTest;
        }
        if ('routing' in patch) {
            const routing = object(patch.routing), list = routing.modelAllowlist;
            if (!Array.isArray(list) || list.length > 500 || list.some(id => typeof id !== 'string' || !profile.models.some(model => model.modelId === id)))
                throw new ProviderInputError('Allowlist entries must come from this profile’s discovered catalog.');
            const limit = routing.monthlySpendLimit;
            if (limit !== null && (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 0 || limit > 1e6))
                throw new ProviderInputError('Invalid monthly spending limit.');
            next.routing = { automatic: boolean(routing.automatic), modelAllowlist: [...new Set(list as string[])], monthlySpendLimit: limit as number | null };
        }
        if ('permissions' in patch) {
            if (definition.class !== 'CODING_AGENT')
                throw new ProviderInputError('Agent permissions apply to coding agents only.');
            const permissions = object(patch.permissions);
            let ceiling: Input = {};
            try {
                ceiling = object(JSON.parse(this.env.KNOUX_AGENT_PERMISSION_CEILING ?? '{}'));
            }
            catch {
                ceiling = {};
            }
            const policy = defaultPermissions();
            for (const key of AGENT_PERMISSIONS) {
                const value = permissions[key];
                if (!['DENY', 'ASK', 'ALLOW'].includes(String(value)))
                    throw new ProviderInputError('Invalid permission policy.');
                if (value !== 'DENY' && (!this.operator || ceiling[key] !== value))
                    throw new ProviderInputError('Permission exceeds the operator’s server-side ceiling.', 403);
                policy[key] = value as 'DENY' | 'ASK' | 'ALLOW';
            }
            next.permissions = policy;
        }
        if ('bindings' in patch) {
            if (definition.class !== 'CODING_AGENT')
                throw new ProviderInputError('Agent bindings apply to coding agents only.');
            const inventory = (await this.inventory()).inventory, bindings = object(patch.bindings);
            function bind(key: string, kind: string): Binding[] {
                const entries = bindings[key];
                if (!Array.isArray(entries) || entries.length > 100)
                    throw new ProviderInputError('Invalid inventory binding.');
                return entries.map(entry => {
                    const item = object(entry);
                    if (typeof item.id !== 'string' || !inventory.some(known => known.id === item.id && known.kind === kind))
                        throw new ProviderInputError('Binding is not installed in the trusted inventory.');
                    return { id: item.id, enabled: boolean(item.enabled) };
                });
            }
            next.bindings = { mcp: bind('mcp', 'MCP'), plugins: bind('plugins', 'PLUGIN'), skills: bind('skills', 'SKILL') };
        }
        if ('cli' in patch) {
            if (definition.class !== 'CODING_AGENT')
                throw new ProviderInputError('CLI settings apply to coding agents only.');
            const cli = object(patch.cli), args = object(cli.arguments), agent = (await this.inventory()).agents.find(entry => entry.id === definition.id);
            if (!agent || cli.source !== agent.source || cli.binaryReference !== agent.binary)
                throw new ProviderInputError('Choose a binary reference verified by the trusted bridge.');
            if (!['PRIMARY', 'REVIEW', 'FALLBACK'].includes(String(cli.role)))
                throw new ProviderInputError('Invalid agent role.');
            const argument = (value: unknown) => value === null ? null : name(value);
            if (args.workingDirectoryReference !== null && args.workingDirectoryReference !== this.repository.workspaceId)
                throw new ProviderInputError('Working-directory references must bind this authenticated workspace; arbitrary host paths are refused.', 403);
            next.cli = { source: cli.source as 'PATH' | 'BUNDLED' | 'CUSTOM', binaryReference: agent.binary, arguments: { model: argument(args.model), profile: argument(args.profile), workingDirectoryReference: argument(args.workingDirectoryReference) }, role: cli.role as 'PRIMARY' | 'REVIEW' | 'FALLBACK', autoSwitch: boolean(cli.autoSwitch) };
        }
        await this.repository.command('PROFILE_UPDATE', { id: profile.id, version: expected, profile: next });
    }
    private async testConnection(profile: ProviderProfile): Promise<void> {
        const context = await scopedRuntime(this.repository, [profile], this.operator, this.env, profile.id);
        // Connection checks may inspect a disabled profile, but never grant generation eligibility.
        context.disabled.delete(profile.providerId);
        const definition = await this.definition(profile.providerId);
        const now = new Date().toISOString();
        const next = { ...profile, connection: { ...EMPTY_CONNECTION, lastTestedAt: now } };
        if (definition.detectionOnly) {
            next.connection.blocker = 'EXECUTOR_NOT_CONNECTED — inventory detection does not verify agent authentication or execution.';
        }
        else
            await withProviderRuntime(context, async () => {
                const adapter = getAdapter(profile.providerId);
                if (!adapter || !adapter.isConfigured(context.env)) {
                    next.connection.blocker = 'CONFIG_REQUIRED — credential or local runtime is unavailable.';
                    return;
                }
                const probe = await adapter.probe(context.env);
                next.connection.configuration = 'CONFIGURED';
                next.connection.auth = probe.authenticated ? 'AUTHENTICATED' : 'FAILED';
                const denied = probe.error ? refusal(probe.error.category, probe.error.httpStatus) : null;
                next.connection.lastErrorCategory = denied?.category ?? null;
                next.connection.blocker = probe.authenticated ? null : denied?.message ?? 'Connection refused. Inspect the safe error category and configuration.';
                updateHealth(adapter.id, { auth: next.connection.auth, lastTestedAt: now, lastError: probe.error });
                if (probe.authenticated) {
                    const discovery = await adapter.discoverModels(context.env);
                    next.models = discovery.catalogModels ?? discovery.models;
                    next.discoveredAt = discovery.discoveredAt;
                    next.connection.discovery = discovery.error ? 'FAILED' : 'DISCOVERY_VERIFIED';
                    next.connection.lastSuccessAt = now;
                    next.connection.lastErrorCategory = discovery.error?.category ?? null;
                    next.connection.blocker = discovery.error ? 'Model discovery refused. No catalog was fabricated.' : null;
                    setDiscoveryCache(adapter.id, discovery.models, discovery.source, discovery.catalogModels);
                    updateHealth(adapter.id, { discovery: next.connection.discovery });
                }
                // Auth/discovery alone do not prove generation or streaming.
                const health = buildProviderHealth(adapter, context.env);
                next.connection.health = health.auth === 'AUTHENTICATED' ? 'UNTESTED' : definition.class === 'LOCAL' ? 'LOCAL_RUNTIME_UNAVAILABLE' : 'BLOCKED';
                if (probe.authenticated && adapter.id === 'openrouter') {
                    const variable = credentialVariable(definition), key = variable ? context.env[variable] : null;
                    if (key)
                        try {
                            const response = await fetch('https://openrouter.ai/api/v1/key', { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store' });
                            if (response.ok) {
                                const reported = openRouterUsage(await response.json(), now);
                                next.providerUsage = reported.usage;
                                next.providerLimits = reported.limits;
                            }
                        }
                        catch { /* Unavailable usage remains UNKNOWN; never expose raw responses. */ }
                }
            });
        await this.repository.command('CONNECTION_UPDATED', { id: profile.id, version: profile.version, profile: next });
    }
    private async liveTest(profile: ProviderProfile, streaming: boolean): Promise<void> {
        if (!profile.enabled)
            throw new ProviderInputError('Disabled profiles cannot execute live tests.', 409);
        const context = await scopedRuntime(this.repository, [profile], this.operator, this.env, profile.id);
        const model = profile.models.find(item => item.modalities.text && item.lifecycle !== 'deprecated' && item.catalog?.buildEligible !== false && providerModelAllowedForProfile(item.modelId));
        function providerModelAllowedForProfile(id: string) { return !profile.routing.modelAllowlist.length || profile.routing.modelAllowlist.includes(id); }
        if (!model)
            throw new ProviderInputError('Discover an eligible model before running a live test.', 409);
        await this.repository.command('LIVE_TEST_REQUESTED', { id: profile.id });
        const next = { ...profile, connection: { ...profile.connection } };
        await withProviderRuntime(context, async () => {
            const adapter = getAdapter(profile.providerId);
            if (!adapter || !providerModelAllowed(adapter.id, model.modelId))
                throw new ProviderInputError('Profile routing policy refused the live test.', 409);
            const response = await adapter.generate({ providerId: adapter.id, modelId: model.modelId, messages: [{ role: 'user', content: 'Reply with OK.' }], controls: { maxOutputTokens: 16 } }, context.env);
            recordUsage({ providerId: adapter.id, modelId: model.modelId, operation: 'generate', taskClass: null, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, cachedTokens: response.usage.cachedTokens, latencyMs: response.latencyMs, ttftMs: response.ttftMs, estimatedCost: response.estimatedCost, success: response.ok, errorCategory: response.error?.category ?? null, fallbackCount: 0 });
            const measuredAt = new Date().toISOString();
            next.connection.runtime = response.ok ? 'GENERATION_VERIFIED' : 'FAILED';
            next.connection.lastTestedAt = measuredAt;
            const denied = response.error ? refusal(response.error.category, response.error.httpStatus) : null;
            next.connection.lastErrorCategory = denied?.category ?? null;
            next.connection.blocker = response.ok ? null : denied?.message ?? 'Live generation refused. No output or raw provider error is exposed.';
            if (response.ok)
                next.connection.lastSuccessAt = measuredAt;
            next.lastLiveTest = { measuredAt, requestedModel: model.modelId, actualModel: response.modelUsed, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, latencyMs: response.latencyMs, ttftMs: response.ttftMs, cost: response.estimatedCost?.amount ?? null, costBasis: response.estimatedCost?.basis ?? 'UNKNOWN', streaming: 'UNTESTED' };
            if (streaming && response.ok) {
                let completed = false, error = false, output = false, inputTokens: number | null = null, outputTokens: number | null = null, ttftMs: number | null = null;
                const started = Date.now();
                for await (const chunk of adapter.stream({ providerId: adapter.id, modelId: model.modelId, messages: [{ role: 'user', content: 'Reply with OK.' }], controls: { maxOutputTokens: 16 } }, context.env)) {
                    output = output || !!chunk.delta;
                    error = error || !!chunk.error;
                    completed = completed || chunk.done;
                    if (chunk.usage) {
                        inputTokens = chunk.usage.inputTokens;
                        outputTokens = chunk.usage.outputTokens;
                    }
                    if (chunk.ttftMs !== null)
                        ttftMs = chunk.ttftMs;
                }
                const verified = completed && output && !error;
                next.connection.streaming = verified ? 'STREAMING_VERIFIED' : 'FAILED';
                next.lastLiveTest.streaming = verified ? 'VERIFIED' : 'FAILED';
                recordUsage({ providerId: adapter.id, modelId: model.modelId, operation: 'stream', taskClass: null, inputTokens, outputTokens, cachedTokens: null, latencyMs: Date.now() - started, ttftMs, estimatedCost: null, success: verified, errorCategory: error ? 'UNKNOWN' : null, fallbackCount: 0 });
            }
            next.connection.health = response.ok ? 'HEALTHY' : 'BLOCKED';
        });
        await this.repository.command('CONNECTION_UPDATED', { id: profile.id, version: profile.version, profile: next });
    }
}
