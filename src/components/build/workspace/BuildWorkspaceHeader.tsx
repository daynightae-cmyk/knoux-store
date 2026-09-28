'use client';

import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import { useBuildWorkspace } from './KnouxBuildWorkspace';

/** The canonical mark, so the workspace header carries the same identity. */
function HeadGlyph() {
  return (
    <svg className="bo-head__glyph" viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} aria-hidden="true" focusable="false">
      {MARK_PATHS.map((path) => (
        <path key={path.id} d={path.d} fill="none" stroke="var(--bo-violet)" strokeWidth="10" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

type Fact = { k: string; v: string; tone?: 'violet' | 'green' | 'amber' | 'red' | 'dim' };

/** Everything below is derived from a fetched fact or the explicit absence of one. */
export function BuildWorkspaceHeader({ intentSummary }: { intentSummary: string | null }) {
  const { state } = useBuildWorkspace();
  const { adapter, project, git, ai, runtime, environment } = state;

  const facts: Fact[] = [];

  facts.push({
    k: 'Environment',
    v: adapter.environment.toUpperCase(),
    tone: adapter.environment === 'production' ? 'violet' : 'green',
  });

  facts.push({
    k: 'Project',
    v: project?.name ?? 'UNREAD',
    tone: project ? undefined : 'amber',
  });

  facts.push({
    k: 'Framework',
    v: project?.framework ?? 'UNDECLARED',
    tone: project?.framework ? undefined : 'dim',
  });

  facts.push({
    k: 'Branch',
    v: git?.branch ?? (git?.available === false ? 'NO .git' : 'UNREAD'),
    tone: git?.branch ? 'green' : 'dim',
  });

  facts.push({
    k: 'Head',
    v: git?.headSha ? git.headSha.slice(0, 10) : 'UNREAD',
    tone: git?.headSha ? undefined : 'dim',
  });

  facts.push({
    k: 'Working tree',
    v: git?.available
      ? git.dirty
        ? `${git.files.length} CHANGED`
        : 'CLEAN'
      : 'UNKNOWN',
    tone: git?.dirty ? 'amber' : git?.available ? 'green' : 'dim',
  });

  facts.push({
    k: 'Runtime',
    v: runtime.status.toUpperCase(),
    tone: runtime.status === 'running' ? 'green' : 'dim',
  });

  facts.push({
    k: 'Senshial',
    v: ai.mode.toUpperCase(),
    tone: ai.mode === 'execute' ? 'amber' : 'violet',
  });

  facts.push({
    k: 'Routing',
    v: ai.routing?.status === 'resolved'
      ? `${ai.routing.providerId?.toUpperCase() ?? '—'} / ${(ai.routing.modelId ?? '—').toUpperCase()}`
      : 'UNAVAILABLE',
    tone: ai.routing?.status === 'resolved' ? 'green' : 'dim',
  });

  facts.push({
    k: 'Config',
    v: `${environment.signals.filter((signal) => signal.present).length}/${environment.signals.length}`,
    tone: environment.signals.some((signal) => signal.present) ? 'violet' : 'dim',
  });

  return (
    <header className="bo-head">
      <div className="bo-head__ident">
        <HeadGlyph />
        <div className="bo-head__title">
          <span className="bo-head__name">KNOuX Build OS</span>
          <span className="bo-head__sub">
            {intentSummary ? intentSummary : 'INTENT NOT COMPILED'}
            {adapter.id !== 'pending' ? ` · ${adapter.label}` : ''}
          </span>
        </div>
      </div>
      <div className="bo-head__strip">
        {facts.map((fact) => (
          <div className="bo-fact" key={fact.k}>
            <span className="bo-fact__k">{fact.k}</span>
            <span className="bo-fact__v" data-tone={fact.tone ?? 'default'} title={fact.v}>
              {fact.v}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}
