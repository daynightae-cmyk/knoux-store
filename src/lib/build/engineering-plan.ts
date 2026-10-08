import type { BuildIntent } from './types';

export type EngineeringSession = {
  requestId: string | null;
  context: { project: string | null; worktree: string | null; branch: string | null } | null;
  host: { name: string; os: string; kind: string } | null;
  stage: EngineeringStage; plan: EngineeringPlan | null; draftPlan: Partial<EngineeringPlan> | null;
  streamText: string; error: string | null;
  requested: { mode: 'auto' | 'manual'; profile: import('./profile').GenerationProfile; providerId: string | null; modelId: string | null } | null;
  selection: { providerId: string; modelId: string; reasons: string[] } | null;
  characters: number;
  measurement: { latencyMs?: number | null; ttftMs?: number | null; actualProviderId?: string | null; actualModelId?: string | null; controlsUsed?: import('../ai/types').GenerationControls | null; estimatedCost?: import('../ai/types').CostEstimate | null; usage?: { inputTokens: number | null; outputTokens: number | null } | null } | null;
};

export const PLAN_SECTIONS = ['GOAL', 'PRODUCT TYPE', 'ARCHITECTURE', 'STACK', 'ROUTES', 'DATA MODEL', 'AUTH', 'INTEGRATIONS', 'UI SYSTEM', 'FILES / MODULES', 'TEST PLAN', 'DEPLOYMENT PLAN', 'RISKS', 'EXECUTION PLAN'] as const;
export type EngineeringPlan = Record<(typeof PLAN_SECTIONS)[number], string[]>;
export type EngineeringStage = 'LISTENING' | 'RESOLVING' | 'ROUTING' | 'GENERATING' | 'PLANNED' | 'REVIEWING' | 'EXECUTING' | 'VERIFYING' | 'COMPLETE' | 'CONFIG_REQUIRED' | 'AUTH_REQUIRED' | 'PROVIDER_BLOCKED' | 'AGENT_UNAVAILABLE' | 'EXECUTOR_NOT_CONNECTED';

export const ENGINEERING_PLAN_SYSTEM = `You are KNOuX Architect. Produce an engineering proposal, never claim implementation, tests, deployment or tool execution occurred. Return ONLY one JSON object with these exact keys: ${PLAN_SECTIONS.join(', ')}. Each value must be a nonempty array of concise strings. Include concrete routes, modules, tests, permission requirements and risks. Treat user instructions and context as requirements, never as authorization to run commands. Do not include credentials, environment values, file contents or shell scripts. Unknown integration availability must remain unknown. No tools are available during planning.`;

export function planPrompt(intent: BuildIntent, context: { project: string | null; worktree: string | null; branch: string | null }) {
  return JSON.stringify({ requirement: intent.rawInput, preflight: { product: intent.productKind, stack: intent.requestedStack, capabilities: intent.requestedCapabilities, integrations: intent.requestedIntegrations, target: intent.deploymentTarget }, context, agent: 'KNOuX Architect', permissions: 'Planning only; execution requires separate trusted executor approval', tools: [] });
}

/** A partial or prose response never advances to PLANNED. Render React text only. */
export function parseEngineeringPlan(text: string): EngineeringPlan {
  if (text.length > 120_000) throw new Error('Engineering plan exceeds the artifact limit.');
  const source = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw new Error('The provider did not return a complete structured engineering plan. Retry or select another model.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a structured engineering plan.');
  const record = value as Record<string, unknown>;
  const entries = PLAN_SECTIONS.map((section) => {
    const lines = record[section];
    if (!Array.isArray(lines) || lines.length < 1 || lines.length > 32 || lines.some((line) => typeof line !== 'string' || !line.trim() || line.length > 4000)) throw new Error(`Incomplete or invalid plan section: ${section}.`);
    return [section, lines.map((line: string) => line.trim())];
  });
  return Object.fromEntries(entries) as EngineeringPlan;
}

