'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@/lib/growth/types';
import styles from './studio.module.css';

type ReviewRecord = { id: string; requested_by: string; requested_at: string; decision: string | null; decided_at: string | null; invalidated_at: string | null; note: string | null; campaign_version: number; plan_snapshot: unknown };
type ReviewData = { approvals: ReviewRecord[]; actorId: string; canSubmit: boolean; canReview: boolean };

/** Reviews persisted bytes only. An approval never calls an ad connector. */
export function CampaignApproval({ campaign, unsaved, demo }: { campaign: Campaign; unsaved: boolean; demo: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<ReviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    void fetch(`/api/growth/campaigns/review?clientId=${encodeURIComponent(campaign.clientId)}&campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.reason ?? 'Review history unavailable.'); if (!controller.signal.aborted) setData(payload); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Review history unavailable.'); });
    return () => controller.abort();
  }, [campaign.clientId, campaign.id, campaign.updatedAt, demo, retry]);
  const current = data?.approvals.find(item => !item.invalidated_at);
  async function act(action: string) {
    if (busy || unsaved || demo) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/growth/campaigns/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: campaign.clientId, campaignId: campaign.id, expectedUpdatedAt: campaign.updatedAt, action, approvalId: current?.id, note }) });
      const payload = await response.json();
      if (!response.ok || !payload.campaign || !payload.approval) throw new Error(payload.reason ?? 'No review decision was confirmed.');
      setMessage(`Recorded ${action.replaceAll('_', ' ')} · ${payload.campaign.status}. No provider execution or spend.`);
      // Keep further writes disabled until refreshed source carries the new revision.
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Review failed.'); setBusy(false); }
  }
  const canDecide = data?.canReview && current && !current.decision && current.requested_by !== data.actorId && campaign.status === 'READY_FOR_REVIEW';
  return <section className={styles.checks} aria-label="Campaign approval workflow">
    <h3>Persisted campaign review · {campaign.status.replaceAll('_', ' ')}</h3>
    <p>Draft → Review → Approved. Publishing remains disconnected and requires separate authorization.</p>
    {demo ? <p>Demo workspace: no approval writes.</p> : !data && !error ? <p role="status">Loading review history…</p> : null}
    {unsaved && <p role="status">Save the campaign and every linked creative before requesting or deciding a review.</p>}
    {data?.canSubmit && ['DRAFT', 'CHANGES_REQUESTED'].includes(campaign.status) && <button type="button" disabled={busy || unsaved} onClick={() => void act('SUBMIT')}>Submit saved campaign for review</button>}
    {current?.requested_by === data?.actorId && campaign.status === 'READY_FOR_REVIEW' && <p>A different authorized reviewer must decide this campaign.</p>}
    {canDecide && <><label>Reviewer note<textarea maxLength={2000} value={note} disabled={busy || unsaved} onChange={event => setNote(event.target.value)} /></label><div>{['APPROVE', 'REQUEST_CHANGES', 'REJECT'].map(action => <button type="button" key={action} disabled={busy || unsaved} onClick={() => void act(action)}>{action.replaceAll('_', ' ')}</button>)}</div></>}
    {data?.canSubmit && current && ['READY_FOR_REVIEW', 'APPROVED'].includes(campaign.status) && <button type="button" disabled={busy || unsaved} onClick={() => void act('WITHDRAW')}>Withdraw review to draft</button>}
    {message && <p role="status">{message}</p>}{error && <><p role="alert">{error}</p><button type="button" disabled={busy} onClick={() => { setError(''); setRetry(value => value + 1); router.refresh(); }}>Reload review history</button></>}
    {data?.approvals.map(item => <details key={item.id}><summary>Version {item.campaign_version} · {item.invalidated_at ? 'SUPERSEDED' : item.decision ?? 'AWAITING REVIEW'} · {item.requested_at}</summary>{item.note && <p>{item.note}</p>}<pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{JSON.stringify(item.plan_snapshot, null, 2)}</pre></details>)}
    <button type="button" disabled>Publish · EXECUTOR_NOT_CONNECTED</button>
  </section>;
}
