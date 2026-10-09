import type { NormalizedModel, ProviderHealth, SupportState } from '../types';
export type ProviderClass = 'INTELLIGENCE' | 'CODING_AGENT' | 'LOCAL' | 'CUSTOM';
export type AuthSource = {
    mode: 'API_KEY' | 'VAULT_SECRET';
    credentialId: string | null;
} | {
    mode: 'ENV_REFERENCE';
    variable: string;
} | {
    mode: 'CLI_PROFILE';
    profileName: string;
} | {
    mode: 'LOCAL_ENDPOINT' | 'CUSTOM_ENDPOINT';
    endpoint: string;
    credentialId: string | null;
};
export type ProviderDefinition = {
    id: string;
    name: string;
    class: ProviderClass;
    transport: string;
    authModes: AuthSource['mode'][];
    environmentNames: string[];
    tabs: string[];
    gateway: boolean;
    detectionOnly: boolean;
};
export const AGENT_PERMISSIONS = ['READ_PROJECT', 'WRITE_PROJECT', 'RUN_TESTS', 'TERMINAL', 'BROWSER', 'GIT_READ', 'GIT_WRITE', 'COMMIT', 'PUSH', 'NETWORK', 'MCP', 'PLUGINS', 'SKILLS', 'WORKTREES', 'SUBAGENTS'] as const;
export type AgentPermission = typeof AGENT_PERMISSIONS[number];
export type PermissionPolicy = Record<AgentPermission, 'DENY' | 'ASK' | 'ALLOW'>;
export type CapabilityGrant = {
    id: AgentPermission;
    supported: SupportState;
    allowed: PermissionPolicy[AgentPermission];
    currentlyAvailable: boolean;
    reason: string;
};
export type AgentConfiguration = {
    source: 'PATH' | 'BUNDLED' | 'CUSTOM';
    binaryReference: string | null;
    arguments: {
        model: string | null;
        profile: string | null;
        workingDirectoryReference: string | null;
    };
    role: 'PRIMARY' | 'REVIEW' | 'FALLBACK';
    autoSwitch: boolean;
};
export type Binding = {
    id: string;
    enabled: boolean;
};
export type InventoryBinding = {
    id: string;
    name: string;
    kind: 'MCP' | 'PLUGIN' | 'SKILL';
    source: string;
    state: 'AVAILABLE' | 'DISABLED' | 'AUTH_REQUIRED' | 'BLOCKED' | 'UNAVAILABLE' | 'UNTESTED';
    measuredAt: string;
    environmentNames: string[];
};
export type AgentRuntime = {
    id: string;
    name: string;
    binary: string | null;
    source: 'PATH' | 'BUNDLED' | 'CUSTOM' | null;
    version: string | null;
    detected: boolean;
    authenticated: 'UNTESTED' | 'AUTHENTICATED';
    executable: boolean;
    state: 'DETECTED' | 'CLI_NOT_FOUND' | 'EXECUTOR_NOT_CONNECTED';
    measuredAt: string;
    capabilities: CapabilityGrant[];
};
export type ProviderConnection = {
    configuration: 'CONFIGURED' | 'CONFIG_REQUIRED';
    auth: ProviderHealth['auth'] | 'UNTESTED';
    discovery: ProviderHealth['discovery'] | 'UNTESTED';
    runtime: ProviderHealth['generation'] | 'UNTESTED';
    streaming: ProviderHealth['streaming'] | 'UNTESTED';
    health: 'HEALTHY' | 'UNTESTED' | 'BLOCKED' | 'LOCAL_RUNTIME_UNAVAILABLE';
    lastTestedAt: string | null;
    lastSuccessAt: string | null;
    lastErrorCategory: string | null;
    blocker: string | null;
};
export type ProviderProfile = {
    id: string;
    ownerId: string;
    workspaceId: string;
    providerId: string;
    name: string;
    enabled: boolean;
    active: boolean;
    auth: AuthSource;
    permissions: PermissionPolicy;
    cli: AgentConfiguration | null;
    bindings: {
        mcp: Binding[];
        plugins: Binding[];
        skills: Binding[];
    };
    routing: {
        automatic: boolean;
        modelAllowlist: string[];
        monthlySpendLimit: number | null;
    };
    connection: ProviderConnection;
    models: NormalizedModel[];
    discoveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lastLiveTest?: {
        measuredAt: string;
        requestedModel: string;
        actualModel: string | null;
        inputTokens: number | null;
        outputTokens: number | null;
        latencyMs: number;
        ttftMs: number | null;
        cost: number | null;
        costBasis: 'MEASURED' | 'ESTIMATED' | 'UNKNOWN';
        streaming: 'VERIFIED' | 'UNTESTED' | 'FAILED';
    };
    providerUsage?: UsageSnapshot;
    providerLimits?: LimitSnapshot[];
};
/** Safe metadata only. No suffix, ciphertext or credential value is part of a projection. */
export type CredentialReference = {
    id: string;
    name: string;
    providerId: string;
    source: 'VAULT_SECRET';
    configured: boolean;
    revision: number;
    createdAt: string;
    updatedAt: string;
    lastVerifiedAt: string | null;
    revokedAt: string | null;
    referencedBy: string[];
};
export type UsageSnapshot = {
    source: 'PROVIDER_REPORTED' | 'KNOuX_MEASURED' | 'LOCAL_AGENT_REPORTED';
    window: string | null;
    requests: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    cost: number | null;
    costBasis: 'MEASURED' | 'ESTIMATED' | 'UNKNOWN';
    currency: string;
    measuredAt: string | null;
    errors: number | null;
    fallbacks: number | null;
    latencyMs: number | null;
    ttftMs: number | null;
};
export type LimitSnapshot = {
    source: UsageSnapshot['source'];
    limitType: string;
    percentRemaining: number | null;
    remaining: number | null;
    total: number | null;
    resetAt: string | null;
    window: string | null;
    measuredAt: string | null;
};
export type AuditEvent = {
    id: string;
    event: string;
    profileId: string | null;
    credentialId: string | null;
    createdAt: string;
};
export type ProviderWorkspaceSnapshot = {
    definitions: ProviderDefinition[];
    profiles: ProviderProfile[];
    credentials: CredentialReference[];
    agents: AgentRuntime[];
    inventory: InventoryBinding[];
    audit: AuditEvent[];
    workspaceId: string | null;
    persistence: 'AVAILABLE' | 'CONFIG_REQUIRED' | 'AUTH_REQUIRED' | 'BLOCKED';
    workspaces?: {
        id: string;
        name: string;
    }[];
    secretStore: {
        writable: boolean;
        state: string;
    };
    operator: boolean;
    blocker: string | null;
    measuredAt: string;
    usage?: Record<string, UsageSnapshot[]>;
};
