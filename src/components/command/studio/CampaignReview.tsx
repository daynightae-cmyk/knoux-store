'use client';

import { useState } from 'react';
import { useWorkspace } from '../workspace-context';
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_PLATFORMS, type Campaign } from '@/lib/growth/types';
import { daysInclusive, formatBudget } from '@/lib/growth/campaigns';
import { destinationValid, reviewFingerprint } from '@/lib/growth/studio';
import styles from './studio.module.css';

export function CampaignReview({ campaign }: { campaign: Campaign }) {
  const { activeClient } = useWorkspace();
  return <Review key={`${activeClient.id}:${campaign.id}:${campaign.updatedAt}`} source={campaign} />;
}

function Review({ source }: { source: Campaign }) {
  const { activeClient, studioEdits, records, campaignPlans, stageCampaign, isDemoWorkspace } = useWorkspace();
  const plan = campaignPlans.find((campaign) => campaign.id === source.id) ?? source;
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [storedAt, setStoredAt] = useState(source.updatedAt);
  const [savedFingerprint, setSavedFingerprint] = useState('');
  const [snapshot, setSnapshot] = useState<{ fingerprint: string; at: string; plan: Campaign } | null>(null);
  const edits = records.creatives.filter((draft) => draft.campaignId === plan.id || plan.creativeSetIds.includes(draft.id)).map((draft) => studioEdits[draft.id]);
  const fingerprint = reviewFingerprint(plan, edits);
  const validSnapshot = snapshot?.fingerprint === fingerprint;
  const patch = (value: Partial<Campaign>) => stageCampaign(source.id, value);
  const save = async () => {
    setSaveState('saving'); setSaveError('');
    try {
      const response = await fetch('/api/growth/campaigns', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...plan, expectedUpdatedAt: storedAt }),
      });
      const payload = await response.json() as { campaign?: { updated_at: string }; reason?: string };
      if (!response.ok || !payload.campaign) throw new Error(payload.reason ?? 'Campaign save failed.');
      setStoredAt(payload.campaign.updated_at); setSavedFingerprint(fingerprint); setSaveState('saved');
    } catch (error) { setSaveState('error'); setSaveError(error instanceof Error ? error.message : 'Campaign save failed.'); }
  };
  const valid = Number.isSafeInteger(plan.budgetMinor) && plan.budgetMinor > 0 && daysInclusive(plan.startDate, plan.endDate) > 0 && plan.platforms.length > 0 && plan.locations.length > 0 && destinationValid(plan.landingPageUrl ?? '') && edits.length > 0;
  return <section className={styles.theatre} aria-label="Campaign builder"><div className={styles.toolbar}><div><span className={styles.eyebrow}>PLAN / PREVIEW / HUMAN REVIEW</span><h2>Build the campaign brief</h2></div><span className={styles.state}>LOCAL DRAFT · NO SPEND</span></div><div className={styles.inspector}>
    <label>Campaign name<input value={plan.name} onChange={(event) => patch({ name: event.target.value })} /></label>
    <label>Business goal<select value={plan.objective} onChange={(event) => patch({ objective: event.target.value as Campaign['objective'] })}>{CAMPAIGN_OBJECTIVES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <fieldset><legend>Channels</legend>{CAMPAIGN_PLATFORMS.map((item) => <label key={item} style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" style={{ width: 18 }} checked={plan.platforms.includes(item)} onChange={(event) => patch({ platforms: event.target.checked ? [...plan.platforms, item] : plan.platforms.filter((platform) => platform !== item) })} />{item.replaceAll('_', ' ')}</label>)}</fieldset>
    <label>Target geography<input value={plan.locations.join(', ')} onChange={(event) => patch({ locations: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></label>
    <label>Audience notes<textarea value={plan.audienceNotes ?? ''} onChange={(event) => patch({ audienceNotes: event.target.value })} /></label>
    <fieldset><legend>Languages</legend>{(['en', 'ar'] as const).map((language) => <label key={language} style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" style={{ width: 18 }} checked={plan.languages.includes(language)} onChange={(event) => patch({ languages: event.target.checked ? [...plan.languages, language] : plan.languages.filter((value) => value !== language) })} />{language === 'en' ? 'English' : 'العربية'}</label>)}</fieldset>
    <label>Media budget (integer minor units)<input aria-label="Media budget (integer minor units)" type="number" step="1" min="1" value={Number.isNaN(plan.budgetMinor) ? '' : plan.budgetMinor} onChange={(event) => patch({ budgetMinor: event.target.valueAsNumber })} /><small>{formatBudget(plan.budgetMinor || 0, plan.currency)} · advertising spend paid by client; service fees separate</small></label>
    <label>Currency<select value={plan.currency} onChange={(event) => patch({ currency: event.target.value as Campaign['currency'] })}>{['AED', 'EGP', 'USD'].map((currency) => <option key={currency}>{currency}</option>)}</select></label>
    <label>Start date<input type="date" value={plan.startDate} onChange={(event) => patch({ startDate: event.target.value })} /></label><label>End date<input type="date" value={plan.endDate} onChange={(event) => patch({ endDate: event.target.value })} /></label>
    <label>Landing destination<input type="url" dir="ltr" value={plan.landingPageUrl ?? ''} onChange={(event) => patch({ landingPageUrl: event.target.value })} /></label><label>Conversion action<input value={plan.conversionTarget ?? ''} onChange={(event) => patch({ conversionTarget: event.target.value })} /></label>
    <div className={styles.checks}><h3>Review package · {activeClient.name}</h3><p>{edits.length} linked creative(s). Creative text, revision, destination, language and asset references are included alongside the complete plan.</p><button type="button" disabled={!valid || !plan.name.trim() || !plan.languages.length} onClick={() => setSnapshot({ fingerprint, at: new Date().toISOString(), plan: structuredClone(plan) })}>Prepare review snapshot</button>{!valid && <p>Set a positive integer budget, valid dates, HTTPS destination, geography, channel and linked creative before review.</p>}
    {snapshot && <div role="status"><strong>{validSnapshot ? 'Review snapshot frozen locally · not submitted' : 'REVIEW INVALIDATED · plan or creative changed'}</strong><p>{snapshot.at} · {formatBudget(snapshot.plan.budgetMinor, snapshot.plan.currency)} · {snapshot.plan.locations.join(', ')}</p><details><summary>Inspect exact frozen package</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{snapshot.fingerprint}</pre></details></div>}
    <button type="button" disabled={isDemoWorkspace || saveState === 'saving' || !plan.name.trim()} onClick={() => void save()}>{saveState === 'saving' ? 'Saving…' : 'Save campaign draft'}</button>{saveState === 'saved' && <p role="status">{savedFingerprint === fingerprint ? 'Campaign draft saved · not approved' : 'Unsaved changes after last save'}</p>}{saveError && <p role="alert">{saveError}</p>}<p>Approval submission requires its own authorized review endpoint. Saving this draft supersedes existing approval records and never authorizes publishing.</p><button type="button" disabled>Request approval · write endpoint unavailable</button><button type="button" disabled>Launch · EXECUTOR_NOT_CONNECTED</button><p>A local review snapshot cannot authorize a provider write.</p></div>
  </div></section>;
}
