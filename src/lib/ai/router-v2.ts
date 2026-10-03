import "server-only";
import type {
  CapabilityState,
  RouterInput,
  RouterDecision,
  RouterCandidate,
  NormalizedModel,
  ProviderHealth,
  CostEstimate,
} from "./types";
import { getDiscoveryCache, getAllDiscoveredModels } from "./registry";
import { getPricing } from "./cost";
import { estimateTokens } from "./contract";

/**
 * Estimated token count at which a request is treated as long-context.
 *
 * The boundary is inclusive; see `buildRouterInput` for why an exclusive
 * comparison silently lost large requests.
 */
const LONG_CONTEXT_TOKEN_THRESHOLD = 50_000;

/**
 * Router v2. Scores models on measurable factors:
 * - task class matching
 * - context window fit
 * - capability requirements (vision, tools, structured output)
 * - provider health
 * - latency
 * - cost
 * - rate-limit state
 * - recent failures
 *
 * AUTO routing explains its decision. Manual selection is always honoured
 * when the provider is configured — it is never silently overridden.
 */

type ScoreFactors = {
  taskMatch: number;
  contextFit: number;
  capabilityMatch: number;
  healthScore: number;
  latencyScore: number;
  costScore: number;
  rateLimitPenalty: number;
  total: number;
};

function scoreModel(
  model: NormalizedModel,
  health: ProviderHealth | null,
  input: RouterInput,
): {
  accepted: boolean;
  rejectionReason: string | null;
  factors: ScoreFactors;
} {
  const factors: ScoreFactors = {
    taskMatch: 0,
    contextFit: 0,
    capabilityMatch: 0,
    healthScore: 0,
    latencyScore: 0,
    costScore: 0,
    rateLimitPenalty: 0,
    total: 0,
  };

  // --- Capability requirements ---
  if (input.visionRequired) {
    if (model.capabilities.vision === "UNSUPPORTED") {
      return {
        accepted: false,
        rejectionReason: "Vision required but model does not support it.",
        factors,
      };
    }
    if (model.capabilities.vision === "UNKNOWN") {
      factors.capabilityMatch -= 5;
    } else {
      factors.capabilityMatch += 10;
    }
  }

  if (input.toolsRequired) {
    if (model.capabilities.tools === "UNSUPPORTED") {
      return {
        accepted: false,
        rejectionReason: "Tools required but model does not support them.",
        factors,
      };
    }
    if (model.capabilities.tools === "UNKNOWN") {
      factors.capabilityMatch -= 5;
    } else {
      factors.capabilityMatch += 10;
    }
  }

  if (input.structuredOutputRequired) {
    if (model.capabilities.structuredOutput === "UNSUPPORTED") {
      return {
        accepted: false,
        rejectionReason:
          "Structured output required but model does not support it.",
        factors,
      };
    }
    if (model.capabilities.structuredOutput !== "UNKNOWN") {
      factors.capabilityMatch += 5;
    }
  }

  // --- Context window fit ---
  if (input.contextRequirement > 0 && model.contextWindow !== null) {
    if (model.contextWindow >= input.contextRequirement) {
      factors.contextFit = 10;
    } else {
      return {
        accepted: false,
        rejectionReason: `Context requirement (${input.contextRequirement.toLocaleString()}) exceeds model context window (${model.contextWindow.toLocaleString()}).`,
        factors,
      };
    }
  } else if (input.contextRequirement > 0 && model.contextWindow === null) {
    factors.contextFit = -3; // Unknown context, slight penalty
  }

  // --- Task class matching ---
  const taskClass = input.taskClass.toLowerCase();
  if (taskClass.includes("vision")) {
    if (
      model.capabilities.vision === "SUPPORTED" ||
      model.capabilities.vision === "VERIFIED"
    )
      factors.taskMatch += 15;
  } else if (taskClass.includes("debug") || taskClass.includes("reason")) {
    if (
      model.capabilities.reasoning === "SUPPORTED" ||
      model.capabilities.reasoning === "VERIFIED"
    )
      factors.taskMatch += 15;
  } else if (taskClass.includes("fast") || taskClass.includes("cheap")) {
    const pricing = getPricing(model.providerId, model.modelId);
    if (pricing.inputPerMillion !== null && pricing.inputPerMillion < 1)
      factors.taskMatch += 15;
  } else if (taskClass.includes("long-context")) {
    if ((model.contextWindow ?? 0) >= 100_000) factors.taskMatch += 15;
  } else if (taskClass.includes("tool") || taskClass.includes("test-repair")) {
    if (
      model.capabilities.tools === "SUPPORTED" ||
      model.capabilities.tools === "VERIFIED"
    )
      factors.taskMatch += 15;
  } else {
    factors.taskMatch += 5; // General task, any model gets base score
  }

  // --- Provider health ---
  if (health) {
    if (health.generation === "GENERATION_VERIFIED") factors.healthScore += 10;
    else if (health.generation === "DEGRADED") factors.healthScore -= 5;
    else if (health.generation === "FAILED") factors.healthScore -= 15;
    else if (health.generation === "RATE_LIMITED") {
      factors.rateLimitPenalty -= 10;
    }

    if (health.streaming === "STREAMING_VERIFIED") factors.healthScore += 5;

    if (health.latencyMs !== null) {
      // Lower latency = higher score. Normalize: 500ms = 10pts, 5000ms = 0pts
      factors.latencyScore = Math.max(0, 10 - health.latencyMs / 500);
    }
  }

  // --- Cost ---
  const pricing = getPricing(model.providerId, model.modelId);
  if (pricing.inputPerMillion !== null && pricing.outputPerMillion !== null) {
    const totalPerMillion = pricing.inputPerMillion + pricing.outputPerMillion;
    // Lower cost = higher score. $0.5/M = 10pts, $20/M = 0pts
    factors.costScore = Math.max(0, 10 - totalPerMillion / 2);
  }

  // --- Compute total ---
  factors.total =
    factors.taskMatch +
    factors.contextFit +
    factors.capabilityMatch +
    factors.healthScore +
    factors.latencyScore +
    factors.costScore +
    factors.rateLimitPenalty;

  return { accepted: true, rejectionReason: null, factors };
}

