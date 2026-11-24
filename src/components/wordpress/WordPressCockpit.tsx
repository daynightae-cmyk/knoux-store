'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { formatCount, formatOfficialDate } from '@/lib/wordpress/external';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { DeviceFrame, type PreviewDevice } from './journeys/DeviceFrame';
import {
  ComposerDocument,
  DEFAULT_BLOCKS,
  readComposerBlocks,
  saveComposerBlocks,
  STARTING_LAYOUT,
  type Block,
} from './journeys/ComposerDocument';
import { WordPressPreviewOrbit } from './WordPressPreviewOrbit';
import s from './WordPressStudio.module.css';

type Translate = (english: string, arabic?: string) => string;
export type WordPressPreviewKind = 'site' | 'theme' | 'plugin';

type SelectorProps = {
  query: string;
  onQuery: (query: string) => void;
  t: Translate;
};

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" strokeLinecap="round" /></svg>;
}

function navigateChoices(event: ReactKeyboardEvent<HTMLUListElement>) {
  if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0 || !buttons.length) return;
  event.preventDefault();
  const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
  const next = event.key === 'Home' ? 0
    : event.key === 'End' ? buttons.length - 1
      : (current + direction + buttons.length) % buttons.length;
  buttons[next]?.focus();
}

function ThemeSelector({ themes, selectedSlug, active, onSelect, query, onQuery, t }: SelectorProps & Readonly<{
  themes: Readonly<ExternalItem[]>;
  selectedSlug: string;
  active: boolean;
  onSelect: (slug: string) => void;
}>) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return themes;
    return themes.filter((item) => item.name.toLowerCase().includes(needle)
      || item.slug.includes(needle)
      || item.tags.some((tag) => tag.toLowerCase().includes(needle)));
  }, [themes, query]);

  return <div className={s.selectorContent}>
    <label className={s.cockpitSearch}>
      <span className={s.srOnly}>{t('Search loaded themes', 'ابحث في القوالب المحمّلة')}</span>
      <SearchIcon />
      <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t('Search themes…', 'ابحث في القوالب…')} />
    </label>
    {filtered.length ? <ul className={s.themeChoices} aria-label={t('Loaded WordPress themes', 'قوالب ووردبريس المحمّلة')} onKeyDown={navigateChoices}>
      {filtered.map((item) => <li key={item.slug}>
        <button type="button" data-cockpit-theme={item.slug} aria-pressed={active && item.slug === selectedSlug} onClick={() => onSelect(item.slug)}>
          <span className={s.themeChoiceImage}>
            {item.screenshotUrl
              // eslint-disable-next-line @next/next/no-img-element -- official, unmodified asset through the existing allowlisted proxy
              ? <img src={`/api/wp-image?u=${encodeURIComponent(item.screenshotUrl)}`} alt="" loading="lazy" />
              : <span>{t('No screenshot', 'لا توجد صورة')}</span>}
          </span>
          <span className={s.choiceCopy}>
            <strong>{item.name}</strong>
            <small>{item.author}</small>
          </span>
          <span className={s.choiceArrow} aria-hidden="true">↗</span>
        </button>
      </li>)}
    </ul> : <p className={s.cockpitEmpty} role="status">{themes.length
      ? t('No loaded theme matches this search.', 'لا يوجد قالب محمّل يطابق هذا البحث.')
      : t('The official theme directory is unavailable this visit.', 'دليل القوالب الرسمي غير متاح هذه الزيارة.')}</p>}
  </div>;
}

