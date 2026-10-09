import 'server-only';
import { createAdminClient } from '../../supabase/admin';
import { ProviderRepository } from './repository';
import { providerRuntimeContext } from './runtime-context';
import { validIdentifier } from './policy';
import { getHealth, getDiscoveryCache } from '../registry';
import { refusal } from './refusal';
/** Persist facts from the canonical runtime, refusing stale profile/credential revisions. */
export async function persistRuntimeEvidence(repositoryFactory = (owner: string, workspace: string) => new ProviderRepository(createAdminClient(), owner, workspace)): Promise<'AVAILABLE' | 'UNAVAILABLE' | 'NOT_SELECTED'> {
    const context = providerRuntimeContext();
    if (!context?.profileIds.size)
        return 'NOT_SELECTED';
    const [owner, workspace] = context.namespace.split(':');
    if (!validIdentifier(owner) || !validIdentifier(workspace))
        return 'NOT_SELECTED';
    try {
        const repository = repositoryFactory(owner, workspace);
        for (const [providerId, profileId] of context.profileIds) {
            const profile = await repository.profile(profileId);
            if (!profile || !context.profileRevisions.get(providerId)?.startsWith(`${profile.id}:${profile.version}:`))
                continue;
            const health = getHealth(providerId), connection = { ...profile.connection };
            // Unconfigured defaults are not new evidence and cannot overwrite verified facts.
            const measured = (state: string) => !['UNCONFIGURED', 'CONFIGURED_UNTESTED'].includes(state);
            if (measured(health.auth))
                connection.auth = health.auth;
            if (measured(health.discovery))
                connection.discovery = health.discovery;
            if (measured(health.generation))
                connection.runtime = health.generation;
            if (measured(health.streaming))
                connection.streaming = health.streaming;
            if (JSON.stringify(connection) === JSON.stringify(profile.connection))
                continue;
            connection.lastTestedAt = new Date().toISOString();
            const denied = health.lastError ? refusal(health.lastError.category, health.lastError.httpStatus) : null;
            connection.lastErrorCategory = denied?.category ?? null;
            if (['FAILED', 'BLOCKED', 'RATE_LIMITED', 'DEGRADED'].includes(health.generation)) {
                connection.health = 'BLOCKED';
                connection.blocker = denied?.message ?? 'Canonical runtime refused this operation. Resolve the measured error category before retrying.';
            }
            if (health.generation === 'GENERATION_VERIFIED' || health.streaming === 'STREAMING_VERIFIED') {
                connection.health = 'HEALTHY';
                connection.lastSuccessAt = new Date().toISOString();
                connection.blocker = null;
            }
            const discovery = getDiscoveryCache(providerId);
            const next = { ...profile, connection, ...(discovery ? { models: discovery.catalogModels ?? discovery.models, discoveredAt: discovery.discoveredAt } : {}) };
            await repository.command('CONNECTION_UPDATED', { id: profile.id, version: profile.version, profile: next });
        }
        return 'AVAILABLE';
    }
    catch {
        return 'UNAVAILABLE';
    }
}
