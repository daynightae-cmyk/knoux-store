'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { SiteLanguagePicker } from '@/components/i18n/SiteLanguage';
import { WordPressPreviewOrbit } from './WordPressPreviewOrbit';
import { WordPressLibraryGateway } from './WordPressLibraryGateway';
import { DeviceFrame } from './journeys/DeviceFrame';
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

export type StudioJourney = (typeof JOURNEYS)[number]['id'];

export function WordPressStudio({
  themes,
  plugins,
  active,
  onJourneyChange,
  onBack,
}: {
  themes: Readonly<ExternalItem[]>;
  plugins: Readonly<ExternalItem[]>;
  active: StudioJourney;
  onJourneyChange: (journey: StudioJourney) => void;
  onBack: () => void;
}) {
  const t = useRouteCopy();
  const journeys = useRef<HTMLDialogElement>(null);
  const themePicker = useRef<HTMLDialogElement>(null);
  const library = useRef<HTMLDialogElement>(null);
  const journeyHeading = useRef<HTMLHeadingElement>(null);
  const journeyTrigger = useRef<HTMLButtonElement>(null);
  const [primary, setPrimary] = useState<'draft' | 'starter'>('draft');
  const [slug, setSlug] = useState<string>(themes[0]?.slug ?? '');
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
  function changeJourney(next: StudioJourney) {
    if (next === active) return;
    cueAtmosphere('confirm');
    onJourneyChange(next);
    window.requestAnimationFrame(() => {
      if (next === 'arrival') journeyTrigger.current?.focus();
      else journeyHeading.current?.focus();
    });
  }

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
    <section className={styles.studio} aria-label="WordPress Studio" data-preview-home={active === 'arrival'}>
      <header className={styles.header}>
        <button id="wordpress-studio-back" type="button" className={styles.back} onClick={onBack}>
          <span aria-hidden="true">←</span> {t('Exit to arrival', 'العودة إلى بوابة الدخول')}
        </button>
        <SiteLanguagePicker />
      </header>

      {active === 'arrival' && <p className={styles.wordmark}>KNOuX <span>STORE</span></p>}
      <h1 id="wordpress-studio-title" className={styles.studioTitle}>WordPress Studio</h1>
      <div className={styles.toolbar}>
        <button ref={journeyTrigger} type="button" onClick={() => journeys.current?.showModal()}>{t('Studio journeys', 'رحلات الاستوديو')}</button>
        {active === 'arrival' && <button type="button" onClick={() => themePicker.current?.showModal()}>{t('Themes', 'القوالب')}</button>}
        {active === 'arrival' && <button type="button" onClick={() => library.current?.showModal()}>{t('WordPress library')}</button>}
        {active !== 'arrival' && <button type="button" onClick={() => changeJourney('arrival')}>{t('Preview orbit', 'مدار المعاينة')}</button>}
      </div>

      <dialog ref={journeys} className={styles.contextPanel} aria-labelledby="wordpress-journey-title">
        <header>
          <h3 id="wordpress-journey-title">{t('Studio journeys', 'رحلات الاستوديو')}</h3>
          <button type="button" onClick={() => journeys.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        <nav className={styles.rail} aria-label={t('Studio journeys', 'رحلات الاستوديو')}>
          {JOURNEYS.map((entry) => (
            <button key={entry.id} type="button" className={styles.journey} aria-pressed={entry.id === active}
              onClick={() => {
                journeys.current?.close();
                changeJourney(entry.id);
              }}>
              {entry.label}
            </button>
          ))}
        </nav>
      </dialog>

      {active === 'arrival' && <dialog ref={library} className={`${styles.contextPanel} ${styles.libraryPanel}`} aria-labelledby="wordpress-library-panel">
        <header>
          <h3 id="wordpress-library-panel">{t('WordPress library')}</h3>
          <button type="button" onClick={() => library.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        <WordPressLibraryGateway />
      </dialog>}

      {active === 'arrival' && <dialog ref={themePicker} className={styles.contextPanel} aria-labelledby="wordpress-theme-panel">
        <header>
          <h3 id="wordpress-theme-panel">{t('Themes', 'القوالب')}</h3>
          <button type="button" onClick={() => themePicker.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        {themes.length ? (
          <div className={styles.choice}>
            <label className={styles.selectLabel} htmlFor="wp-theme-choice">{t('Choose a theme', 'اختيار قالب')}</label>
            <select id="wp-theme-choice" value={slug} onChange={(event) => {
              cueAtmosphere('confirm');
              setSlug(event.target.value);
            }}>
              {themes.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
            {theme && (
              <>
                <p>{t('Official theme screenshot', 'صورة القالب الرسمية')}</p>
                <DeviceFrame device="desktop" theme={theme} />
                <a className={styles.browse} href={theme.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {t('Official theme page', 'الصفحة الرسمية للقالب')} ↗
                </a>
              </>
            )}
          </div>
        ) : <p role="status">{t('The official theme directory is unavailable.', 'دليل القوالب الرسمي غير متاح.')}</p>}
        <button type="button" onClick={() => {
          themePicker.current?.close();
          changeJourney('theme');
        }}>{t('Theme Explorer', 'مستكشف القوالب')}</button>
      </dialog>}

      <div className={styles.body}>
        {active !== 'arrival' && <h2 ref={journeyHeading} tabIndex={-1} className={styles.heading}>{journey.label}</h2>}
        {active === 'arrival' && (
          <section className={styles.section} aria-label={t('Document previews', 'معاينات المستند')}>
            {intent && <p className={styles.intent} role="status"><span>{t('Your words', 'وصفك')}</span> “{intent}”</p>}
            <WordPressPreviewOrbit t={t} primary={primary} onSwitch={setPrimary} onCustomize={() => changeJourney('composer')} />
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
