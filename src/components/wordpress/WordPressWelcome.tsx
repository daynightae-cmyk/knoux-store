'use client';

/** 01 · Arrival Experience — the 2026-11-23 Store artboard, built in code. */
import Link from 'next/link';
import { useEffect, useId, useRef, type MouseEvent } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from './WordPressCosmicMark';
import type { ExternalQueryState } from '@/lib/wordpress/external';
import { StudioDirectoryStatus, WpIcon } from './EcosystemHero';
import s from './wordpress-welcome.module.css';

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

export function WordPressWelcome({ active, themesLoaded, directoryState, journeyCount, onEnter }: Readonly<{ active: boolean; themesLoaded: number; directoryState: ExternalQueryState; journeyCount: number; onEnter: () => void }>) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const scene = useRef<HTMLElement>(null);
  const language = useSiteLanguage();
  const ar = language === 'ar';
  const dustId = `wp-arrival-dust-${uid}`;

  useEffect(() => {
    const element = scene.current;
    if (!element || !active) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (frame || document.hidden || motion.matches) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        element.style.setProperty('--px', ((event.clientX / innerWidth - .5) * 2).toFixed(3));
        element.style.setProperty('--py', ((event.clientY / innerHeight - .5) * 2).toFixed(3));
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); if (frame) cancelAnimationFrame(frame); };
  }, [active]);

  function enterStudio(event: MouseEvent<HTMLAnchorElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
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
      <div className={s.vignette} aria-hidden="true" />
      <div className={s.stars} aria-hidden="true" />

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
          <div className={s.crown} />
          <div className={s.gateBody}><div className={s.gateInner} /><div className={s.gateTicks} /><div className={s.gateGlass} /><WordPressCosmicMark className={s.mark} tone="starlight" /></div>
          <div className={`${s.pylon} ${s.pylonLeft}`} /><div className={`${s.pylon} ${s.pylonRight}`} />
          <div className={s.stairs} />
          <span className={`${s.flare} ${s.flareTop}`} /><span className={`${s.flare} ${s.flareLeft}`} /><span className={`${s.flare} ${s.flareRight}`} />
        </div>
        <div className={`${s.satellite} ${s.satelliteLeft}`} aria-hidden="true"><WpIcon name="wordpress" /></div>
        <div className={`${s.satellite} ${s.satelliteRight}`} aria-hidden="true"><WpIcon name="wordpress" /></div>

        <StudioDirectoryStatus uid={uid} ar={ar} directoryState={directoryState} themesLoaded={themesLoaded} journeyCount={journeyCount} />
      </div>

      <div className={s.floor} aria-hidden="true"><div className={s.floorGrid} /></div>
      <div className={`${s.clouds} ${s.cloudsLeft}`} aria-hidden="true" /><div className={`${s.clouds} ${s.cloudsRight}`} aria-hidden="true" />

      <a href="#studio" className={s.enter} onClick={enterStudio} data-enter-studio><span><b>Enter WordPress Studio</b><small lang="ar">دخول إلى استوديو ووردبريس</small></span><i aria-hidden="true">→</i></a>
      <nav className={s.features} aria-label={ar ? 'اختصارات الاستوديو' : 'Studio shortcuts'}>
        {FEATURES.map((item) => item.href.startsWith('#')
          ? <a href={item.href} key={item.title} onClick={enterStudio}><WpIcon name={item.icon} /><span><b>{item.title}</b><small>{item.subtitle}</small></span></a>
          : <Link href={item.href} key={item.title}><WpIcon name={item.icon} /><span><b>{item.title}</b><small>{item.subtitle}</small></span></Link>)}
      </nav>
      <div className={s.limb} aria-hidden="true" />
    </section>
  );
}
