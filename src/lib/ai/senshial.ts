import 'server-only';
import { getAdapter, updateHealth, buildProviderHealth, allProviderHealth } from './registry';
import { recordUsage } from './usage';
import { routeV2, buildRouterInput } from './router-v2';
import { generateWithFallback } from './fallback';
import { estimateTokens } from './contract';
import type { SenshialRequest, SenshialResponse, SenshialContextEntry, TokenUsage, CostEstimate } from './types';

/**
 * Senshial — real inference integration.
 *
 * ASK: REAL inference, READ-ONLY. May inspect user-selected context.
 * PLAN: REAL inference, READ-ONLY. May produce structured plans.
 * EXECUTE: BLOCKED. Agent write runtime is not yet security-verified.
 *
 * Never fakes execution. Never mutates files, runs commands, or deploys.
 */

const SYSTEM_PROMPTS: Record<'ask' | 'plan', string> = {
  ask: `You are KNOuX Senshial in ASK mode. You are READ-ONLY. You may answer questions, summarize code, and explain project context. You must not propose file mutations, command execution, or deployments. If asked to make changes, explain what would need to change and why, but do not present it as done.`,
  plan: `You are KNOuX Senshial in PLAN mode. You are READ-ONLY. You produce structured plans for engineering work. Each plan step should be concrete and actionable. You must not execute anything, run commands, or claim work is done. Output your plan as a numbered list of steps with a clear rationale for each.`,
};

export async function runSenshial(
  request: SenshialRequest,
  env: Record<string, string | undefined>,
): Promise<SenshialResponse> {
  // EXECUTE is always blocked
  if (request.mode === 'execute') {
    return {
      ok: false,
      mode: 'execute',
      text: '',
      providerId: null,
      modelId: null,
      usage: null,
      latencyMs: null,
      estimatedCost: null,
      error: null,
      blocked: true,
      blocker: 'EXECUTE BLOCKED — Agent write runtime is not yet security-verified. No file mutations, commands, or deployments are performed.',
    };
  }

  const mode = request.mode; // 'ask' | 'plan'

  // Build context string from user-selected context entries
  const contextText = (request.context ?? [])
    .filter((e: SenshialContextEntry) => e.content && !e.content.includes('[REDACTED]'))
    .map((e: SenshialContextEntry) => `--- ${e.label} ---\n${e.content}`)
    .join('\n\n');

  // Build the full prompt
  const fullPrompt = contextText
    ? `${request.prompt}\n\n--- Selected Context ---\n${contextText}`
    : request.prompt;

  // Build router input
  const routerInput = buildRouterInput('general', 'auto', fullPrompt, {
    toolsRequired: false,
    structuredOutput: mode === 'plan',
  });

  // Get health for routing
  const healthMap = new Map(allProviderHealth(env).map((h) => [h.providerId, h]));
  const decision = routeV2(routerInput, healthMap);

  if (decision.status !== 'resolved' || !decision.selected) {
    return {
      ok: false,
      mode,
      text: '',
      providerId: null,
      modelId: null,
      usage: null,
      latencyMs: null,
      estimatedCost: null,
      error: { category: 'UNSUPPORTED_CAPABILITY', message: 'No model available', safeMessage: decision.blocker ?? 'No model could be selected for this request.', httpStatus: null, providerErrorId: null, retryable: false },
      blocked: false,
      blocker: decision.blocker ?? 'No model could be selected.',
    };
  }

  const { providerId, modelId } = decision.selected;

  // Execute real generation with fallback
  const result = await generateWithFallback(
    {
      providerId,
      modelId,
      messages: [{ role: 'user', content: fullPrompt }],
      system: request.system ?? SYSTEM_PROMPTS[mode],
      controls: request.controls,
    },
    env,
    decision.fallbackChain,
  );

  const response = result.response;

  // Record usage
  recordUsage({
    providerId,
    modelId,
    operation: 'generate',
    taskClass: mode,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    cachedTokens: response.usage.cachedTokens,
    latencyMs: response.latencyMs,
    ttftMs: response.ttftMs,
    estimatedCost: response.estimatedCost,
    success: response.ok,
    errorCategory: response.error?.category ?? null,
    fallbackCount: result.fallbackCount,
  });

  if (response.ok) {
    updateHealth(providerId, {
      generation: 'GENERATION_VERIFIED',
      lastError: null,
      latencyMs: response.latencyMs,
    });

    return {
      ok: true,
      mode,
      text: response.text,
      providerId,
      modelId,
      usage: response.usage,
      latencyMs: response.latencyMs,
      estimatedCost: response.estimatedCost,
      error: null,
      blocked: false,
      blocker: null,
    };
  }

  return {
    ok: false,
    mode,
    text: '',
    providerId,
    modelId,
    usage: response.usage,
    latencyMs: response.latencyMs,
    estimatedCost: response.estimatedCost,
    error: response.error,
    blocked: false,
    blocker: response.error?.safeMessage ?? 'Generation failed.',
  };
}
