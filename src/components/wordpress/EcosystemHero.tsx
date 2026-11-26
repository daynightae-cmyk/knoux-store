import type { CSSProperties } from 'react';
import type { ExternalQueryState } from '@/lib/wordpress/external';
import s from './wordpress-welcome.module.css';

type IconName = 'wordpress' | 'plugin' | 'layers' | 'spark' | 'bolt' | 'rocket' | 'diamond' | 'cube' | 'people' | 'infinity';
const ICONS: Record<IconName, string> = {
  wordpress: 'M12 2.8a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4ZM5.2 9h3m-2 6 3.2-8m1-1.2h2.2m-1 9.5 2.7-7.5 2.6 7.5 2.2-7.7',
  plugin: 'M9 3h6v4a2 2 0 1 0 4 2h2v6h-4a2 2 0 1 1-2 4v2H9v-4a2 2 0 1 0-4-2H3V9h4a2 2 0 1 1 2-4Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  spark: 'm12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Zm7 0 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2Z',
  bolt: 'm13 2-8 12h6l-1 8 9-13h-6V2Z',
  rocket: 'M14 5c3-3 6-2 6-2s1 3-2 6l-5 5-4-4 5-5Zm-5 4-4 1-2 3 6 1m4 0-1 6-3 2-1-6m7-9 1 1M6 18l-3 3m5-2-2 2',
  diamond: 'm12 21-9-11 4-6h10l4 6-9 11ZM3 10h18M7 4l5 17 5-17M7 4l5 6 5-6',
  cube: 'm12 2 9 5v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5m-9 5v10M7.5 4.5l9 5',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  infinity: 'M18.5 7.5c-4 0-9 9-13 9a4.5 4.5 0 0 1 0-9c4 0 9 9 13 9a4.5 4.5 0 0 0 0-9Z',
};

export function WpIcon({ name, className }: Readonly<{ name: IconName; className?: string }>) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>;
}

const BARS = [7, 12, 18, 10, 25, 16, 31, 22, 14, 36, 25, 17, 28, 40, 23, 34, 19, 30, 15, 24, 12, 20, 9, 15, 7, 11, 6];

const DIRECTORY_STATUS = {
  ok: { label: 'WordPress.org theme directory online', text: 'Online', ar: 'متصل الآن' },
  empty: { label: 'WordPress.org theme directory returned no results', text: 'No results', ar: 'لا نتائج' },
  unavailable: { label: 'WordPress.org theme directory unavailable', text: 'Offline', ar: 'غير متصل' },
} as const;

export function StudioDirectoryStatus({ uid, ar, directoryState, themesLoaded, journeyCount }: Readonly<{
  uid: string;
  ar: boolean;
  directoryState: ExternalQueryState;
  themesLoaded: number;
  journeyCount: number;
}>) {
  const status = DIRECTORY_STATUS[directoryState];
  return (
    <aside className={`${s.glassCard} ${s.monitor}`} aria-label={ar ? 'حالة الاستوديو' : 'Studio status'}>
      <div className={s.cardShine} aria-hidden="true" />
      <div className={s.monitorHead}>
        <div><h2>STUDIO STATUS</h2><p lang="ar">حالة الاستوديو</p></div>
        <span className={s.online} data-online={directoryState !== "unavailable"} aria-label={status.label}>
          <i />{status.text}<small lang="ar">{status.ar}</small>
        </span>
      </div>
      <div className={s.world} aria-hidden="true">
        <svg viewBox="0 0 320 135"><defs><pattern id={`map-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#a66cff" /></pattern></defs><g fill={`url(#map-${uid})`}><path d="M20 38 36 19 64 12 89 20 111 19 124 34 111 44 105 59 84 57 74 72 61 64 49 46 28 49Z" /><path d="m101 68 21 9 12 19-6 28-14-12-7-24-12-9Z" /><path d="m154 26 25-12 27 6 14-3 42 14 26 23-12 16-24-5-16 11-13-9-14 6-10 29-19 23-13-11 3-27-13-17-18-6-8-17 14-12Z" /><path d="m259 92 18-8 21 12-4 18-23 4-15-11Z" /></g><ellipse cx="160" cy="78" rx="147" ry="35" fill="none" stroke="#b575ff" strokeWidth="1.2" transform="rotate(-8 160 78)" /></svg>
      </div>
      <div className={s.stats}>
        <div><WpIcon name="cube" /><strong>{themesLoaded}</strong><span>Themes</span><small lang="ar">قوالب هذا العرض</small></div>
        <div><WpIcon name="people" /><strong>{journeyCount}</strong><span>Journeys</span><small lang="ar">مسارات الاستوديو</small></div>
        <div><WpIcon name="infinity" /><strong>WP.org</strong><span>Directory</span><small lang="ar">المصدر الرسمي</small></div>
      </div>
      <div className={s.equalizer} aria-hidden="true">{BARS.map((height, i) => <i key={i} style={{ '--bar': `${height}px`, '--delay': `${i * -80}ms` } as CSSProperties} />)}</div>
    </aside>
  );
}
