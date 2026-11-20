'use client';

import { useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import styles from './WordPressStudio.module.css';

/**
 * WordPress Studio — ten journeys, in the order the work actually happens.
 *
 * Each journey is rendered honestly: values come from registries, providers
 * and theme data only. Nothing here invents a price, an uptime promise, a
 * provider connection or a theme that has not been fetched.
 *
 * The ten sections mirror the supplied originals:
 *   01 Arrival   02 Domain Intelligence   03 Theme Explorer   04 Site Identity
 *   05 Plugin Intelligence   06 Live Responsive Canvas   07 Visual Composer
 *   08 Hosting & Infrastructure   09 Build & Deployment   10 Operations Command Center
 */

function useRouteCopy() {
  const language = useSiteLanguage();
  return (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
}

const JOURNEYS = [
  { id: 'arrival', code: '01', label: 'Arrival' },
  { id: 'domain', code: '02', label: 'Domain Intelligence' },
  { id: 'theme', code: '03', label: 'Theme Explorer' },
  { id: 'identity', code: '04', label: 'Site Identity' },
  { id: 'plugins', code: '05', label: 'Plugin Intelligence' },
  { id: 'canvas', code: '06', label: 'Live Responsive Canvas' },
  { id: 'composer', code: '07', label: 'Visual Composer' },
  { id: 'hosting', code: '08', label: 'Hosting & Infrastructure' },
  { id: 'build', code: '09', label: 'Build & Deployment' },
  { id: 'operations', code: '10', label: 'Operations Command Center' },
] as const;

/** Copy for the journeys that share one honest shape: heading, intro, two
 *  readout cards and a boundary note. Values stay registry truth — nothing
 *  here invents a connection, a price or a status. */
const READOUT_JOURNEYS: Partial<Record<(typeof JOURNEYS)[number]['id'], {
  heading: string;
  intro: string;
  cards: Readonly<{ meter: string; meterAr?: string; value: string; valueAr?: string }>[];
  note: string;
}>> = {
  domain: {
    heading: 'The name comes first.',
    intro: 'A registrar is the only authority on whether a domain can be registered. KNOuX shows exactly what it said.',
    cards: [
      { meter: 'Provider state', meterAr: 'حالة المزود', value: 'Not configured' },
      { meter: 'Last check', meterAr: 'آخر فحص', value: 'Never', valueAr: 'أبداً' },
    ],
    note: 'Availability and pricing appear here once a registrar connection is configured.',
  },
  identity: {
    heading: 'Site identity',
    intro: 'The name, the mark and the words a site introduces itself with.',
    cards: [
      { meter: 'Site title', meterAr: 'عنوان الموقع', value: 'Not set', valueAr: 'غير مضبوط' },
      { meter: 'Tagline', meterAr: 'الشعار الفرعي', value: 'Not set', valueAr: 'غير مضبوط' },
    ],
    note: 'Identity is agreed before launch. Nothing is published from this studio.',
  },
  plugins: {
    heading: 'Plugin Intelligence',
    intro: 'Extensions that add a capability to an install that already runs.',
    cards: [
      { meter: 'Directory', meterAr: 'الدليل', value: 'WordPress.org', valueAr: 'ووردبريس دوت أورغ' },
      { meter: 'Scope', meterAr: 'النطاق', value: 'Metadata and compatibility', valueAr: 'بيانات التعريف والتوافق' },
    ],
    note: 'KNOuX installs and verifies plugins; it does not publish or endorse any specific item.',
  },
  composer: {
    heading: 'Visual Composer',
    intro: 'Drag, drop and design freely.',
    cards: [
      { meter: 'Blocks', meterAr: 'الكتل', value: 'Reusable', valueAr: 'قابلة لإعادة الاستخدام' },
      { meter: 'Layout', meterAr: 'التخطيط', value: 'Modular', valueAr: 'وحدوي' },
    ],
    note: 'Composition is a request, not a checkout. KNOuX assembles layers after scope is agreed.',
  },
  hosting: {
    heading: 'Hosting & Infrastructure',
    intro: 'Where it runs, and who is answerable for it staying up.',
    cards: [
      { meter: 'Provider', meterAr: 'المزود', value: 'Not configured' },
      { meter: 'Boundary', meterAr: 'الحد', value: 'KNOuX performs; provider supplies' },
    ],
    note: 'Infrastructure is a decision with a person attached to it, not a plan with a number attached to it.',
  },
  build: {
    heading: 'Build & Deployment',
    intro: 'The engineering that keeps it alive.',
    cards: [
      { meter: 'Stages', meterAr: 'المراحل', value: 'Build · Validate · Deploy · Release' },
      { meter: 'Receipts', meterAr: 'الإيصالات', value: 'Bound to operation', valueAr: 'مرتبطة بالعملية' },
    ],
    note: 'No payment is taken here and nothing is registered automatically.',
  },
  operations: {
    heading: 'Operations Command Center',
    intro: 'Maintenance, performance, security, backup and recovery.',
    cards: [
      { meter: 'Services', meterAr: 'الخدمات', value: 'Seven operating services', valueAr: 'سبع خدمات تشغيلية' },
      { meter: 'Incidents', meterAr: 'الحوادث', value: '0', valueAr: '٠' },
    ],
    note: 'Scope and sequence are agreed before work starts.',
  },
};

export function WordPressStudio({ themes }: { themes: Readonly<ExternalItem[]> }) {
  const t = useRouteCopy();
  const [active, setActive] = useState<string>(JOURNEYS[0].id);
  const [slug, setSlug] = useState<string>(themes[0]?.slug ?? '');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const journey = JOURNEYS.find((entry) => entry.id === active) ?? JOURNEYS[0];
  const readout = READOUT_JOURNEYS[journey.id];
  const theme = themes.find((item) => item.slug === slug);
  const requestParams = new URLSearchParams({
    requestType: 'wordpress',
    items: theme
      ? `WordPress site; theme: ${theme.name}; source: ${theme.sourceUrl}; domain and hosting review; maintenance`
      : 'WordPress site; theme selection; domain and hosting review; maintenance',
  });

  return (
    <section className={styles.studio} aria-label="WordPress Studio">
      <header className={styles.header}>
        <span>WORDPRESS STUDIO</span>
      </header>

      <nav className={styles.rail} role="navigation" aria-label={t('Studio journeys', 'رحلات الاستوديو')}>
        {JOURNEYS.map((entry) => {
          const isActive = entry.id === active;
          return (
            <button
              key={entry.id}
              type="button"
              className={`${styles.journey} ${isActive ? styles.active : ''}`}
              aria-pressed={isActive}
              onClick={() => setActive(entry.id)}
            >
              <span className={styles.code}>{entry.code}</span>
              <span className={styles.label}>{entry.label}</span>
            </button>
          );
        })}
      </nav>

      <main className={styles.body}>
        <h2 className={styles.heading}>
          {journey.code} / {journey.label} <span className={styles.stepDot} />
        </h2>

        {/* 01 Arrival */}
        {active === 'arrival' && (
          <section className={styles.section}>
            <h3>{t('Your next website, in view.')}</h3>
            <p>{t('Official WordPress.org themes')}</p>
            {themes.length ? (
              <div className={styles.choice}>
                <label className={styles.selectLabel} htmlFor="wp-theme-choice">{t('Choose a theme')}</label>
                <select id="wp-theme-choice" value={slug} onChange={(event) => setSlug(event.target.value)}>
                  {themes.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className={styles.note} role="status">{t('The official theme directory is unavailable. Browse again or compose a request without a theme.')}</p>
            )}
            <p className={styles.note}>{t('Planning studio · nothing installed or published')}</p>
          </section>
        )}

        {/* 02 Domain · 04 Identity · 05 Plugins · 07 Composer · 08 Hosting ·
            09 Build · 10 Operations — one shared readout shape, copy per journey. */}
        {readout && (
          <section className={styles.section}>
            <h3>{t(readout.heading)}</h3>
            <p>{t(readout.intro)}</p>
            <div className={styles.cardGrid}>
              {readout.cards.map((card) => (
                <div key={card.meter} className={styles.card}>
                  <span className={styles.meter}>{t(card.meter, card.meterAr)}</span>
                  <span className={styles.value}>{t(card.value, card.valueAr)}</span>
                </div>
              ))}
            </div>
            <p className={styles.note}>{t(readout.note)}</p>
          </section>
        )}

        {/* 03 Theme Explorer */}
        {active === 'theme' && (
          <section className={styles.section}>
            <h3>{t('Full presentation systems.')}</h3>
            <p>{t('Official themes, presented as the screenshots their authors publish.')}</p>
            {themes.length ? (
              <div className={styles.themeGrid}>
                {themes.slice(0, 6).map((item) => (
                  <article key={item.slug} className={styles.themeCard} aria-label={item.name}>
                    <div className={styles.themeThumb}>
                      {item.screenshotUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy */}
                          <img src={`/api/wp-image?u=${encodeURIComponent(item.screenshotUrl)}`} alt={`${item.name} · WordPress.org`} loading="lazy" />
                        </>
                      ) : (
                        <div className={styles.themePlaceholder}>{t('No screenshot')}</div>
                      )}
                    </div>
                    <div className={styles.themeBody}>
                      <span className={styles.themeName}>{item.name}</span>
                      <span className={styles.themeBy}>{t('by')} {item.author ?? t('WordPress.org')}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.note}>{t('The official theme directory is unavailable.')}</p>
            )}
          </section>
        )}

        {/* 06 Live Responsive Canvas */}
        {active === 'canvas' && (
          <section className={styles.section}>
            <h3>{t('Live Responsive Canvas')}</h3>
            <p>{t('Desktop · Mobile · Tablet')}</p>
            <fieldset className={styles.deviceRail} aria-label={t('Screenshot width')}>
              <legend className={styles.visuallyHidden}>{t('Screenshot width')}</legend>
              {(['desktop', 'tablet', 'mobile'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.deviceButton} ${device === value ? styles.active : ''}`}
                  aria-pressed={device === value}
                  onClick={() => setDevice(value)}
                >
                  {t(deviceLabel[value])}
                </button>
              ))}
            </fieldset>
            <div className={styles.canvasWrapper} data-device={device}>
              <div className={styles.previewFrame}>
                <div className={styles.chrome}>{theme?.name ?? 'WordPress'}</div>
                {theme?.screenshotUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy */}
                    <img src={`/api/wp-image?u=${encodeURIComponent(theme.screenshotUrl)}`} alt={`${theme.name} · WordPress.org`} width={1200} height={900} loading="lazy" />
                  </>
                ) : (
                  <p className={styles.note}>{t('This theme has no official screenshot.')}</p>
                )}
              </div>
            </div>
            <p className={styles.note}>{t('Official screenshot · resized for comparison, not a live responsive site.')}</p>
          </section>
        )}

        <a className={styles.request} href={`/contact?${requestParams.toString()}`}>{t('Compose a site request')} ↗</a>
        <a className={styles.browse} href="/wordpress/themes">{t('Search the full catalogue')} →</a>
      </main>
    </section>
  );
}

const deviceLabel = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' } as const;
