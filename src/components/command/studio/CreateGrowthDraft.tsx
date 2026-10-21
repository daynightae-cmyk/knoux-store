'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../workspace-context';
import { usePageCopy } from '@/lib/i18n/page-copy';
import styles from './studio.module.css';

/** Small entry forms for real records; review and publishing remain separate. */
export function CreateGrowthDraft({ kind }: { kind: 'client' | 'creative' | 'campaign' }) {
  const { activeClient, records, isDemoWorkspace } = useWorkspace();
  const router = useRouter();
  const requestKey = useRef<string | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const label = usePageCopy();
  if (isDemoWorkspace) return null;
  return <details className={styles.theatre}>
    <summary>{label(`Create ${kind}`, kind === 'client' ? 'إضافة عميل' : kind === 'creative' ? 'إنشاء مسودة إبداعية' : 'إنشاء مسودة حملة')}</summary>
    <form className={styles.inspector} onChange={() => { if (state !== 'saving') { requestKey.current = null; setState('idle'); } }} onSubmit={async event => {
      event.preventDefault(); setState('saving'); setError('');
      const form = new FormData(event.currentTarget);
      requestKey.current ??= crypto.randomUUID();
      const value = (key: string) => String(form.get(key) ?? '');
      const input = {
        clientId: activeClient.id, requestId: requestKey.current,
        name: value('name'), concept: value('name'), headline: value('name'),
        businessCategory: value('category'), city: value('city'), website: value('website'), brandTone: value('tone'),
        campaignId: value('campaignId') || null, languages: ['en', 'ar'],
        objective: 'LEADS', budgetMinor: Number(value('budget')), currency: 'AED',
        startDate: value('start'), endDate: value('end'), locations: [activeClient.city].filter(Boolean), platforms: ['instagram'],
      };
      try {
        const response = await fetch(`/api/growth/${kind}s`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
        const payload = await response.json() as { reason?: string };
        if (!response.ok) throw new Error(payload.reason ?? `Save refused (${response.status}).`);
        setState('saved'); router.refresh();
      } catch (failure) { setState('error'); setError(failure instanceof Error ? failure.message : 'Save failed.'); }
    }}>
      <fieldset disabled={state === 'saving' || state === 'saved'}>
        <legend>{label('New record')}</legend>
        <label>{label('Name')}<input name="name" required maxLength={200} /></label>
        {kind === 'client' && <>
          <p>{label('An existing workspace owner can onboard a client. Initial owner access must be provisioned by the operator.')}</p>
          <label>{label('Business category')}<input name="category" required maxLength={200} /></label>
          <label>{label('City')}<input name="city" required maxLength={120} /></label>
          <label>{label('Website')}<input name="website" type="url" placeholder="https://" /></label>
          <label>{label('Brand tone')}<textarea name="tone" maxLength={2000} /></label>
        </>}
        {kind === 'creative' && <label>{label('Campaign')}<select name="campaignId"><option value="">{label('Unassigned draft')}</option>{records.campaigns.filter(campaign => ['DRAFT', 'CHANGES_REQUESTED'].includes(campaign.status)).map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>}
        {kind === 'campaign' && <>
          <label>{label('Budget in fils')}<input name="budget" type="number" required min={1} step={1} /></label>
          <label>{label('Start date')}<input name="start" type="date" required /></label>
          <label>{label('End date')}<input name="end" type="date" required /></label>
          <p>{label('Creates an Instagram lead campaign draft in AED. Edit channels and targeting in the campaign builder.')}</p>
        </>}
        <button type="submit">{state === 'saving' ? label('Saving…') : label('Create draft')}</button>
      </fieldset>
      {state === 'saved' && <button type="button" onClick={event => { event.currentTarget.form?.reset(); requestKey.current = null; setState('idle'); }}>{label('Create another')}</button>}
      {error && <p role="alert">{error}</p>}{state === 'saved' && <p role="status">{label('Saved. The workspace is refreshing.')}</p>}
    </form>
  </details>;
}
