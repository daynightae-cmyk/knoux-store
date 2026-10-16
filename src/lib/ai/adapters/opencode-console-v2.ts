import 'server-only';
import { OpenAICompatibleAdapter } from './base';
import type { DiscoveryResult, GenerationRequest, GenerationResponse, NormalizedError, ProbeResult, StreamChunk } from '../contract';

export const OPENCODE_CONSOLE_ID = 'opencode-console-v2';
export const OPENCODE_CONSOLE_ENV = 'OPENCODE_CONSOLE_TOKEN';
const CONFIG_URL = 'https://opencode.ai/console/api/v2/config';
const CHAT_BASE = 'https://opencode.ai/inference/openai/v1';
type ConsoleConfig = { providers?: { opencode?: { package?: string; settings?: { baseURL?: string }; headers?: Record<string, unknown>; models?: Record<string, { name?: unknown }> } } };
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
  private async workspace(env: Record<string, string | undefined>): Promise<{ config?: ConsoleConfig; error: NormalizedError | null }> {
    const token = env[OPENCODE_CONSOLE_ENV]?.trim();
    if (!token?.startsWith('oc_sk_')) return { error: refused('A workspace-bound Console V2 service-account token is required. Go and legacy Zen keys are not accepted.', 'AUTHENTICATION') };
    try {
      const response = await fetch(CONFIG_URL, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) return { error: refused(`Console V2 configuration request refused (HTTP ${response.status}).`, response.status === 401 || response.status === 403 ? 'AUTHENTICATION' : 'INVALID_REQUEST', response.status) };
      const config: ConsoleConfig = await response.json();
      if (!config?.providers?.opencode?.models || typeof config.providers.opencode.models !== 'object' || Array.isArray(config.providers.opencode.models)) return { error: refused('Console configuration has no OpenCode model map.', 'INVALID_REQUEST') };
      return { config, error: null };
    } catch { return { error: refused('Console V2 configuration is unreachable.', 'NETWORK') }; }
  }
  override async probe(env: Record<string, string | undefined>): Promise<ProbeResult> {
    const started = Date.now(), result = await this.workspace(env);
    return { providerId: this.id, authenticated: !result.error, detail: result.error?.safeMessage ?? 'Workspace-bound Console configuration authenticated. Inference remains untested.', error: result.error, latencyMs: Date.now() - started };
  }
  override async discoverModels(env: Record<string, string | undefined>): Promise<DiscoveryResult> {
    const result = await this.workspace(env);
    const models = Object.entries(result.config?.providers?.opencode?.models ?? {}).filter(([id]) => /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,159}$/.test(id)).map(([id, metadata]) => {
      const model = this.normalizeModel(id);
      model.displayName = typeof metadata?.name === 'string' ? metadata.name.slice(0, 160) : id;
      model.capabilities = { streaming: 'UNKNOWN', tools: 'UNKNOWN', structuredOutput: 'UNKNOWN', reasoning: 'UNKNOWN', vision: 'UNKNOWN' };
      return model;
    });
    return { providerId: this.id, models, source: result.error ? 'UNKNOWN' : 'LIVE', discoveredAt: new Date().toISOString(), error: result.error, fromCache: false };
  }
  private async chatTransport(request: GenerationRequest, env: Record<string, string | undefined>) {
    if (request.tools?.length || request.responseSchema) return { error: refused('Tools and structured output have not been verified for this Console transport.') };
    const result = await this.workspace(env);
    if (result.error) return { error: result.error };
    const provider = result.config?.providers?.opencode;
    if (!Object.hasOwn(provider?.models ?? {}, request.modelId)) return { error: refused('Model is not available in this Console workspace.', 'MODEL_NOT_FOUND') };
    // Family is never guessed from a model name. Other protocols fail closed.
    if (provider?.package !== 'aisdk:@ai-sdk/openai-compatible' || provider.settings?.baseURL !== CHAT_BASE)
      return { error: refused('This Console workspace advertises a protocol that this adapter does not yet support.') };
    const org = provider.headers?.['x-opencode-org-id'];
    if (typeof org !== 'string' || !/^org_[a-zA-Z0-9_-]{1,100}$/.test(org)) return { error: refused('Console workspace header is missing or invalid.', 'INVALID_REQUEST') };
    return { adapter: new OpenCodeConsoleV2Adapter(org), error: null };
  }
  override async generate(request: GenerationRequest, env: Record<string, string | undefined>): Promise<GenerationResponse> {
    const result = await this.chatTransport(request, env);
    if (result.error) return this.errorResponse(result.error, 0, request.modelId);
    return result.adapter!.generateChat(request, env);
  }
  private generateChat(request: GenerationRequest, env: Record<string, string | undefined>) { return super.generate(request, env); }
  override async *stream(request: GenerationRequest, env: Record<string, string | undefined>, signal?: AbortSignal): AsyncGenerator<StreamChunk, void, void> {
    if (signal?.aborted) { yield this.streamError(refused('Request cancelled.', 'ABORTED'), 0); return; }
    const result = await this.chatTransport(request, env);
    if (signal?.aborted) { yield this.streamError(refused('Request cancelled.', 'ABORTED'), 0); return; }
    if (result.error) { yield this.streamError(result.error, 0); return; }
    yield* result.adapter!.streamChat(request, env, signal);
  }
  private streamChat(request: GenerationRequest, env: Record<string, string | undefined>, signal?: AbortSignal) { return super.stream(request, env, signal); }
}
