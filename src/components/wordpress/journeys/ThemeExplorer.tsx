'use client';

/**
 * 03 · Theme Explorer — reference 83377, rendered as code on live registry data.
 *
 * Three panels like the reference: a searchable, filterable library on the
 * left; a device-framed preview of the selected theme on the right with its
 * real registry facts (rating, installs, version, compatibility — only when
 * WordPress.org actually returned them). Screenshots are the authors' own
 * images through the existing allowlisted proxy, never recoloured or faked.
 * "Use this theme" composes a real request; nothing is installed from here.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCount, formatOfficialDate, type ExternalItem } from '@/lib/wordpress/external';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { DeviceFrame, type PreviewDevice } from './DeviceFrame';
import s from './journeys.module.css';

const SELECTED_THEME_KEY = 'knoux-wp-selected-theme';
const FILTERS = ['All', 'blog', 'e-commerce', 'portfolio', 'business', 'magazine'] as const;

function formatInstalls(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function ThemeExplorer({ themes, selectedSlug, onSelect, directory = false }: Readonly<{
  themes: Readonly<ExternalItem[]>;
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
  directory?: boolean;
}>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [savedSlug, setSavedSlug] = useState('');
  const selectedHeading = useRef<HTMLHeadingElement>(null);
  const previewPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!directory) return;
    const timer = window.setTimeout(() => {
      try { setSavedSlug(sessionStorage.getItem(SELECTED_THEME_KEY) ?? ''); } catch { /* selection remains in memory */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [directory]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return themes.filter((item) => {
      const matchesFilter = filter === 'All' || item.tags.some((tag) => tag.toLowerCase().includes(filter));
      const matchesQuery = !needle
        || item.name.toLowerCase().includes(needle)
        || item.slug.includes(needle)
        || item.tags.some((tag) => tag.toLowerCase().includes(needle));
      return matchesFilter && matchesQuery;
    });
  }, [themes, query, filter]);

  const theme = filtered.find((item) => item.slug === (selectedSlug ?? savedSlug)) ?? filtered[0];
  const updated = formatOfficialDate(theme?.lastUpdated);
  const downloads = formatCount(theme?.downloaded);

  function select(slug: string) {
    if (directory) {
      setSavedSlug(slug);
      try { sessionStorage.setItem(SELECTED_THEME_KEY, slug); } catch { /* selection remains in memory */ }
      if (matchMedia('(max-width: 980px)').matches) {
        window.requestAnimationFrame(() => {
          previewPanel.current?.scrollIntoView({ block: 'start' });
          selectedHeading.current?.focus({ preventScroll: true });
        });
      }
    }
    if (slug !== theme?.slug) cueAtmosphere('confirm');
    onSelect?.(slug);
  }

  const requestHref = theme ? `/contact?${new URLSearchParams({
    requestType: 'wordpress',
    items: `WordPress site; theme: ${theme.name}; source: ${theme.sourceUrl}; domain and hosting review; maintenance`,
  }).toString()}` : '/contact?requestType=wordpress';

  if (!themes.length) {
    return (
      <section className={s.panel}>
        <h3 className={s.panelTitle}>{t('Theme Explorer')}</h3>
        <p className={s.empty} role="status">{t('The official theme directory is unavailable this visit. Browse the full catalogue or compose a request without a theme.')}</p>
        <a className={s.ghostAction} href="/wordpress/themes">{t('Open the theme catalogue')} →</a>
      </section>
    );
  }

  return (
    <section className={s.explorer} aria-label={t('Theme Explorer')}>
      <div className={s.library}>
        <header className={s.libraryHead}>
          <h3 className={s.panelTitle}>{t('Theme Library')}</h3>
          <span className={s.count}>{themes.length} {t('themes loaded', 'قالب محمّل')}</span>
        </header>
        {!directory && <label className={s.search}>
          <span className={s.visuallyHidden}>{t('Search themes')}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" strokeLinecap="round" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search themes, styles, or industries…')} />
        </label>}
        <div className={s.filters} role="group" aria-label={t('Filter by style')}>
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              className={s.filter}
              aria-pressed={filter === value}
              onClick={() => { if (filter !== value) cueAtmosphere('settle'); setFilter(value); }}
            >
              {value === 'All' ? t('All themes', 'كل القوالب') : value}
            </button>
          ))}
        </div>
        {filtered.length ? (
          <ul className={s.grid} aria-label={t('Themes')}>
            {filtered.map((item) => {
              const isSelected = theme?.slug === item.slug;
              return (
                <li key={item.slug}>
                  <button type="button" className={s.card} aria-pressed={isSelected} onClick={() => select(item.slug)}>
                    <span className={s.thumb}>
                      {item.screenshotUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy
                        <img src={`/api/wp-image?u=${encodeURIComponent(item.screenshotUrl)}`} alt="" loading="lazy" />
                      ) : (
                        <span className={s.noShot}>{t('No screenshot')}</span>
                      )}
                      {isSelected ? <span className={s.selectedFlag}>{t('Selected', 'مختار')}</span> : null}
                    </span>
                    <span className={s.cardBody}>
                      <span className={s.cardName}>{item.name}</span>
                      <span className={s.cardMeta}>
                        {item.tags.slice(0, 2).join(' · ') || item.author}
                        {typeof item.rating === 'number' && item.rating > 0 ? (
                          <span className={s.rating}>★ {(item.rating / 20).toFixed(1)}{item.ratingCount ? ` (${item.ratingCount})` : ''}</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={s.empty} role="status">{t('No loaded theme matches this search. Clear the filters or open the full catalogue.')}</p>
        )}
      </div>

      {theme ? (
        <aside ref={previewPanel} className={s.stagePanel} aria-label={t('Selected theme')}>
          <div className={s.deviceRail} role="group" aria-label={t('Preview device')}>
            {(['desktop', 'tablet', 'mobile'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={s.deviceChip}
                aria-pressed={device === value}
                onClick={() => { if (device !== value) cueAtmosphere('settle'); setDevice(value); }}
              >
                {t(value[0].toUpperCase() + value.slice(1))}
              </button>
            ))}
          </div>
          <DeviceFrame device={device} theme={theme} />
          <div className={s.detail}>
            <header className={s.detailHead}>
              <h4 ref={selectedHeading} tabIndex={-1}>{theme.name}</h4>
              {typeof theme.rating === 'number' && theme.rating > 0 ? (
                <span className={s.rating}>★ {(theme.rating / 20).toFixed(1)}{theme.ratingCount ? ` (${theme.ratingCount.toLocaleString()} ${t('reviews', 'تقييم')})` : ''}</span>
              ) : null}
            </header>
            <p className={s.detailBy}>{t('by')} {theme.author} · WordPress.org</p>
            {theme.shortDescription ? <p className={s.detailDesc}>{theme.shortDescription}</p> : null}
            <dl className={s.facts}>
              {typeof theme.activeInstalls === 'number' ? (
                <div><dt>{t('Active installs', 'تثبيتات نشطة')}</dt><dd>{formatInstalls(theme.activeInstalls)}+</dd></div>
              ) : null}
              {downloads && (
                <div><dt>{t('Downloads')}</dt><dd>{downloads}</dd></div>
              )}
              {updated && <div><dt>{t('Last updated')}</dt><dd>{updated}</dd></div>}
              {theme.version ? <div><dt>{t('Version', 'الإصدار')}</dt><dd>{theme.version}</dd></div> : null}
              {theme.testedWp ? <div><dt>{t('Tested up to', 'مُختبَر حتى')}</dt><dd>WP {theme.testedWp}</dd></div> : null}
              {theme.requiresPhp ? <div><dt>PHP</dt><dd>{theme.requiresPhp}+</dd></div> : null}
            </dl>
            {theme.tags.length ? (
              <ul className={s.tags} aria-label={t('Style tags')}>
                {theme.tags.slice(0, 6).map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            ) : null}
            <div className={s.actions}>
              {theme.previewUrl && (
                <a className={s.ghostAction} href={theme.previewUrl} target="_blank" rel="noreferrer noopener">
                  {t('Open live preview', 'افتح المعاينة الحية')} ↗
                </a>
              )}
              <a className={s.ghostAction} href={theme.sourceUrl} target="_blank" rel="noreferrer noopener">{t('Official page', 'الصفحة الرسمية')} ↗</a>
              <a className={s.primaryAction} href={requestHref} onClick={() => cueAtmosphere('confirm')}>{t('Use this theme', 'استخدم هذا القالب')} →</a>
            </div>
            <p className={s.boundary}>{t('Official registry facts, verbatim. KNOuX installs and configures after scope is agreed — nothing runs from this preview.')}</p>
          </div>
        </aside>
      ) : null}
    </section>
  );
}
