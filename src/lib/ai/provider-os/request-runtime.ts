import 'server-only';
import type { NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '../../build/api-guard';
import { isBuildOperator } from '../../build/operator';
import { resolveDeploymentEnvironment } from '../../build/deployment';
import { createAdminClient } from '../../supabase/admin';
import { ProviderRepository, ProviderStorageError } from './repository';
import { ScopedProviderSecretStore } from './secret-store';
import { getRegisteredAdapters } from '../registry';
import { credentialVariable, endpointVariable, providerDefinitions } from './definitions';
import { withProviderRuntime, type ProviderRuntimeContext } from './runtime-context';
import type { ProviderProfile } from './types';
import { validIdentifier } from './policy';
import { checkRequestOrigin, publicRequestOrigin } from '../../contact/intake-guard';
import { persistRuntimeEvidence } from './runtime-evidence';
export function environmentContext(env: Record<string, string | undefined> = process.env): ProviderRuntimeContext {
    return { namespace: 'legacy-environment', env: { ...env }, disabled: new Set(), manualOnly: new Set(), modelAllowlists: new Map(), seedModels: new Map(), seedHealth: new Map(), profileIds: new Map(), profileRevisions: new Map() };
}
export async function scopedRuntime(repository: ProviderRepository, profiles: ProviderProfile[], operator: boolean, env: Record<string, string | undefined> = process.env, selectedProfileId?: string): Promise<ProviderRuntimeContext> {
    const context = environmentContext(env);
    context.namespace = `${repository.ownerId}:${repository.workspaceId}`;
    const store = new ScopedProviderSecretStore(repository, env);
    const definitions = providerDefinitions();
    for (const adapter of getRegisteredAdapters()) {
        const definition = definitions.find(item => item.id === adapter.id)!;
        const owned = profiles.filter(profile => profile.providerId === adapter.id);
        const profile = owned.find(profile => profile.id === selectedProfileId) ?? owned.find(profile => profile.active);
        if (!profile) {
            if (!operator || owned.length) {
                context.disabled.add(adapter.id);
                for (const name of adapter.requiredEnv)
                    delete context.env[name];
            }
            continue;
        }
        context.profileIds.set(adapter.id, profile.id);
        for (const name of adapter.requiredEnv)
            delete context.env[name];
        const endpointName = endpointVariable(adapter.id);
        if (endpointName)
            delete context.env[endpointName];
        let configured = true;
        let revision = 'none';
        if (profile.auth.mode === 'ENV_REFERENCE') {
            if (!operator || !definition.environmentNames.includes(profile.auth.variable))
                configured = false;
            else
                context.env[profile.auth.variable] = env[profile.auth.variable];
            configured = configured && !!context.env[profile.auth.variable]?.trim();
        }
        else if (profile.auth.mode === 'CLI_PROFILE') {
            configured = false;
        }
        else {
            if ('endpoint' in profile.auth && endpointName)
                context.env[endpointName] = profile.auth.endpoint;
            const id = profile.auth.credentialId;
            if (id) {
                const row = await repository.credentialRow(id);
                if (!row || row.provider_id !== adapter.id || row.revoked_at)
                    configured = false;
                else {
                    revision = String(row.revision);
                    const variable = credentialVariable(definition) ?? (adapter.id === 'ollama' ? 'OLLAMA_API_KEY' : adapter.id === 'lm-studio' ? 'LM_API_TOKEN' : null);
                    const value = await store.read(id);
                    if (!variable || !value)
                        configured = false;
                    else
                        context.env[variable] = value;
                }
            }
            else if (profile.auth.mode === 'API_KEY' || profile.auth.mode === 'VAULT_SECRET')
                configured = false;
        }
        if (definition.class === 'LOCAL' && resolveDeploymentEnvironment(env) !== 'local')
            configured = false;
        if (!profile.enabled || !configured || profile.routing.monthlySpendLimit !== null || profile.connection.auth !== 'AUTHENTICATED' || profile.connection.discovery !== 'DISCOVERY_VERIFIED')
            context.disabled.add(adapter.id);
        if (!profile.routing.automatic || !profile.active)
            context.manualOnly.add(adapter.id);
        context.modelAllowlists.set(adapter.id, profile.routing.modelAllowlist);
        context.profileRevisions.set(adapter.id, `${profile.id}:${profile.version}:${revision}`);
        if (profile.discoveredAt && profile.models.length)
            context.seedModels.set(adapter.id, { models: profile.models, discoveredAt: profile.discoveredAt });
        const measured = (state: ProviderProfile['connection']['auth']) => state === 'UNTESTED' ? 'CONFIGURED_UNTESTED' as const : state;
        context.seedHealth.set(adapter.id, { auth: measured(profile.connection.auth), discovery: measured(profile.connection.discovery), generation: measured(profile.connection.runtime), streaming: measured(profile.connection.streaming), lastTestedAt: profile.connection.lastTestedAt });
    }
    return context;
}
/** One authorized request boundary around the existing canonical handlers; it never changes process.env. */
export async function providerRequest(request: NextRequest, scope: string, handler: (request: NextRequest) => Promise<Response>): Promise<Response> {
    if (request.method !== 'GET' && !checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok)
        return Response.json({ message: 'Cross-site provider request refused.' }, { status: 403 });
    const ownerId = await resolveBuildOwnerId();
    const denied = await guardBuildApi(request, { scope, session: async () => ownerId ? { id: ownerId } : null });
    if (denied)
        return denied;
    let context = environmentContext();
    if (ownerId) {
        const workspace = request.headers.get('x-knoux-workspace-id') ?? request.cookies.get('knoux-provider-workspace')?.value ?? ownerId;
        const profileId = request.headers.get('x-knoux-provider-profile-id') ?? undefined;
        if (!validIdentifier(workspace) || (profileId && !validIdentifier(profileId)))
            return Response.json({ message: 'Invalid workspace or profile identity.' }, { status: 400 });
        const operator = isBuildOperator(ownerId);
        try {
            const repository = new ProviderRepository(createAdminClient(), ownerId, workspace);
            await repository.ensureWorkspace();
            const profiles = await repository.profiles();
            if (profileId && !profiles.some(profile => profile.id === profileId))
                return Response.json({ message: 'Profile ownership refused.' }, { status: 403 });
            context = await scopedRuntime(repository, profiles, operator, process.env, profileId);
        }
        catch (cause) {
            // Only established operators retain the original environment contract when no Provider OS schema exists.
            const absent = cause instanceof ProviderStorageError ? cause.code === 'CONFIG_REQUIRED' : !process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!operator || !absent || profileId || workspace !== ownerId)
                return Response.json({ message: 'Scoped provider persistence is unavailable. No other profile or credential was substituted.' }, { status: 409, headers: { 'cache-control': 'no-store' } });
            context = environmentContext();
            context.namespace = `${ownerId}:legacy-environment`;
        }
    }
    context.authorizedRequest = request;
    return withProviderRuntime(context, async () => {
        const response = await handler(request);
        if (response.body && response.headers.get('content-type')?.includes('text/event-stream')) {
            const reader = response.body.getReader();
            const stream = new ReadableStream<Uint8Array>({
                async pull(controller) {
                    const chunk = await reader.read();
                    if (chunk.done) {
                        await withProviderRuntime(context, persistRuntimeEvidence);
                        controller.close();
                    }
                    else
                        controller.enqueue(chunk.value);
                },
                async cancel(reason) { await reader.cancel(reason); }
            });
            return new Response(stream, { status: response.status, headers: response.headers });
        }
        const persistence = await persistRuntimeEvidence();
        response.headers.set('x-knoux-provider-evidence-persistence', persistence);
        return response;
    });
}
