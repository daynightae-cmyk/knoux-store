'use client';

import { useEffect, useState } from 'react';
import {
  WORDPRESS_ACTIONS,
  confirmationFor,
  isWordPressMutation,
  type WordPressAction,
  type WordPressOperation,
} from '@/lib/wordpress/operations';
import type { WordPressExecutorResult } from '@/lib/wordpress/executor';

type Configuration = { state: string; configured: boolean; siteIds: string[]; message: string };
type Receipt = Omit<WordPressExecutorResult, 'measuredAt'> & { measuredAt: string | null };

const OPERATIONS_URL = '/api/wordpress/operations';

export function OperationsConsole() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [siteId, setSiteId] = useState('');
  const [action, setAction] = useState<WordPressAction>('site.probe');
  const [slug, setSlug] = useState('');
  const [reference, setReference] = useState('');
  const [review, setReview] = useState<WordPressOperation | null>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Receipt | null>(null);
  const needsSlug = /^(plugin|theme)\./.test(action);
  const needsReference = ['restore', 'migration', 'deploy'].includes(action);

  useEffect(() => {
    const lifecycle = new AbortController();
    const signal = AbortSignal.any([lifecycle.signal, AbortSignal.timeout(8000)]);
    const blocked = { configured: false, siteIds: [] };
    void fetch(OPERATIONS_URL, { cache: 'no-store', signal })
      .then(async (response) => {
        if (lifecycle.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setConfig({ ...blocked, state: 'AUTH_REQUIRED', message: 'A signed-in allowlisted operator is required.' });
          return;
        }
        if (!response.ok) throw new Error('Configuration unavailable');
        const current = await response.json() as Configuration;
        if (!lifecycle.signal.aborted) setConfig(current);
      })
      .catch(() => {
        if (!lifecycle.signal.aborted) {
          setConfig({ ...blocked, state: 'STATUS_UNAVAILABLE', message: 'Operation configuration could not be read.' });
        }
      });
    return () => lifecycle.abort();
  }, []);

  function propose() {
    if (!config?.configured || !config.siteIds.includes(siteId)) return;
    setResult(null);
    setApproved(false);
    setReview({
      siteId,
      action,
      requestId: crypto.randomUUID(),
      ...(needsSlug ? { slug: slug.trim() } : {}),
      ...(needsReference ? { reference: reference.trim() } : {}),
    });
  }

  async function execute() {
    if (!review || busy || result || (isWordPressMutation(review.action) && !approved)) return;
    const withoutReceipt = {
      requestId: review.requestId,
      externalReference: null,
      version: null,
      items: [],
      measuredAt: null,
    };
    setBusy(true);
    try {
      const response = await fetch(OPERATIONS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...review,
          ...(isWordPressMutation(review.action) ? { confirmation: confirmationFor(review) } : {}),
        }),
      });
      if (response.status === 401 || response.status === 403) {
        setResult({ ...withoutReceipt, state: 'AUTH_REQUIRED', message: 'The server refused authorization.' });
        return;
      }
      const value = await response.json();
      if (value.requestId === review.requestId && typeof value.measuredAt === 'string') {
        setResult(value);
      } else if (value.state === 'BLOCKED' || value.state === 'NOT_CONFIGURED') {
        setResult({ ...withoutReceipt, state: value.state, message: value.message });
      } else {
        throw new Error('Matching operation receipt unavailable');
      }
    } catch {
      setResult({
        ...withoutReceipt,
        state: 'EXECUTOR_NOT_CONNECTED',
        message: 'No matching receipt was received. Reconcile this request ID with the trusted executor before repeating a mutation.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wp-operations-console" aria-label="Trusted WordPress operations">
      <header>
        <h3>Operate the actual install</h3>
        <p role="status" data-operation-config={config?.state ?? 'READING'}>
          {config?.message ?? 'Reading executor configuration…'}
        </p>
        {config?.state === 'AUTH_REQUIRED' && <a href="/login?next=%2Fwordpress%23operate">Sign in</a>}
      </header>
      {config?.configured && (
        <>
          <div className="wp-operation-fields">
            <label>Configured site
              <select value={siteId} disabled={busy} onChange={(event) => { setSiteId(event.target.value); setReview(null); }}>
                <option value="">Select a site</option>
                {config.siteIds.map((id) => <option key={id}>{id}</option>)}
              </select>
            </label>
            <label>Structured action
              <select value={action} disabled={busy} onChange={(event) => { setAction(event.target.value as WordPressAction); setReview(null); }}>
                {WORDPRESS_ACTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {needsSlug && <label>WordPress.org slug
              <input value={slug} disabled={busy} maxLength={80} onChange={(event) => { setSlug(event.target.value); setReview(null); }} />
            </label>}
            {needsReference && <label>Trusted executor reference
              <input value={reference} disabled={busy} maxLength={120} onChange={(event) => { setReference(event.target.value); setReview(null); }} />
            </label>}
          </div>
          <button type="button" className="action" disabled={!siteId || busy || (needsSlug && !slug.trim()) || (needsReference && !reference.trim())} onClick={propose}>
            Review operation
          </button>
        </>
      )}
      {review && (
        <aside className="wp-operation-review">
          <h4>{isWordPressMutation(review.action) ? 'Confirm a site mutation' : 'Review read-only probe'}</h4>
          <p>{review.action} · {review.siteId} · {review.slug ?? review.reference ?? 'No extra arguments'}</p>
          <p>Request {review.requestId}. The configured executor applies site access, backup and idempotency rules.</p>
          {isWordPressMutation(review.action) && (
            <label className="wp-operation-approval">
              <input type="checkbox" checked={approved} disabled={busy || Boolean(result)} onChange={(event) => setApproved(event.target.checked)} />
              I approve this exact operation on this site.
            </label>
          )}
          <button type="button" className="action" disabled={busy || Boolean(result) || (isWordPressMutation(review.action) && !approved)} onClick={() => void execute()}>
            {busy ? 'Sending…' : 'Send structured request'}
          </button>
        </aside>
      )}
      {result && (
        <div className="wp-operation-receipt" role="status">
          <strong>{result.state}</strong>
          <p>{result.message}</p>
          <dl>
            <dt>Request ID</dt><dd>{result.requestId}</dd>
            <dt>Receipt</dt><dd>{result.externalReference ?? 'None received'}</dd>
            <dt>Version</dt><dd>{result.version ?? 'UNKNOWN'}</dd>
            <dt>Measured</dt><dd>{result.measuredAt ?? 'No executor measurement'}</dd>
          </dl>
          {result.items.map((item) => <p key={item.slug}>{item.slug} · {item.version ?? 'UNKNOWN'} · {item.active === null ? 'ACTIVATION UNKNOWN' : item.active ? 'ACTIVE' : 'INACTIVE'}</p>)}
        </div>
      )}
    </section>
  );
}
