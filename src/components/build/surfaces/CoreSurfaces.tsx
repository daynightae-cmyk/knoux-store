'use client';

/**
 * Terminal, System, Data, Test, Git and Release surfaces.
 *
 * These share a file because each is a thin, honest projection of one adapter
 * capability, and splitting six small components across six files would add
 * navigation without adding structure. The behaviour that matters is that each
 * one refuses to draw a working control for a capability that does not exist.
 */

import { useCallback, useEffect, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { Blocked, Empty, KV, Pane, Section, StatusBadge } from '../workspace/Primitives';
import { VERIFICATION_CHECKS, measurableScore } from '@/lib/build/verification';
import type { Diagnostic, VerificationCheck } from '@/lib/build/types';

/* ------------------------------------------------------------------ terminal */

export function TerminalSurface() {
  const { state } = useBuildWorkspace();
  const blocker = state.adapter.blockers['terminal.interactive'];

  return (
    <Pane
      title="Terminal"
      meta={<StatusBadge status="blocked" label="UNAVAILABLE" />}
    >
      <Blocked
        title="TERMINAL UNAVAILABLE IN HOSTED MODE"
        body="A browser-hosted deployment has no shell. Nothing on this page can start a process, attach to a TTY, or observe a PID. No prerecorded output is shown in place of a terminal, because a transcript of invented text is not a terminal."
        requirement={
          blocker ??
          'An authenticated KNOuX build bridge running on a trusted host, exposing a constrained command surface to the browser over an authorised channel.'
        }
      />
      <Section label="What this surface will show once a bridge exists">
        <dl className="bo-kv">
          <dt>Session model</dt>
          <dd>DEV · BUILD · TEST · GIT · CUSTOM, each tracking id, command, cwd, pid, start, end, exit code, stdout, stderr.</dd>
          <dt>Status vocabulary</dt>
          <dd>IDLE · RUNNING · SUCCESS · FAILED · STOPPED. Never an ambiguous done state.</dd>
          <dt>Output rendering</dt>
          <dd>Terminal output is untrusted. It is rendered as text nodes, never as markup.</dd>
          <dt>Process safety</dt>
          <dd>A start is refused when a matching process is already listening, so a dev server cannot be duplicated.</dd>
        </dl>
      </Section>
    </Pane>
  );
}

/* -------------------------------------------------------------------- system */

export function SystemSurface() {
  const { state } = useBuildWorkspace();
  const { adapter, project, git, environment, runtime, database } = state;

  return (
    <Pane title="System" meta={<StatusBadge status={state.status} />}>
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Environment">
          <dl className="bo-kv">
            <dt>Adapter</dt>
            <dd>{adapter.label}</dd>
            <dt>Adapter id</dt>
            <dd>{adapter.id}</dd>
            <dt>Mode</dt>
            <dd>{adapter.environment.toUpperCase()}</dd>
            <dt>Project</dt>
            <dd>{project?.name ?? 'UNREAD'}</dd>
            <dt>Root</dt>
            <dd>{project?.root ?? 'UNREAD'}</dd>
            <dt>Framework</dt>
            <dd>{project?.framework ?? 'UNDECLARED'}</dd>
            <dt>Package manager</dt>
            <dd>{project?.packageManager ?? 'UNDECLARED'}</dd>
            <dt>Git available</dt>
            <dd>
              <StatusBadge status={git?.available ? 'available' : 'unavailable'} label={git?.available ? 'YES' : 'NO'} />{' '}
              {git?.blocker}
            </dd>
            <dt>Runtime</dt>
            <dd>
              {runtime.status.toUpperCase()} — {runtime.blocker}
            </dd>
            <dt>Database</dt>
            <dd>
              <StatusBadge status={database?.connected ? 'available' : 'unconfigured'} label={database?.connected ? 'CONNECTED' : 'NO CONNECTION'} />{' '}
              {database?.blocker}
            </dd>
          </dl>
        </Section>

        <div style={{ height: 22 }} />

        <Section label="Configuration presence">
          <p className="bo-note">
            Values are never sent to the browser. Only presence is reported, so this cannot leak a secret.
          </p>
          <div style={{ height: 10 }} />
          <table className="bo-table">
            <thead>
              <tr>
                <th scope="col">Variable</th>
                <th scope="col">Scope</th>
                <th scope="col">Purpose</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {environment.signals.map((signal) => (
                <tr key={signal.name}>
                  <td>{signal.name}</td>
                  <td>{signal.scope}</td>
                  <td>{signal.purpose}</td>
                  <td>
                    <StatusBadge status={signal.present ? 'pass' : 'not-run'} label={signal.present ? 'CONFIGURED' : 'MISSING'} />
                  </td>
                </tr>
              ))}
              {environment.signals.length === 0 ? (
                <tr>
                  <td colSpan={4}>No environment signal was returned by this deployment.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Section>
      </div>
    </Pane>
  );
}

/* ---------------------------------------------------------------------- data */

export function DataSurface() {
  const { state } = useBuildWorkspace();
  const database = state.database;
  const capabilities = database?.capabilities;

  return (
    <Pane title="Data" meta={<StatusBadge status={database?.connected ? 'available' : 'unconfigured'} />}>
      <Blocked
        title={database?.connected ? 'Adapter not implemented' : 'NO DATABASE CONNECTION'}
        body="No Postgres or Supabase adapter is implemented, so no schema, table, column or index can be read. A schema diagram drawn without a connection would be an illustration, not an inspection, so none is drawn."
        requirement={database?.requirement ?? database?.blocker ?? 'A server-side connection string plus a read-only introspection adapter.'}
      />
      <Section label="Declared adapter capability">
        <table className="bo-table">
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {(['schemas', 'tables', 'columns', 'relations', 'query', 'write', 'migrations'] as const).map((key) => (
              <tr key={key}>
                <td>{key}</td>
                <td>
                  <StatusBadge
                    status={capabilities?.[key] ? 'available' : 'blocked'}
                    label={capabilities?.[key] ? 'AVAILABLE' : 'UNAVAILABLE'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="bo-blocked__req">
          A production write additionally requires the DATABASE_WRITE permission level and an elevated, separately
          authenticated path. Browser-side SQL execution is not permitted.
        </p>
      </Section>
    </Pane>
  );
}

/* --------------------------------------------------------------------- tests */

type VerifyResponse = {
  enabled: boolean;
  allowedTasks: string[];
  status: VerificationCheck;
};

export function TestSurface() {
  const { dispatch } = useBuildWorkspace();
  const [runner, setRunner] = useState<VerifyResponse | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{ task: string; snapshot: { checks: VerificationCheck[]; capturedAt: string; headSha: string | null }; diagnostics: Diagnostic[] } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/build/verify', { cache: 'no-store' });
        if (!cancelled && response.ok) setRunner((await response.json()) as VerifyResponse);
      } catch {
        if (!cancelled) setRunner(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(
    async (task: string) => {
      setRunning(task);
      setFailure(null);
      try {
        const response = await fetch('/api/build/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ task }),
        });
        const body = (await response.json()) as {
          snapshot?: { checks: VerificationCheck[]; capturedAt: string; headSha: string | null };
          diagnostics?: Diagnostic[];
          message?: string;
        };
        if (!response.ok || !body.snapshot) {
          setFailure(body.message ?? `The runner responded ${response.status}.`);
          return;
        }
        setResult({ task, snapshot: body.snapshot, diagnostics: body.diagnostics ?? [] });
        dispatch({ type: 'verification/resolved', snapshot: body.snapshot });
        dispatch({ type: 'diagnostics/resolved', diagnostics: body.diagnostics ?? [] });
      } catch (error) {
        setFailure(error instanceof Error ? error.message : 'The runner could not be reached.');
      } finally {
        setRunning(null);
      }
    },
    [dispatch],
  );

  const checks = result?.snapshot.checks ?? [];
  // A score only appears when every tracked check has a real measurement.
  const score = measurableScore(
    VERIFICATION_CHECKS.map((definition) =>
      checks.find((check) => check.id === definition.id) ?? {
        ...definition, exitCode: null, status: 'not-run' as const,
        evidence: 'Not run in this session.', ranAt: null, durationMs: null,
      },
    ),
  );

  return (
    <Pane
      title="Tests"
      meta={<StatusBadge status={runner?.enabled ? 'available' : 'blocked'} label={runner?.enabled ? 'RUNNER ON' : 'RUNNER OFF'} />}
    >
      {!runner?.enabled ? (
        <Blocked
          title="VERIFICATION RUNNER DISABLED"
          body="This deployment refuses to execute package scripts. Only four allowlisted tasks can ever run, and the argument vector is assembled inside the server adapter rather than by the request."
          requirement={runner?.status.evidence}
        >
          <div className="bo-actions">
            {(runner?.allowedTasks ?? ['lint', 'typecheck', 'test', 'build']).map((task) => (
              <button key={task} type="button" className="bo-action" disabled title="Runner disabled on this deployment">
                RUN {task.toUpperCase()}
              </button>
            ))}
          </div>
        </Blocked>
      ) : (
        <div className="bo-pane__body--pad" style={{ padding: 20 }}>
          <Section label="Allowlisted tasks">
            <div className="bo-actions">
              {(runner.allowedTasks ?? []).map((task) => (
                <button
                  key={task}
                  type="button"
                  className="bo-action"
                  disabled={running !== null}
                  onClick={() => void run(task)}
                >
                  {running === task ? 'RUNNING…' : `RUN ${task.toUpperCase()}`}
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}

      {failure ? (
        <Blocked title="Run failed" body={failure} requirement="The allowlisted runner refused the request." />
      ) : null}

      {result ? (
        <div className="bo-pane__body--pad" style={{ padding: 20 }}>
          <Section label={`Result · ${result.task.toUpperCase()}`}>
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
                {checks.map((check) => (
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
            <p className="bo-blocked__req">HEAD at run time: {result.snapshot.headSha ?? 'unknown'}</p>
            {score !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
                <div className="bo-meter" style={{ flex: 1 }}>
                  <div className="bo-meter__fill" data-tone="green" style={{ width: `${score}%` }} />
                </div>
                <span className="bo-status" data-status="pass">{score}%</span>
              </div>
            ) : null}
            {result.diagnostics.length > 0 ? (
              <>
                <div style={{ height: 14 }} />
                <Section label={`Normalised diagnostics · ${result.diagnostics.length}`}>
                  {result.diagnostics.map((diagnostic) => (
                    <div key={diagnostic.id} style={{ borderLeft: '2px solid var(--bo-line-bright)', paddingLeft: 12, marginBottom: 10 }}>
                      <div className="bo-status" data-status={diagnostic.status === 'fail' ? 'fail' : 'not-run'}>
                        {diagnostic.source.toUpperCase()} · {diagnostic.severity.toUpperCase()}
                        {diagnostic.line ? ` · ${diagnostic.file}:${diagnostic.line}` : ''}
                      </div>
                      <p className="bo-note" style={{ marginTop: 4 }}>{diagnostic.message}</p>
                      {diagnostic.rootCause ? (
                        <p className="bo-blocked__req">Root cause: {diagnostic.rootCause}</p>
                      ) : (
                        <p className="bo-blocked__req">
                          Root cause not established. The evidence below is correlation only.
                        </p>
                      )}
                    </div>
                  ))}
                </Section>
              </>
            ) : null}
          </Section>
        </div>
      ) : null}

      {!result && runner?.enabled ? (
        <Empty title="No run in this session" body="Run a task to capture a real exit code against a real HEAD." />
      ) : null}
    </Pane>
  );
}

/* ----------------------------------------------------------------------- git */

export function GitSurface() {
  const { state } = useBuildWorkspace();
  const git = state.git;

  if (!git?.available) {
    return (
      <Pane title="Git" meta={<StatusBadge status="unavailable" />}>
        <Blocked
          title="GIT STATE UNAVAILABLE"
          body={git?.blocker ?? 'Git state could not be read.'}
          requirement="A deployment that ships a .git directory. Production builds ship source without history, so there is nothing honest to show."
        />
      </Pane>
    );
  }

  return (
    <Pane title="Git" meta={<StatusBadge status="available" label="READ ONLY" />}>
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Snapshot">
          <dl className="bo-kv">
            <dt>Branch</dt>
            <dd>{git.branch ?? 'DETACHED'}</dd>
            <dt>HEAD</dt>
            <dd>{git.headSha}</dd>
            <dt>origin/main</dt>
            <dd>{git.originMainSha ?? 'UNREAD'}</dd>
            <dt>Working tree</dt>
            <dd>{git.dirty ? `${git.files.length} changed` : 'CLEAN'}</dd>
            <dt>Ahead / behind</dt>
            <dd>
              {git.ahead ?? '—'} / {git.behind ?? '—'}
            </dd>
            <dt>Write capability</dt>
            <dd>
              <StatusBadge status="blocked" label="BLOCKED" /> {state.adapter.blockers['git.write']}
            </dd>
          </dl>
        </Section>

        <div style={{ height: 22 }} />

        <Section label={`Changed files · ${git.files.length}`}>
          {git.files.length === 0 ? (
            <p className="bo-note">The working tree is clean. No local, staged or untracked change exists.</p>
          ) : (
            <table className="bo-table">
              <thead>
                <tr>
                  <th scope="col">State</th>
                  <th scope="col">Path</th>
                </tr>
              </thead>
              <tbody>
                {git.files.map((file) => (
                  <tr key={`${file.state}:${file.path}`}>
                    <td>
                      <StatusBadge
                        status={file.state === 'untracked' ? 'not-run' : file.state === 'staged' ? 'pass' : 'partial'}
                        label={file.state.toUpperCase()}
                      />
                    </td>
                    <td>{file.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <div style={{ height: 22 }} />

        <Section label="Recent commits">
          <table className="bo-table">
            <thead>
              <tr>
                <th scope="col">SHA</th>
                <th scope="col">Subject</th>
                <th scope="col">Author</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {git.commits.map((commit) => (
                <tr key={commit.sha}>
                  <td>{commit.sha.slice(0, 8)}</td>
                  <td>{commit.subject}</td>
                  <td>{commit.author}</td>
                  <td>{commit.at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="bo-blocked__req">
            A local commit is not a push, a push is not a green check, a green check is not a merge, and a merge is
            not a deployment. These states are tracked separately and are not collapsed anywhere in this surface.
          </p>
        </Section>
      </div>
    </Pane>
  );
}

/* ------------------------------------------------------------------- release */

const STAGES: { id: string; label: string; check: string | null }[] = [
  { id: 'local', label: 'LOCAL', check: 'diff-check' },
  { id: 'test', label: 'TEST', check: 'test' },
  { id: 'build', label: 'BUILD', check: 'build' },
  { id: 'ci', label: 'CI', check: 'ci' },
  { id: 'deploy', label: 'DEPLOYMENT', check: 'deployment' },
];

export function ReleaseSurface() {
  const { state } = useBuildWorkspace();
  const snapshot = state.verification;
  const byId = new Map((snapshot?.checks ?? []).map((check) => [check.id, check]));

  const stages = STAGES.map((stage) => {
    const check = stage.check ? byId.get(stage.check) : null;
    const status = stage.id === 'local'
      ? state.git?.dirty === false
        ? 'pass'
        : state.git?.available
          ? 'partial'
          : 'not-run'
      : check?.status ?? 'not-run';
    return { ...stage, status, check };
  });

  const score = measurableScore(VERIFICATION_CHECKS.map((definition) => {
    const found = byId.get(definition.id);
    return found ?? { ...definition, exitCode: null, status: 'not-run' as const, evidence: 'Not run in this session.', ranAt: null, durationMs: null };
  }));

  return (
    <Pane title="Release" meta={<StatusBadge status={snapshot ? 'partial' : 'not-run'} />}>
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Stage evidence">
          <table className="bo-table">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Command</th>
                <th scope="col">Exit</th>
                <th scope="col">Evidence</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id}>
                  <td>{stage.label}</td>
                  <td>{stage.check?.command ?? '—'}</td>
                  <td>{stage.check?.exitCode ?? '—'}</td>
                  <td style={{ maxWidth: 320 }}>
                    {stage.id === 'local'
                      ? state.git?.available
                        ? state.git.dirty
                          ? `${state.git.files.length} files changed in the working tree.`
                          : 'Working tree clean.'
                        : 'Git unavailable on this deployment.'
                      : (stage.check?.evidence ?? 'Not run in this session.')}
                  </td>
                  <td>
                    <StatusBadge status={stage.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div style={{ height: 20 }} />

        <Section label="Score">
          {score === null ? (
            <p className="bo-note">
              No score is shown. A score is only produced when every tracked check has a real measurement, because a
              percentage over a partly unrun set is a misleading number rather than a useful one.
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="bo-meter" style={{ flex: 1 }}>
                <div className="bo-meter__fill" data-tone="green" style={{ width: `${score}%` }} />
              </div>
              <span className="bo-status" data-status="pass">
                {score}%
              </span>
            </div>
          )}
        </Section>

        <div style={{ height: 20 }} />

        <Section label="Not runnable from this surface">
          <KV
            rows={[
              { k: 'COMMIT', v: <StatusBadge status="blocked" label="BLOCKED" /> },
              { k: 'PUSH', v: <StatusBadge status="blocked" label="BLOCKED" /> },
              { k: 'PR', v: <StatusBadge status="blocked" label="BLOCKED" /> },
              { k: 'MERGE', v: <StatusBadge status="blocked" label="BLOCKED" /> },
              { k: 'DEPLOY', v: <StatusBadge status="blocked" label="BLOCKED" /> },
            ]}
          />
          <p className="bo-blocked__req">
            {state.adapter.blockers['deploy.trigger'] ??
              'Release is owned by the pipeline. A page that can merge or deploy would let any visitor ship code.'}
          </p>
        </Section>
      </div>
    </Pane>
  );
}
