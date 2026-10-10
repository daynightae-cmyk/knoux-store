'use client';

import { useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import styles from './WordPressStudio.module.css';

const COPY = {
  en: { title: 'Your next website, in view.', source: 'Official WordPress.org themes', theme: 'Choose a theme', desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile', caption: 'Official screenshot · resized for comparison, not a live responsive site.', request: 'Compose a site request', browse: 'Search the full catalogue', empty: 'The official theme directory is unavailable. Browse again or compose a request without a theme.', missing: 'This theme has no official screenshot.', preview: 'Open official theme & live preview', status: 'Planning studio · nothing installed or published', author: 'Published by', unavailable: 'Screenshot unavailable. Open the official theme page.' },
  ar: { title: 'موقعك القادم، أمامك.', source: 'قوالب رسمية من WordPress.org', theme: 'اختر قالبًا', desktop: 'كمبيوتر', tablet: 'جهاز لوحي', mobile: 'هاتف', caption: 'صورة رسمية · تغيير الحجم للمقارنة، وليست موقعًا متجاوبًا مباشرًا.', request: 'تكوين طلب موقع', browse: 'البحث في الكتالوج الكامل', empty: 'دليل القوالب الرسمي غير متاح حاليًا. تصفح مجددًا أو أنشئ طلبًا دون قالب.', missing: 'لا توجد صورة رسمية لهذا القالب.', preview: 'فتح القالب والمعاينة الرسمية', status: 'استوديو تخطيط · لم يتم تثبيت أو نشر أي شيء', author: 'نشر بواسطة', unavailable: 'الصورة غير متاحة. افتح صفحة القالب الرسمية.' },
};

/** A bounded official selection, carried to the existing intake as URL state. */
export function WordPressStudio({ themes }: { themes: ExternalItem[] }) {
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [slug, setSlug] = useState(themes[0]?.slug ?? '');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [failedImage, setFailedImage] = useState('');
  const copy = COPY[locale];
  const theme = themes.find(item => item.slug === slug);
  const params = new URLSearchParams({ requestType: 'wordpress', items: theme ? `WordPress site; theme: ${theme.name}; source: ${theme.sourceUrl}; domain and hosting review; maintenance` : 'WordPress site; theme selection; domain and hosting review; maintenance' });

  return <section className={styles.studio} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label="WordPress Studio">
    <header className={styles.header}><span>WORDPRESS STUDIO</span><button type="button" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')} aria-label={locale === 'en' ? 'Switch studio to Arabic' : 'Switch studio to English'}>{locale === 'en' ? 'العربية' : 'English'}</button></header>
    <h2>{copy.title}</h2>
    <p>{copy.source}</p>
    {themes.length ? <label className={styles.select}>{copy.theme}<select value={slug} onChange={event => setSlug(event.target.value)}>{themes.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label> : <p role="status">{copy.empty}</p>}
    <div className={styles.devices} role="group" aria-label={locale === 'en' ? 'Screenshot width' : 'عرض الصورة'}>{(['desktop', 'tablet', 'mobile'] as const).map(value => <button key={value} type="button" aria-pressed={device === value} onClick={() => setDevice(value)}>{copy[value]}</button>)}</div>
    <div className={styles.canvas} data-device={device}>
      <div className={styles.preview}>
        <div className={styles.chrome} aria-hidden="true"><i/><i/><i/><span>{theme?.name ?? 'WordPress'}</span></div>
        {theme?.screenshotUrl && failedImage !== theme.screenshotUrl ? <>
          {/* eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy */}
          <img src={`/api/wp-image?u=${encodeURIComponent(theme.screenshotUrl)}`} alt={`${theme.name} · WordPress.org`} width={1200} height={900} onError={() => setFailedImage(theme.screenshotUrl ?? '')}/>
        </> : <p>{theme?.screenshotUrl ? copy.unavailable : copy.missing}</p>}
      </div>
    </div>
    <p className={styles.caption}>{copy.caption}</p>
    {theme ? <p className={styles.byline}>{copy.author} <b>{theme.author}</b> · <a href={theme.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.preview} ↗</a></p> : null}
    <a className={styles.request} href={`/contact?${params}`}>{copy.request} ↗</a>
    <a className={styles.browse} href="/wordpress/themes">{copy.browse} →</a>
    <p className={styles.caption}>{copy.status}</p>
  </section>;
}
