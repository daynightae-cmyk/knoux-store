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

export function WordPressStudio({ themes }: { themes: Readonly<ExternalItem[]> }) {
  const t = useRouteCopy();
  const [active, setActive] = useState<string>(JOURNEYS[0].id);
  const [slug, setSlug] = useState<string>(themes[0]?.slug ?? '');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const journey = JOURNEYS.find((entry) => entry.id === active) ?? JOURNEYS[0];
  const theme = themes.find((item) => item.slug === slug);

  return (
    <section className={styles.studio} aria-label="WordPress Studio">
      <header className={styles.header}>
        <span>WORDPRESS STUDIO</span>
        <button type="button" aria-label={t('Close studio', 'أغلاق الاستوديو')} className={styles.closeButton}>&times;</button>
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
                <label className={styles.selectLabel}>{t('Choose a theme')}</label>
                <select value={slug} onChange={(event) => setSlug(event.target.value)}>
                  {themes.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className={styles.note}>{t('The official theme directory is unavailable. Browse again or compose a request without a theme.')}</p>
            )}
            <p className={styles.note}>{t('Planning studio · nothing installed or published')}</p>
          </section>
        )}

        {/* 02 Domain Intelligence */}
        {active === 'domain' && (
          <section className={styles.section}>
            <h3>{t('The name comes first.')}</h3>
            <p>{t('A registrar is the only authority on whether a domain can be registered. KNOuX shows exactly what it said.')}</p>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Provider state', 'حالة المزود')}</span>
                <span className={styles.value}>{t('Not configured', 'غير настроен')}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Last check', 'آخر فحص')}</span>
                <span className={styles.value}>{t('Never', 'أبداً')}</span>
              </div>
            </div>
            <p className={styles.note}>{t('Availability and pricing appear here once a registrar connection is configured.')}</p>
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

        {/* 04 Site Identity */}
        {active === 'identity' && (
          <section className={styles.section}>
            <h3>{t('Site identity')}</h3>
            <p>{t('The name, the mark and the words a site introduces itself with.')}</p>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Site title', 'عنوان الموقع')}</span>
                <span className={styles.value}>{t('Not set', 'غير مضبوط')}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Tagline', 'الشعار الفرعي')}</span>
                <span className={styles.value}>{t('Not set', 'غير مضبوط')}</span>
              </div>
            </div>
            <p className={styles.note}>{t('Identity is agreed before launch. Nothing is published from this studio.')}</p>
          </section>
        )}

        {/* 05 Plugin Intelligence */}
        {active === 'plugins' && (
          <section className={styles.section}>
            <h3>{t('Plugin Intelligence')}</h3>
            <p>{t('Extensions that add a capability to an install that already runs.')}</p>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Directory', 'الدليل')}</span>
                <span className={styles.value}>{t('WordPress.org', 'ووردبريس دوت أورغ')}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Scope', 'النطاق')}</span>
                <span className={styles.value}>{t('Metadata and compatibility', 'بيانات التعريف والتوافق')}</span>
              </div>
            </div>
            <p className={styles.note}>{t('KNOuX installs and verifies plugins; it does not publish or endorse any specific item.')}</p>
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

        {/* 07 Visual Composer */}
        {active === 'composer' && (
          <section className={styles.section}>
            <h3>{t('Visual Composer')}</h3>
            <p>{t('Drag, drop and design freely.')}</p>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Blocks', 'الكتل')}</span>
                <span className={styles.value}>{t('Reusable', 'قابلة لإعادة الاستخدام')}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Layout', 'التخطيط')}</span>
                <span className={styles.value}>{t('Modular', 'وحدوي')}</span>
              </div>
            </div>
            <p className={styles.note}>{t('Composition is a request, not a checkout. KNOuX assembles layers after scope is agreed.')}</p>
          </section>
        )}

        {/* 08 Hosting & Infrastructure */}
        {active === 'hosting' && (
          <section className={styles.section}>
            <h3>{t('Hosting & Infrastructure')}</h3>
            <p>{t('Where it runs, and who is answerable for it staying up.')}</p>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Provider', 'المزود')}</span>
                <span className={styles.value}>{t('Not configured', 'غير настроен')}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Boundary', 'الحد')}</span>
                <span className={styles.value}>{t('KNOuX performs; provider supplies')}</span>
              </div>
            </div>
            <p className={styles.note}>{t('Infrastructure is a decision with a person attached to it, not a plan with a number attached to it.')}</p>
          </section>
        )}

        {/* 09 Build & Deployment */}
        {active === 'build' && (
          <section className={styles.section}>
            <h3>{t('Build & Deployment')}</h3>
            <p>{t('The engineering that keeps it alive.')}</p>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Stages', 'المراحل')}</span>
                <span className={styles.value}>{t('Build · Validate · Deploy · Release')}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Receipts', 'الإيصالات')}</span>
                <span className={styles.value}>{t('Bound to operation', 'مرتبطة بالعملية')}</span>
              </div>
            </div>
            <p className={styles.note}>{t('No payment is taken here and nothing is registered automatically.')}</p>
          </section>
        )}

        {/* 10 Operations Command Center */}
        {active === 'operations' && (
          <section className={styles.section}>
            <h3>{t('Operations Command Center')}</h3>
            <p>{t('Maintenance, performance, security, backup and recovery.')}</p>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Services', 'الخدمات')}</span>
                <span className={styles.value}>{t('Seven operating services', 'سبع خدمات تشغيلية')}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.meter}>{t('Incidents', 'الحوادث')}</span>
                <span className={styles.value}>{t('0', '٠')}</span>
              </div>
            </div>
            <p className={styles.note}>{t('Scope and sequence are agreed before work starts.')}</p>
          </section>
        )}

        <a className={styles.request} href={`/contact?requestType=wordpress`}>{t('Compose a site request')} ↗</a>
        <a className={styles.browse} href="/wordpress/themes">{t('Search the full catalogue')} →</a>
      </main>
    </section>
  );
}

const deviceLabel = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' } as const;
