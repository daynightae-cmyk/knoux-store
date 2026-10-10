'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignalLookupClient } from '@/components/signal/SignalLookupClient';
import styles from '@/app/signal/signal.module.css';

export function SignalExperience({ context = 'SG / SIGNAL' }: { context?: string }) {
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const arabic = locale === 'ar';
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.experience} aria-labelledby="signal-title" lang={locale} dir={arabic ? 'rtl' : 'ltr'}>
        <div className={styles.experienceIntro}>
          <div className={styles.kicker}>{context} — PHONE INTELLIGENCE</div>
          <h1 id="signal-title">KNOuX SIGNAL</h1>
          <p>{arabic ? 'ابحث عن أدلة اتصال الأعمال العامة، مع مصدرها وحدودها.' : 'Find public business contact evidence, with its source and limitations.'}</p>
          <p>{arabic ? 'مصر · الإمارات · السعودية · قطر · الكويت · البحرين · عُمان. بيانات الأعمال ليست دليلًا شاملًا لهوية الأفراد.' : 'Egypt · UAE · Saudi Arabia · Qatar · Kuwait · Bahrain · Oman. Business records are not a complete directory of personal identities.'}</p>
          <nav className={styles.introActions} aria-label={arabic ? 'خدمات Signal' : 'Signal services'}>
            <a href="#signal-query">{arabic ? 'البحث عن رقم' : 'Look up a number'} ↓</a>
            <Link href="/signal/business">{arabic ? 'بيانات الأعمال' : 'Business evidence'}</Link>
            <Link href="/signal/my-number/privacy">{arabic ? 'الخصوصية والموافقة' : 'Privacy & consent'}</Link>
            <button type="button" onClick={() => setLocale(arabic ? 'en' : 'ar')} aria-label={arabic ? 'Switch to English' : 'Switch to Arabic'}>{arabic ? 'English' : 'العربية'}</button>
          </nav>
        </div>
        <SignalLookupClient locale={locale} />
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
