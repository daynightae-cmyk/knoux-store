import { SignalLookupClient } from '@/components/signal/SignalLookupClient';
import styles from '@/app/signal/signal.module.css';

export function SignalExperience({ context = 'SG / SIGNAL' }: { context?: string }) {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.experience} aria-labelledby="signal-title">
        <div className={styles.experienceIntro}>
          <div className={styles.kicker}>{context} — PHONE INTELLIGENCE</div>
          <h1 id="signal-title">KNOuX SIGNAL</h1>
          <p>Resolve the evidence behind a number.</p>
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
