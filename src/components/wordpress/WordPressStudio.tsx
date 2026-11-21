'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ParticleMark } from '@/components/brand/ParticleMark';
import type { ExternalItem, ExternalQueryState } from '@/lib/wordpress/external';
import { formatCount, formatOfficialDate } from '@/lib/wordpress/external';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { wordPressItems, wordPressServices } from '@/data/wordpress';
import { DomainFinder } from './DomainFinder';
import { DomainConnectionSummary, DomainProvenance } from './DomainProvenance';
import { HostingRack } from './HostingRack';
import { BuildAndOperate } from './BuildAndOperate';
import { EcosystemComposer } from './EcosystemComposer';
import styles from './WordPressStudio.module.css';

/**
 * WordPress Studio - the ten reference journeys, rebuilt as one instrument.
 *
 * Each journey is a real panel rather than a picture of one. Values are read
 * from WordPress.org, from the deployment's provider configuration or from the
 * first-party service registry; where no source exists the panel says so and
 * keeps its shape. The reference's invented products, creators, prices,
 * uptimes and progress percentages are deliberately not reproduced.
 *
 * The studio is a tab set, not ten stacked pages: the reference screens are
 * alternative views of the same workspace, and a visitor should be able to
 * move between them without losing the theme they selected.
 */

type JourneyId =
  | 'arrival'
  | 'domain'
  | 'theme'
  | 'identity'
  | 'plugins'
  | 'canvas'
  | 'composer'
  | 'hosting'
  | 'build'
  | 'operations';

type Journey = {
  id: JourneyId;
  code: string;
  label: string;
  labelAr: string;
  arabic: string;
  icon: string;
};

const JOURNEYS: readonly Journey[] = [
  {
    id: 'arrival',
    code: '01',
    label: 'Arrival',
    labelAr: 'الوصول',
    arabic: 'بوابة الدخول إلى الاستوديو',
    icon: 'M4 21V9l8-6 8 6v12M9 21v-7h6v7',
  },
  {
    id: 'domain',
    code: '02',
    label: 'Domain Intelligence',
    labelAr: 'ذكاء النطاقات',
    arabic: 'اكتشاف النطاق والتحقق الفوري',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3Z',
  },
  {
    id: 'theme',
    code: '03',
    label: 'Theme Explorer',
    labelAr: 'مستكشف القوالب',
    arabic: 'استكشاف القوالب والهوية البصرية',
    icon: 'm12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5',
  },
  {
    id: 'identity',
    code: '04',
    label: 'Site Identity',
    labelAr: 'هوية الموقع',
    arabic: 'إعداد هوية الموقع والمحتوى',
    icon: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M6 15v6',
  },
  {
    id: 'plugins',
    code: '05',
    label: 'Plugin Intelligence',
    labelAr: 'ذكاء الإضافات',
    arabic: 'مكتبة الإضافات وإدارة الاختيارات',
    icon: 'M9 4h6v3a2 2 0 1 0 2 2h3v6h-3a2 2 0 1 1-2 2v3H9v-3a2 2 0 1 0-2-2H4V9h3a2 2 0 1 1 2-2Z',
  },
  {
    id: 'canvas',
    code: '06',
    label: 'Live Responsive Canvas',
    labelAr: 'لوحة العرض المتجاوب',
    arabic: 'معاينة سطح المكتب والجوال والجهاز اللوحي',
    icon: 'M3 5h18v11H3Zm5 15h8M12 16v4',
  },
  {
    id: 'composer',
    code: '07',
    label: 'Visual Composer',
    labelAr: 'المنشئ المرئي',
    arabic: 'تكوين الموقع والتحكم في عناصر المشروع',
    icon: 'M4 20h4L19 9l-4-4L4 16Zm9-13 4 4M14 4l3-1 4 4-1 3',
  },
  {
    id: 'hosting',
    code: '08',
    label: 'Hosting & Infrastructure',
    labelAr: 'الاستضافة والبنية التحتية',
    arabic: 'ربط النطاق والاستضافة والخدمات',
    icon: 'M4 5h16v5H4Zm0 9h16v5H4Zm3-6h.01M7 17h.01',
  },
  {
    id: 'build',
    code: '09',
    label: 'Build & Deployment',
    labelAr: 'البناء والنشر',
    arabic: 'مراحل التنفيذ الحقيقية والحركات المصاحبة',
    icon: 'm12 3 8 4.5v9L12 21l-8-4.5v-9Zm0 0v18M4 7.5l8 4.5 8-4.5',
  },
  {
    id: 'operations',
    code: '10',
    label: 'Operations Command Center',
    labelAr: 'مركز العمليات',
    arabic: 'إدارة الموقع والأمان والأداء والصيانة',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v4l3 2',
  },
] as const;

const DIRECTORY_LABEL: Record<ExternalQueryState, string> = {
  ok: 'Directory online',
  empty: 'Directory empty',
  unavailable: 'Unavailable',
};

const DIRECTORY_TONE: Record<ExternalQueryState, 'ok' | 'off' | 'warn'> = {
  ok: 'ok',
  empty: 'warn',
  unavailable: 'off',
};

const HASH_JOURNEYS: Record<string, JourneyId> = {
  studio: 'arrival',
  arrival: 'arrival',
  domain: 'domain',
  library: 'theme',
  theme: 'theme',
  identity: 'identity',
  plugins: 'plugins',
  canvas: 'canvas',
  launch: 'composer',
  composer: 'composer',
  infrastructure: 'hosting',
  hosting: 'hosting',
  build: 'build',
  operate: 'operations',
  operations: 'operations',
};