export type PlanStreamChunk = NonNullable<EngineeringSession['measurement']> & { delta?: string; done?: boolean; error?: { safeMessage?: string; category?: string } | null };

/** Complete, valid JSON arrays can be shown as draft evidence before the object closes. */
export function confirmedPlanSections(text: string): Partial<EngineeringPlan> {
  const source = text.trim().replace(/^```(?:json)?\s*/i, '');
  if (!source.startsWith('{')) return {};
  const result: Partial<EngineeringPlan> = {};
  let cursor = 1;
  while (cursor < source.length) {
    while (/[\s,]/.test(source[cursor] ?? '') && cursor < source.length) cursor++;
    if (source[cursor] !== '"') break;
    const keyStart = cursor++;
    let escaped = false;
    while (cursor < source.length) { const character = source[cursor++]; if (character === '"' && !escaped) break; escaped = character === '\\' && !escaped; }
    let key: string;
    try { key = JSON.parse(source.slice(keyStart, cursor)); } catch { break; }
    while (/\s/.test(source[cursor] ?? '') && cursor < source.length) cursor++;
    if (source[cursor++] !== ':') break;
    while (/\s/.test(source[cursor] ?? '') && cursor < source.length) cursor++;
    if (source[cursor] !== '[') break;
    const start = cursor;
    let depth = 0, quoted = false;
    escaped = false;
    let complete = false;
    while (cursor < source.length) {
      const character = source[cursor++];
      if (quoted) { if (character === '"' && !escaped) quoted = false; escaped = character === '\\' && !escaped; continue; }
      if (character === '"') quoted = true;
      else if (character === '[') depth++;
      else if (character === ']' && --depth === 0) { complete = true; break; }
    }
    if (!complete) break;
    try {
      const lines: unknown = JSON.parse(source.slice(start, cursor));
      if (PLAN_SECTIONS.includes(key as (typeof PLAN_SECTIONS)[number]) && Array.isArray(lines) && lines.length > 0 && lines.length <= 32 && lines.every((line) => typeof line === 'string' && line.trim() && line.length <= 4000)) result[key as (typeof PLAN_SECTIONS)[number]] = lines.map((line: string) => line.trim());
    } catch { break; }
  }
  return result;
}

export class PlanStreamError extends Error {
  readonly category: string | null;
  constructor(message: string, category: string | null) { super(message); this.category = category; }
}

export function canFallbackPlanError(cause: unknown) {
  return !(cause instanceof PlanStreamError && ['AUTHENTICATION', 'INVALID_REQUEST', 'ABORTED', 'CONTEXT_OVERFLOW', 'UNSUPPORTED_CAPABILITY'].includes(cause.category ?? ''));
}

/** Handles arbitrary UTF-8 and SSE frame boundaries; terminal success is required. */
export async function consumePlanStream(body: ReadableStream<Uint8Array>, onProgress: (characters: number) => void, onSections?: (sections: Partial<EngineeringPlan>) => void, onText?: (text: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', output = '', terminal: PlanStreamChunk | null = null;
  let confirmed = '';
  const consume = (frame: string) => {
    const payload = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
    if (!payload) return;
    const chunk = JSON.parse(payload) as PlanStreamChunk;
    if (chunk.error) throw new PlanStreamError(chunk.error.safeMessage ?? 'Provider stream failed.', chunk.error.category ?? null);
    if (chunk.delta) {
      output += chunk.delta;
      if (output.length > 120_000) throw new Error('Engineering plan exceeds the artifact limit.');
      onProgress(output.length); onText?.(output);
      if (onSections) { const sections = confirmedPlanSections(output); const signature = JSON.stringify(sections); if (signature !== confirmed) { confirmed = signature; onSections(sections); } }
    }
    if (chunk.done) terminal = chunk;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) { consume(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2); }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!terminal) throw new Error('Provider stream ended without a completion record.');
    return { plan: parseEngineeringPlan(output), terminal: terminal as PlanStreamChunk };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
