'use client';

import Link from 'next/link';
import { SiteLanguagePicker } from '@/components/i18n/SiteLanguage';
import { OPEN_EVENT } from '@/components/CommandPalette';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import s from './wordpress-masthead.module.css';

function Icon({ name }: Readonly<{ name: 'search' | 'bell' | 'user' }>) {
  const paths = {
    search: 'm21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
    user: 'M20 21a8 8 0 0 0-16 0m16-9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

/** The Store-specific chrome shared by every WordPress reference artboard. */
export function WordPressMasthead() {
  const language = useSiteLanguage();
  const ar = language === 'ar';
  return (
    <header className={s.masthead} aria-label={ar ? 'رأس متجر نوكس' : 'KNOUX Store header'}>
      <Link href="/" className={s.brand} aria-label="KNOuX home"><i aria-hidden="true" />KNOuX</Link>
      <nav className={s.nav} aria-label={ar ? 'أقسام المتجر' : 'Store divisions'}>
        <Link href="/products" aria-current="page">Store <span lang="ar">متجر</span></Link>
        <a href="/wordpress#studio">Studio <span lang="ar">الاستوديو</span></a>
        <Link href="/wordpress/patterns">Resources <span lang="ar">الموارد</span></Link>
        <Link href="/contact">Support <span lang="ar">الدعم</span></Link>
      </nav>
      <Link href="/wordpress" className={s.storeIdentity}>
        <strong>KNOuX <span>STORE</span></strong>
        <small>Digital Headquarters</small>
      </Link>
      <div className={s.actions}>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))} aria-label={ar ? 'فتح البحث' : 'Open search'}><Icon name="search" /></button>
        <Link href="/signal" aria-label={ar ? 'الإشارات والتنبيهات' : 'Signals and alerts'} className={s.alert}><Icon name="bell" /><i aria-hidden="true" /></Link>
        <Link href="/account" aria-label={ar ? 'الحساب' : 'Account'}><Icon name="user" /></Link>
        <div className={s.language}><SiteLanguagePicker /></div>
      </div>
    </header>
  );
}
