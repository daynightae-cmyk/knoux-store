'use client';

/**
 * 05 · Plugin Intelligence — the Theme Explorer's instrument language applied
 * to plugins, which are metadata rather than images: a searchable capability
 * list on the left, and a compatibility readout on the right built only from
 * fields WordPress.org actually returned (active installs, tested-up-to,
 * required PHP, version, rating). Selection composes a real request; nothing
 * is installed from the studio.
 */
import { useMemo, useRef, useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import studioStyles from '../WordPressStudio.module.css';
import s from './journeys.module.css';

function formatInstalls(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function PluginIntelligence({ plugins, directory = false }: Readonly<{ plugins: Readonly<ExternalItem[]>; directory?: boolean }>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [query, setQuery] = useState('');
  const [slug, setSlug] = useState<string>(plugins[0]?.slug ?? '');
  // Selection tray: a real curated set (this session only), inspired by the
  // reference's tray — no installs happen here, the set composes one request.
  const [tray, setTray] = useState<string[]>([]);
  const trayPanel = useRef<HTMLDialogElement>(null);
  const detailPanel = useRef<HTMLElement>(null);

  function toggleTray(target: string) {
    cueAtmosphere(tray.includes(target) ? 'settle' : 'confirm');
    setTray((current) => current.includes(target) ? current.filter((entry) => entry !== target) : [...current, target]);
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return plugins;
    return plugins.filter((item) =>
      item.name.toLowerCase().includes(needle)
      || item.slug.includes(needle)
      || item.shortDescription.toLowerCase().includes(needle)
      || item.tags.some((tag) => tag.toLowerCase().includes(needle)));
  }, [plugins, query]);

  const plugin = filtered.find((item) => item.slug === slug) ?? filtered[0];

  function selectPlugin(target: string) {
    if (plugin?.slug !== target) cueAtmosphere('confirm');
    setSlug(target);
    if (directory && matchMedia('(max-width: 980px)').matches) {
      window.requestAnimationFrame(() => {
        detailPanel.current?.scrollIntoView({ block: 'start' });
        detailPanel.current?.focus({ preventScroll: true });
      });
    }
  }

  if (!plugins.length) {
    return (
      <section className={s.panel}>
        <h3 className={s.panelTitle}>{t('Plugin Intelligence')}</h3>
        <p className={s.empty} role="status">{t('The official plugin directory is unavailable this visit. Browse the full catalogue or compose a request without a plugin.', 'دليل الإضافات الرسمي غير متاح هذه الزيارة. تصفح الفهرس الكامل أو اكتب طلباً بدون إضافة.')}</p>
        <a className={s.ghostAction} href="/wordpress/plugins">{t('Open the plugin catalogue', 'افتح فهرس الإضافات')} →</a>
      </section>
    );
  }

  const requestHref = plugin ? `/contact?${new URLSearchParams({
    requestType: 'wordpress',
    items: `WordPress site; plugin: ${plugin.name}; source: ${plugin.sourceUrl}; installation and compatibility review; maintenance`,
  }).toString()}` : '/contact?requestType=wordpress';

  const trayPlugins = plugins.filter((item) => tray.includes(item.slug));
  const trayHref = `/contact?${new URLSearchParams({
    requestType: 'wordpress',
    items: `WordPress site; plugins: ${trayPlugins.map((item) => `${item.name} (${item.sourceUrl})`).join('; ')}; installation and compatibility review; maintenance`,
  }).toString()}`;

  return (
    <section className={s.pluginsJourney} aria-label={t('Plugin Intelligence')}>
    <div className={s.explorer}>
      <div className={s.library}>
        <header className={s.libraryHead}>
          <h3 className={s.panelTitle}>{t('Plugin Directory', 'دليل الإضافات')}</h3>
          <span className={s.count}>{plugins.length} {t('plugins loaded', 'إضافة محمّلة')}</span>
        </header>
        {!directory && <label className={s.search}>
          <span className={s.visuallyHidden}>{t('Search plugins')}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" strokeLinecap="round" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search capabilities — SEO, forms, cache…', 'ابحث عن قدرات — SEO، نماذج، كاش…')} />
        </label>}
        {filtered.length ? (
          <ul className={s.pluginList} aria-label={t('Plugins')}>
            {filtered.map((item) => {
              const isSelected = plugin?.slug === item.slug;
              return (
                <li key={item.slug} className={s.pluginRowWrap}>
                  <button type="button" className={s.domainRow} aria-pressed={isSelected}
                    onClick={() => selectPlugin(item.slug)}>
                    <span className={s.pluginIdentity}>
                      {item.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- official icon through the existing allowlisted proxy
                        <img className={s.pluginIcon} src={`/api/wp-image?u=${encodeURIComponent(item.iconUrl)}`} alt="" loading="lazy" />
                      ) : <span className={s.pluginIconFallback} aria-hidden="true">◈</span>}
                      <span className={s.domainName}>{item.name}</span>
                    </span>
                    <span className={s.domainProvider}>{item.author}</span>
                    <span className={s.domainPrice}>
                      {typeof item.activeInstalls === 'number' ? `${formatInstalls(item.activeInstalls)}+ ${t('installs', 'تثبيت')}` : t('Installs not published', 'التثبيتات غير منشورة')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={s.trayToggle}
                    aria-pressed={tray.includes(item.slug)}
                    aria-label={tray.includes(item.slug) ? t(`Remove ${item.name} from the selection tray`, `أزل ${item.name} من مجموعة الاختيار`) : t(`Add ${item.name} to the selection tray`, `أضف ${item.name} إلى مجموعة الاختيار`)}
                    onClick={() => toggleTray(item.slug)}
                  >{tray.includes(item.slug) ? '✓' : '+'}</button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={s.empty} role="status">{t('No loaded plugin matches this search. Clear it or open the full catalogue.', 'لا توجد إضافة محمّلة تطابق البحث. امسحه أو افتح الفهرس الكامل.')}</p>
        )}
      </div>

      {plugin ? (
        <aside ref={detailPanel} tabIndex={-1} className={s.stagePanel} aria-label={t('Selected plugin')}>
          <header className={s.detailHead}>
            <h4>{plugin.name}</h4>
            {typeof plugin.rating === 'number' && plugin.rating > 0 ? (
              <span className={s.rating}>★ {(plugin.rating / 20).toFixed(1)}{plugin.ratingCount ? ` (${plugin.ratingCount.toLocaleString()})` : ''}</span>
            ) : null}
          </header>
          <p className={s.detailBy}>{t('by')} {plugin.author} · WordPress.org</p>
          {plugin.shortDescription ? <p className={s.detailDesc}>{plugin.shortDescription}</p> : null}
          <dl className={s.facts}>
            {typeof plugin.activeInstalls === 'number' ? (
              <div><dt>{t('Active installs', 'تثبيتات نشطة')}</dt><dd>{formatInstalls(plugin.activeInstalls)}+</dd></div>
            ) : null}
            {plugin.version ? <div><dt>{t('Version', 'الإصدار')}</dt><dd>{plugin.version}</dd></div> : null}
            {plugin.testedWp ? <div><dt>{t('Tested up to', 'مُختبَر حتى')}</dt><dd>WP {plugin.testedWp}</dd></div> : null}
            {plugin.requiresWp ? <div><dt>{t('Requires WP', 'يتطلب WP')}</dt><dd>{plugin.requiresWp}+</dd></div> : null}
            {plugin.requiresPhp ? <div><dt>PHP</dt><dd>{plugin.requiresPhp}+</dd></div> : null}
            {plugin.lastUpdated ? <div><dt>{t('Updated', 'آخر تحديث')}</dt><dd>{plugin.lastUpdated.slice(0, 10)}</dd></div> : null}
          </dl>
          {plugin.tags.length ? (
            <ul className={s.tags} aria-label={t('Capability tags')}>
              {plugin.tags.slice(0, 6).map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          ) : null}
          <div className={s.actions}>
            <a className={s.ghostAction} href={plugin.sourceUrl} target="_blank" rel="noreferrer noopener">{t('Official page', 'الصفحة الرسمية')} ↗</a>
            <a className={s.primaryAction} href={requestHref} onClick={() => cueAtmosphere('confirm')}>{t('Request this plugin', 'اطلب هذه الإضافة')} →</a>
          </div>
          <p className={s.boundary}>{t('Official registry facts, verbatim. KNOuX installs, configures and verifies compatibility on the real install — nothing runs from this preview.', 'بيانات رسمية حرفية. تثبّت KNOuX وتضبط وتتحقق من التوافق على التثبيت الحقيقي — لا شيء يعمل من هذه المعاينة.')}</p>
        </aside>
      ) : null}
    </div>

    <button className={s.ghostAction} type="button" onClick={() => trayPanel.current?.showModal()}>
      {t('Review selected plugins', 'راجع الإضافات المحددة')} ({trayPlugins.length})
    </button>
    <dialog ref={trayPanel} className={studioStyles.contextPanel} aria-labelledby="wp-plugin-selection">
      <header>
        <h3 id="wp-plugin-selection">{t('Selection tray')}</h3>
        <button type="button" onClick={() => trayPanel.current?.close()}>{t('Close', 'إغلاق')}</button>
      </header>
      {trayPlugins.length ? (
        <div className={s.selectionTray} role="group" aria-label={t('Selection tray')}>
          <span className={s.trayLabel}>
            <b>{trayPlugins.length}</b> {t('selected', 'مختارة')}
          </span>
          <ul className={s.trayChips} aria-label={t('Selected plugins')}>
            {trayPlugins.map((item) => (
              <li key={item.slug}>
                <span>{item.name}{item.version ? <em> v{item.version}</em> : null}</span>
                <button type="button" aria-label={t(`Remove ${item.name}`, `أزل ${item.name}`)} onClick={() => toggleTray(item.slug)}>×</button>
              </li>
            ))}
          </ul>
          <a className={s.primaryAction} href={trayHref} onClick={() => cueAtmosphere('confirm')}>
            {t(`Request this set (${trayPlugins.length})`, `اطلب هذه المجموعة (${trayPlugins.length})`)} →
          </a>
        </div>
      ) : <p role="status">{t('Select plugins from the directory to review them here.', 'اختر إضافات من الدليل لمراجعتها هنا.')}</p>}
    </dialog>
    </section>
  );
}
