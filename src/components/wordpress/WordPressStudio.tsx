'use client';

import { useEffect, useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { ThemeExplorer } from './journeys/ThemeExplorer';
import { LiveCanvas } from './journeys/LiveCanvas';
import { DomainIntelligence } from './journeys/DomainIntelligence';
import { SiteIdentity } from './journeys/SiteIdentity';
import { InfrastructureMap } from './journeys/InfrastructureMap';
import { OperationsCenter } from './journeys/OperationsCenter';
import { VisualComposer } from './journeys/VisualComposer';
import { BuildPipeline } from './journeys/BuildPipeline';
import { PluginIntelligence } from './journeys/PluginIntelligence';
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

export function WordPressStudio({
  themes,
  plugins,
  requestedJourney,
  onBack,
}: {
  themes: Readonly<ExternalItem[]>;
  plugins: Readonly<ExternalItem[]>;
  requestedJourney?: string;
  onBack: () => void;
}) {
  const t = useRouteCopy();
  const [active, setActive] = useState<string>(JOURNEYS[0].id);
  const [slug, setSlug] = useState<string>(themes[0]?.slug ?? '');

  useEffect(() => {
    if (requestedJourney && JOURNEYS.some((entry) => entry.id === requestedJourney)) {
      setActive(requestedJourney);
    }
  }, [requestedJourney]);
  // The arrival composer hands its words here — same tab via the event,
  // a return visit via session storage. The stored sentence is read through
  // an external-store subscription so server and client renders agree.
  const [intent, setIntent] = useState<string>('');

  useEffect(() => {
    const readStored = () => {
      try { return window.sessionStorage.getItem('knoux-wp-studio-intent') ?? ''; } catch { return ''; }
    };
    const sync = () => setIntent(readStored());
    const receive = (event: Event) => {
      const words = (event as CustomEvent<string>).detail;
      if (typeof words === 'string' && words.trim()) {
        setIntent(words.trim());
        setActive('arrival');
        cueAtmosphere('ready');
      }
    };
    sync();
    window.addEventListener('knoux:wp-studio-intent', receive);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('knoux:wp-studio-intent', receive);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const journey = JOURNEYS.find((entry) => entry.id === active) ?? JOURNEYS[0];
  const theme = themes.find((item) => item.slug === slug);
  const requestParams = new URLSearchParams({
    requestType: 'wordpress',
    items: [
      intent ? `WordPress site: ${intent}` : 'WordPress site',
      theme ? `theme: ${theme.name}; source: ${theme.sourceUrl}` : 'theme selection',
      'domain and hosting review',
      'maintenance',
    ].join('; '),
  });

  return (
    <section className={styles.studio} aria-label="WordPress Studio">
      <header className={styles.header}>
        <button id="wordpress-studio-back" type="button" className={styles.back} onClick={onBack}>
          <span aria-hidden="true">←</span> {t('Arrival', 'الوصول')}
        </button>
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
              onClick={() => { if (!isActive) cueAtmosphere('confirm'); setActive(entry.id); }}
            >
              <span className={styles.code}>{entry.code}</span>
              <span className={styles.label}>{entry.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.body}>
        <h2 className={styles.heading}>
          {journey.code} / {journey.label} <span className={styles.stepDot} />
        </h2>

        {/* 01 Arrival */}
        {active === 'arrival' && (
          <section className={styles.section}>
            <h3>{t('Your next website, in view.')}</h3>
            {intent ? (
              <p className={styles.intent} role="status">
                <span>{t('Your words', 'وصفك')}</span> “{intent}”
              </p>
            ) : null}
            <p>{t('Official WordPress.org themes')}</p>
            {themes.length ? (
              <div className={styles.choice}>
                <label className={styles.selectLabel} htmlFor="wp-theme-choice">{t('Choose a theme')}</label>
                <select id="wp-theme-choice" value={slug} onChange={(event) => { cueAtmosphere('confirm'); setSlug(event.target.value); }}>
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

        {/* 02 Domain Intelligence — reference 83378: real search instrument on
            the live registrar boundary, honest states, selected-domain panel. */}
        {active === 'domain' && <DomainIntelligence />}

        {/* 04 Site Identity — reference 83382: live brand design tool with the
            canonical mark, honest draft state, request composition. */}
        {active === 'identity' && <SiteIdentity />}

        {/* 08 Hosting & Infrastructure — reference 83379: orbital map with the
            canonical mark, honest provider states and the seven real services. */}
        {active === 'hosting' && <InfrastructureMap />}

        {/* 10 Operations Command Center — reference 83383: real service
            capabilities, honest readouts and a true session feed. */}
        {active === 'operations' && <OperationsCenter />}

        {/* 07 Visual Website Composer — reference 83375: a working block
            composer with palette, layers, live preview and inspector. */}
        {active === 'composer' && <VisualComposer />}

        {/* 09 Build & Deployment — reference 83376: the real pipeline stages,
            honest checkpoints, no fabricated telemetry. */}
        {active === 'build' && <BuildPipeline />}

        {/* 05 Plugin Intelligence — capability search on live registry data
            with a compatibility readout built only from returned fields. */}
        {active === 'plugins' && <PluginIntelligence plugins={plugins} />}

        {/* 03 Theme Explorer — reference 83377: searchable library + selected
            theme stage with real registry facts and device-framed preview. */}
        {active === 'theme' && (
          <ThemeExplorer themes={themes} selectedSlug={slug} onSelect={setSlug} />
        )}

        {/* 06 Live Responsive Canvas — reference 83381: device toggles, scale
            control, breakpoints and three framed viewports on one podium. */}
        {active === 'canvas' && (
          <LiveCanvas themes={themes} selectedSlug={slug} onSelect={setSlug} />
        )}

        <a className={styles.request} href={`/contact?${requestParams.toString()}`}>{t('Compose a site request')} ↗</a>
        <a className={styles.browse} href="/wordpress/themes">{t('Search the full catalogue')} →</a>
      </div>
    </section>
  );
}
