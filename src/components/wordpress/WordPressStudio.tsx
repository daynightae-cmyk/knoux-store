'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { SiteLanguagePicker } from '@/components/i18n/SiteLanguage';
import { WordPressCockpit, type WordPressPreviewKind } from './WordPressCockpit';
import { WordPressLibraryGateway } from './WordPressLibraryGateway';
import { ThemeExplorer } from './journeys/ThemeExplorer';
import { LiveCanvas } from './journeys/LiveCanvas';
import { DomainIntelligence } from './journeys/DomainIntelligence';
import { SiteIdentity, readIdentityDraft, saveIdentityDraft, DEFAULT_IDENTITY_DRAFT } from './journeys/SiteIdentity';
import { readComposerBlocks, saveComposerBlocks } from './journeys/ComposerDocument';
import { useStudioCatalog } from './StudioCatalogData';
import { StudioDraftControls } from './StudioDraftControls';
import { readStudioCatalog, restoreStudioSelection } from '@/lib/wordpress/studio-client';
import type { WordPressDraft, WordPressDraftDocument } from '@/lib/wordpress/site-drafts';
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
export const STUDIO_JOURNEY_COUNT = JOURNEYS.length;

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
  const library = useRef<HTMLDialogElement>(null);
  const accountDrafts = useRef<HTMLDialogElement>(null);
  const restoreLookup = useRef<AbortController | null>(null);
  const journeyHeading = useRef<HTMLHeadingElement>(null);
  const journeyTrigger = useRef<HTMLButtonElement>(null);
  const [primary, setPrimary] = useState<'draft' | 'starter'>('draft');
  const [slug, setSlug] = useState<string>(themes[0]?.slug ?? '');
  const [pluginSlug, setPluginSlug] = useState<string>(plugins[0]?.slug ?? '');
  const [previewKind, setPreviewKind] = useState<WordPressPreviewKind>('site');
  const [pluginSlugs, setPluginSlugs] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<ExternalItem | undefined>(themes[0]);
  const [selectedPlugin, setSelectedPlugin] = useState<ExternalItem | undefined>(plugins[0]);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const themeCatalog = useStudioCatalog('theme', themes, themes.length ? 'ok' : 'unavailable', active === 'arrival' || active === 'theme');
  const pluginCatalog = useStudioCatalog('plugin', plugins, plugins.length ? 'ok' : 'unavailable', active === 'arrival' || active === 'plugins');
  const theme = themeCatalog.items.find((item) => item.slug === slug) ?? (selectedTheme?.slug === slug ? selectedTheme : undefined);
  const plugin = pluginCatalog.items.find((item) => item.slug === pluginSlug) ?? (selectedPlugin?.slug === pluginSlug ? selectedPlugin : undefined);

  const restoreDraft = useCallback((saved: WordPressDraft) => {
    restoreLookup.current?.abort();
    const controller = new AbortController();
    restoreLookup.current = controller;
    const selection = restoreStudioSelection(saved);
    saveIdentityDraft(saved.document.identity ?? DEFAULT_IDENTITY_DRAFT);
    saveComposerBlocks(saved.document.blocks);
    setSlug(selection.themeSlug ?? '');
    setPluginSlug(selection.pluginSlug ?? '');
    setPluginSlugs(saved.document.pluginSlugs);
    setSelectedTheme(themes.find((item) => item.slug === selection.themeSlug));
    setSelectedPlugin(plugins.find((item) => item.slug === selection.pluginSlug));
    setPreviewKind(selection.kind);
    setPrimary('draft');
    setRestoreVersion((version) => version + 1);
    // A saved selection may live beyond the current catalogue page. Resolve its
    // official metadata without changing the user's active search or filters.
    for (const [kind, selectedSlug] of [['theme', selection.themeSlug], ['plugin', selection.pluginSlug]] as const) {
      if (!selectedSlug) continue;
      void readStudioCatalog({ kind, search: selectedSlug, page: 1, perPage: 9 }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        const item = result.items.find((candidate) => candidate.slug === selectedSlug);
        if (kind === 'theme') setSelectedTheme(item); else setSelectedPlugin(item);
      }).catch(() => { /* Keep the saved slug; unavailable metadata never changes selection. */ });
    }
  }, [themes, plugins]);

  useEffect(() => () => restoreLookup.current?.abort(), []);

  function snapshot(): WordPressDraftDocument {
    const selectedPlugins = pluginSlug && previewKind === 'plugin' && !pluginSlugs.includes(pluginSlug)
      ? [...pluginSlugs, pluginSlug].slice(-50) : pluginSlugs;
    return {
      schema: 1, identity: readIdentityDraft(), blocks: readComposerBlocks(),
      themeSlug: slug || null, pluginSlugs: selectedPlugins,
      selection: { kind: previewKind, pluginSlug: selectedPlugins.includes(pluginSlug) ? pluginSlug : null },
    };
  }
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

  function selectTheme(next: string) {
    restoreLookup.current?.abort();
    setSelectedTheme(themeCatalog.items.find((item) => item.slug === next) ?? (theme?.slug === next ? theme : undefined));
    setSlug(next);
    setPreviewKind('theme');
  }

  function selectPlugin(next: string) {
    restoreLookup.current?.abort();
    setSelectedPlugin(pluginCatalog.items.find((item) => item.slug === next) ?? (plugin?.slug === next ? plugin : undefined));
    setPluginSlugs((current) => [...new Set([...current, next])].slice(-50));
    setPluginSlug(next);
    setPreviewKind('plugin');
  }

  function changePlugins(next: string[]) {
    setPluginSlugs(next);
    if (!next.includes(pluginSlug)) {
      setPluginSlug(next.at(-1) ?? '');
      if (previewKind === 'plugin') setPreviewKind('site');
    }
  }
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
      {/* The arrival gateway owns the page's only <h1>. The Studio is a modal
          region on top of it, so its title is an accessible level-one heading
          without becoming a second document heading. */}
      <p id="wordpress-studio-title" role="heading" aria-level={1} className={styles.studioTitle}>WordPress Studio</p>
      <div className={styles.toolbar}>
        <button ref={journeyTrigger} type="button" onClick={() => journeys.current?.showModal()}>{t('Studio journeys', 'رحلات الاستوديو')}</button>
        <button type="button" onClick={() => accountDrafts.current?.showModal()}>{t('Account drafts', 'مسودات الحساب')}</button>
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

      <dialog ref={accountDrafts} className={styles.contextPanel} aria-labelledby="wordpress-account-drafts-title">
        <header>
          <h3 id="wordpress-account-drafts-title">{t('Account drafts', 'مسودات الحساب')}</h3>
          <button type="button" onClick={() => accountDrafts.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        <p>{t('Save or restore this site’s identity, layout and selections in your signed-in account. Saving does not publish a WordPress site.', 'احفظ أو استرجع هوية الموقع وتخطيطه واختياراته في حسابك المسجّل. الحفظ لا ينشر موقع ووردبريس.')}</p>
        <StudioDraftControls visible title={() => readIdentityDraft().name.trim() || 'WordPress site draft'} snapshot={snapshot} onRestore={restoreDraft} />
      </dialog>

      {active === 'arrival' && <dialog ref={library} className={`${styles.contextPanel} ${styles.libraryPanel}`} aria-labelledby="wordpress-library-panel">
        <header>
          <h3 id="wordpress-library-panel">{t('WordPress library')}</h3>
          <button type="button" onClick={() => library.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        <WordPressLibraryGateway />
      </dialog>}

      <div className={styles.body}>
        {active !== 'arrival' && <h2 ref={journeyHeading} tabIndex={-1} className={styles.heading}>{journey.label}</h2>}
        {active === 'arrival' && (
          <section className={styles.section} aria-label={t('Document previews', 'معاينات المستند')}>
            {intent && <p className={styles.intent} role="status"><span>{t('Your words', 'وصفك')}</span> “{intent}”</p>}
            <WordPressCockpit
              themes={themeCatalog.items}
              plugins={pluginCatalog.items}
              themeCatalog={themeCatalog}
              pluginCatalog={pluginCatalog}
              selectedTheme={theme}
              selectedPlugin={plugin}
              selectedSlug={slug}
              pluginSlug={pluginSlug}
              kind={previewKind}
              onKindChange={setPreviewKind}
              onSelectTheme={selectTheme}
              onSelectPlugin={selectPlugin}
              t={t}
              primary={primary}
              onSwitch={setPrimary}
              onCustomize={() => changeJourney('composer')}
            />
          </section>
        )}

        {/* 02 Domain Intelligence — reference 83378: real search instrument on
            the live registrar boundary, honest states, selected-domain panel. */}
        {active === 'domain' && <DomainIntelligence />}

        {/* 04 Site Identity — reference 83382: live brand design tool with the
            canonical mark, honest draft state, request composition. */}
        {active === 'identity' && <SiteIdentity key={restoreVersion} />}

        {/* 08 Hosting & Infrastructure — reference 83379: orbital map with the
            canonical mark, honest provider states and the seven real services. */}
        {active === 'hosting' && <InfrastructureMap />}

        {/* 10 Operations Command Center — reference 83383: real service
            capabilities, honest readouts and a true session feed. */}
        {active === 'operations' && <OperationsCenter />}

        {/* 07 Visual Website Composer — reference 83375: a working block
            composer with palette, layers, live preview and inspector. */}
        {active === 'composer' && <VisualComposer key={restoreVersion} onPreview={() => changeJourney('canvas')} />}

        {/* 09 Build & Deployment — reference 83376: the real pipeline stages,
            honest checkpoints, no fabricated telemetry. */}
        {active === 'build' && <BuildPipeline />}

        {/* 05 Plugin Intelligence — capability search on live registry data
            with a compatibility readout built only from returned fields. */}
        {active === 'plugins' && <PluginIntelligence plugins={pluginCatalog.items} catalog={pluginCatalog} selectedItem={plugin} selectedSlug={pluginSlug} onSelect={selectPlugin} selectedPlugins={pluginSlugs} onPluginsChange={changePlugins} />}

        {/* 03 Theme Explorer — reference 83377: searchable library + selected
            theme stage with real registry facts and device-framed preview. */}
        {active === 'theme' && (
          <ThemeExplorer themes={themeCatalog.items} catalog={themeCatalog} selectedItem={theme} selectedSlug={slug} onSelect={selectTheme} />
        )}

        {/* 06 Live Responsive Canvas — reference 83381: device toggles, scale
            control, breakpoints and three framed viewports on one podium. */}
        {active === 'canvas' && (
          <LiveCanvas key={restoreVersion} themes={theme ? [theme, ...themeCatalog.items.filter((item) => item.slug !== theme.slug)] : []} selectedSlug={slug} onSelect={selectTheme} onEdit={() => changeJourney('composer')} />
        )}

        <a className={styles.request} href={`/contact?${requestParams.toString()}`}>{t('Compose a site request')} ↗</a>
        <a className={styles.browse} href="/wordpress/themes">{t('Search the full catalogue')} →</a>
      </div>
    </section>
  );
}
