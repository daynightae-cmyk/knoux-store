import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { CapabilityState, NormalizedModel } from '../types';
export type ProviderRuntimeContext = {
    authorizedRequest?: Request;
    namespace: string;
    env: Record<string, string | undefined>;
    disabled: Set<string>;
    manualOnly: Set<string>;
    modelAllowlists: Map<string, string[]>;
    seedModels: Map<string, {
        models: NormalizedModel[];
        discoveredAt: string;
    }>;
    seedHealth: Map<string, {
        auth: CapabilityState;
        discovery: CapabilityState;
        generation: CapabilityState;
        streaming: CapabilityState;
        lastTestedAt: string | null;
    }>;
    profileIds: Map<string, string>;
    profileRevisions: Map<string, string>;
};
const storage = new AsyncLocalStorage<ProviderRuntimeContext>();
export function providerRuntimeContext(): ProviderRuntimeContext | undefined { return storage.getStore(); }
export function runtimeNamespace(): string { return storage.getStore()?.namespace ?? 'legacy-environment'; }
export function providerRuntimeKey(id: string): string { return `${runtimeNamespace()}:${id}:${storage.getStore()?.profileRevisions.get(id) ?? 'environment'}`; }
export function providerEnabled(id: string): boolean { return !storage.getStore()?.disabled.has(id); }
export function providerAutomatic(id: string): boolean { return providerEnabled(id) && !storage.getStore()?.manualOnly.has(id); }
export function providerModelAllowed(id: string, modelId: string): boolean {
    const context = storage.getStore(), list = context?.modelAllowlists.get(id);
    if (context?.profileIds.has(id) && !context.seedModels.get(id)?.models.some(model => model.modelId === modelId && model.modalities.text && model.lifecycle !== 'deprecated' && model.catalog?.buildEligible !== false))
        return false;
    return !list?.length || list.includes(modelId);
}
export function withProviderRuntime<T>(context: ProviderRuntimeContext, run: () => T): T { return storage.run(context, run); }
export function providerEnvironment(): Record<string, string | undefined> { return storage.getStore()?.env ?? process.env; }
