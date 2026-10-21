'use client';

import Link from 'next/link';
import { SignalLookupClient } from '@/components/signal/SignalLookupClient';
import { usePageCopy } from '@/lib/i18n/page-copy';
import styles from '@/app/signal/signal.module.css';

export function SignalExperience({ context = 'SG / SIGNAL' }: { context?: string }) {
  const t = usePageCopy();
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.experience} aria-labelledby="signal-title">
        <div className={styles.experienceIntro}>
          <div className={styles.kicker}>{context} — PHONE INTELLIGENCE</div>
          <h1 id="signal-title">KNOuX SIGNAL</h1>
          <p>{t('Find public business contact evidence, with its source and limitations.')}</p>
          <p>{t('Egypt · UAE · Saudi Arabia · Qatar · Kuwait · Bahrain · Oman. Business records are not a complete directory of personal identities.')}</p>
          <nav className={styles.introActions} aria-label={t('Signal services')}>
            <a href="#signal-query">{t('Look up a number')} ↓</a>
            <Link href="/signal/business">{t('Business evidence')}</Link>
            <Link href="/signal/my-number/privacy">{t('Privacy & consent')}</Link>
          </nav>
        </div>
        <SignalLookupClient />
      </section>
      <section className={styles.contract} aria-label="Signal truth contract">
        <span>REAL NUMBER FACTS</span>
        <span>CONSENT-BASED ALIASES</span>
        <span>AGGREGATE ACTIVITY</span>
        <span>NO FAKE IDENTITY</span>
      </section>
    </main>
  );
}
