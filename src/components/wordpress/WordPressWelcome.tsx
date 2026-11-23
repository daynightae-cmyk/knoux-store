'use client';

/** 01 · Arrival Experience — the 2026-11-23 Store artboard, built in code. */
import Link from 'next/link';
import { useEffect, useId, useRef, type CSSProperties, type MouseEvent } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from './WordPressCosmicMark';
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

const LIBRARY = [
  { icon: 'wordpress' as const, title: 'Premium Themes', ar: 'قوالب احترافية مميزة', href: '/wordpress/themes' },
  { icon: 'plugin' as const, title: 'Powerful Plugins', ar: 'إضافات قوية ومتقدمة', href: '/wordpress/plugins' },
  { icon: 'layers' as const, title: 'Studio Resources', ar: 'موارد الاستوديو المتكاملة', href: '/wordpress/patterns' },
  { icon: 'spark' as const, title: 'Creative Assets', ar: 'أصول إبداعية جاهزة', href: '/creative' },
];
const FEATURES = [
  { icon: 'bolt' as const, title: 'Discover', subtitle: 'Explore the Collection', ar: 'استكشف المجموعة', href: '/products' },
  { icon: 'layers' as const, title: 'Build', subtitle: 'Powerful WordPress Sites', ar: 'أنشئ موقعك', href: '#studio' },
  { icon: 'rocket' as const, title: 'Accelerate', subtitle: 'Your Creative Workflow', ar: 'سرّع مسارك الإبداعي', href: '/wordpress/solutions' },
  { icon: 'diamond' as const, title: 'Go Premium', subtitle: 'Studio-Grade Solutions', ar: 'ارتقِ إلى الاحتراف', href: '/products' },
];
const BARS = [7, 12, 18, 10, 25, 16, 31, 22, 14, 36, 25, 17, 28, 40, 23, 34, 19, 30, 15, 24, 12, 20, 9, 15, 7, 11, 6];

