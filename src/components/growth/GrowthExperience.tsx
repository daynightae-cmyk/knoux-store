'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { DEMO_CLIENTS } from '@/data/growth/clients';
import { creativesFor } from '@/data/growth/workspace';
import { PLACEMENTS, beginEdit, type PlacementId } from '@/lib/growth/studio';
import { PlacementPreview } from '@/components/command/studio/AdPreviewTheatre';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { usePageCopy } from '@/lib/i18n/page-copy';
import styles from './growth-experience.module.css';

export function GrowthExperience() {
  const [placement, setPlacement] = useState<PlacementId>('instagram-feed');
  const client = DEMO_CLIENTS[0];
  const creative = creativesFor(client.id)[0];
  const language = useSiteLanguage();
  const t = usePageCopy();
  return <section className={`shell ${styles.experience}`} aria-label="Growth OS introduction"><div className={styles.hero}><div className={styles.editorial}><div className={styles.kicker}>04 / KNOuX GROWTH OS</div><h1>{t('Turn attention into')}<em>{t('a clear next move.')}</em></h1><p>{t('Strategy, creative and campaigns. One managed workflow, built around your business and reviewed with you before any advertising spend.')}</p><div className={styles.actions}><a href="#growth-brief">{t('Start a growth brief')} ↗</a><Link href="/command/creative">{t('Explore the studio')}</Link></div><p className={styles.note}>{t('KNOuX service fees and client-paid media spend are scoped separately. No guaranteed returns.')}</p><div className={styles.operatingMap} aria-label={t('Service operating map')}>{[t('01 / Brief'), t('02 / Create'), t('03 / Review'), t('04 / Measure')].map((step, index) => <span key={step} data-active={index === (placement === 'google-search' ? 3 : 1)}>{step}<small>{index === 2 ? t('Human approval') : index === 3 ? t('Verified sources') : t('Managed service')}</small></span>)}</div></div><div className={styles.glimpse}><span className={styles.kicker}>{t('INTERACTIVE DEMO / READ-ONLY PRODUCT GLIMPSE')}</span><div className={styles.placements} role="group" aria-label="Public preview placement">{PLACEMENTS.map((item) => <button type="button" key={item.id} aria-pressed={placement === item.id} onClick={() => setPlacement(item.id)}>{item.label}</button>)}</div><div className={styles.preview}><PlacementPreview edit={{ ...beginEdit(creative, client.website), locale: language === 'ar' ? 'ar' : 'en' }} clientName={client.name} placement={placement} /></div><p className={styles.note}>{t('Demonstration client data. Local layout approximation, not a published ad or a connected platform. No performance claims.')}</p></div></div>
    <div className={styles.deliver}><h2>{t('The work behind the growth.')}</h2>{[[t('A measurable plan'), t('Define audience, channels, conversion actions and the scope of delivery.')], [t('Creative that stays connected'), t('Review copy and placement together, with brand rules beside the work.')], [t('Decisions with evidence'), t('Approve a defined plan. Report verified sources and keep missing metrics visible.')]].map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
    <GrowthBrief />
  </section>;
}

const FIELDS = [
  ['name', 'Your name'], ['email', 'Email'], ['organisation', 'Business name'], ['category', 'Business category'], ['market', 'Market / country'], ['geography', 'Target geography'], ['languages', 'Target languages'], ['platforms', 'Current platforms'],
] as const;
function GrowthBrief() {
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const t = usePageCopy();
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const invalid: Record<string, string> = {};
    for (const [key] of FIELDS) if (!fields[key]?.trim()) invalid[key] = t('This field is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email ?? '')) invalid.email = t('Enter a valid email.');
    if (!fields.consent) invalid.consent = t('Consent is required.');
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const message = ['KNOuX Growth qualification brief', ...['category', 'market', 'goal', 'geography', 'languages', 'platforms', 'assets', 'budgetBand'].map((key) => `${key}: ${fields[key]}`)].join('\n');
    setReview({ name: fields.name.trim(), email: fields.email.trim(), organisation: fields.organisation.trim(), message, requestType: 'growth', selectedItems: [], preferredChannels: fields.platforms.split(',').map((value) => value.trim()).filter(Boolean), budgetBand: fields.budgetBand, timeline: '', sourceInput: null, entryRoute: '/growth', website: fields.website ?? '' });
    setStatus('');
  }
  async function send() {
    if (!review || sending) return;
    setSending(true);
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) });
      const receipt = await response.json() as { delivered?: boolean };
      const sent = response.ok && receipt.delivered === true;
      setDelivered(sent);
      setStatus(sent ? t('Request delivered.') : response.status === 503 ? t('UNCONFIGURED: Nothing was sent. Request delivery is unavailable; use the contact page for an alternative contact method. Your brief is preserved.') : t('Delivery failed. Your brief is preserved; try again.'));
    } catch { setStatus(t('Network error. Nothing confirmed delivered; your brief is preserved.')); }
    finally { setSending(false); }
  }
  return <section id="growth-brief" className={styles.brief} aria-label="Growth qualification brief"><div><span className={styles.kicker}>{t('START WITH YOUR BUSINESS')}</span><h2>{t('A useful brief. A real conversation.')}</h2><p>{t('Tell us what you need. Review the exact request before sending. This is an inquiry, not a quote or an advertising purchase.')}</p><span className={styles.privacyNote}>{t('Your details are used only to respond to this inquiry.')}</span></div><form noValidate onSubmit={prepare} onChange={() => { setReview(null); setStatus(''); }} className={styles.form}>{FIELDS.map(([key, en]) => <label key={key}>{t(en)}<input aria-label={t(en)} name={key} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? 254 : 100} required dir={key === 'email' ? 'ltr' : undefined} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : key === 'organisation' ? 'organization' : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `brief-${key}-error` : undefined} />{errors[key] && <small id={`brief-${key}-error`}>{errors[key]}</small>}</label>)}<label>{t('Business goal')}<select name="goal">{[['LEADS', 'Leads'], ['SALES', 'Sales'], ['CALLS', 'Calls'], ['WHATSAPP', 'WhatsApp'], ['BOOKINGS', 'Bookings'], ['BRAND', 'Brand']].map(([value, en]) => <option value={value} key={value}>{t(en)}</option>)}</select></label><label>{t('Monthly media budget · client-paid')}<select name="budgetBand">{['To be scoped', 'AED under 5,000', 'AED 5,000–15,000', 'AED 15,000–50,000', 'AED 50,000+'].map((value) => <option value={value} key={value}>{t(value)}</option>)}</select></label><label>{t('Landing page / creative needed?')}<select name="assets"><option value="Both">{t('Both')}</option><option value="Landing page">{t('Landing page')}</option><option value="Creative">{t('Creative assets')}</option><option value="Neither">{t('Already available')}</option></select></label><div className={styles.honeypot} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div><label className={styles.consent}><input type="checkbox" name="consent" required />{t('I consent to KNOuX using these details to respond to this inquiry.')}{errors.consent && <small>{errors.consent}</small>}</label><button type="submit">{t('Review exact request')} ↗</button>{review && <div className={styles.review}><h3>{t('Request summary')}</h3><pre>{JSON.stringify(review, null, 2)}</pre><button type="button" disabled={sending || delivered} onClick={send}>{sending ? t('Sending…') : t('Send growth inquiry')}</button></div>}<p role="status">{status}</p></form></section>;
}