export function routeV2(
  input: RouterInput,
  healthMap: Map<string, ProviderHealth>,
): RouterDecision {
  const reasons: string[] = [];

  // Manual mode: honour explicit selection, never override
  if (input.mode === "manual" && input.manualSelection) {
    const { providerId, modelId } = input.manualSelection;
    const health = healthMap.get(providerId) ?? null;

    if (!health || !health.configured) {
      return {
        taskClass: input.taskClass,
        mode: "manual",
        selected: null,
        candidates: [],
        fallbackChain: [],
        estimatedCost: null,
        health: {},
        contextFit: "unknown",
        reasons: [
          `Manual selection ${providerId}/${modelId} rejected: provider not configured.`,
        ],
        status: "unavailable",
        blocker: `Provider ${providerId} is not configured. Manual selection was not overridden.`,
      };
    }

    // Find the model in discovered or static models
    const discovered = getDiscoveryCache(providerId)?.models ?? [];
    const model = discovered.find((m) => m.modelId === modelId);
    const displayName = model?.displayName ?? modelId;

    // Check capability requirements
    if (input.visionRequired && model?.capabilities.vision === "UNSUPPORTED") {
      return {
        taskClass: input.taskClass,
        mode: "manual",
        selected: null,
        candidates: [],
        fallbackChain: [],
        estimatedCost: null,
        health: {},
        contextFit: "unknown",
        reasons: [
          `Manual selection rejected: vision required but ${modelId} does not support it.`,
        ],
        status: "unavailable",
        blocker:
          "The manually selected model does not meet the capability requirements. Selection was not overridden.",
      };
    }

    reasons.push(`Manual selection honoured: ${providerId}/${modelId}.`);
    if (health.generation === "GENERATION_VERIFIED")
      reasons.push(`Provider health: generation verified.`);
    else if (health.generation === "DEGRADED")
      reasons.push(`Warning: provider is in a degraded state.`);
    else if (health.generation === "RATE_LIMITED")
      reasons.push(`Warning: provider is rate-limited.`);

    return {
      taskClass: input.taskClass,
      mode: "manual",
      selected: { providerId, modelId, displayName },
      candidates: [
        {
          providerId,
          modelId,
          displayName,
          score: 0,
          accepted: true,
          rejectionReason: null,
        },
      ],
      fallbackChain: [],
      estimatedCost: null,
      health: { [providerId]: health.generation },
      contextFit:
        model?.contextWindow && input.contextRequirement > 0
          ? model.contextWindow >= input.contextRequirement
            ? "fits"
            : "exceeds"
          : "unknown",
      reasons,
      status: "resolved",
      blocker: null,
    };
  }

  // AUTO mode: score all available models
  const allModels = getAllDiscoveredModels();
  const candidates: RouterCandidate[] = [];

  for (const { providerId, models } of allModels) {
    const health = healthMap.get(providerId) ?? null;
    if (health && !health.configured) continue;

    for (const model of models) {
      const { accepted, rejectionReason, factors } = scoreModel(
        model,
        health,
        input,
      );
      candidates.push({
        providerId,
        modelId: model.modelId,
        displayName: model.displayName,
        score: factors.total,
        accepted,
        rejectionReason,
      });
    }
  }

  // Sort accepted candidates by score descending
  const accepted = candidates
    .filter((c) => c.accepted)
    .sort((a, b) => b.score - a.score);

  if (accepted.length === 0) {
    const rejected = candidates.filter((c) => !c.accepted);
    return {
      taskClass: input.taskClass,
      mode: "auto",
      selected: null,
      candidates,
      fallbackChain: [],
      estimatedCost: null,
      health: {},
      contextFit: "unknown",
      reasons: [
        `No model satisfied the requirements for task "${input.taskClass}".`,
      ],
      status: "unavailable",
      blocker:
        rejected.length > 0
          ? `All ${candidates.length} candidates were rejected. Top rejection: ${rejected[0].rejectionReason}`
          : "No models are available. Run model discovery first.",
    };
  }

  const selected = accepted[0];
  reasons.push(
    `Selected ${selected.providerId}/${selected.modelId} (score: ${selected.score.toFixed(1)}).`,
  );

  // Explain the top factors
  if (selected.score > 15)
    reasons.push(`Strong match: high task-class and capability alignment.`);
  else if (selected.score > 5)
    reasons.push(`Moderate match: meets core requirements.`);
  else reasons.push(`Weak match: selected as the only available option.`);

  // Build fallback chain (next 2 accepted candidates)
  const fallback = accepted.slice(1, 3).map((c) => ({
    providerId: c.providerId,
    modelId: c.modelId,
    displayName: c.displayName,
  }));

  if (fallback.length > 0 && !input.noFallback) {
    reasons.push(
      `Fallback chain: ${fallback.map((f) => `${f.providerId}/${f.modelId}`).join(" → ")}.`,
    );
  }

  // Estimate cost
  const pricing = getPricing(selected.providerId, selected.modelId);
  const costEstimate: CostEstimate =
    pricing.inputPerMillion !== null
      ? { amount: null, basis: "ESTIMATED", currency: pricing.currency }
      : { amount: null, basis: "UNKNOWN", currency: "USD" };

  // Context fit
  const selectedModel = allModels
    .find((m) => m.providerId === selected.providerId)
    ?.models.find((m) => m.modelId === selected.modelId);
  const contextFit =
    selectedModel?.contextWindow && input.contextRequirement > 0
      ? selectedModel.contextWindow >= input.contextRequirement
        ? "fits"
        : "exceeds"
      : "unknown";

  if (contextFit === "fits")
    reasons.push(`Context window fits the requirement.`);
  else if (contextFit === "exceeds")
    reasons.push(`Warning: context requirement exceeds model window.`);

  // Health map for selected + fallbacks. Keyed by provider, valued with the
  // same CapabilityState vocabulary the rest of the runtime uses, so the
  // router never reports a health state the rest of the system cannot read.
  const health: Record<string, CapabilityState> = {};
  for (const c of [selected, ...fallback]) {
    const h = healthMap.get(c.providerId);
    if (h) health[c.providerId] = h.generation;
  }

  return {
    taskClass: input.taskClass,
    mode: "auto",
    selected: {
      providerId: selected.providerId,
      modelId: selected.modelId,
      displayName: selected.displayName,
    },
    candidates,
    fallbackChain: fallback,
    estimatedCost: costEstimate,
    health,
    contextFit,
    reasons,
    status: "resolved",
    blocker: null,
  };
}

// Convenience: build RouterInput from a simple request
export function buildRouterInput(
  taskClass: string,
  mode: "auto" | "manual",
  prompt: string,
  options?: {
    visionRequired?: boolean;
    toolsRequired?: boolean;
    structuredOutputRequired?: boolean;
    manualSelection?: { providerId: string; modelId: string };
    noFallback?: boolean;
  },
): RouterInput {
  const tokenEstimate = estimateTokens(prompt);
  // Long context if the estimate reaches the threshold. The comparison is
  // inclusive: an exclusive check made a prompt of exactly 200,000 characters
  // estimate to exactly 50,000 tokens and report *no* context requirement,
  // silently routing a large request to a small-window model.
  const contextRequirement =
    tokenEstimate >= LONG_CONTEXT_TOKEN_THRESHOLD ? tokenEstimate : 0;
  return {
    taskClass,
    contextRequirement,
    visionRequired: options?.visionRequired ?? false,
    toolsRequired: options?.toolsRequired ?? false,
    structuredOutputRequired: options?.structuredOutputRequired ?? false,
    mode,
    manualSelection: options?.manualSelection,
    noFallback: options?.noFallback,
  };
}
