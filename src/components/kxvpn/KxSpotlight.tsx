'use client';

import Link from 'next/link';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { siteDirection } from '@/lib/i18n/languages';
import styles from './KxPortal.module.css';

/** Featured product link without altering the site's audited software registry. */
export function KxSpotlight() {
  const language = useSiteLanguage();
  const ar = language === 'ar';
  return (
    <section className={styles.spotlight} dir={siteDirection(language)} lang={language} aria-label="KX Private VPN">
      <div>
        <span className={styles.eyebrow}>{ar ? 'المنتج الأحدث / أندرويد' : 'DEVELOPMENT SPOTLIGHT / ANDROID'}</span>
        <h2>KX PRIVATE VPN<span aria-hidden="true">™</span></h2>
        <p>{ar ? 'عميل WireGuard أصلي مع تخزين مشفر محليًا وSplit Tunneling. حالة التطوير والاختبارات ظاهرة بوضوح؛ لا يوجد إصدار إنتاجي عام حاليًا.' : 'Native WireGuard client, encrypted local profiles and per-app routing. Development and verification are documented; a public production release is not available yet.'}</p>
      </div>
      <Link href="/software/kx-private-vpn">{ar ? 'افتح صفحة المنتج' : 'EXPLORE KX'} <span aria-hidden="true">↗</span></Link>
    </section>
  );
}
