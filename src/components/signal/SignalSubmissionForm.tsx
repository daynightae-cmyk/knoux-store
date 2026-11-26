'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import styles from '@/app/signal/signal.module.css';

const countries = [['AE', 'United Arab Emirates'], ['EG', 'Egypt'], ['SA', 'Saudi Arabia'], ['QA', 'Qatar'], ['BH', 'Bahrain'], ['OM', 'Oman'], ['KW', 'Kuwait']] as const;
const categories = [['spam', 'Spam'], ['scam', 'Suspected scam'], ['sales', 'Sales'], ['harassment', 'Harassment'], ['safe_business', 'Safe business'], ['other', 'Other']] as const;

export function SignalSubmissionForm({ mode }: { mode: 'claim' | 'report' }) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('AE');
  const [category, setCategory] = useState('spam');
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [signIn, setSignIn] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  const facts = query.trim() ? normalizeSignalPhone(query, country) : null;
  const resetFeedback = () => { setState('idle'); setMessage(''); setSignIn(false); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!facts?.valid || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setState('pending'); setMessage(''); setSignIn(false);
    try {
      const response = await fetch(`/api/signal/${mode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: facts.e164, country, ...(mode === 'report' ? { category } : {}) }), signal: controller.signal });
      const payload = await response.json() as { ok?: boolean; claim?: unknown; report?: unknown; error?: string };
      if (!response.ok || !payload.ok || !(mode === 'claim' ? payload.claim : payload.report)) {
        setSignIn(response.status === 401);
        throw new Error(payload.error ?? 'No submission was confirmed. Please retry.');
      }
      setState('success');
      setMessage(mode === 'claim' ? `Claim saved for ${facts.e164}. Ownership was checked against your verified account phone.` : `Report saved for ${facts.e164}. A community report is evidence, not a verified accusation.`);
    } catch (error) {
      if (active.current !== controller) return;
      setState('error');
      setMessage(controller.signal.aborted ? 'The request timed out. No submission was confirmed. Retry when connected.' : error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) active.current = null;
    }
  }

  return <section className={styles.managementPanel} aria-label={mode === 'claim' ? 'Claim your verified number' : 'Submit categorized evidence'}>
    <div className={styles.managementPanelHeader}><h2>{mode === 'claim' ? 'Claim your verified number' : 'Submit categorized evidence'}</h2></div>
    <p>{mode === 'claim' ? 'Sign in with this exact phone already verified on your account. Entering a number cannot establish ownership.' : 'Submit only your own lawful experience. Reports do not establish identity, location or guilt.'}</p>
    <form className={styles.managementForm} onSubmit={submit}>
      <div className={styles.field}><label htmlFor={`signal-${mode}-country`}>Country</label><select id={`signal-${mode}-country`} value={country} disabled={state === 'pending'} onChange={event => { setCountry(event.target.value); resetFeedback(); }}>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></div>
      <div className={styles.field}><label htmlFor={`signal-${mode}-phone`}>Phone number</label><input id={`signal-${mode}-phone`} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={80} value={query} disabled={state === 'pending'} aria-invalid={facts?.valid === false} onChange={event => { setQuery(event.target.value); resetFeedback(); }} />{facts && <p>{facts.valid ? `Normalized: ${facts.e164} · format validation only` : facts.reason}</p>}</div>
      {mode === 'report' && <div className={styles.field}><label htmlFor="signal-report-category">Report category</label><select id="signal-report-category" value={category} disabled={state === 'pending'} onChange={event => { setCategory(event.target.value); resetFeedback(); }}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
      <div className={styles.managementActions}><button type="submit" disabled={!facts?.valid || state === 'pending' || state === 'success'}>{state === 'pending' ? 'Submitting…' : mode === 'claim' ? 'Claim verified number' : 'Submit report'}</button></div>
    </form>
    {message && <p className={styles.managementFeedback} data-tone={state === 'error' ? 'error' : undefined} role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
    {signIn && <Link href={`/login?next=${encodeURIComponent(mode === 'claim' ? '/signal/claim' : '/signal/my-number/reputation')}`}>Sign in to continue</Link>}
    {mode === 'claim' && state === 'success' && <Link href="/signal/my-number">Open number management</Link>}
  </section>;
}