const PRODUCT_LINKS = [
  { label: 'Official Themes', href: '/wordpress/themes', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4.5 5 2.6 8 1.9-5.4L11 8h2l2.6 8 2-8' },
  { label: 'Official Plugins', href: '/wordpress/plugins', icon: 'M9 4h6v3a2 2 0 1 0 2 2h3v6h-3a2 2 0 1 1-2 2v3H9v-3a2 2 0 1 0-2-2H4V9h3a2 2 0 1 1 2-2Z' },
  { label: 'Studio Resources', href: '/wordpress/solutions', icon: 'm12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5' },
  { label: 'Creative Assets', href: '/creative', icon: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M18 6l-2.5 2.5m-7 7L6 18' },
] as const;

const IDENTITY_COLORS = [
  { label: 'Primary', value: '#a855f7' },
  { label: 'Secondary', value: '#c084fc' },
  { label: 'Background', value: '#0b0716' },
] as const;

const COMPOSER_PAGES = ['Home', 'Features', 'Products', 'About', 'Contact'] as const;

const COMPOSER_COMPONENTS = [
  'Section', 'Container', 'Grid', 'Text', 'Image', 'Video',
  'Button', 'Icon', 'Menu', 'Slider', 'Form', 'Map',
  'Code', 'Widget', 'Custom',
] as const;

const BUILD_STAGES = [
  { code: '01', label: 'Prepare & Resolve', detail: 'Read the selected theme, plugins and request.' },
  { code: '02', label: 'Build & Compile', detail: 'Assemble the generated project in the workspace.' },
  { code: '03', label: 'Test & Validate', detail: 'Run the project checks before anything is written.' },
  { code: '04', label: 'Package & Sign', detail: 'Produce a receipt bound to the operation.' },
  { code: '05', label: 'Deploy & Release', detail: 'Hand the receipt to the configured operator path.' },
] as const;

const VALIDATION_CHECKS = [
  'Code quality', 'Tests & coverage', 'Security scan', 'Dependency integrity', 'Release readiness',
] as const;

const OPERATION_MODULES = [
  { label: 'Site Management', href: '/wordpress/solutions' },
  { label: 'Security', href: '/wordpress#operate' },
  { label: 'Performance', href: '/wordpress#operate' },
  { label: 'Maintenance', href: '/wordpress#operate' },
  { label: 'Backup & Recovery', href: '/wordpress#operate' },
  { label: 'Monitoring', href: '/wordpress#operate' },
  { label: 'Automation', href: '/wordpress#operate' },
  { label: 'Configuration', href: '/wordpress#operate' },
] as const;

function useRouteCopy() {
  const language = useSiteLanguage();
  return (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
}

function JourneyIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function StatusPill({ tone, children }: { tone: 'ok' | 'off' | 'warn' | 'signal'; children: ReactNode }) {
  return <span className={styles.statusPill} data-tone={tone}>{children}</span>;
}

function Panel({ title, meta, children, className }: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.panel} ${className ?? ''}`} aria-label={title}>
      <header className={styles.panelHead}>
        <h4>{title}</h4>
        {meta ? <span className={styles.panelMeta}>{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      {note ? <span className={styles.statNote}>{note}</span> : null}
    </div>
  );
}

function OfficialImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy
    <img className={className} src={`/api/wp-image?u=${encodeURIComponent(src)}`} alt={alt} loading="lazy" />
  );
}

function ratingLabel(item: ExternalItem): string {
  if (typeof item.rating !== 'number') return 'Not rated';
  return `${Math.round(item.rating)} / 100`;
}

export function WordPressStudio({
  themes,
  directoryState,
}: {
  themes: Readonly<ExternalItem[]>;
  directoryState: ExternalQueryState;
}) {
  const t = useRouteCopy();
  const [active, setActive] = useState<JourneyId>('arrival');
  const [slug, setSlug] = useState<string>(themes[0]?.slug ?? '');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewScale, setPreviewScale] = useState(100);
  const [themeQuery, setThemeQuery] = useState('');
  const [siteTitle, setSiteTitle] = useState('KNOUX Store');
  const [tagline, setTagline] = useState('Digital Headquarters');
  const [logoPlacement, setLogoPlacement] = useState('center');
  const [selectedPage, setSelectedPage] = useState<string>('Home');
  const [selectedBlock, setSelectedBlock] = useState<string>('Content');

  useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.replace('#', '');
      const journey = HASH_JOURNEYS[id];
      if (journey) setActive(journey);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const journey = JOURNEYS.find((entry) => entry.id === active) ?? JOURNEYS[0];
  const theme = themes.find((item) => item.slug === slug) ?? themes[0];

  const filteredThemes = useMemo(() => {
    const query = themeQuery.trim().toLowerCase();
    if (!query) return themes;
    return themes.filter((item) =>
      [item.name, item.author, item.shortDescription, ...item.tags].join(' ').toLowerCase().includes(query),
    );
  }, [themeQuery, themes]);

  const themeTags = useMemo(() => {
    const seen = new Set<string>();
    for (const item of themes) for (const tag of item.tags) seen.add(tag);
    return Array.from(seen).slice(0, 5);
  }, [themes]);

  const requestParams = new URLSearchParams({
    requestType: 'wordpress',
    items: theme
      ? `WordPress site; theme: ${theme.name}; source: ${theme.sourceUrl}; domain and hosting review; maintenance`
      : 'WordPress site; theme selection; domain and hosting review; maintenance',
  });

  return (
    <section className={styles.studio} aria-label="WordPress Studio">
      {/* The studio floats in the same universe as the arrival gateway: nebula
          wash, star points, orbit rings and a planet limb, all drawn in CSS. */}
      <div className={styles.scene} aria-hidden="true">
        <span className={styles.sceneNebula} />
        <span className={styles.sceneStars} />
        <span className={styles.sceneRingA} />
        <span className={styles.sceneRingB} />
        <span className={styles.sceneLimb} />
      </div>
      <div className={styles.topbar}>
        <nav className={styles.crumb} aria-label="Breadcrumb">
          <Link href="/">KNOuX</Link>
          <span aria-hidden="true">/</span>
          <span>WordPress Studio</span>
          <span aria-hidden="true">/</span>
          <span>{t(journey.label, journey.labelAr)}</span>
        </nav>
        <p className={styles.wordmark}>
          <b>KNOUX <span>STORE</span></b>
          <small>Digital Headquarters</small>
        </p>
        <div className={styles.topbarRight}>
          <StatusPill tone={DIRECTORY_TONE[directoryState]}>
            {t(DIRECTORY_LABEL[directoryState], 'الدليل متاح')}
          </StatusPill>
          <span className={styles.sectionBadge}>
            <small>{t('Section', 'القسم')}</small>
            <b>{journey.code}</b>
          </span>
        </div>
      </div>

      <div className={styles.frame}>
        <nav className={styles.rail} aria-label={t('Studio journeys', 'رحلات الاستوديو')}>
          {JOURNEYS.map((entry) => {
            const isActive = entry.id === active;
            return (
              <button
                key={entry.id}
                type="button"
                className={`${styles.railItem} ${isActive ? styles.railItemActive : ''}`}
                aria-pressed={isActive}
                onClick={() => setActive(entry.id)}
              >
                <span className={styles.railIcon}><JourneyIcon path={entry.icon} /></span>
                <span className={styles.railText}>
                  <span className={styles.railCode}>{entry.code}</span>
                  <span className={styles.railLabel}>{t(entry.label, entry.labelAr)}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className={styles.stage} key={journey.id}>
          {active === 'arrival' ? (
            <div className={styles.arrivalGrid}>
              <Panel title={t('Studio destinations', 'وجهات الاستوديو')} meta="04">
                <p className={styles.panelLead}>Digital Products for WordPress</p>
                <ul className={styles.destinationList}>
                  {PRODUCT_LINKS.map((entry) => (
                    <li key={entry.label}>
                      <Link href={entry.href}>
                        <JourneyIcon path={entry.icon} />
                        <span>{t(entry.label)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>

              <div className={styles.arrivalGate}>
                <div className={styles.gateRing} aria-hidden="true">
                  <ParticleMark patternId="studio-arrival-particles" className={styles.gateMark} dense />
                  <span className={styles.gateFlare} />
                </div>
                <h4>{t('Enter the studio', 'ادخل إلى الاستوديو')}</h4>
                <p className={styles.gateCopy}>
                  {t('Choose a theme to carry into the request. Nothing is installed or published from this page.')}
                </p>
                {themes.length ? (
                  <div className={styles.field}>
                    <label htmlFor="wp-theme-choice">{t('Choose a theme', 'اختر قالباً')}</label>
                    <select id="wp-theme-choice" value={theme?.slug ?? ''} onChange={(event) => setSlug(event.target.value)}>
                      {themes.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <p className={styles.note} role="status">
                    {t('The official theme directory is unavailable. Browse again or compose a request without a theme.')}
                  </p>
                )}
                <p className={styles.note}>{t('Planning studio · nothing installed or published')}</p>
              </div>

              <Panel title={t('Studio status', 'حالة الاستوديو')} meta={<StatusPill tone={DIRECTORY_TONE[directoryState]}>{DIRECTORY_LABEL[directoryState]}</StatusPill>}>
                <div className={styles.statGrid}>
                  <Stat label={t('Themes loaded')} value={themes.length} />
                  <Stat label={t('KNOuX releases')} value={wordPressItems.length} />
                  <Stat label={t('Services')} value={wordPressServices.length} />
                </div>
                <p className={styles.note}>{t('Observed at page render · WordPress.org')}</p>
                <div className={styles.equalizer} aria-hidden="true">
                  {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ height: `${22 + ((index * 37) % 60)}%` }} />)}
                </div>
              </Panel>
            </div>
          ) : null}

          {active === 'domain' ? (
            <div className={styles.domainGrid}>
              <ol className={styles.stepRail} aria-label={t('Domain journey', 'رحلة النطاق')}>
                {['Search', 'Domain Intelligence', 'Configure', 'Checkout'].map((step, index) => (
                  <li key={step} className={index === 1 ? styles.stepActive : ''}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {t(step)}
                  </li>
                ))}
              </ol>

              <div className={styles.domainMain}>
                <Panel title={t('Find the name first', 'ابحث عن الاسم أولاً')} meta={<StatusPill tone="signal">REGISTRAR</StatusPill>}>
                  <p className={styles.panelLead}>
                    {t('A registrar is the only authority on whether a domain can be registered. KNOuX shows exactly what it said.')}
                  </p>
                  <DomainFinder />
                  <DomainProvenance />
                </Panel>
              </div>

              <Panel title={t('Selected domain', 'النطاق المختار')} meta={t('No selection', 'لا يوجد اختيار')}>
                <p className={styles.emptyState}>
                  {t('Search a name to see the registrar verdict, registration price, renewal price, provider and the time it was checked.')}
                </p>
                <ul className={styles.checkList}>
                  <li>{t('Availability from the registrar')}</li>
                  <li>{t('Registration and renewal prices, when published')}</li>
                  <li>{t('Provider attribution and check time')}</li>
                  <li>{t('A registration review that never purchases')}</li>
                </ul>
                <p className={styles.note}>{t('No price, availability or ownership claim is made without a provider answer.')}</p>
              </Panel>
            </div>
          ) : null}

          {active === 'theme' ? (
            <div className={styles.themeLayout}>
              <Panel
                title={t('Theme Library', 'مكتبة القوالب')}
                meta={`${themes.length} ${t('loaded', 'محمل')}`}
                className={styles.themeLibrary}
              >
                <div className={styles.searchRow}>
                  <input
                    type="search"
                    value={themeQuery}
                    onChange={(event) => setThemeQuery(event.target.value)}
                    placeholder={t('Search themes, authors or styles…')}
                    aria-label={t('Search loaded themes')}
                  />
                  <span className={styles.meta}>{filteredThemes.length} {t('results in view', 'نتيجة في العرض')}</span>
                </div>
                <div className={styles.chipRow} aria-label={t('Theme tags', 'وسوم القوالب')}>
                  <span className={styles.chipActive}>{t('All themes', 'كل القوالب')}</span>
                  {themeTags.map((tag) => <span key={tag} className={styles.chip}>{tag}</span>)}
                </div>
                {filteredThemes.length ? (
                  <div className={styles.themeGrid}>
                    {filteredThemes.slice(0, 9).map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        className={`${styles.themeCard} ${item.slug === theme?.slug ? styles.themeCardActive : ''}`}
                        aria-pressed={item.slug === theme?.slug}
                        onClick={() => setSlug(item.slug)}
                      >
                        <span className={styles.themeShot}>
                          {item.screenshotUrl ? (
                            <OfficialImage src={item.screenshotUrl} alt={`${item.name} · WordPress.org`} />
                          ) : (
                            <span className={styles.placeholder}>{t('No screenshot')}</span>
                          )}
                          {item.rating ? <span className={styles.themeRating}>{ratingLabel(item)}</span> : null}
                        </span>
                        <span className={styles.themeBody}>
                          <strong>{item.name}</strong>
                          <small>{t('by')} {item.author}</small>
                          <span className={styles.themeMeta}>
                            {item.downloaded ? `${formatCount(item.downloaded)} ${t('downloads')}` : t('Downloads not published')}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>{t('No loaded theme matches that search. The full directory remains one link away.')}</p>
                )}
              </Panel>

              <Panel
                title={theme ? theme.name : t('Theme preview')}
                meta={<StatusPill tone="signal">WORDPRESS.ORG</StatusPill>}
              >
                {theme ? (
                  <>
                    <div className={styles.themePreview}>
                      {theme.screenshotUrl ? (
                        <OfficialImage src={theme.screenshotUrl} alt={`${theme.name} preview · WordPress.org`} />
                      ) : (
                        <span className={styles.placeholder}>{t('No official screenshot')}</span>
                      )}
                    </div>
                    <p className={styles.byline}>{t('by')} {theme.author}</p>
                    <dl className={styles.factList}>
                      <div><dt>{t('Rating')}</dt><dd>{ratingLabel(theme)}{theme.ratingCount ? ` · ${theme.ratingCount}` : ''}</dd></div>
                      <div><dt>{t('Downloads')}</dt><dd>{theme.downloaded ? formatCount(theme.downloaded) : t('Not published')}</dd></div>
                      <div><dt>{t('Version')}</dt><dd>{theme.version ?? t('Not published')}</dd></div>
                      <div><dt>{t('Last updated')}</dt><dd>{formatOfficialDate(theme.lastUpdated) ?? t('Not published')}</dd></div>
                    </dl>
                    {theme.tags.length ? <p className={styles.tagLine}>{theme.tags.slice(0, 6).join(' · ')}</p> : null}
                    <div className={styles.panelActions}>
                      <button type="button" className={styles.primaryAction} onClick={() => setSlug(theme.slug)}>
                        {t('Use this theme', 'استخدم هذا القالب')}
                      </button>
                      <button type="button" className={styles.ghostAction} onClick={() => setActive('canvas')}>
                        {t('Live preview', 'معاينة مباشرة')}
                      </button>
                      <a className={styles.ghostAction} href={theme.sourceUrl} target="_blank" rel="noreferrer">
                        {t('WordPress.org', 'ووردبريس.أورج')} ↗
                      </a>
                    </div>
                  </>
                ) : (
                  <p className={styles.emptyState}>{t('The official theme directory is unavailable.')}</p>
                )}
              </Panel>
            </div>
          ) : null}

          {active === 'identity' ? (
            <div className={styles.identityLayout}>
              <Panel title={t('Brand controls', 'تحكم الهوية')}>
                <div className={styles.field}>
                  <label htmlFor="studio-site-title">{t('Site title', 'اسم الموقع')}</label>
                  <input id="studio-site-title" value={siteTitle} onChange={(event) => setSiteTitle(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="studio-tagline">{t('Tagline', 'الشعار النصي')}</label>
                  <input id="studio-tagline" value={tagline} onChange={(event) => setTagline(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{t('Logo placement', 'موضع الشعار')}</span>
                  <div className={styles.segmented}>
                    {['left', 'center', 'right'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={logoPlacement === value}
                        onClick={() => setLogoPlacement(value)}
                      >
                        {t(value[0].toUpperCase() + value.slice(1))}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{t('Typography', 'الخطوط')}</span>
                  <p className={styles.fieldValue}>{t('Site default · Arial / system sans')}</p>
                  <p className={styles.note}>{t('The theme supplies its own typography; the studio does not overwrite it.')}</p>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{t('Colour controls', 'ألوان الهوية')}</span>
                  <div className={styles.swatches}>
                    {IDENTITY_COLORS.map((color) => (
                      <span key={color.label} className={styles.swatch}>
                        <i style={{ background: color.value }} aria-hidden="true" />
                        <span>{color.label}<code>{color.value}</code></span>
                      </span>
                    ))}
                  </div>
                  <p className={styles.note}>{t('These are the live site tokens, not a theme override.')}</p>
                </div>
              </Panel>

              <Panel title={t('Live preview', 'معاينة مباشرة')} meta={<StatusPill tone="warn">{t('Local only', 'محلي فقط')}</StatusPill>}>
                <div className={styles.identityCanvas} data-placement={logoPlacement}>
                  <div className={styles.identityBrowser}>
                    <span /><span /><span />
                  </div>
                  {theme?.screenshotUrl ? (
                    <OfficialImage src={theme.screenshotUrl} alt={`${theme.name} · WordPress.org`} className={styles.identityShot} />
                  ) : (
                    <div className={styles.identityFallback} />
                  )}
                  <div className={styles.identityOverlay}>
                    <strong>{siteTitle || t('Untitled site')}</strong>
                    <small>{tagline || t('No tagline')}</small>
                  </div>
                </div>
                <p className={styles.note}>{t('The preview composes the selected official theme screenshot with your local identity values. Nothing is published.')}</p>
              </Panel>

              <Panel title={t('Inspector', 'المفتش')} meta={<span className={styles.meta}>{t('Section', 'القسم')} · Hero</span>}>
                <div className={styles.inspectorGroup}>
                  <span className={styles.fieldLabel}>{t('Spacing', 'المسافات')}</span>
                  <label className={styles.rangeRow}><span>{t('Top')}</span><input type="range" min="0" max="160" defaultValue="120" aria-label={t('Top spacing')} /><output>120 px</output></label>
                  <label className={styles.rangeRow}><span>{t('Bottom')}</span><input type="range" min="0" max="160" defaultValue="80" aria-label={t('Bottom spacing')} /><output>80 px</output></label>
                  <label className={styles.rangeRow}><span>{t('Side')}</span><input type="range" min="0" max="160" defaultValue="120" aria-label={t('Side spacing')} /><output>120 px</output></label>
                </div>
                <div className={styles.inspectorGroup}>
                  <span className={styles.fieldLabel}>{t('Alignment', 'المحاذاة')}</span>
                  <div className={styles.segmented}>
                    {['left', 'center', 'right'].map((value) => <button key={value} type="button" aria-pressed={value === 'center'}>{t(value[0].toUpperCase() + value.slice(1))}</button>)}
                  </div>
                </div>
                <div className={styles.inspectorGroup}>
                  <span className={styles.fieldLabel}>{t('Background', 'الخلفية')}</span>
                  <p className={styles.fieldValue}>{t('Cosmic gradient · theme supplied')}</p>
                </div>
                <div className={styles.inspectorGroup}>
                  <span className={styles.fieldLabel}>{t('Effects', 'المؤثرات')}</span>
                  <label className={styles.toggleRow}><span>{t('Glow')}</span><input type="checkbox" defaultChecked /></label>
                  <label className={styles.toggleRow}><span>{t('Particles')}</span><input type="checkbox" defaultChecked /></label>
                  <label className={styles.toggleRow}><span>{t('Parallax')}</span><input type="checkbox" /></label>
                </div>
              </Panel>
            </div>
          ) : null}

          {active === 'plugins' ? (
            <div className={styles.pluginLayout}>
              <Panel title={t('Plugin Library', 'مكتبة الإضافات')} meta={<StatusPill tone="signal">WORDPRESS.ORG</StatusPill>}>
                <p className={styles.panelLead}>
                  {t('The official plugin directory is browsed on demand rather than preloaded into the studio. Nothing here is a ranking or a recommendation.')}
                </p>
                <div className={styles.panelActions}>
                  <Link className={styles.primaryAction} href="/wordpress/plugins">
                    {t('Browse the plugin directory', 'تصفح دليل الإضافات')} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </Panel>

              <Panel title={t('Selection and review', 'الاختيار والمراجعة')} meta={<StatusPill tone="signal">{t('By name only', 'بالاسم فقط')}</StatusPill>}>
                <p className={styles.emptyState}>
                  {t('No plugin list is preloaded, so a request names its plugins and the review covers compatibility and maintenance. KNOuX installs and verifies plugins; it does not publish or endorse any specific item.')}
                </p>
              </Panel>
            </div>
          ) : null}

          {active === 'canvas' ? (
            <div className={styles.canvasJourney}>
              <div className={styles.canvasToolbar}>
                <div className={styles.deviceTabs} role="group" aria-label={t('Device preview', 'معاينة الأجهزة')}>
                  {(['desktop', 'tablet', 'mobile'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={device === value}
                      onClick={() => setDevice(value)}
                    >
                      <JourneyIcon path={value === 'desktop' ? 'M3 5h18v11H3Zm5 15h8M12 16v4' : value === 'tablet' ? 'M6 3h12v18H6Zm4 15h4' : 'M8 3h8v18H8Zm3 15h2'} />
                      <span>{t(value[0].toUpperCase() + value.slice(1))}<small>{value === 'desktop' ? '1440 × 900' : value === 'tablet' ? '820 × 1180' : '390 × 844'}</small></span>
                    </button>
                  ))}
                </div>
                <div className={styles.breakpointStrip} aria-label={t('Breakpoints', 'نقاط التجاوب')}>
                  <JourneyIcon path="M4 12h3m10 0h3M8 8v8m8-8v8M10 12h4" />
                  <span>{t('Breakpoints', 'نقاط التجاوب')}</span>
                  <i><b className={styles.dotOk} />≥ 1100 px</i>
                  <i><b className={styles.dotOk} />760 – 1099 px</i>
                  <i><b className={styles.dotOk} />≤ 759 px</i>
                </div>
              </div>

              <div className={styles.canvasLayout}>
                <div className={styles.canvasSide}>
                  <Panel title={t('Device preview', 'معاينة الأجهزة')}>
                    <div className={styles.deviceRows}>
                      {(['desktop', 'tablet', 'mobile'] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={styles.deviceRow}
                          aria-pressed={device === value}
                          onClick={() => setDevice(value)}
                        >
                          <JourneyIcon path={value === 'desktop' ? 'M3 5h18v11H3Zm5 15h8M12 16v4' : value === 'tablet' ? 'M6 3h12v18H6Zm4 15h4' : 'M8 3h8v18H8Zm3 15h2'} />
                          <span>{t(value[0].toUpperCase() + value.slice(1))}</span>
                          <i className={styles.rowSwitch} data-on={device === value} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    <p className={styles.note}>{t('The switch marks the focused device. Every device stays on the stage.')}</p>
                  </Panel>
                  <Panel title={t('Preview mode', 'وضع المعاينة')}>
                    <div className={styles.modeList}>
                      <span className={styles.modeActive}><i className={styles.dotOk} />{t('Static preview', 'معاينة ثابتة')}</span>
                      <span className={styles.modeOff}>{t('Live preview', 'معاينة مباشرة')}<small>{t('Not connected', 'غير متصل')}</small></span>
                      <span className={styles.modeOff}>{t('Sync all devices', 'مزامنة جميع الأجهزة')}<small>{t('Not connected', 'غير متصل')}</small></span>
                      <span className={styles.modeOff}>{t('Auto refresh', 'تحديث تلقائي')}<small>{t('Not connected', 'غير متصل')}</small></span>
                    </div>
                  </Panel>
                </div>

                <div className={styles.deviceStage} data-device={device} style={{ '--stage-scale': previewScale / 100 } as CSSProperties}>
                  <div className={styles.stageFloor} aria-hidden="true"><i /><i /><i /></div>
                  <div className={styles.pedestal} data-kind="desktop">
                    <div className={styles.deviceFrame} data-kind="desktop">
                      <div className={styles.deviceScreen}>
                        {theme?.screenshotUrl ? <OfficialImage src={theme.screenshotUrl} alt={`${theme.name} desktop preview · WordPress.org`} /> : <div className={styles.deviceFallback} />}
                      </div>
                    </div>
                    <i className={styles.monitorNeck} aria-hidden="true" />
                    <i className={styles.monitorBase} aria-hidden="true" />
                    <i className={styles.pedestalGlow} aria-hidden="true" />
                  </div>
                  <div className={styles.pedestal} data-kind="tablet">
                    <div className={styles.deviceFrame} data-kind="tablet">
                      <i className={styles.deviceNotch} aria-hidden="true" />
                      <div className={styles.deviceScreen}>
                        {theme?.screenshotUrl ? <OfficialImage src={theme.screenshotUrl} alt={`${theme.name} tablet preview · WordPress.org`} /> : <div className={styles.deviceFallback} />}
                      </div>
                    </div>
                    <i className={styles.pedestalGlow} aria-hidden="true" />
                  </div>
                  <div className={styles.pedestal} data-kind="mobile">
                    <div className={styles.deviceFrame} data-kind="mobile">
                      <i className={styles.deviceNotch} aria-hidden="true" />
                      <div className={styles.deviceScreen}>
                        {theme?.screenshotUrl ? <OfficialImage src={theme.screenshotUrl} alt={`${theme.name} mobile preview · WordPress.org`} /> : <div className={styles.deviceFallback} />}
                      </div>
                    </div>
                    <i className={styles.pedestalGlow} aria-hidden="true" />
                  </div>
                </div>

                <Panel title={t('Scaling & canvas', 'المقياس واللوحة')}>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Scale', 'المقياس')}</span>
                    <label className={styles.rangeRow}><span>{previewScale}%</span><input type="range" min="50" max="150" step="25" value={previewScale} onChange={(event) => setPreviewScale(Number(event.target.value))} aria-label={t('Preview scale')} /><output>{previewScale}%</output></label>
                    <div className={styles.scalePresets} role="group" aria-label={t('Preview scale')}>
                      {[50, 75, 100, 125, 150].map((value) => (
                        <button key={value} type="button" aria-pressed={previewScale === value} onClick={() => setPreviewScale(value)}>{value}%</button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Breakpoints', 'نقاط التجاوب')}</span>
                    <ul className={styles.breakpoints}>
                      <li><span className={styles.dotOk} />{t('Desktop')} <b>≥ 1100 px</b><JourneyIcon path="M4 12l5 5L20 6" /></li>
                      <li><span className={styles.dotOk} />{t('Tablet')} <b>760 – 1099 px</b><JourneyIcon path="M4 12l5 5L20 6" /></li>
                      <li><span className={styles.dotOk} />{t('Mobile')} <b>≤ 759 px</b><JourneyIcon path="M4 12l5 5L20 6" /></li>
                    </ul>
                  </div>
                  <div className={styles.responsiveStatus}>
                    <span className={styles.fieldLabel}>{t('Responsive status', 'حالة التجاوب')}</span>
                    <StatusPill tone="warn">{t('Preview only', 'معاينة فقط')}</StatusPill>
                    <p>{t('This is the official theme screenshot, resized for comparison. It is not a live responsive site.')}</p>
                  </div>
                </Panel>
              </div>
            </div>
          ) : null}

          {active === 'composer' ? (
            <>
              <div className={styles.composerLayout}>
                <Panel title={t('Template pages', 'صفحات القالب')} className={styles.composerPages}>
                  <ul className={styles.pageList}>
                    {COMPOSER_PAGES.map((page) => (
                      <li key={page}>
                        <button type="button" aria-pressed={selectedPage === page} onClick={() => setSelectedPage(page)}>
                          <span className={styles.pageDot} />{t(page)}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <span className={styles.fieldLabel}>{t('Layers', 'الطبقات')}</span>
                  <ul className={styles.layerTree}>
                    {['Page', 'Header', 'Hero Section', 'Container', 'Content', 'Title', 'Subtitle', 'Buttons', 'Footer'].map((layer, index) => (
                      <li key={layer} style={{ paddingInlineStart: `${Math.min(index, 4) * 10}px` }}>
                        <button type="button" aria-pressed={selectedBlock === layer} onClick={() => setSelectedBlock(layer)}>
                          {layer}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title={t('Components', 'المكونات')} meta={`${COMPOSER_COMPONENTS.length}`}>
                  <div className={styles.componentGrid}>
                    {COMPOSER_COMPONENTS.map((component) => (
                      <button key={component} type="button" onClick={() => setSelectedBlock(component)}>
                        <span aria-hidden="true">+</span>
                        {t(component)}
                      </button>
                    ))}
                  </div>
                </Panel>

                <div className={styles.composerCanvas}>
                  <div className={styles.composerToolbar}>
                    <span>{t('KNOUX Store', 'متجر كنوكس')} / {t(selectedPage)}</span>
                    <div>
                      <button type="button">{t('Preview', 'معاينة')}</button>
                      <span className={styles.primaryAction}>{t('Publish', 'نشر')}</span>
                    </div>
                  </div>
                  <div className={styles.composerViewport}>
                    {theme?.screenshotUrl ? <OfficialImage src={theme.screenshotUrl} alt={`${theme.name} composer canvas · WordPress.org`} /> : <div className={styles.deviceFallback} />}
                    <div className={styles.composerSelection}>
                      <span>{selectedBlock}</span>
                      <i /><i /><i /><i />
                    </div>
                    <div className={styles.composerOverlay}>
                      <strong>{siteTitle || 'KNOUX Store'}</strong>
                      <small>{tagline || 'Digital Headquarters'}</small>
                      <span>{t('Explore Store', 'استكشف المتجر')} →</span>
                    </div>
                  </div>
                  <p className={styles.note}>{t('Composition is a request, not a checkout. Nothing is published from this studio.')}</p>
                </div>

                <Panel title={t('Inspector', 'المفتش')} meta={<span className={styles.meta}>{selectedBlock}</span>}>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Layout', 'التخطيط')}</span>
                    <div className={styles.segmented}>
                      {['block', 'flex', 'grid'].map((value) => <button key={value} type="button" aria-pressed={value === 'block'}>{t(value)}</button>)}
                    </div>
                    <label className={styles.rangeRow}><span>{t('Gap')}</span><input type="range" min="0" max="64" defaultValue="24" aria-label={t('Gap')} /><output>24 px</output></label>
                  </div>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Size', 'الحجم')}</span>
                    <p className={styles.fieldValue}>{t('Width 100% · Height auto')}</p>
                  </div>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Spacing', 'المسافات')}</span>
                    <label className={styles.rangeRow}><span>{t('Top')}</span><input type="range" min="0" max="120" defaultValue="48" aria-label={t('Top spacing')} /><output>48 px</output></label>
                    <label className={styles.rangeRow}><span>{t('Bottom')}</span><input type="range" min="0" max="120" defaultValue="48" aria-label={t('Bottom spacing')} /><output>48 px</output></label>
                  </div>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Typography', 'الخطوط')}</span>
                    <p className={styles.fieldValue}>{t('Theme default')}</p>
                  </div>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Background', 'الخلفية')}</span>
                    <p className={styles.fieldValue}>{t('Cosmic gradient')}</p>
                  </div>
                  <div className={styles.inspectorGroup}>
                    <span className={styles.fieldLabel}>{t('Effects', 'المؤثرات')}</span>
                    <label className={styles.toggleRow}><span>{t('Glow')}</span><input type="checkbox" defaultChecked /></label>
                    <label className={styles.toggleRow}><span>{t('Particles')}</span><input type="checkbox" defaultChecked /></label>
                  </div>
                </Panel>
              </div>

              <div className={styles.flowRail} aria-hidden="true">
                {['Drag & Drop', 'Build Modules', 'Connect & Link', 'Compose Pages', 'Publish'].map((step, index) => (
                  <span key={step}><b>{String(index + 1).padStart(2, '0')}</b>{step}</span>
                ))}
              </div>

              <EcosystemComposer />
            </>
          ) : null}

          {active === 'hosting' ? (
            <>
              <div className={styles.hostingHero}>
                <div className={styles.orbit} aria-hidden="true">
                  <i /><i /><i />
                  <span className={styles.orbitCore}>
                    <ParticleMark patternId="studio-hosting-particles" className={styles.orbitMark} />
                  </span>
                  {[
                    { label: 'Domain connection', value: <DomainConnectionSummary />, href: '#domain' },
                    { label: 'Hosting nodes', value: t('Provider not configured'), href: '/contact?intent=infrastructure' },
                    { label: 'SSL / security', value: t('Not measured'), href: '/wordpress#operate' },
                    { label: 'Service bridges', value: `${wordPressServices.length} ${t('services offered')}`, href: '/wordpress/solutions' },
                    { label: 'Storage & database', value: t('No telemetry source'), href: '/contact?intent=infrastructure' },
                  ].map((node) => (
                    <a key={node.label} className={styles.orbitNode} href={node.href}>
                      <strong>{node.label}</strong>
                      <span>{node.value}</span>
                    </a>
                  ))}
                </div>
                <div className={styles.hostingKpis}>
                  <Stat label={t('System health', 'صحة النظام')} value={t('Not measured')} note={t('No monitoring source configured')} />
                  <Stat label={t('Domain', 'النطاق')} value={<DomainConnectionSummary />} note={t('Read at request time')} />
                  <Stat label={t('Services', 'الخدمات')} value={wordPressServices.length} note={t('Real operating services')} />
                  <Stat label={t('Storage', 'التخزين')} value={t('Not measured')} note={t('No storage telemetry source')} />
                </div>
              </div>

              <div className={styles.hostingGrid}>
                <Panel title={t('System health', 'صحة النظام')} meta={<StatusPill tone="off">{t('No telemetry', 'لا قياس')}</StatusPill>}>
                  <p className={styles.emptyState}>{t('Uptime and incident figures appear here only when a monitoring provider is connected. None is configured.')}</p>
                  <ul className={styles.checkList}>
                    <li>{t('Hosting online · not measured')}</li>
                    <li>{t('Domain connected · read above')}</li>
                    <li>{t('SSL secured · not measured')}</li>
                    <li>{t('Services operational · offered, not monitored')}</li>
                  </ul>
                </Panel>
                <Panel title={t('Live infrastructure', 'البنية الحية')} meta={<StatusPill tone="off">{t('No telemetry', 'لا قياس')}</StatusPill>}>
                  <p className={styles.emptyState}>{t('CPU, memory and network are not read from any provider by this deployment.')}</p>
                  <div className={styles.emptyChart} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
                </Panel>
                <Panel title={t('Global nodes', 'العقد العالمية')} meta={<StatusPill tone="off">{t('No telemetry', 'لا قياس')}</StatusPill>}>
                  <div className={styles.mapPlaceholder} aria-hidden="true" />
                  <p className={styles.emptyState}>{t('No latency or region measurements are published because no source supplies them.')}</p>
                </Panel>
                <Panel title={t('Services overview', 'نظرة على الخدمات')} meta={`${wordPressServices.length}`}>
                  <ul className={styles.serviceList}>
                    {wordPressServices.map((service) => (
                      <li key={service.id}>
                        <span>{service.name}</span>
                        <StatusPill tone="signal">{t('Offered', 'متاحة')}</StatusPill>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              <div className={styles.embedded}>
                <HostingRack />
              </div>
            </>
          ) : null}

          {active === 'build' ? (
            <>
              <div className={styles.buildLayout}>
                <Panel title={t('Build stages', 'مراحل البناء')} meta={<StatusPill tone="off">{t('Idle', 'خامل')}</StatusPill>}>
                  <ol className={styles.buildStages}>
                    {BUILD_STAGES.map((stage) => (
                      <li key={stage.code}>
                        <span className={styles.stageDot} />
                        <span className={styles.stageCode}>{stage.code}</span>
                        <div><strong>{t(stage.label)}</strong><p>{t(stage.detail)}</p></div>
                        <StatusPill tone="off">{t('Not started', 'لم يبدأ')}</StatusPill>
                      </li>
                    ))}
                  </ol>
                </Panel>

                <div className={styles.buildOrbit}>
                  <div className={styles.buildRings} aria-hidden="true"><i /><i /><i /></div>
                  <span className={styles.buildCore}>
                    <ParticleMark patternId="studio-build-particles" className={styles.buildMark} dense />
                  </span>
                  {['Build', 'Test', 'Validate', 'Deploy', 'Release'].map((node, index) => (
                    <span key={node} className={styles.buildNode} style={{ '--node': index } as CSSProperties}>
                      {t(node)}
                    </span>
                  ))}
                  <p className={styles.buildCaption}>{t('No build is running. The pipeline starts when an operation is requested.')}</p>
                </div>

                <Panel title={t('Validation checkpoints', 'نقاط التحقق')} meta={<StatusPill tone="off">{t('Not run', 'لم تُشغّل')}</StatusPill>}>
                  <ul className={styles.checkList}>
                    {VALIDATION_CHECKS.map((check) => (
                      <li key={check}><span>{t(check)}</span><StatusPill tone="off">{t('Not run', 'لم تُشغّل')}</StatusPill></li>
                    ))}
                  </ul>
                  <p className={styles.note}>{t('Checks run against the generated project before any receipt is issued.')}</p>
                </Panel>
              </div>

              <div className={styles.releaseGrid}>
                <Panel title={t('Build', 'البناء')} meta={<StatusPill tone="off">{t('Idle')}</StatusPill>}>
                  <p className={styles.emptyState}>{t('No build in progress.')}</p>
                </Panel>
                <Panel title={t('Validation', 'التحقق')} meta={<StatusPill tone="off">{t('Idle')}</StatusPill>}>
                  <p className={styles.emptyState}>{t('No validation run recorded for this session.')}</p>
                </Panel>
                <Panel title={t('Deployment', 'النشر')} meta={<StatusPill tone="off">{t('Idle')}</StatusPill>}>
                  <p className={styles.emptyState}>{t('No deployment is in progress. Publishing requires the operator path and explicit confirmation.')}</p>
                </Panel>
                <Panel title={t('Release', 'الإصدار')} meta={<StatusPill tone="off">{t('Idle')}</StatusPill>}>
                  <p className={styles.emptyState}>{t('Target release: not set.')}</p>
                </Panel>
              </div>

              <div className={styles.deployPaths}>
                <Panel title={t('Deployment paths', 'مسارات النشر')} meta={<StatusPill tone="warn">{t('Operator-controlled', 'يتحكم بها المشغّل')}</StatusPill>}>
                  <ul className={styles.pathList}>
                    <li><strong>{t('Production')}</strong><span>{t('Enabled only by the deployment operator')}</span><StatusPill tone="off">{t('Not verified', 'غير مُتحقق')}</StatusPill></li>
                    <li><strong>{t('Staging')}</strong><span>{t('Enabled only by the deployment operator')}</span><StatusPill tone="off">{t('Not verified', 'غير مُتحقق')}</StatusPill></li>
                    <li><strong>{t('Development')}</strong><span>{t('Local workspace only')}</span><StatusPill tone="off">{t('Not verified', 'غير مُتحقق')}</StatusPill></li>
                  </ul>
                  <p className={styles.note}>{t('This page reads no deployment secret and reports no path as ready without a configured operator.')}</p>
                </Panel>
              </div>
            </>
          ) : null}

          {active === 'operations' ? (
            <>
              <div className={styles.opsLayout}>
                <div className={styles.opsColumn}>
                  <Panel title={t('Security monitoring', 'مراقبة الأمان')} meta={<StatusPill tone="off">{t('No telemetry', 'لا قياس')}</StatusPill>}>
                    <ul className={styles.checkList}>
                      {['Threat detection', 'Real-time protection', 'Access control', 'Intrusion monitoring'].map((item) => (
                        <li key={item}><span>{t(item)}</span><StatusPill tone="off">{t('Not measured', 'غير مقاس')}</StatusPill></li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel title={t('Performance analytics', 'تحليلات الأداء')} meta={<StatusPill tone="off">{t('No telemetry', 'لا قياس')}</StatusPill>}>
                    <p className={styles.emptyState}>{t('Uptime, response time, throughput and system load appear here only when a monitoring provider is connected.')}</p>
                    <div className={styles.emptyChart} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
                  </Panel>
                  <Panel title={t('Maintenance controls', 'تحكم الصيانة')} meta={<StatusPill tone="signal">{t('Services offered', 'خدمات متاحة')}</StatusPill>}>
                    <ul className={styles.serviceList}>
                      {wordPressServices.slice(0, 5).map((service) => (
                        <li key={service.id}>
                          <span>{service.name}</span>
                          <Link href={`/contact?requestType=wordpress&items=${encodeURIComponent(`${service.name} request`)}`}>{t('Request', 'اطلب')} ↗</Link>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </div>

                <div className={styles.opsCenter}>
                  <div className={styles.opsGlobe} aria-hidden="true">
                    <ParticleMark patternId="studio-ops-particles" className={styles.opsMark} dense />
                  </div>
                  <div className={styles.opsKpis}>
                    <Stat label={t('System health', 'صحة النظام')} value={t('Not measured')} />
                    <Stat label={t('Operational efficiency', 'كفاءة التشغيل')} value={t('Not measured')} />
                    <Stat label={t('Active services', 'الخدمات المتاحة')} value={wordPressServices.length} note={t('Offered, not monitored')} />
                    <Stat label={t('Incidents', 'الحوادث')} value={t('No source')} />
                  </div>
                  <p className={styles.opsCaption}>KNOUX OPERATIONS</p>
                </div>

                <div className={styles.opsColumn}>
                  <Panel title={t('Operational modules', 'وحدات التشغيل')} meta={`${OPERATION_MODULES.length}`}>
                    <div className={styles.moduleGrid}>
                      {OPERATION_MODULES.map((module) => (
                        <Link key={module.label} href={module.href}>{t(module.label)}</Link>
                      ))}
                    </div>
                  </Panel>
                  <Panel title={t('Alert stream', 'تدفق التنبيهات')} meta={<StatusPill tone="off">{t('No source', 'لا مصدر')}</StatusPill>}>
                    <p className={styles.emptyState}>{t('No alert provider is configured. This stream is not a placeholder for invented events.')}</p>
                  </Panel>
                  <Panel title={t('Service status', 'حالة الخدمات')} meta={<StatusPill tone="signal">{t('Offered', 'متاحة')}</StatusPill>}>
                    <ul className={styles.serviceList}>
                      {wordPressServices.map((service) => (
                        <li key={service.id}><span>{service.name}</span><StatusPill tone="signal">{t('Offered', 'متاحة')}</StatusPill></li>
                      ))}
                    </ul>
                  </Panel>
                </div>
              </div>

              <div className={styles.embedded}>
                <BuildAndOperate />
              </div>
            </>
          ) : null}

          <footer className={styles.studioFoot}>
            <p>{t('Planning studio · nothing installed or published')}</p>
            <div className={styles.footActions}>
              <Link className={styles.request} href={`/contact?${requestParams.toString()}`}>
                {t('Compose a site request', 'تكوين طلب موقع')} <span aria-hidden="true">↗</span>
              </Link>
              <Link className={styles.browse} href="/wordpress/themes">
                {t('Search the full catalogue', 'تصفح الكتالوج الكامل')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </footer>
        </div>
      </div>

      {/* The reference screens name the journey beneath the console, with the
          section code in a hex badge and the Arabic line under the title. */}
      <header className={styles.journeyHead}>
        <span className={styles.journeyHex} aria-hidden="true"><b>{journey.code}</b></span>
        <div className={styles.journeyTitles}>
          <h3>{t(journey.label, journey.labelAr)}</h3>
          <p lang="ar" dir="rtl">{journey.arabic}</p>
        </div>
      </header>
    </section>
  );
}
