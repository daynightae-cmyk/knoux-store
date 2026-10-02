import Link from 'next/link';
import { FounderPortrait } from './FounderPortrait';
import styles from './AboutFounder.module.css';

export function AboutFounder() {
  return (
    <section id="about-founder" className={`shell ${styles.section}`} aria-labelledby="founder-title">
      <div className={styles.record}><span>05 / SIGNATURE</span><span>THE PERSON BEHIND KNOuX</span></div>
      <div className={styles.layout}>
        <FounderPortrait />
        <div className={styles.identity}>
          <span className="label label--signal">FOUNDER / KNOuX</span>
          <h2 id="founder-title">Sadek<br /><em>Elgazar.</em></h2>
          <p className={styles.role}>Founder &amp; Software Developer</p>
          <p className={styles.statement}>Software engineering and product building, brought together in one connected institution.</p>
          <div className={styles.practice}>
            <span>ENGINEERING</span><span>PRODUCT BUILDING</span><span>KNOuX SYSTEMS</span>
          </div>
          <div className={styles.links}>
            <Link className="action" href="/contact">Contact KNOuX <span aria-hidden="true">↗</span></Link>
            <Link className="action" href="/work">Explore verified work <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
