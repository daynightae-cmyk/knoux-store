import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProviderProfile, CredentialReference, AuditEvent } from './types';
import type { SecretEnvelope } from './secret-cipher';
export class ProviderStorageError extends Error {
    readonly code: 'CONFIG_REQUIRED' | 'CONFLICT' | 'DEPENDENCY' | 'BLOCKED';
    constructor(code: ProviderStorageError['code']) {
        super(code === 'CONFIG_REQUIRED' ? 'Provider persistence is not configured. Install the additive schema and server service credential.' : code === 'CONFLICT' ? 'Configuration changed. Refresh before retrying.' : code === 'DEPENDENCY' ? 'Credential is still referenced. Remove profile bindings before deleting it.' : 'Provider storage refused the request.');
        this.code = code;
    }
}
function storageError(error: {
    code?: string;
} | null): ProviderStorageError {
    return new ProviderStorageError(['42P01', '42883', 'PGRST202', 'PGRST205'].includes(error?.code ?? '') ? 'CONFIG_REQUIRED' : error?.code === '40001' ? 'CONFLICT' : error?.code === '23503' ? 'DEPENDENCY' : 'BLOCKED');
}
export type CredentialRow = {
    id: string;
    owner_id: string;
    workspace_id: string;
    provider_id: string;
    name: string;
    encrypted_value: SecretEnvelope | null;
    revision: number;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
    last_verified_at: string | null;
};
/** Every query binds both dimensions; the constructor is created only after session authorization. */
export class ProviderRepository {
    readonly ownerId: string;
    readonly workspaceId: string;
    private readonly client: SupabaseClient;
    constructor(client: SupabaseClient, ownerId: string, workspaceId: string) { this.client = client; this.ownerId = ownerId; this.workspaceId = workspaceId; }
    async command(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
        const result = await this.client.rpc('knoux_provider_command', { p_owner: this.ownerId, p_workspace: this.workspaceId, p_action: action, p_payload: payload });
        if (result.error)
            throw storageError(result.error);
        return result.data;
    }
    async ensureWorkspace(): Promise<void> { await this.command('ENSURE_WORKSPACE'); }
    async listWorkspaces(): Promise<{
        id: string;
        name: string;
    }[]> {
        const result = await this.client.from('knoux_provider_workspaces').select('id,name').eq('owner_id', this.ownerId).order('created_at').limit(50);
        if (result.error)
            throw storageError(result.error);
        return result.data ?? [];
    }
    async profiles(): Promise<ProviderProfile[]> {
        const result = await this.client.from('knoux_provider_profiles').select('body').eq('owner_id', this.ownerId).eq('workspace_id', this.workspaceId).order('created_at').limit(100);
        if (result.error)
            throw storageError(result.error);
        return (result.data ?? []).map(row => row.body as ProviderProfile);
    }
    async profile(id: string): Promise<ProviderProfile | null> { return (await this.profiles()).find(profile => profile.id === id) ?? null; }
    async credentialRow(id: string): Promise<CredentialRow | null> {
        const result = await this.client.from('knoux_provider_credentials').select('id,owner_id,workspace_id,provider_id,name,encrypted_value,revision,revoked_at,created_at,updated_at,last_verified_at').eq('owner_id', this.ownerId).eq('workspace_id', this.workspaceId).eq('id', id).maybeSingle();
        if (result.error)
            throw storageError(result.error);
        return result.data as CredentialRow | null;
    }
    async credentials(profiles: ProviderProfile[]): Promise<CredentialReference[]> {
        const result = await this.client.from('knoux_provider_credentials').select('id,provider_id,name,configured,revision,revoked_at,created_at,updated_at,last_verified_at').eq('owner_id', this.ownerId).eq('workspace_id', this.workspaceId).order('created_at').limit(100);
        if (result.error)
            throw storageError(result.error);
        return (result.data ?? []).map(row => ({ id: row.id, name: row.name, providerId: row.provider_id, source: 'VAULT_SECRET', configured: row.configured === true, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, revokedAt: row.revoked_at, lastVerifiedAt: row.last_verified_at, referencedBy: profiles.filter(profile => 'credentialId' in profile.auth && profile.auth.credentialId === row.id).map(profile => profile.id) }));
    }
    async audit(): Promise<AuditEvent[]> {
        const result = await this.client.from('knoux_provider_audit').select('id,event,profile_id,credential_id,created_at').eq('owner_id', this.ownerId).eq('workspace_id', this.workspaceId).order('created_at', { ascending: false }).limit(100);
        if (result.error)
            throw storageError(result.error);
        return (result.data ?? []).map(row => ({ id: row.id, event: row.event, profileId: row.profile_id, credentialId: row.credential_id, createdAt: row.created_at }));
    }
}
