'use client';

import { useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { usePageCopy } from '@/lib/i18n/page-copy';
import styles from './WordPressStudio.module.css';

/** A bounded official selection, carried to the existing intake as URL state. */
export function WordPressStudio({ themes }: { themes: ExternalItem[] }) {
  const [slug, setSlug] = useState(themes[0]?.slug ?? '');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [failedImage, setFailedImage] = useState('');
  const t = usePageCopy();
  const theme = themes.find(item => item.slug === slug);
  const params = new URLSearchParams({ requestType: 'wordpress', items: theme ? `WordPress site; theme: ${theme.name}; source: ${theme.sourceUrl}; domain and hosting review; maintenance` : 'WordPress site; theme selection; domain and hosting review; maintenance' });
  const deviceLabel = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' } as const;

  return <section className={styles.studio} aria-label="WordPress Studio">
    <header className={styles.header}><span>WORDPRESS STUDIO</span></header>
    <h2>{t('Your next website, in view.')}</h2>
    <p>{t('Official WordPress.org themes')}</p>
    {themes.length ? <label className={styles.select}>{t('Choose a theme')}<select value={slug} onChange={event => setSlug(event.target.value)}>{themes.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label> : <p role="status">{t('The official theme directory is unavailable. Browse again or compose a request without a theme.')}</p>}
    <div className={styles.devices} role="group" aria-label={t('Screenshot width')}>{(['desktop', 'tablet', 'mobile'] as const).map(value => <button key={value} type="button" aria-pressed={device === value} onClick={() => setDevice(value)}>{t(deviceLabel[value])}</button>)}</div>
    <div className={styles.canvas} data-device={device}>
      <div className={styles.preview}>
        <div className={styles.chrome} aria-hidden="true"><i/><i/><i/><span>{theme?.name ?? 'WordPress'}</span></div>
        {theme?.screenshotUrl && failedImage !== theme.screenshotUrl ? <>
          {/* eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy */}
          <img src={`/api/wp-image?u=${encodeURIComponent(theme.screenshotUrl)}`} alt={`${theme.name} · WordPress.org`} width={1200} height={900} onError={() => setFailedImage(theme.screenshotUrl ?? '')}/>
        </> : <p>{theme?.screenshotUrl ? t('Screenshot unavailable. Open the official theme page.') : t('This theme has no official screenshot.')}</p>}
      </div>
    </div>
    <p className={styles.caption}>{t('Official screenshot · resized for comparison, not a live responsive site.')}</p>
    {theme ? <p className={styles.byline}>{t('Published by')} <b>{theme.author}</b> · <a href={theme.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Open official theme & live preview')} ↗</a></p> : null}
    <a className={styles.request} href={`/contact?${params}`}>{t('Compose a site request')} ↗</a>
    <a className={styles.browse} href="/wordpress/themes">{t('Search the full catalogue')} →</a>
    <p className={styles.caption}>{t('Planning studio · nothing installed or published')}</p>
  </section>;
}
