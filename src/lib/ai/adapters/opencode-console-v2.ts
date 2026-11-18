import 'server-only';
import { OpenAICompatibleAdapter } from './base';
import { cancelledGenerationResponse, generationSignal } from '../contract';
import { abortedError, timeoutError } from '../errors';
import type { DiscoveryResult, GenerationRequest, GenerationResponse, NormalizedError, ProbeResult, StreamChunk } from '../contract';

export const OPENCODE_CONSOLE_ID = 'opencode-console-v2';
export const OPENCODE_CONSOLE_ENV = 'OPENCODE_CONSOLE_TOKEN';
const CONFIG_URL = 'https://opencode.ai/console/api/v2/config';
const CHAT_BASE = 'https://opencode.ai/inference/openai/v1';
const CONSOLE_MANAGE_URL = 'https://opencode.ai/console/org_01M5FZAGB0GT13QWAC4D0VESJ2/models';
type ConsoleConfig = {
  providers?: {
    opencode?: {
      package?: string;
      settings?: { baseURL?: string };
      headers?: Record<string, unknown>;
      models?: Record<string, { name?: unknown; disabled?: boolean }>;
    };
  };
};
function refused(message: string, category: NormalizedError['category'] = 'UNSUPPORTED_CAPABILITY', status: number | null = null): NormalizedError {
  return { category, message, safeMessage: message, httpStatus: status, providerErrorId: null, retryable: false };
}

/** Workspace-bound service accounts only. The private config/MCP inventory and
 * arbitrary supplied endpoints are never published or executed.
 * https://dev.opencode.ai/v2/docs/console/api
 */