export function WordPressWelcome({ themesLoaded, directoryOnline, onEnter }: Readonly<{ themesLoaded: number; directoryOnline: boolean; onEnter: () => void }>) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const scene = useRef<HTMLElement>(null);
  const language = useSiteLanguage();
  const ar = language === 'ar';
  const dustId = `wp-arrival-dust-${uid}`;

  useEffect(() => {
    const element = scene.current;
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        element.style.setProperty('--px', ((event.clientX / innerWidth - .5) * 2).toFixed(3));
        element.style.setProperty('--py', ((event.clientY / innerHeight - .5) * 2).toFixed(3));
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); if (frame) cancelAnimationFrame(frame); };
  }, []);

  function enterStudio(event?: MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault();
    cueAtmosphere('wake');
    onEnter();
  }

  return (
    <section ref={scene} className={s.scene} aria-labelledby="wp-welcome-title" data-scene="wordpress-welcome">
      <div className={s.nebula} aria-hidden="true" />
      <svg className={s.dust} viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
        <defs><filter id={dustId} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.007 0.012" numOctaves="4" seed="23" result="t" /><feColorMatrix in="t" type="matrix" values="0 0 0 0 0.58  0 0 0 0 0.18  0 0 0 0 0.95  .85 .35 0 0 0" /></filter></defs>
        <rect width="1200" height="800" filter={`url(#${dustId})`} />
      </svg>
      <div className={s.planet} aria-hidden="true" /><div className={s.moon} aria-hidden="true" />

      <header className={s.header}>
        <h1 id="wp-welcome-title" className={s.title}><b>01</b><i aria-hidden="true" />ARRIVAL EXPERIENCE</h1>
        <p className={s.arabic} lang="ar">بوابة الدخول إلى الاستوديو</p>
        <p className={s.edition}>KNOuX <span>WordPress Studio</span></p>
      </header>

      <div className={s.stage}>
        <aside className={`${s.glassCard} ${s.library}`} aria-label={ar ? 'مكتبة ووردبريس' : 'WordPress library'}>
          <div className={s.cardShine} aria-hidden="true" />
          <h2>KNOuX <span>STORE</span></h2>
          <p className={s.cardLede}>Premium WordPress Ecosystem<br /><span lang="ar">منظومة ووردبريس الاحترافية</span></p>
          <nav className={s.libraryNav} aria-label="WordPress destinations">
            {LIBRARY.map((item) => <Link href={item.href} key={item.title}><WpIcon name={item.icon} /><span><b>{item.title}</b><small lang="ar">{item.ar}</small></span><i aria-hidden="true">›</i></Link>)}
          </nav>
        </aside>

        <div className={s.gateway} aria-hidden="true">
          <div className={s.orbit} /><div className={`${s.orbit} ${s.orbitInner}`} />
          <div className={s.gateBody}><div className={s.gateInner} /><div className={s.gateTicks} /><div className={s.gateGlass} /><WordPressCosmicMark className={s.mark} /></div>
          <div className={`${s.pylon} ${s.pylonLeft}`} /><div className={`${s.pylon} ${s.pylonRight}`} />
          <div className={s.stairs} />
          <span className={`${s.flare} ${s.flareTop}`} /><span className={`${s.flare} ${s.flareLeft}`} /><span className={`${s.flare} ${s.flareRight}`} />
        </div>
        <div className={`${s.satellite} ${s.satelliteLeft}`} aria-hidden="true"><WpIcon name="wordpress" /></div>
        <div className={`${s.satellite} ${s.satelliteRight}`} aria-hidden="true"><WpIcon name="wordpress" /></div>

        <aside className={`${s.glassCard} ${s.monitor}`} aria-label={ar ? 'حالة الاستوديو' : 'Studio status'}>
          <div className={s.cardShine} aria-hidden="true" />
          <div className={s.monitorHead}><div><h2>STUDIO STATUS</h2><p lang="ar">حالة الاستوديو</p></div><span className={s.online} data-online={directoryOnline}><i />{directoryOnline ? 'Online' : 'Offline'}<small lang="ar">{directoryOnline ? 'متصل الآن' : 'غير متصل'}</small></span></div>
          <div className={s.world} aria-hidden="true">
            <svg viewBox="0 0 320 135"><defs><pattern id={`map-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#a66cff" /></pattern></defs><g fill={`url(#map-${uid})`}><path d="M20 38 36 19 64 12 89 20 111 19 124 34 111 44 105 59 84 57 74 72 61 64 49 46 28 49Z" /><path d="m101 68 21 9 12 19-6 28-14-12-7-24-12-9Z" /><path d="m154 26 25-12 27 6 14-3 42 14 26 23-12 16-24-5-16 11-13-9-14 6-10 29-19 23-13-11 3-27-13-17-18-6-8-17 14-12Z" /><path d="m259 92 18-8 21 12-4 18-23 4-15-11Z" /></g><ellipse cx="160" cy="78" rx="147" ry="35" fill="none" stroke="#b575ff" strokeWidth="1.2" transform="rotate(-8 160 78)" /></svg>
          </div>
          <div className={s.stats}>
            <div><WpIcon name="cube" /><strong>{themesLoaded}</strong><span>Themes loaded</span><small lang="ar">قوالب هذا العرض</small></div>
            <div><WpIcon name="people" /><strong>10</strong><span>Studio journeys</span><small lang="ar">مسارات الاستوديو</small></div>
            <div><WpIcon name="infinity" /><strong>WP.org</strong><span>Live directory</span><small lang="ar">المصدر الرسمي</small></div>
          </div>
          <div className={s.equalizer} aria-hidden="true">{BARS.map((height, i) => <i key={i} style={{ '--bar': `${height}px`, '--delay': `${i * -80}ms` } as CSSProperties} />)}</div>
        </aside>
      </div>

      <div className={s.floor} aria-hidden="true"><div className={s.floorGrid} /></div>
      <div className={`${s.clouds} ${s.cloudsLeft}`} aria-hidden="true" /><div className={`${s.clouds} ${s.cloudsRight}`} aria-hidden="true" />

      <a href="#studio" className={s.enter} onClick={enterStudio} data-enter-studio><span><b>Enter WordPress Studio</b><small lang="ar">دخول إلى استوديو ووردبريس</small></span><i aria-hidden="true">→</i></a>
      <nav className={s.features} aria-label={ar ? 'اختصارات الاستوديو' : 'Studio shortcuts'}>
        {FEATURES.map((item) => item.href.startsWith('#')
          ? <a href={item.href} key={item.title} onClick={enterStudio} aria-label={ar ? item.ar : `${item.title} — ${item.subtitle}`}><WpIcon name={item.icon} /><span><b>{item.title}</b><small>{item.subtitle}</small></span></a>
          : <Link href={item.href} key={item.title} aria-label={ar ? item.ar : `${item.title} — ${item.subtitle}`}><WpIcon name={item.icon} /><span><b>{item.title}</b><small>{item.subtitle}</small></span></Link>)}
      </nav>
      <div className={s.limb} aria-hidden="true" />
    </section>
  );
}