function PluginSelector({ plugins, selectedSlug, active, onSelect, query, onQuery, t }: SelectorProps & Readonly<{
  plugins: Readonly<ExternalItem[]>;
  selectedSlug: string;
  active: boolean;
  onSelect: (slug: string) => void;
}>) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return plugins;
    return plugins.filter((item) => item.name.toLowerCase().includes(needle)
      || item.slug.includes(needle)
      || item.shortDescription.toLowerCase().includes(needle)
      || item.tags.some((tag) => tag.toLowerCase().includes(needle)));
  }, [plugins, query]);

  return <div className={s.selectorContent}>
    <label className={s.cockpitSearch}>
      <span className={s.srOnly}>{t('Search loaded plugins', 'ابحث في الإضافات المحمّلة')}</span>
      <SearchIcon />
      <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t('Search capabilities…', 'ابحث عن قدرات…')} />
    </label>
    {filtered.length ? <ul className={s.pluginChoices} aria-label={t('Loaded WordPress plugins', 'إضافات ووردبريس المحمّلة')} onKeyDown={navigateChoices}>
      {filtered.map((item) => <li key={item.slug}>
        <button type="button" data-cockpit-plugin={item.slug} aria-pressed={active && item.slug === selectedSlug} onClick={() => onSelect(item.slug)}>
          {item.iconUrl
            // eslint-disable-next-line @next/next/no-img-element -- official, unmodified asset through the existing allowlisted proxy
            ? <img src={`/api/wp-image?u=${encodeURIComponent(item.iconUrl)}`} alt="" loading="lazy" />
            : <span className={s.pluginFallback} aria-hidden="true">◈</span>}
          <span className={s.choiceCopy}>
            <strong>{item.name}</strong>
            <small>{item.version ? `v${item.version} · ` : ''}{item.author}</small>
          </span>
          <span className={s.choiceArrow} aria-hidden="true">↗</span>
        </button>
      </li>)}
    </ul> : <p className={s.cockpitEmpty} role="status">{plugins.length
      ? t('No loaded plugin matches this search.', 'لا توجد إضافة محمّلة تطابق هذا البحث.')
      : t('The official plugin directory is unavailable this visit.', 'دليل الإضافات الرسمي غير متاح هذه الزيارة.')}</p>}
  </div>;
}

function RegistryFacts({ item, t }: Readonly<{ item: ExternalItem; t: Translate }>) {
  const installs = formatCount(item.activeInstalls);
  const updated = formatOfficialDate(item.lastUpdated);
  return <dl className={s.cockpitFacts}>
    {installs ? <div><dt>{t('Active installs', 'التثبيتات النشطة')}</dt><dd>{installs}+</dd></div> : null}
    {item.version ? <div><dt>{t('Version', 'الإصدار')}</dt><dd>{item.version}</dd></div> : null}
    {item.testedWp ? <div><dt>{t('Tested up to', 'مُختبَر حتى')}</dt><dd>WP {item.testedWp}</dd></div> : null}
    {item.requiresPhp ? <div><dt>PHP</dt><dd>{item.requiresPhp}+</dd></div> : null}
    {updated ? <div><dt>{t('Updated', 'آخر تحديث')}</dt><dd>{updated}</dd></div> : null}
    {typeof item.rating === 'number' && item.rating > 0 ? <div><dt>{t('Official rating', 'التقييم الرسمي')}</dt><dd>{(item.rating / 20).toFixed(1)} / 5{item.ratingCount ? ` · ${item.ratingCount.toLocaleString()}` : ''}</dd></div> : null}
  </dl>;
}

/**
 * The arrival cockpit: real registry selectors flank one focal preview.
 * Selection never navigates away. Only local drafts and official source data
 * are rendered; installation remains unavailable until a real site connection
 * and authenticated server-side capability exist.
 */
