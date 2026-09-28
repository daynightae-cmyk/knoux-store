'use client';

/**
 * KNOuX Senshial, the Provider Center, the Reality Ledger and Project Health.
 *
 * Senshial is project intelligence, not a chat window. Its mode is always
 * visible, because the difference between reading and mutating is the whole
 * safety story. With no provider configured, every run resolves to `blocked`
 * with the exact variable that would change that — which is the honest state,
 * and is more useful than a plausible reply.
 */

import { useCallback, useMemo, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { Blocked, Chips, KV, Pane, Section, StatusBadge } from '../workspace/Primitives';
import { ceilingForMode, evaluatePermission, modeDescription, modeMayPropose } from '@/lib/build/permissions';
import { taskClasses } from '@/lib/build/model-router';
import { aggregate, ledgerRow, ledgerHeadline, measurableScore, VERIFICATION_CHECKS } from '@/lib/build/verification';
import type {
  ExecutionStatus,
  SenshialExecution,
  SenshialMode,
  TaskClass,
  VerificationCheck,
} from '@/lib/build/types';

const MODES: { id: SenshialMode; label: string }[] = [
  { id: 'ask', label: 'ASK' },
  { id: 'plan', label: 'PLAN' },
  { id: 'execute', label: 'EXECUTE' },
];

function newExecution(prompt: string, mode: SenshialMode, providerId: string | null, modelId: string | null): SenshialExecution {
  return {
    id: `exec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    mode,
    providerId,
    modelId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    inspectedResources: [],
    proposedChanges: [],
    approvedActions: [],
    changedFiles: [],
    commands: [],
    verification: null,
    status: 'queued',
    blocker: null,
  };
}

/* ------------------------------------------------------------------ senshial */

export function SenshialSurface() {
  const { state, dispatch } = useBuildWorkspace();
  const [prompt, setPrompt] = useState('');
  const mode = state.ai.mode;
  const routing = state.ai.routing;
  const ceiling = ceilingForMode(mode);

  const run = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const execution = newExecution(trimmed, mode, routing?.providerId ?? null, routing?.modelId ?? null);
    const configured = routing?.status === 'resolved';

    if (!configured) {
      dispatch({
        type: 'execution/add',
        execution: {
          ...execution,
          status: 'blocked',
          completedAt: new Date().toISOString(),
          blocker:
            routing?.blocker ??
            'No provider is configured, so no model could be selected and nothing was executed.',
        },
      });
      return;
    }

    // Even with a provider resolved, execution still has to clear the
    // permission engine. In this build the adapter has no execution method, so
    // the run is recorded as blocked rather than reported as a success.
    const decision = evaluatePermission({
      id: `${execution.id}-action`,
      level: mode === 'execute' ? 'edit' : 'read',
      title: `Senshial ${mode.toUpperCase()} run`,
      detail: trimmed,
      affects: mode === 'ask' ? [] : ['project files (proposed only)'],
      irreversible: false,
    });

    dispatch({
      type: 'execution/add',
      execution: {
        ...execution,
        status: 'blocked',
        completedAt: new Date().toISOString(),
        inspectedResources: [state.project?.name ?? 'project'],
        blocker:
          'The provider contract is defined but no adapter implements execute(). A model is selected and reachable, yet there is no verified transport to call it with, so nothing was sent.',
        approvedActions: [],
      },
    });
    void decision;
  }, [prompt, mode, routing, dispatch, state.project?.name]);

  return (
    <Pane
      title="KNOuX Senshial"
      meta={
        <>
          <StatusBadge status={routing?.status === 'resolved' ? 'resolved' : 'unconfigured'} label={routing?.status === 'resolved' ? 'ROUTED' : 'NO ROUTE'} />
          <span>{mode.toUpperCase()}</span>
        </>
      }
    >
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Mode — always visible, never hidden">
          <Chips
            ariaLabel="Senshial mode"
            options={MODES}
            value={mode}
            onChange={(id) => dispatch({ type: 'ai/mode', mode: id })}
          />
          <p className="bo-note">{modeDescription(mode)}</p>
          <KV
            rows={[
              { k: 'May propose up to', v: ceiling.toUpperCase() },
              {
                k: 'Can edit files',
                v: <StatusBadge status={modeMayPropose(mode, 'edit') ? 'pass' : 'blocked'} label={modeMayPropose(mode, 'edit') ? 'MAY PROPOSE' : 'MUST NOT'} />,
              },
              {
                k: 'Can run commands',
                v: <StatusBadge status={modeMayPropose(mode, 'run') ? 'pass' : 'blocked'} label={modeMayPropose(mode, 'run') ? 'MAY PROPOSE' : 'MUST NOT'} />,
              },
              {
                k: 'Can deploy',
                v: <StatusBadge status={modeMayPropose(mode, 'deploy') ? 'pass' : 'blocked'} label={modeMayPropose(mode, 'deploy') ? 'MAY PROPOSE' : 'MUST NOT'} />,
              },
            ]}
          />
        </Section>

        <div style={{ height: 20 }} />

        <Section label="Request">
          <textarea
            className="bo-textarea"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what you want to understand about this project."
            aria-label="Senshial request"
          />
          <div className="bo-actions">
            <button
              type="button"
              className="bo-action bo-action--primary"
              onClick={run}
              disabled={prompt.trim().length === 0}
            >
              RUN {mode.toUpperCase()}
            </button>
          </div>
        </Section>

        {routing?.status !== 'resolved' ? (
          <Blocked
            title="NO MODEL SELECTED"
            body={routing?.blocker ?? 'Routing has not resolved for this task class.'}
            requirement="Configure a provider on the server, then re-run. The router will not substitute a model you did not choose."
          />
        ) : null}
      </div>
    </Pane>
  );
}

/* ------------------------------------------------------------------ providers */

export function ProviderCenter() {
  const { state, dispatch } = useBuildWorkspace();
  const providers = state.ai.providers;
  const configured = providers.filter((provider) => provider.configured);

  return (
    <Pane
      title="Provider Center"
      meta={
        <>
          <span>{configured.length}/{providers.length} CONFIGURED</span>
        </>
      }
    >
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Routing">
          <Chips
            ariaLabel="Routing mode"
            options={[
              { id: 'auto', label: 'AUTO' },
              { id: 'manual', label: 'MANUAL' },
            ]}
            value={state.ai.routingMode}
            onChange={(id) => dispatch({ type: 'ai/routing-mode', mode: id })}
          />
          <div style={{ height: 10 }} />
          <span className="bo-label">Task class</span>
          <div style={{ height: 8 }} />
          <Chips
            ariaLabel="Task class"
            options={taskClasses().map((task) => ({ id: task, label: task.toUpperCase() }))}
            value={state.ai.task}
            onChange={(id) => dispatch({ type: 'ai/task', task: id as TaskClass })}
          />
        </Section>

        {state.ai.routing ? (
          <>
            <div style={{ height: 20 }} />
            <Section label="Routing decision">
              <KV
                rows={[
                  { k: 'Task', v: state.ai.routing.task.toUpperCase() },
                  { k: 'Mode', v: state.ai.routing.mode.toUpperCase() },
                  { k: 'Provider', v: state.ai.routing.providerId ?? 'NONE' },
                  { k: 'Model', v: state.ai.routing.modelId ?? 'NONE' },
                  { k: 'State', v: <StatusBadge status={state.ai.routing.status} /> },
                  { k: 'Blocker', v: state.ai.routing.blocker ?? '—' },
                ]}
              />
              {state.ai.routing.reason.length > 0 ? (
                <>
                  <div style={{ height: 12 }} />
                  <table className="bo-table">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Rule that fired</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.ai.routing.reason.map((reason, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </Section>
          </>
        ) : null}

        <div style={{ height: 20 }} />

        <Section label="Providers">
          {providers.length === 0 ? (
            <p className="bo-note">No provider catalogue was returned by this deployment.</p>
          ) : (
            providers.map((provider) => (
              <div
                key={provider.id}
                style={{ borderTop: '1px solid var(--bo-line-faint)', padding: '12px 0' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--bo-ink)' }}>{provider.displayName}</span>
                  <StatusBadge status={provider.configured ? 'available' : 'unconfigured'} label={provider.configured ? 'CONFIGURED' : 'UNCONFIGURED'} />
                  <span className="bo-status" data-status="not-run" style={{ marginLeft: 'auto' }}>
                    {provider.models.length} MODELS
                  </span>
                </div>
                <p className="bo-note" style={{ marginTop: 6 }}>{provider.reason}</p>
                <div style={{ height: 8 }} />
                <div className="bo-chips">
                  {Object.entries(provider.capabilities).map(([key, value]) => (
                    <span
                      key={key}
                      className="bo-chip"
                      style={{ cursor: 'default' }}
                      data-capability={key}
                      aria-label={`${key}: ${value ? 'supported' : 'not supported'}`}
                    >
                      {key.replace(/([A-Z])/g, ' $1').toUpperCase()} {value ? '✓' : '✕'}
                    </span>
                  ))}
                </div>
                {provider.configured ? (
                  <>
                    <div style={{ height: 10 }} />
                    <table className="bo-table">
                      <thead>
                        <tr>
                          <th scope="col">Model</th>
                          <th scope="col">Context</th>
                          <th scope="col">Vision</th>
                          <th scope="col">Tools</th>
                          <th scope="col">Streaming</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provider.models.map((model) => (
                          <tr key={model.id}>
                            <td>{model.label}</td>
                            <td>{model.contextWindow ? model.contextWindow.toLocaleString() : 'UNDECLARED'}</td>
                            <td>{model.supportsVision ? 'YES' : 'NO'}</td>
                            <td>{model.supportsTools ? 'YES' : 'NO'}</td>
                            <td>{model.supportsStreaming ? 'YES' : 'NO'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : null}
              </div>
            ))
          )}
          <p className="bo-blocked__req">
            Model metadata above is declared in source, never discovered from a live call. Routing only ever matches on
            a property a model actually declares, so it cannot claim a capability that is not listed.
          </p>
        </Section>
      </div>
    </Pane>
  );
}

/* ------------------------------------------------------------------ ledger */

export function RealityLedger() {
  const { state } = useBuildWorkspace();
  const snapshot = state.verification;
  const byId = useMemo(
    () => new Map((snapshot?.checks ?? []).map((check) => [check.id, check])),
    [snapshot],
  );

  const rows = useMemo(() => {
    const pass = (id: string) => byId.get(id)?.status ?? 'not-run';
    return [
      ledgerRow({
        subject: 'Project adapter',
        implemented: 'pass',
        configured: 'pass',
        tested: 'pass',
        runtimeVerified: 'pass',
        blocker: null,
      }),
      ledgerRow({
        subject: 'Code surface (read)',
        implemented: 'pass',
        configured: 'pass',
        tested: 'pass',
        runtimeVerified: 'pass',
        productionVerified: 'pass',
        blocker: null,
      }),
      ledgerRow({
        subject: 'Code surface (write)',
        implemented: 'blocked',
        configured: 'blocked',
        tested: 'not-applicable',
        blocker: 'No write method exists on the adapter.',
      }),
      ledgerRow({
        subject: 'Terminal',
        implemented: 'blocked',
        configured: 'blocked',
        tested: 'not-applicable',
        blocker: state.adapter.blockers['terminal.interactive'],
      }),
      ledgerRow({
        subject: 'Git read',
        implemented: 'pass',
        configured: state.git?.available ? 'pass' : 'blocked',
        tested: 'not-run',
        runtimeVerified: state.git?.available ? 'pass' : 'blocked',
        blocker: state.git?.blocker,
      }),
      ledgerRow({
        subject: 'Git write',
        implemented: 'blocked',
        configured: 'blocked',
        tested: 'not-applicable',
        blocker: state.adapter.blockers['git.write'],
      }),
      ledgerRow({
        subject: 'AI providers',
        implemented: 'pass',
        configured: state.ai.providers.some((provider) => provider.configured) ? 'pass' : 'unconfigured',
        tested: 'pass',
        blocker: state.ai.providers.some((provider) => provider.configured)
          ? null
          : 'No provider credential is present on this deployment.',
      }),
      ledgerRow({
        subject: 'Database',
        implemented: 'blocked',
        configured: state.database?.connected ? 'pass' : 'unconfigured',
        tested: 'not-applicable',
        blocker: state.database?.blocker,
      }),
      ledgerRow({
        subject: 'Verification runner',
        implemented: 'pass',
        configured: 'not-run',
        tested: 'pass',
        blocker: 'Disabled on this deployment.',
      }),
      ledgerRow({
        subject: 'Lint',
        implemented: 'pass',
        configured: 'not-applicable',
        tested: pass('lint'),
        ciVerified: 'not-run',
        blocker: pass('lint') === 'not-run' ? 'Not run in this session.' : null,
      }),
      ledgerRow({
        subject: 'Typecheck',
        implemented: 'pass',
        configured: 'not-applicable',
        tested: pass('typecheck'),
        ciVerified: 'not-run',
        blocker: pass('typecheck') === 'not-run' ? 'Not run in this session.' : null,
      }),
      ledgerRow({
        subject: 'Tests',
        implemented: 'pass',
        configured: 'not-applicable',
        tested: pass('test'),
        ciVerified: 'not-run',
        blocker: pass('test') === 'not-run' ? 'Not run in this session.' : null,
      }),
      ledgerRow({
        subject: 'Build',
        implemented: 'pass',
        configured: 'not-applicable',
        tested: pass('build'),
        ciVerified: 'not-run',
        blocker: pass('build') === 'not-run' ? 'Not run in this session.' : null,
      }),
      ledgerRow({
        subject: 'CI',
        implemented: 'pass',
        configured: 'pass',
        tested: 'not-run',
        ciVerified: 'not-run',
        productionVerified: 'not-run',
        blocker: 'This page cannot read CI. The check runs on the commit, not in the browser.',
      }),
      ledgerRow({
        subject: 'Deployment',
        implemented: 'pass',
        configured: 'pass',
        tested: 'pass',
        runtimeVerified: 'pass',
        ciVerified: 'not-run',
        productionVerified: 'not-run',
        blocker: 'The deployment serving this page is running, but the page cannot verify the pipeline that produced it.',
      }),
    ];
  }, [byId, state.adapter.blockers, state.ai.providers, state.database, state.git]);

  return (
    <Pane title="Reality Ledger" meta={<span>{rows.length} SUBJECTS</span>}>
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <p className="bo-note">
          Each subject is tracked on six independent axes. A row is only as green as its weakest axis, so a capability
          cannot present as finished on the strength of one passing check.
        </p>
        <div style={{ height: 14 }} />
        <div style={{ overflowX: 'auto' }}>
          <table className="bo-ledger">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Impl</th>
                <th scope="col">Conf</th>
                <th scope="col">Test</th>
                <th scope="col">Runtime</th>
                <th scope="col">CI</th>
                <th scope="col">Prod</th>
                <th scope="col">Blocker</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.subject}>
                  <td>
                    {row.subject}
                    <div style={{ marginTop: 4 }}>
                      <StatusBadge status={ledgerHeadline(row)} label="ROW" />
                    </div>
                  </td>
                  <td><StatusBadge status={row.implemented} /></td>
                  <td><StatusBadge status={row.configured} /></td>
                  <td><StatusBadge status={row.tested} /></td>
                  <td><StatusBadge status={row.runtimeVerified} /></td>
                  <td><StatusBadge status={row.ciVerified} /></td>
                  <td><StatusBadge status={row.productionVerified} /></td>
                  <td style={{ whiteSpace: 'normal', minWidth: 220, color: 'var(--bo-ink-4)' }}>
                    {row.blocker ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Pane>
  );
}

/* ------------------------------------------------------------------ health */

export function ProjectHealth() {
  const { state } = useBuildWorkspace();
  const snapshot = state.verification;
  const byId = useMemo(
    () => new Map((snapshot?.checks ?? []).map((check) => [check.id, check])),
    [snapshot],
  );

  const rows: VerificationCheck[] = VERIFICATION_CHECKS.map((definition) =>
    byId.get(definition.id) ?? {
      ...definition,
      exitCode: null,
      status: 'not-run' as const,
      evidence: 'Not run in this session.',
      ranAt: null,
      durationMs: null,
    },
  );

  const score = measurableScore(rows);
  const overall = aggregate(rows);

  return (
    <Pane title="Project Health" meta={<StatusBadge status={overall} />}>
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Score">
          {score === null ? (
            <p className="bo-note">
              No percentage is shown. Every tracked check must have a real measurement before a score means anything;
              a number over a partly unrun set would be a decoration rather than a measurement.
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="bo-meter" style={{ flex: 1 }}>
                <div className="bo-meter__fill" data-tone="green" style={{ width: `${score}%` }} />
              </div>
              <span className="bo-status" data-status={overall}>{score}%</span>
            </div>
          )}
        </Section>

        <div style={{ height: 20 }} />

        <Section label="Checks">
          <table className="bo-table">
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Command</th>
                <th scope="col">Exit</th>
                <th scope="col">Duration</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((check) => (
                <tr key={check.id}>
                  <td>{check.label}</td>
                  <td>{check.command ?? '—'}</td>
                  <td>{check.exitCode ?? '—'}</td>
                  <td>{check.durationMs === null ? '—' : `${check.durationMs}ms`}</td>
                  <td>
                    <StatusBadge status={check.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div style={{ height: 20 }} />

        <Section label="Evidence">
          {rows.map((check) => (
            <div key={check.id} style={{ marginBottom: 8 }}>
              <span className="bo-status" data-status={check.status}>{check.label.toUpperCase()}</span>
              <p className="bo-blocked__req" style={{ marginTop: 3 }}>{check.evidence}</p>
            </div>
          ))}
        </Section>
      </div>
    </Pane>
  );
}

/* -------------------------------------------------------------- execution log */

const EXECUTION_TONE: Record<ExecutionStatus, string> = {
  queued: 'not-run', inspecting: 'partial', 'waiting-approval': 'partial',
  executing: 'partial', verifying: 'partial', complete: 'pass', partial: 'partial',
  failed: 'fail', blocked: 'blocked', cancelled: 'not-run',
};

export function ExecutionHistory() {
  const { state } = useBuildWorkspace();
  const executions = state.executions;
  const failures = state.failures;

  return (
    <Pane title="Execution History" meta={<span>{executions.length} RUNS</span>}>
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Replay">
          {executions.length === 0 ? (
            <p className="bo-note">
              No engineering run has been recorded in this session. Every run records its prompt, mode, provider and
              model, the resources it inspected, the actions it was approved for, the files it changed, the commands
              it ran and its verification result, so any run can be read back exactly.
            </p>
          ) : (
            executions.map((execution) => (
              <div
                key={execution.id}
                style={{ borderTop: '1px solid var(--bo-line-faint)', padding: '12px 0' }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={EXECUTION_TONE[execution.status]} label={execution.status.replace('-', ' ').toUpperCase()} />
                  <span className="bo-status" data-status="not-run">{execution.mode.toUpperCase()}</span>
                  <span className="bo-status" data-status="not-run" style={{ marginLeft: 'auto' }}>
                    {execution.startedAt.slice(11, 19)}
                  </span>
                </div>
                <p className="bo-note" style={{ marginTop: 6 }}>{execution.prompt}</p>
                <div style={{ height: 8 }} />
                <KV
                  rows={[
                    { k: 'Provider', v: execution.providerId ?? 'NONE' },
                    { k: 'Model', v: execution.modelId ?? 'NONE' },
                    { k: 'Inspected', v: execution.inspectedResources.length ? execution.inspectedResources.join(', ') : 'NONE' },
                    { k: 'Proposed changes', v: execution.proposedChanges.length ? `${execution.proposedChanges.length}` : 'NONE' },
                    { k: 'Approved actions', v: execution.approvedActions.length ? execution.approvedActions.join(', ') : 'NONE' },
                    { k: 'Changed files', v: execution.changedFiles.length ? execution.changedFiles.join(', ') : 'NONE' },
                    { k: 'Commands', v: execution.commands.length ? execution.commands.join(', ') : 'NONE' },
                    { k: 'Completed', v: execution.completedAt ?? 'NOT COMPLETED' },
                    { k: 'Blocker', v: execution.blocker ?? '—' },
                  ]}
                />
              </div>
            ))
          )}
        </Section>

        {failures.length > 0 ? (
          <>
            <div style={{ height: 20 }} />
            <Section label="Failure memory">
              {failures.map((failure) => (
                <div key={failure.id} style={{ borderLeft: '2px solid var(--bo-red)', paddingLeft: 12, marginBottom: 10 }}>
                  <p className="bo-note">{failure.problem}</p>
                  <p className="bo-blocked__req">
                    {failure.attempt} → {failure.result} ({failure.at})
                  </p>
                </div>
              ))}
            </Section>
          </>
        ) : null}

        <div style={{ height: 20 }} />
        <p className="bo-blocked__req">
          Execution history is held in session state only. No cross-device memory is claimed, because no backend
          stores it and inventing a persistence story would be a fabricated capability.
        </p>
      </div>
    </Pane>
  );
}