export class OpenCodeConsoleV2Adapter extends OpenAICompatibleAdapter {
  constructor(orgId?: string) {
    super({ id: OPENCODE_CONSOLE_ID, displayName: 'OpenCode Console V2', transport: 'OpenCode Console V2', baseUrl: CHAT_BASE,
      authHeader: 'bearer', requiredEnv: [OPENCODE_CONSOLE_ENV], extraHeaders: orgId ? { 'x-opencode-org-id': orgId } : undefined,
      supportsVision: false, supportsTools: false, supportsStructuredOutput: false, supportsStreaming: true,
      controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: true, toolChoice: false } });
  }
  private async workspace(env: Record<string, string | undefined>, signal?: AbortSignal): Promise<{ config?: ConsoleConfig; error: NormalizedError | null }> {
    if (signal?.aborted) return { error: abortedError() };
    const token = env[OPENCODE_CONSOLE_ENV]?.trim();
    if (!token?.startsWith('oc_sk_')) return { error: refused('A workspace-bound Console V2 service-account token is required. Legacy Zen keys are not accepted.', 'AUTHENTICATION') };
    const transportSignal = generationSignal(signal, 10000);
    try {
      transportSignal.throwIfAborted();
      const response = await fetch(CONFIG_URL, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: transportSignal });
      transportSignal.throwIfAborted();
      if (!response.ok) return { error: refused(`Console V2 configuration request refused (HTTP ${response.status}).`, response.status === 401 || response.status === 403 ? 'AUTHENTICATION' : 'INVALID_REQUEST', response.status) };
      const config: ConsoleConfig = await response.json();
      transportSignal.throwIfAborted();
      if (!config?.providers?.opencode?.models || typeof config.providers.opencode.models !== 'object' || Array.isArray(config.providers.opencode.models)) return { error: refused('Console configuration has no OpenCode model map.', 'INVALID_REQUEST') };
      return { config, error: null };
    } catch (cause) {
      if (signal?.aborted || (cause instanceof Error && cause.name === 'AbortError')) return { error: abortedError() };
      if (cause instanceof Error && cause.name === 'TimeoutError') return { error: timeoutError() };
      return { error: refused('Console V2 configuration is unreachable.', 'NETWORK') };
    }
  }
  override async probe(env: Record<string, string | undefined>): Promise<ProbeResult> {
    const started = Date.now(), result = await this.workspace(env);
    return { providerId: this.id, authenticated: !result.error, detail: result.error?.safeMessage ?? 'Workspace-bound Console configuration authenticated. Inference remains untested.', error: result.error, latencyMs: Date.now() - started };
  }
  override async discoverModels(env: Record<string, string | undefined>): Promise<DiscoveryResult> {
    const result = await this.workspace(env);
    const provider = result.config?.providers?.opencode;
    const rawModels = provider?.models ?? {};
    const models = Object.entries(rawModels)
      .filter(([id]) => /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,159}$/.test(id))
      .map(([id, metadata]) => {
        const model = this.normalizeModel(id);
        model.displayName = typeof metadata?.name === 'string' ? metadata.name.slice(0, 160) : id;
        model.capabilities = { streaming: 'UNKNOWN', tools: 'UNKNOWN', structuredOutput: 'UNKNOWN', reasoning: 'UNKNOWN', vision: 'UNKNOWN' };
        const disabled = typeof metadata?.disabled === 'boolean' ? metadata.disabled : false;
        model.catalog = { categories: [], gateway: false, authorNamespace: 'opencode', supportedParameters: null, free: null, buildEligible: !disabled, metadataSource: 'IDENTITY_HINT' };
        model.lifecycle = disabled ? 'deprecated' : 'unknown';
        model.source = 'LIVE';
        return model;
      });
    return {
      providerId: this.id,
      models,
      source: result.error ? 'UNKNOWN' : 'LIVE',
      discoveredAt: new Date().toISOString(),
      error: result.error,
      fromCache: false,
      catalogModels: result.error ? undefined : models,
    };
  }
  private async chatTransport(request: GenerationRequest, env: Record<string, string | undefined>, signal?: AbortSignal) {
    if (signal?.aborted) return { error: abortedError() };
    if (request.tools?.length || request.responseSchema) return { error: refused('Tools and structured output have not been verified for this Console transport.') };
    const result = await this.workspace(env, signal);
    if (signal?.aborted) return { error: abortedError() };
    if (result.error) return { error: result.error };
    const provider = result.config?.providers?.opencode;
    if (!provider || !Object.hasOwn(provider?.models ?? {}, request.modelId)) return { error: refused('Model is not available in this Console workspace.', 'MODEL_NOT_FOUND') };
    const metadata = provider.models?.[request.modelId];
    if (typeof metadata?.disabled === 'boolean' && metadata.disabled) {
      return { error: refused(`Model access is disabled for ${request.modelId}. Enable it at the OpenCode Console: ${CONSOLE_MANAGE_URL}`, 'AUTHENTICATION', 403) };
    }
    const org = provider.headers?.['x-opencode-org-id'];
    if (typeof org !== 'string' || !/^org_[a-zA-Z0-9_-]{1,100}$/.test(org)) return { error: refused('Console workspace header is missing or invalid.', 'INVALID_REQUEST') };
    // Console V2 workspaces advertise `{ name, headers, models }`. Older layouts
    // also carried `package` and `settings.baseURL`; either is accepted when the
    // org header is present — the inference endpoint is the fixed Console V2 URL.
    return { adapter: new OpenCodeConsoleV2Adapter(org), error: null };
  }
  override async generate(request: GenerationRequest, env: Record<string, string | undefined>, signal?: AbortSignal): Promise<GenerationResponse> {
    const started = Date.now();
    if (signal?.aborted) return cancelledGenerationResponse();
    const result = await this.chatTransport(request, env, signal);
    if (signal?.aborted) return cancelledGenerationResponse(Date.now() - started);
    if (result.error) return this.errorResponse(result.error, Date.now() - started, request.modelId);
    const response = await result.adapter!.generateChat(request, env, signal);
    return signal?.aborted ? cancelledGenerationResponse(Date.now() - started, response) : response;
  }
  private generateChat(request: GenerationRequest, env: Record<string, string | undefined>, signal?: AbortSignal) { return super.generate(request, env, signal); }
  override async *stream(request: GenerationRequest, env: Record<string, string | undefined>, signal?: AbortSignal): AsyncGenerator<StreamChunk, void, void> {
    if (signal?.aborted) { yield this.streamError(abortedError(), 0); return; }
    const result = await this.chatTransport(request, env, signal);
    if (signal?.aborted) { yield this.streamError(abortedError(), 0); return; }
    if (result.error) { yield this.streamError(result.error, 0); return; }
    yield* result.adapter!.streamChat(request, env, signal);
  }
  private streamChat(request: GenerationRequest, env: Record<string, string | undefined>, signal?: AbortSignal) { return super.stream(request, env, signal); }
}
