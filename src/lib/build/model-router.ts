/**
 * Historical deterministic routing rules retained for task taxonomy and fixture tests.
 * Live workspace decisions use the canonical server Router V2.
 *
 * AUTO routing is a total function over declared metadata. It never guesses a
 * property: every rule below names a capability that the candidate model
 * actually declares in `providers.ts`. When nothing qualifies, the decision is
 * `unavailable` with the blocker, not a silent fallback to some model that
 * happens to exist.
 *
 * The reason list is part of the contract, not debug output. The workspace
 * shows the visitor exactly which rule selected a model.
 */

import type {
  AIModelDefinition,
  ProviderStatus,
  RoutingDecision,
  RoutingMode,
  TaskClass,
} from './types';

/** Minimum context window for a task that reads a whole repository. */
const LONG_CONTEXT_FLOOR = 100_000;

type Rule = {
  task: TaskClass;
  /** Descriptive only. The predicate is what actually decides. */
  description: string;
  /** Lower sorts first. */
  priority: number;
  accepts: (model: AIModelDefinition) => boolean;
};

/**
 * Ordered rules. The first that yields a candidate decides. Ties inside a rule
 * are broken by declared context window and then by model id, so the result
 * does not depend on catalogue order.
 */
const RULES: Rule[] = [
  {
    task: 'vision', priority: 0, description: 'Requires a model that declares vision support.',
    accepts: (m) => m.supportsVision,
  },
  {
    task: 'long-context', priority: 1,
    description: `Requires a declared context window of at least ${LONG_CONTEXT_FLOOR.toLocaleString()} tokens.`,
    accepts: (m) => (m.contextWindow ?? 0) >= LONG_CONTEXT_FLOOR,
  },
  {
    task: 'test-repair', priority: 2, description: 'Requires tool use and a code or debugging tag.',
    accepts: (m) => m.supportsTools && m.tags.some((t) => t === 'code' || t === 'debugging' || t === 'reasoning'),
  },
  {
    task: 'debugging', priority: 3, description: 'Requires a reasoning or debugging tag.',
    accepts: (m) => m.tags.some((t) => t === 'debugging' || t === 'deep-reasoning' || t === 'reasoning'),
  },
  {
    task: 'architecture', priority: 4, description: 'Requires tool use and the largest declared context window.',
    accepts: (m) => m.supportsTools && (m.contextWindow ?? 0) > 0,
  },
  {
    task: 'fast-edit', priority: 5, description: 'Requires a model tagged fast or cheap.',
    accepts: (m) => m.tags.includes('fast') || m.tags.includes('cheap'),
  },
  {
    task: 'refactor', priority: 6, description: 'Requires tool use.',
    accepts: (m) => m.supportsTools,
  },
  {
    task: 'search', priority: 7, description: 'Requires tool use; any text model qualifies.',
    accepts: (m) => m.supportsTools,
  },
  {
    task: 'general', priority: 8, description: 'Any model that declares tool use.',
    accepts: (m) => m.supportsTools,
  },
];

export function taskClasses(): TaskClass[] {
  return [...new Set(RULES.map((rule) => rule.task))];
}

export function ruleFor(task: TaskClass): Rule | null {
  return RULES.find((rule) => rule.task === task) ?? null;
}

function best(models: AIModelDefinition[]): AIModelDefinition | null {
  if (models.length === 0) return null;
  return [...models].sort(
    (a, b) => (b.contextWindow ?? 0) - (a.contextWindow ?? 0) || a.id.localeCompare(b.id),
  )[0];
}

/**
 * Choose a provider and model for a task.
 *
 * `manual` honours the caller's explicit choice when that provider is
 * actually configured, and reports the reason when it is not — it does not
 * quietly substitute a different provider.
 */
export function routeModel(
  task: TaskClass,
  mode: RoutingMode,
  providers: ProviderStatus[],
  manual?: { providerId: string; modelId: string },
): RoutingDecision {
  const configured = providers.filter((provider) => provider.configured);

  if (configured.length === 0) {
    return {
      task,
      mode,
      providerId: null,
      modelId: null,
      reason: [],
      status: 'unavailable',
      blocker:
        'No AI provider is configured, so no model can be selected. Set one of the provider environment variables on the server. Routing will not guess a provider.',
    };
  }

  if (mode === 'manual') {
    if (!manual) {
      return {
        task, mode, providerId: null, modelId: null, reason: [], status: 'unavailable',
        blocker: 'Manual routing requires an explicit provider and model selection.',
      };
    }
    const provider = configured.find((entry) => entry.id === manual.providerId);
    if (!provider) {
      const declared = providers.find((entry) => entry.id === manual.providerId);
      return {
        task, mode, providerId: null, modelId: null,
        reason: [`${manual.providerId} is not configured on this deployment.`],
        status: 'unavailable',
        blocker: declared
          ? `${declared.displayName} is declared but unconfigured. It needs ${declared.requiredEnv.join(' and ')} on the server. Routing was not changed silently.`
          : `${manual.providerId} is not a known provider. Routing was not changed silently.`,
      };
    }
    const model = provider.models.find((entry) => entry.id === manual.modelId);
    if (!model) {
      return {
        task, mode, providerId: null, modelId: null,
        reason: [`${manual.modelId} is not declared by ${provider.displayName}.`],
        status: 'unavailable',
        blocker: 'The selected model is not in the declared catalogue for this provider. No substitute was chosen.',
      };
    }
    return {
      task, mode, providerId: provider.id, modelId: model.id,
      reason: ['Manual selection honoured as declared.'],
      status: 'resolved', blocker: null,
    };
  }

  const rule = ruleFor(task);
  if (!rule) {
    return {
      task, mode, providerId: null, modelId: null, reason: [], status: 'unavailable',
      blocker: `No routing rule is defined for task class "${task}".`,
    };
  }

  const reason = [`Task "${task}" matched rule: ${rule.description}`];
  const qualifying = configured
    .flatMap((provider) => provider.models.filter(rule.accepts).map((model) => ({ provider, model })))
    .sort(
      (a, b) =>
        b.model.contextWindow! - a.model.contextWindow! ||
        a.provider.id.localeCompare(b.provider.id) ||
        a.model.id.localeCompare(b.model.id),
    );

  const chosen = best(qualifying.map((entry) => entry.model));
  if (!chosen) {
    return {
      task, mode, providerId: null, modelId: null, reason, status: 'unavailable',
      blocker: `No configured model declares what "${task}" requires. ${reason[0]} No model was substituted.`,
    };
  }

  const owner = configured.find((provider) => provider.models.some((entry) => entry.id === chosen.id));
  if (owner) {
    reason.push(
      `${owner.displayName} / ${chosen.label} selected as the highest-context model satisfying the rule.`,
    );
    if (chosen.contextWindow) reason.push(`Declared context window: ${chosen.contextWindow.toLocaleString()} tokens.`);
  }
  return {
    task, mode, providerId: owner?.id ?? null, modelId: chosen.id, reason, status: 'resolved', blocker: null,
  };
}
