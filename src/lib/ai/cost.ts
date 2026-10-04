import 'server-only';
import type { CostEstimate, ModelPricing, TokenUsage } from './types';

/**
 * Cost engine. Distinguishes MEASURED (provider returned a cost), ESTIMATED
 * (calculated from pricing metadata), and UNKNOWN (no pricing data).
 *
 * Never invents pricing. If a model's pricing is null, the result is UNKNOWN,
 * not 0.
 */

// Curated pricing metadata per provider:model. Updated from provider docs.
// Values are per 1,000,000 tokens in USD. null = unknown.
const PRICING_DB: Record<string, ModelPricing> = {
  // OpenAI
  'openai:gpt-4.1': { inputPerMillion: 2.0, outputPerMillion: 8.0, cachedInputPerMillion: 0.5, currency: 'USD' },
  'openai:gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6, cachedInputPerMillion: 0.1, currency: 'USD' },
  'openai:gpt-4.1-nano': { inputPerMillion: 0.1, outputPerMillion: 0.4, cachedInputPerMillion: 0.025, currency: 'USD' },
  'openai:o4-mini': { inputPerMillion: 1.1, outputPerMillion: 4.4, cachedInputPerMillion: 0.275, currency: 'USD' },
  'openai:o3': { inputPerMillion: 2.0, outputPerMillion: 8.0, cachedInputPerMillion: 0.5, currency: 'USD' },
  'openai:gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0, cachedInputPerMillion: 1.25, currency: 'USD' },
  'openai:gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6, cachedInputPerMillion: 0.075, currency: 'USD' },

  // Anthropic
  'anthropic:claude-sonnet-4': { inputPerMillion: 3.0, outputPerMillion: 15.0, cachedInputPerMillion: 0.3, currency: 'USD' },
  'anthropic:claude-opus-4': { inputPerMillion: 15.0, outputPerMillion: 75.0, cachedInputPerMillion: 1.5, currency: 'USD' },
  'anthropic:claude-haiku-4': { inputPerMillion: 0.8, outputPerMillion: 4.0, cachedInputPerMillion: 0.08, currency: 'USD' },
  'anthropic:claude-3.5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cachedInputPerMillion: 0.3, currency: 'USD' },
  'anthropic:claude-3.5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4.0, cachedInputPerMillion: 0.08, currency: 'USD' },

  // Google
  'google:gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 10.0, cachedInputPerMillion: 0.3125, currency: 'USD' },
  'google:gemini-2.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.3, cachedInputPerMillion: 0.01875, currency: 'USD' },
  'google:gemini-2.0-flash': { inputPerMillion: 0.1, outputPerMillion: 0.4, cachedInputPerMillion: 0.025, currency: 'USD' },

  // Groq
  'groq:llama-3.3-70b': { inputPerMillion: 0.59, outputPerMillion: 0.79, cachedInputPerMillion: null, currency: 'USD' },
  'groq:llama-3.1-8b': { inputPerMillion: 0.05, outputPerMillion: 0.08, cachedInputPerMillion: null, currency: 'USD' },

  // Mistral
  'mistral:mistral-large-latest': { inputPerMillion: 2.0, outputPerMillion: 6.0, cachedInputPerMillion: null, currency: 'USD' },
  'mistral:mistral-small-latest': { inputPerMillion: 0.1, outputPerMillion: 0.3, cachedInputPerMillion: null, currency: 'USD' },

  // DeepSeek
  'deepseek:deepseek-chat': { inputPerMillion: 0.27, outputPerMillion: 1.1, cachedInputPerMillion: 0.07, currency: 'USD' },
  'deepseek:deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19, cachedInputPerMillion: 0.14, currency: 'USD' },
};

export function getPricing(providerId: string, modelId: string): ModelPricing {
  return PRICING_DB[`${providerId}:${modelId}`] ?? {
    inputPerMillion: null,
    outputPerMillion: null,
    cachedInputPerMillion: null,
    currency: 'USD',
  };
}

export function calculateCost(
  providerId: string,
  modelId: string,
  usage: TokenUsage,
): CostEstimate {
  const pricing = getPricing(providerId, modelId);
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cached = usage.cachedTokens ?? 0;

  if (pricing.inputPerMillion === null && pricing.outputPerMillion === null) {
    return { amount: null, basis: 'UNKNOWN', currency: 'USD' };
  }

  let cost = 0;
  if (pricing.inputPerMillion !== null) {
    const billableInput = input - cached;
    if (billableInput > 0) {
      cost += (billableInput / 1_000_000) * pricing.inputPerMillion;
    }
    if (cached > 0 && pricing.cachedInputPerMillion !== null) {
      cost += (cached / 1_000_000) * pricing.cachedInputPerMillion;
    }
  }
  if (pricing.outputPerMillion !== null && output > 0) {
    cost += (output / 1_000_000) * pricing.outputPerMillion;
  }

  return { amount: Math.round(cost * 1_000_000) / 1_000_000, basis: 'ESTIMATED', currency: pricing.currency };
}

export function mergeCostBasis(...estimates: (CostEstimate | null)[]): CostEstimate {
  const valid = estimates.filter((e): e is CostEstimate => e !== null);
  if (valid.length === 0) return { amount: null, basis: 'UNKNOWN', currency: 'USD' };
  const hasMeasured = valid.some((e) => e.basis === 'MEASURED');
  const allUnknown = valid.every((e) => e.basis === 'UNKNOWN');
  if (allUnknown) return { amount: null, basis: 'UNKNOWN', currency: 'USD' };
  const total = valid.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  return { amount: Math.round(total * 1_000_000) / 1_000_000, basis: hasMeasured ? 'MEASURED' : 'ESTIMATED', currency: 'USD' };
}
