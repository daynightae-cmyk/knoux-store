'use client';

import Link from 'next/link';
import { SignalLookupClient } from '@/components/signal/SignalLookupClient';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import styles from '@/app/signal/signal.module.css';
/**
 * Route copy resolved against the site language.
 *
 * The hook lives here, in the component, rather than in a shared `usePageCopy`:
 * that module imported the language store, which every page already loads, so
 * the bundler grouped the route catalogue into the shared chunk and shipped it
 * to pages that never show route copy.
 */
function useRouteCopy() {
  const language = useSiteLanguage();
  return (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
}

export function SignalExperience({ context = 'SG / SIGNAL' }: { context?: string }) {
  const t = useRouteCopy();
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
