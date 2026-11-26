'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  GENERATED_PROJECT_CONFIRMATION,
  GENERATED_PROJECT_DEPLOY_CONFIRMATION,
  type GeneratedProjectPlan,
  type GeneratedRuntimeReceipt,
} from '@/lib/build/generated-project-contract';
import styles from './preview-workspace.module.css';

type HostAccess = { state: 'checking' | 'enabled' | 'disabled' | 'forbidden' | 'unreachable'; message: string };

const RECEIPT_LABELS: Record<GeneratedRuntimeReceipt['state'], string> = {
  validating: 'VALIDATING PROPOSED FILES',
  built: 'BUILD COMPLETE · SOURCE → COMPILED',
  exported: 'EXPORTED · ZIP BUNDLE READY',
  ready: 'PREVIEW LIVE',
  deployed: 'DEPLOYED · LOCAL PUBLISH APPLIED',
  stopped: 'STOPPED',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
};

function byteLabel(value: number) {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KiB`;
}

/**
 * Review and apply one bounded static artifact on the trusted host.
 *
 * Planning produced the files; nothing here writes until an allowlisted
 * same-origin operator checks every file and submits the exact confirmation.
 * The receipt is the only execution evidence this component displays.
 */
export function GeneratedProjectExecution({ artifact, onReceipt, compact = false }: {
  artifact: GeneratedProjectPlan;
  onReceipt?: (receipt: GeneratedRuntimeReceipt | null) => void;
  compact?: boolean;
}) {
  const fingerprint = useMemo(() => JSON.stringify(artifact), [artifact]);
  const files = useMemo(() => artifact.files.map((file) => ({
    path: file.path,
    bytes: new TextEncoder().encode(file.content).byteLength,
    content: file.content,
  })), [artifact]);
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const [host, setHost] = useState<HostAccess>({ state: 'checking', message: 'Inspecting the trusted execution host…' });
  const [digest, setDigest] = useState<{ fingerprint: string; value: string } | null>(null);
  const [reviewedFor, setReviewedFor] = useState<string | null>(null);
  const [phrase, setPhrase] = useState('');
  const [deployPhrase, setDeployPhrase] = useState('');
  const [deployReviewedFor, setDeployReviewedFor] = useState<string | null>(null);
  const [result, setResult] = useState<{ fingerprint: string; receipt: GeneratedRuntimeReceipt } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deployBusy, setDeployBusy] = useState(false);
  const [cancelDeployBusy, setCancelDeployBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const receipt = result?.fingerprint === fingerprint ? result.receipt : null;
  const reviewDigest = digest?.fingerprint === fingerprint ? digest.value : null;
  const confirmed = reviewedFor === fingerprint && phrase === GENERATED_PROJECT_CONFIRMATION;
  const deployConfirmed = deployReviewedFor === fingerprint && deployPhrase === GENERATED_PROJECT_DEPLOY_CONFIRMATION;
  const live = receipt?.state === 'ready' || receipt?.state === 'deployed';
  const canEmbed = typeof window !== 'undefined' && window.location.protocol === 'http:';
  const deployable = receipt?.state === 'exported' || receipt?.state === 'ready' || receipt?.state === 'deployed';
  const alreadyDeployed = receipt?.deploy?.status === 'applied';

  useEffect(() => {
    let active = true;
    void fetch('/api/build/generated-projects', { cache: 'no-store' })
      .then(async (response) => {
        const value = await response.json().catch(() => null) as { enabled?: boolean; message?: string } | null;
        if (!active) return;
        if (response.ok && value?.enabled) {
          setHost({ state: 'enabled', message: 'Trusted static execution is enabled for this allowlisted operator.' });
        } else if (response.status === 401 || response.status === 403) {
          setHost({ state: 'forbidden', message: value?.message ?? 'Generated project writes require a same-origin allowlisted operator.' });
        } else if (response.status === 503) {
          setHost({ state: 'disabled', message: value?.message ?? 'Static execution is disabled on this host.' });
        } else {
          setHost({ state: 'unreachable', message: value?.message ?? 'The execution host could not be inspected.' });
        }
      })
      .catch(() => { if (active) setHost({ state: 'unreachable', message: 'The execution host could not be reached.' }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const encoder = new TextEncoder();
    void crypto.subtle.digest('SHA-256', encoder.encode(fingerprint))
      .then((value) => { if (active) setDigest({ fingerprint, value: [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [fingerprint]);

  async function readError(response: Response) {
    const value = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    return value?.message ?? value?.error ?? `The trusted host answered HTTP ${response.status}.`;
  }

  async function apply() {
    if (!confirmed || busy || host.state !== 'enabled') return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/build/generated-projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationId: crypto.randomUUID(), artifact, confirmation: GENERATED_PROJECT_CONFIRMATION }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const value = await response.json() as { receipt?: GeneratedRuntimeReceipt };
      if (!value.receipt) throw new Error('The host returned no execution receipt.');
      setResult({ fingerprint, receipt: value.receipt });
      onReceipt?.(value.receipt);
      setReviewedFor(null);
      setPhrase('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The static project could not be applied.');
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!receipt || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/build/generated-projects/${receipt.operationId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readError(response));
      const value = await response.json() as { receipt?: GeneratedRuntimeReceipt };
      if (!value.receipt) throw new Error('The host returned no cancellation receipt.');
      setResult({ fingerprint, receipt: value.receipt });
      onReceipt?.(value.receipt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The preview could not be stopped.');
    } finally {
      setBusy(false);
    }
  }

  async function deploy() {
    if (!deployConfirmed || deployBusy || !deployable || alreadyDeployed) return;
    setDeployBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/build/generated-projects/${receipt!.operationId}/deploy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target: 'local', confirmation: GENERATED_PROJECT_DEPLOY_CONFIRMATION }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const value = await response.json() as { receipt?: GeneratedRuntimeReceipt };
      if (!value.receipt) throw new Error('The host returned no deployment receipt.');
      setResult({ fingerprint, receipt: value.receipt });
      onReceipt?.(value.receipt);
      setDeployReviewedFor(null);
      setDeployPhrase('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The deployment could not be applied.');
    } finally {
      setDeployBusy(false);
    }
  }

  async function cancelDeploy() {
    if (!receipt || cancelDeployBusy) return;
    setCancelDeployBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/build/generated-projects/${receipt.operationId}`, { method: 'PATCH' });
      if (!response.ok) throw new Error(await readError(response));
      const value = await response.json() as { receipt?: GeneratedRuntimeReceipt };
      if (!value.receipt) throw new Error('The host returned no cancellation receipt.');
      setResult({ fingerprint, receipt: value.receipt });
      onReceipt?.(value.receipt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The deployment could not be cancelled.');
    } finally {
      setCancelDeployBusy(false);
    }
  }

  // Receipts arrive from the trusted host, but a malformed or legacy record
  // must degrade to "unknown", never crash the review surface.
  const build = receipt?.compiled?.build ?? receipt?.build ?? null;
  const exportReceipt = receipt?.export ?? receipt?.bundle;
  const deployReceipt = receipt?.deploy;

  return (
    <section className={styles.execution} aria-labelledby="generated-project-heading" data-compact={compact || undefined}>
      <header className={styles.executionHead}>
        <h3 id="generated-project-heading">Reviewed static application</h3>
        <span>{artifact.kind} · {files.length} files · {byteLabel(totalBytes)}</span>
      </header>
      <div className={styles.executionBody}>
        <p>
          This proposal contains a complete bounded static application. Applying it writes only these files inside
          the trusted host&apos;s generated-projects root, runs a measured static build from source to a separate
          compiled output, emits a deterministic ZIP and serves a loopback preview. No dependency install, generated
          server code, Git write or external network deployment runs. Deployment is a separate explicit confirmation.
        </p>
        <p className={styles.executionMeta} role="status">{host.message}</p>
        {reviewDigest ? <p className={styles.executionMeta}>Proposal digest · SHA-256 {reviewDigest}</p> : null}

        <ul className={styles.executionFiles} aria-label="Proposed generated files">
          {files.map((file) => (
            <li key={file.path}>
              <details>
                <summary><code>{file.path}</code><small>{byteLabel(file.bytes)}</small></summary>
                <pre tabIndex={0} aria-label={`Proposed content of ${file.path}`}>{file.content}</pre>
              </details>
            </li>
          ))}
        </ul>

        <div className={styles.executionControls}>
          <label>
            <input type="checkbox" checked={reviewedFor === fingerprint} disabled={busy || host.state !== 'enabled'} onChange={(event) => setReviewedFor(event.currentTarget.checked ? fingerprint : null)} />
            <span>I reviewed every proposed file and understand this writes them on the trusted host.</span>
          </label>
          <label className={styles.executionConfirm}>
            <span>Type {GENERATED_PROJECT_CONFIRMATION} to authorize</span>
            <input
              type="text" value={phrase} autoComplete="off" spellCheck={false} disabled={busy || host.state !== 'enabled'}
              aria-label={`Type ${GENERATED_PROJECT_CONFIRMATION} to authorize generated project execution`}
              onChange={(event) => setPhrase(event.currentTarget.value)}
            />
          </label>
          <div className={styles.executionActions}>
            <button type="button" disabled={!confirmed || busy || host.state !== 'enabled'} onClick={() => void apply()}>
              {busy && !live ? 'Applying reviewed files…' : 'Apply reviewed static project'}
            </button>
            {receipt?.bundle?.bytes ? <a href={`/api/build/generated-projects/${receipt.operationId}/bundle`}>Download bundle</a> : null}
            {live ? <button type="button" className={styles.executionStop} disabled={busy} onClick={() => void stop()}>Stop preview</button> : null}
          </div>
        </div>

        {error ? <p className={styles.executionError} role="alert">{error}</p> : null}

        {receipt ? (
          <div className={styles.executionReceipt} data-state={receipt.state}>
            <p><strong>{RECEIPT_LABELS[receipt.state]}</strong> · external reference <code>{receipt.externalReference}</code></p>
            {receipt.compiled?.files?.length ? <p>{receipt.compiled.files.length} verified files · {byteLabel(receipt.compiled.bytes)} written{receipt.bundle ? ` · bundle SHA-256 {receipt.bundle.sha256}` : ''}</p> : null}

            {build && (
              <details className={styles.executionStage} open>
                <summary>Build stage · {build.status.toUpperCase()}</summary>
                <p className={styles.executionMeta}>{build.command} · exit {build.exitCode ?? '—'} · {build.evidence}{build.durationMs !== null ? ` · ${build.durationMs} ms` : ''}</p>
              </details>
            )}

            {exportReceipt && (
              <details className={styles.executionStage} open>
                <summary>Export stage · deterministic ZIP</summary>
                <p className={styles.executionMeta}>{exportReceipt.path} · {exportReceipt.bytes} bytes · SHA-256 {exportReceipt.sha256} · {exportReceipt.format}{exportReceipt.durationMs !== null ? ` · ${exportReceipt.durationMs} ms` : ''}</p>
              </details>
            )}

            {deployReceipt && (
              <details className={styles.executionStage} open>
                <summary>Deployment stage · {deployReceipt.status.toUpperCase()}</summary>
                <p className={styles.executionMeta}>Target {deployReceipt.target} · confirmation {deployReceipt.confirmation ?? '—'} · reference {deployReceipt.reference ?? '—'}{deployReceipt.appliedAt ? ` · applied ${deployReceipt.appliedAt}` : ''}{deployReceipt.blocker ? ` · blocker: ${deployReceipt.blocker}` : ''}{deployReceipt.error ? ` · error: ${deployReceipt.error}` : ''}</p>
                {deployable && !alreadyDeployed && (
                  <div className={styles.executionControls}>
                    <label>
                      <input type="checkbox" checked={deployReviewedFor === fingerprint} disabled={deployBusy || alreadyDeployed} onChange={(event) => setDeployReviewedFor(event.currentTarget.checked ? fingerprint : null)} />
                      <span>I confirm this local publish deployment and understand it writes compiled output to the trusted host&apos;s deploy root.</span>
                    </label>
                    <label className={styles.executionConfirm}>
                      <span>Type {GENERATED_PROJECT_DEPLOY_CONFIRMATION} to authorize</span>
                      <input
                        type="text" value={deployPhrase} autoComplete="off" spellCheck={false} disabled={deployBusy || alreadyDeployed}
                        aria-label={`Type ${GENERATED_PROJECT_DEPLOY_CONFIRMATION} to authorize deployment`}
                        onChange={(event) => setDeployPhrase(event.currentTarget.value)}
                      />
                    </label>
                    <div className={styles.executionActions}>
                      <button type="button" disabled={!deployConfirmed || deployBusy || !deployable || alreadyDeployed} onClick={() => void deploy()}>
                        {deployBusy ? 'Deploying…' : 'Deploy compiled output'}
                      </button>
                      {deployBusy || deployReceipt?.status === 'requested' || deployReceipt?.status === 'not-requested' ? <button type="button" className={styles.executionStop} disabled={cancelDeployBusy || alreadyDeployed} onClick={() => void cancelDeploy()}>{cancelDeployBusy ? 'Cancelling deployment…' : 'Cancel deployment'}</button> : null}
                    </div>
                  </div>
                )}
                {alreadyDeployed && <p className={styles.executionMeta}>Deployment already applied. It cannot be cancelled from this surface; remove the published output manually on the trusted host.</p>}
              </details>
            )}

            {receipt.preview?.url ? <p>Preview origin <code>{receipt.preview.origin}</code> · HTTP {receipt.preview.httpStatus ?? 'UNKNOWN'} · ticket expires {receipt.preview.expiresAt ?? 'UNKNOWN'}</p> : null}
            {receipt.preview?.blocker ? <p role="status">{receipt.preview.blocker}</p> : null}
            {receipt.preview?.url ? <p><a href={receipt.preview.url} target="_blank" rel="noreferrer">Open live preview in a new tab ↗</a></p> : null}
            {live && canEmbed && receipt.preview?.url ? <iframe className={styles.executionPreviewFrame} src={receipt.preview.url} title="Generated application live preview" sandbox="allow-scripts" /> : null}
            {!live && receipt.state !== 'validating' && receipt.state !== 'built' && receipt.state !== 'exported' ? <p className={styles.executionMeta}>No preview process is claimed while this receipt is {receipt.state}.</p> : null}
            {!receipt.compiled?.files?.length && receipt.state === 'failed' ? <p className={styles.executionMeta}>No files were confirmed as written by this receipt.</p> : null}
          </div>
        ) : <p className={styles.executionMeta}>No generated files have been written for this proposal.</p>}
      </div>
    </section>
  );
}