export function WordPressCockpit({ themes, plugins, selectedSlug, pluginSlug, kind, onKindChange, onSelectTheme, onSelectPlugin, onCustomize, primary, onSwitch, t }: Readonly<{
  themes: Readonly<ExternalItem[]>;
  plugins: Readonly<ExternalItem[]>;
  selectedSlug: string;
  pluginSlug: string;
  kind: WordPressPreviewKind;
  onKindChange: (kind: WordPressPreviewKind) => void;
  onSelectTheme: (slug: string) => void;
  onSelectPlugin: (slug: string) => void;
  onCustomize: () => void;
  primary: 'draft' | 'starter';
  onSwitch: (preview: 'draft' | 'starter') => void;
  t: Translate;
}>) {
  const [themeQuery, setThemeQuery] = useState('');
  const [pluginQuery, setPluginQuery] = useState('');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [draft, setDraft] = useState<Block[]>(DEFAULT_BLOCKS);
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'copied' | 'unavailable'>('idle');
  const themeSheet = useRef<HTMLDialogElement>(null);
  const pluginSheet = useRef<HTMLDialogElement>(null);
  const draftPanel = useRef<HTMLDialogElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(readComposerBlocks()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const theme = themes.find((item) => item.slug === selectedSlug) ?? themes[0];
  const plugin = plugins.find((item) => item.slug === pluginSlug) ?? plugins[0];
  const current = kind === 'theme' ? theme : kind === 'plugin' ? plugin : undefined;
  const title = kind === 'site'
    ? t(primary === 'draft' ? 'Your layout draft' : 'Starting layout', primary === 'draft' ? 'مسودة التخطيط' : 'التخطيط الأساسي')
    : current?.name ?? t('Directory unavailable', 'الدليل غير متاح');
  const blocks = primary === 'draft' ? draft : STARTING_LAYOUT;
  const devices = [
    { value: 'desktop', label: t('Desktop', 'سطح المكتب'), icon: '▭' },
    { value: 'tablet', label: t('Tablet', 'الجهاز اللوحي'), icon: '▯' },
    { value: 'mobile', label: t('Mobile', 'الهاتف'), icon: '▥' },
  ] as const;

  function updateDraft(next: Block[]) {
    setDraft(next);
    saveComposerBlocks(next);
  }

  function finishSheetSelection() {
    const wasOpen = Boolean(themeSheet.current?.open || pluginSheet.current?.open);
    themeSheet.current?.close();
    pluginSheet.current?.close();
    if (wasOpen) window.requestAnimationFrame(() => previewHeading.current?.focus({ preventScroll: true }));
  }

  function chooseTheme(slug: string) {
    if (slug !== selectedSlug || kind !== 'theme') cueAtmosphere('confirm');
    onSelectTheme(slug);
    setShareState('idle');
    finishSheetSelection();
  }

  function choosePlugin(slug: string) {
    if (slug !== pluginSlug || kind !== 'plugin') cueAtmosphere('confirm');
    onSelectPlugin(slug);
    setShareState('idle');
    finishSheetSelection();
  }

  function showSite() {
    onKindChange('site');
    setShareState('idle');
    cueAtmosphere('settle');
    finishSheetSelection();
  }

  async function shareCurrent() {
    if (!current) return;
    setShareState('idle');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: current.name, text: current.shortDescription || current.name, url: current.sourceUrl });
        setShareState('shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(current.sourceUrl);
        setShareState('copied');
      } else {
        setShareState('unavailable');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareState('unavailable');
    }
  }

  const requestHref = current ? `/contact?${new URLSearchParams({
    requestType: 'wordpress',
    items: `WordPress site; ${kind}: ${current.name}; source: ${current.sourceUrl}; installation and compatibility review; maintenance`,
  }).toString()}` : '/contact?requestType=wordpress';

  return <>
    <div className={s.cockpit} data-wordpress-cockpit data-preview-kind={kind}>
      <span className={s.cockpitHorizon} aria-hidden="true" />
      <aside className={`${s.cockpitPanel} ${s.themesPanel}`} aria-labelledby="wp-cockpit-themes">
        <header className={s.cockpitPanelHeader}>
          <div><span>WORDPRESS.ORG</span><h2 id="wp-cockpit-themes">{t('Themes', 'القوالب')}</h2></div>
          <b>{themes.length}</b>
        </header>
        <ThemeSelector themes={themes} selectedSlug={selectedSlug} active={kind === 'theme'} onSelect={chooseTheme} query={themeQuery} onQuery={setThemeQuery} t={t} />
        <a className={s.panelCatalogLink} href="/wordpress/themes">{t('Full theme catalogue', 'فهرس القوالب الكامل')} <span aria-hidden="true">↗</span></a>
      </aside>

      <section className={`${s.cockpitPanel} ${s.previewPanel}`} aria-labelledby="wp-cockpit-preview-title">
        <header className={s.previewHeader}>
          <div className={s.previewScope} role="group" aria-label={t('Preview source', 'مصدر المعاينة')}>
            <button type="button" aria-pressed={kind === 'site'} onClick={showSite}>{t('Site', 'الموقع')}</button>
            <button type="button" aria-pressed={kind === 'theme'} disabled={!theme} onClick={() => theme && chooseTheme(theme.slug)}>{t('Theme', 'القالب')}</button>
            <button type="button" aria-pressed={kind === 'plugin'} disabled={!plugin} onClick={() => plugin && choosePlugin(plugin.slug)}>{t('Plugin', 'الإضافة')}</button>
          </div>
        </header>

        <div className={s.previewScroll}>
          <div key={`${kind}-${current?.slug ?? primary}`} className={s.previewSwap}>
            <div className={s.previewIdentity} aria-live="polite" aria-atomic="true">
              <div>
                <span>{kind === 'site' ? t('LOCAL EDITABLE PREVIEW', 'معاينة محلية قابلة للتحرير') : `${kind.toUpperCase()} · WORDPRESS.ORG`}</span>
                <h2 id="wp-cockpit-preview-title" ref={previewHeading} tabIndex={-1}>{title}</h2>
                {current ? <p>{t('by')} {current.author}</p> : <p>{t('Your local sections stay in this browser session.', 'تبقى أقسامك المحلية في جلسة هذا المتصفح.')}</p>}
              </div>
              <span className={s.previewStatus}><i aria-hidden="true" />{kind === 'site' ? t('Draft', 'مسودة') : t('Official source', 'مصدر رسمي')}</span>
            </div>

            {kind === 'theme' && theme ? <>
              <div className={s.previewVisual}><DeviceFrame device={device} theme={theme} eager /></div>
              <div className={s.previewDetails}>
                {theme.shortDescription ? <p>{theme.shortDescription}</p> : null}
                <RegistryFacts item={theme} t={t} />
              </div>
            </> : null}

            {kind === 'plugin' && plugin ? <>
              <div className={s.pluginPreviewHero}>
                <div className={s.pluginPreviewIcon}>
                  {plugin.iconUrl
                    // eslint-disable-next-line @next/next/no-img-element -- official, unmodified asset through the existing allowlisted proxy
                    ? <img src={`/api/wp-image?u=${encodeURIComponent(plugin.iconUrl)}`} alt={`${plugin.name} · WordPress.org`} />
                    : <span aria-hidden="true">◈</span>}
                </div>
                <div><span>{t('REGISTRY OVERVIEW', 'نظرة على السجل الرسمي')}</span><strong>{plugin.name}</strong><small>{t('Previewing metadata does not install or execute this plugin.', 'معاينة البيانات لا تثبّت أو تشغّل هذه الإضافة.')}</small></div>
              </div>
              <div className={s.previewDetails}>
                {plugin.shortDescription ? <p>{plugin.shortDescription}</p> : null}
                <RegistryFacts item={plugin} t={t} />
                {plugin.tags.length ? <ul className={s.cockpitTags} aria-label={t('Plugin capability tags', 'وسوم قدرات الإضافة')}>{plugin.tags.slice(0, 7).map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}
              </div>
            </> : null}

            {kind === 'site' ? <>
              <div className={`${s.previewVisual} ${s.sitePreview}`}><DeviceFrame device={device} title={title}><ComposerDocument blocks={blocks} /></DeviceFrame></div>
              <div className={s.draftChoice} role="group" aria-label={t('Layout version', 'نسخة التخطيط')}>
                <button type="button" aria-pressed={primary === 'draft'} onClick={() => onSwitch('draft')}>{t('Layout draft', 'مسودة التخطيط')}</button>
                <button type="button" aria-pressed={primary === 'starter'} onClick={() => onSwitch('starter')}>{t('Starting layout', 'التخطيط الأساسي')}</button>
              </div>
            </> : null}

            {!current && kind !== 'site' ? <p className={s.cockpitEmpty} role="status">{t('This official directory is unavailable. Your local site draft is still available.', 'هذا الدليل الرسمي غير متاح. مسودة موقعك المحلية ما زالت متاحة.')}</p> : null}
          </div>
        </div>

        <footer className={s.previewActions}>
          {kind === 'site' ? <>
            <button type="button" className={s.primaryCockpitAction} onClick={onCustomize}>{t('Customize', 'تخصيص')} <span aria-hidden="true">→</span></button>
            <button type="button" onClick={() => draftPanel.current?.showModal()}>{t('Preview & inspector', 'المعاينة والفاحص')}</button>
          </> : <>
            {kind === 'theme' && theme ? <a className={s.primaryCockpitAction} href={theme.previewUrl ?? theme.sourceUrl} target="_blank" rel="noopener noreferrer">{theme.previewUrl ? t('Live preview', 'معاينة حية') : t('Official page', 'الصفحة الرسمية')} <span aria-hidden="true">↗</span></a> : null}
            {kind === 'plugin' && plugin ? <a className={s.primaryCockpitAction} href={plugin.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Official page', 'الصفحة الرسمية')} <span aria-hidden="true">↗</span></a> : null}
            {current ? <button type="button" onClick={shareCurrent}>{t('Share', 'مشاركة')}</button> : null}
            {kind === 'theme' ? <button type="button" onClick={onCustomize}>{t('Customize draft', 'تخصيص المسودة')}</button> : null}
            {current ? <a href={requestHref}>{t('Request setup', 'اطلب الإعداد')}</a> : null}
          </>}
          <button type="button" disabled title={t('No authenticated WordPress site is connected in this Studio.', 'لا يوجد موقع ووردبريس موثّق متصل بهذا الاستوديو.')}>{t('Install', 'تثبيت')} <small>{t('Not connected', 'غير متصل')}</small></button>
          {shareState !== 'idle' ? <span className={s.shareStatus} role="status">{shareState === 'shared' ? t('Shared.', 'تمت المشاركة.') : shareState === 'copied' ? t('Official link copied.', 'تم نسخ الرابط الرسمي.') : t('Sharing is unavailable here. Open the official page instead.', 'المشاركة غير متاحة هنا. افتح الصفحة الرسمية بدلاً من ذلك.')}</span> : null}
        </footer>
      </section>

      <aside className={`${s.cockpitPanel} ${s.pluginsPanel}`} aria-labelledby="wp-cockpit-plugins">
        <header className={s.cockpitPanelHeader}>
          <div><span>WORDPRESS.ORG</span><h2 id="wp-cockpit-plugins">{t('Plugins', 'الإضافات')}</h2></div>
          <b>{plugins.length}</b>
        </header>
        <PluginSelector plugins={plugins} selectedSlug={pluginSlug} active={kind === 'plugin'} onSelect={choosePlugin} query={pluginQuery} onQuery={setPluginQuery} t={t} />
        <a className={s.panelCatalogLink} href="/wordpress/plugins">{t('Full plugin catalogue', 'فهرس الإضافات الكامل')} <span aria-hidden="true">↗</span></a>
      </aside>
      {(kind === 'theme' || kind === 'site') && <div className={`${s.deviceSwitch} ${s.orbitalDeviceDock}`} role="group" aria-label={t('Preview device', 'جهاز المعاينة')}>
        {devices.map(({ value, label, icon }) => <button key={value} type="button" aria-pressed={device === value} onClick={() => {
          if (value !== device) cueAtmosphere('confirm');
          setDevice(value);
        }} aria-label={label}>
          <span aria-hidden="true">{icon}</span><span>{label}</span>
        </button>)}
      </div>}
    </div>

    <nav className={s.mobileCockpitDock} aria-label={t('Studio libraries', 'مكتبات الاستوديو')}>
      <button type="button" aria-pressed={kind === 'site'} onClick={showSite}><span aria-hidden="true">◇</span>{t('Site', 'الموقع')}</button>
      <button type="button" aria-pressed={kind === 'theme'} onClick={() => themeSheet.current?.showModal()}><span aria-hidden="true">▧</span>{t('Themes', 'القوالب')}<small>{themes.length}</small></button>
      <button type="button" aria-pressed={kind === 'plugin'} onClick={() => pluginSheet.current?.showModal()}><span aria-hidden="true">◈</span>{t('Plugins', 'الإضافات')}<small>{plugins.length}</small></button>
    </nav>

    <dialog ref={themeSheet} className={`${s.contextPanel} ${s.cockpitSheet}`} aria-labelledby="wp-theme-sheet-title">
      <header><div><span>WORDPRESS.ORG</span><h3 id="wp-theme-sheet-title">{t('Choose a theme', 'اختر قالباً')}</h3></div><button type="button" onClick={() => themeSheet.current?.close()} aria-label={t('Close themes', 'إغلاق القوالب')}>×</button></header>
      <ThemeSelector themes={themes} selectedSlug={selectedSlug} active={kind === 'theme'} onSelect={chooseTheme} query={themeQuery} onQuery={setThemeQuery} t={t} />
    </dialog>
    <dialog ref={pluginSheet} className={`${s.contextPanel} ${s.cockpitSheet}`} aria-labelledby="wp-plugin-sheet-title">
      <header><div><span>WORDPRESS.ORG</span><h3 id="wp-plugin-sheet-title">{t('Choose a plugin', 'اختر إضافة')}</h3></div><button type="button" onClick={() => pluginSheet.current?.close()} aria-label={t('Close plugins', 'إغلاق الإضافات')}>×</button></header>
      <PluginSelector plugins={plugins} selectedSlug={pluginSlug} active={kind === 'plugin'} onSelect={choosePlugin} query={pluginQuery} onQuery={setPluginQuery} t={t} />
    </dialog>
    <dialog ref={draftPanel} className={`${s.contextPanel} ${s.draftPanel}`} aria-labelledby="wp-draft-panel-title">
      <header><div><span>LOCAL SESSION</span><h3 id="wp-draft-panel-title">{t('Layout previews & inspector', 'معاينات التخطيط والفاحص')}</h3></div><button type="button" onClick={() => draftPanel.current?.close()} aria-label={t('Close layout previews', 'إغلاق معاينات التخطيط')}>×</button></header>
      <WordPressPreviewOrbit draft={draft} onDraftChange={updateDraft} t={t} primary={primary} onSwitch={onSwitch} onCustomize={() => { draftPanel.current?.close(); onCustomize(); }} />
    </dialog>
  </>;
}
