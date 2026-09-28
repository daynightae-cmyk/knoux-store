'use client';

/**
 * Project HUD and evidence panel.
 *
 * Both read only from resolved adapter state. When a value does not exist the
 * HUD prints a truthful state — NOT CONNECTED, NOT RUN, UNCONFIGURED,
 * BLOCKED, NOT VERIFIED — and never a demo number. There is no percentage,
 * no token count, no latency figure and no test count in this component,
 * because none of them is measured here.
 */

import { STAGES, type Stage } from '@/lib/build/stages';
import { aggregate, measurableScore } from '@/lib/build/verification';
import type { BuildWorkspaceState } from '@/lib/build/workspace-state';
import { StatusBadge } from '../workspace/Primitives';

type Metric = { label: string; value: string; tone?: 'violet' | 'green' | 'amber' | 'red' | 'dim' };

/** Resolve a value, or a truthful absence. Never a placeholder that implies data. */
function or(value: string | null | undefined, absence: string): { text: string; tone?: Metric['tone'] } {
  if (typeof value === 'string' && value.trim().length > 0) return { text: value };
  return { text: absence, tone: 'dim' };
}

export function ProjectHud({ state, stage }: { state: BuildWorkspaceState; stage: Stage }) {
  const { project, git, runtime, ai, environment, verification, adapter } = state;

  const checks = verification?.checks ?? [];
  const gate = aggregate(checks);
  const score = measurableScore(checks);

  const metrics: Metric[] = [
    { label: 'Project', value: or(project?.name, 'NOT CONNECTED').text, tone: or(project?.name, '').tone },
    { label: 'Environment', value: adapter.environment.toUpperCase(), tone: 'violet' },
    { label: 'Branch', value: or(git?.branch, 'NOT CONNECTED').text, tone: or(git?.branch, '').tone },
    { label: 'Head', value: or(git?.headSha?.slice(0, 10), 'NOT VERIFIED').text, tone: or(git?.headSha, '').tone },
    { label: 'Runtime', value: runtime.status.toUpperCase(), tone: runtime.status === 'running' ? 'green' : 'dim' },
    { label: 'Surface', value: stage.name },
    { label: 'Senshial', value: ai.mode.toUpperCase(), tone: 'violet' },
    {
      label: 'Model',
      value: ai.routing?.status === 'resolved'
        ? `${ai.routing.providerId}/${ai.routing.modelId}`
        : 'UNCONFIGURED',
      tone: ai.routing?.status === 'resolved' ? 'green' : 'dim',
    },
    { label: 'Config', value: `${environment.signals.filter((s) => s.present).length}/${environment.signals.length}`, tone: 'dim' },
  ];

  return (
    <div className="sp-hud">
      <span className="sp-hud__eyebrow">{stage.category}</span>
      <div className="sp-hud__index" aria-hidden="true">
        {String(stage.index + 1).padStart(2, '0')}
      </div>
      <h3 className="sp-hud__name">{stage.name}</h3>
      <div className="sp-hud__metrics">
        {metrics.map((metric) => (
          <div className="sp-hud__metric" key={metric.label}>
            <span className="bo-label">{metric.label}</span>
            <span className="sp-hud__value" data-tone={metric.tone ?? 'default'}>
              {metric.value}
            </span>
          </div>
        ))}
        <div className="sp-hud__metric">
          <span className="bo-label">Verification</span>
          <span className="sp-hud__value">
            {score === null ? 'NOT RUN' : `${score}%`}
          </span>
        </div>
      </div>
      <p className="sp-hud__note">
        {score === null
          ? 'No score: a percentage is only shown once all four gates carry a real measurement.'
          : `Four measured gates. Current aggregate ${gate.toUpperCase()}.`}
      </p>
    </div>
  );
}

export type Evidence = {
  category: string;
  title: string;
  description: string;
  source: string;
  status: 'pass' | 'fail' | 'blocked' | 'unconfigured' | 'not-run' | 'not-applicable';
  facts: { k: string; v: string }[];
};

/**
 * The evidence panel. Structure is category, title, factual description,
 * source, status — and the facts that support it.
 *
 * Every fact is read from resolved state. When there is no evidence, the panel
 * says so in the same shape rather than collapsing to an empty box.
 */
export function EvidencePanel({ state, stage }: { state: BuildWorkspaceState; stage: Stage }) {
  const { git, project, verification, runtime, ai, database, environment } = state;
  const snapshot = verification?.checks ?? [];
  const byId = new Map(snapshot.map((check) => [check.id, check]));

  const evidence = buildEvidence(state, stage, byId, {
    git, project, runtime, ai, database, environment, snapshot, byId,
  });
  const detail = evidence.facts.length > 0 ? (
    <dl className="sp-evidence__facts">
      {evidence.facts.map((fact) => (
        <div key={fact.k} style={{ display: 'contents' }}>
          <dt>{fact.k}</dt>
          <dd>{fact.v}</dd>
        </div>
      ))}
    </dl>
  ) : null;

  return (
    <aside className="sp-evidence" aria-label="Selected stage evidence">
      <span className="sp-evidence__category">{evidence.category}</span>
      <h4 className="sp-evidence__title">{evidence.title}</h4>
      <p className="sp-evidence__desc">{evidence.description}</p>
      <div className="sp-evidence__foot">
        <span className="bo-label">Source</span>
        <span className="sp-evidence__source">{evidence.source}</span>
      </div>
      <div className="sp-evidence__foot">
        <span className="bo-label">Status</span>
        <StatusBadge status={evidence.status} />
      </div>
      {detail}
    </aside>
  );
}

