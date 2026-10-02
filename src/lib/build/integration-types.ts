/** Browser-safe integration facts. Never put a credential in these contracts. */
export type IntegrationFact = { name: string; state: 'configured' | 'unconfigured' | 'blocked' | 'unmeasured' | 'available'; detail: string };
export type PlatformStatus = { id: string; label: string; facts: IntegrationFact[]; requirements: string[] };
export type DeploymentFacts = { source: 'vercel-environment' | 'unavailable'; environment: string | null; url: string | null; sha: string | null; branch: string | null; deploymentId: string | null };
export type SecretStoreStatus = { mode: 'environment-only' | 'external-vault' | 'unconfigured'; writable: boolean; reason: string };
export type DeveloperTool = { id: string; label: string; category: 'agent' | 'runtime'; available: boolean; version: string | null; measuredAt: string };
export type IntegrationSnapshot = { platforms: PlatformStatus[]; deployment: DeploymentFacts; secrets: SecretStoreStatus; tools: DeveloperTool[]; toolsAvailable: boolean; providerProbeAllowed: boolean; toolsBlocker: string | null; measuredAt: string };
export type GitHubRepository = { fullName: string; url: string; description: string | null; private: boolean; defaultBranch: string; language: string | null; updatedAt: string; latestCommit: string | null; owner: string };
