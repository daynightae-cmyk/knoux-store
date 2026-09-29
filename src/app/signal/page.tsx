import type { Metadata } from 'next';
import { SignalLookupClient } from '@/components/signal/SignalLookupClient';
import styles from './signal.module.css';

export const metadata: Metadata = {
  title: 'Signal',
  description: 'KNOuX Signal — phone identity, reputation and consent-based community intelligence.',
  alternates: { canonical: 'https://knoux.store/signal' },
};

export default function SignalPage() {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero} aria-labelledby="signal-title">
        <div className={styles.kicker}>KN / SIGNAL — IDENTITY INTELLIGENCE</div>
        <h1 id="signal-title">Know the signal behind the number.</h1>
        <p>
          Normalize a number, inspect verified identity and reputation signals, and query
          consent-based community aliases without invented data.
        </p>
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