type Context = {
  git: BuildWorkspaceState['git'];
  project: BuildWorkspaceState['project'];
  runtime: BuildWorkspaceState['runtime'];
  ai: BuildWorkspaceState['ai'];
  database: BuildWorkspaceState['database'];
  environment: BuildWorkspaceState['environment'];
  snapshot: NonNullable<BuildWorkspaceState['verification']>['checks'];
  byId: Map<string, { exitCode: number | null; status: string; evidence: string; command: string | null }>;
};

function buildEvidence(
  state: BuildWorkspaceState,
  stage: Stage,
  byId: Map<string, { exitCode: number | null; status: string; evidence: string; command: string | null }>,
  context: Context,
): Evidence {
  const base = { category: stage.category, title: stage.title, description: stage.description };

  switch (stage.id) {
    case 'intent': {
      const intent = state.intent;
      return {
        ...base,
        source: stage.evidenceSource,
        status: intent ? (intent.confidence === 'empty' ? 'not-run' : 'pass') : 'not-run',
        facts: intent
          ? [
              { k: 'Confidence', v: intent.confidence.toUpperCase() },
              { k: 'Product kind', v: intent.productKind.toUpperCase() },
              { k: 'Resolved records', v: String(intent.resolvedEntityIds.length) },
              { k: 'Unresolved terms', v: intent.unresolvedTerms.length ? intent.unresolvedTerms.join(', ') : 'NONE' },
            ]
          : [{ k: 'Specification', v: 'NOT COMPILED' }],
      };
    }
    case 'architecture': {
      const graph = state.graph;
      return {
        ...base,
        source: stage.evidenceSource,
        status: graph ? 'pass' : 'not-run',
        facts: graph
          ? [
              { k: 'Nodes', v: String(graph.nodes.length) },
              { k: 'Import edges', v: String(graph.edges.length) },
              { k: 'Unavailable domains', v: graph.unavailableDomains.length ? graph.unavailableDomains.join(', ').toUpperCase() : 'NONE' },
            ]
          : [{ k: 'Topology', v: 'NOT RESOLVED' }],
      };
    }
    case 'build': {
      const selected = state.workspace.selectedFilePath;
      const write = state.adapter.capabilities['project.write'];
      return {
        ...base,
        source: stage.evidenceSource,
        status: write === 'available' ? 'pass' : 'blocked',
        facts: [
          { k: 'Selected file', v: selected ?? 'NONE' },
          { k: 'Write capability', v: write === 'available' ? 'AVAILABLE' : 'BLOCKED' },
        ],
      };
    }
    case 'runtime': {
      return {
        ...base,
        source: stage.evidenceSource,
        status: context.runtime.status === 'running' ? 'pass' : 'blocked',
        facts: [
          { k: 'Runtime', v: context.runtime.status.toUpperCase() },
          { k: 'URL', v: context.runtime.url ?? 'NO ACTIVE RUNTIME' },
          { k: 'Viewport', v: `${state.preview.viewport.width}×${state.preview.viewport.height}` },
          { k: 'Process control', v: 'BLOCKED — a web deployment cannot supervise processes' },
        ],
      };
    }
    case 'verify': {
      const ran = context.snapshot.length;
      const gate = aggregate(state.verification?.checks ?? []);
      return {
        ...base,
        source: stage.evidenceSource,
        status: ran === 0 ? 'not-run' : gate === 'pass' ? 'pass' : gate === 'fail' ? 'fail' : 'not-run',
        facts: ran === 0
          ? [{ k: 'Runner', v: 'NOT RUN' }, { k: 'Reason', v: state.adapter.blockers['test.run'] ?? 'NOT STATED' }]
          : context.snapshot.map((check) => ({
              k: check.label,
              v: check.exitCode === null ? check.status.toUpperCase() : `EXIT ${check.exitCode}`,
            })),
      };
    }
    case 'git': {
      const git = context.git;
      if (!git?.available) {
        return {
          ...base,
          source: stage.evidenceSource,
          status: 'blocked',
          facts: [{ k: 'Git state', v: 'NOT CONNECTED' }, { k: 'Reason', v: git?.blocker ?? 'NOT RESOLVED' }],
        };
      }
      return {
        ...base,
        source: stage.evidenceSource,
        status: 'pass',
        facts: [
          { k: 'Branch', v: git.branch ?? 'DETACHED' },
          { k: 'HEAD', v: (git.headSha ?? '').slice(0, 10) },
          { k: 'origin/main', v: (git.originMainSha ?? 'UNREAD').slice(0, 10) },
          { k: 'Working tree', v: git.dirty ? `${git.files.length} CHANGED` : 'CLEAN' },
          { k: 'Ahead / behind', v: `${git.ahead ?? '—'} / ${git.behind ?? '—'}` },
          { k: 'Write capability', v: 'BLOCKED' },
        ],
      };
    }
    case 'release':
    default: {
      return {
        ...base,
        source: stage.evidenceSource,
        status: 'not-run',
        facts: [
          { k: 'Commit', v: 'BLOCKED' },
          { k: 'Push', v: 'BLOCKED' },
          { k: 'CI', v: 'NOT VERIFIED' },
          { k: 'Production', v: 'NOT VERIFIED' },
          { k: 'Reason', v: state.adapter.blockers['deploy.trigger'] ?? 'Release is owned by the pipeline.' },
        ],
      };
    }
  }
}

export { STAGES };
