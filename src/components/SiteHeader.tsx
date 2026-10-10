'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { institutionNavigation, primaryNavigation } from '@/data/navigation';
import { OPEN_EVENT } from '@/components/CommandPalette';
import { track } from '@/lib/analytics';

/**
 * Where the divisions give way to the panel. Mirrors the switchover block in
 * `globals.css`; the two must agree or the panel opens with no way to close it.
 */
const PANEL_MAX_WIDTH = '(max-width: 1100px)';

/**
 * Site header.
 *
 * Divisions, not pages. The command palette is the only other persistent
 * affordance, and it opens on Ctrl/Cmd+K, on `/`, and from the labelled
 * button, so search is reachable by pointer, keyboard and discoverability.
 */
export function SiteHeader() {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const authRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password') || pathname.startsWith('/update-password');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The mobile panel closes through its own links and on Escape, so it does not
  // need to be synchronised to the pathname from an effect.
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  // Rotating or resizing past the switchover hides the trigger that closes the
  // panel, which would otherwise leave an opaque full-viewport panel over the
  // page with the body still scroll-locked and no visible way out. Closing on
  // the crossing releases the lock above through the same state.
  useEffect(() => {
    const panel = window.matchMedia(PANEL_MAX_WIDTH);
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMenu(false);
    };
    panel.addEventListener('change', onChange);
    return () => panel.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <Link href="/" className="brand" aria-label="KNOuX home">
          <span className="brand-dot" aria-hidden="true" />
          KNOuX
          <span className="brand-end">r</span>
        </Link>

        <nav className="desktop-nav" aria-label="Divisions">
          {primaryNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.href === '/signal' ? false : undefined}
              aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'page' : undefined}
              onClick={() => track({ type: 'division_opened', division: item.label, route: item.href })}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {authRoute ? (
            <Link className="header-access header-home" href="/" aria-label="Return to KNOuX home">
              <svg className="header-home__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3.5 10.7 12 3.8l8.5 6.9v9.1h-5.7v-5.7H9.2v5.7H3.5z" />
              </svg>
              <span>HOME</span>
            </Link>
          ) : (
            <Link className="header-access" href="/account">
              ACCESS
            </Link>
          )}
          <button
            className="header-search"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))}
            aria-label="Open search"
          >
            <span>SEARCH</span>
            <kbd>⌘K</kbd>
          </button>
          <button
            className="mobile-toggle"
            type="button"
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menu}
            onClick={() => setMenu((value) => !value)}
          >
            {menu ? 'CLOSE' : 'MENU'}
            <span aria-hidden="true">{menu ? '×' : '+'}</span>
          </button>
        </div>
      </header>

      {menu ? (
        <nav className="mobile-panel" aria-label="Site navigation">
          <button type="button" className="mobile-panel__search" onClick={() => {
            setMenu(false);
            window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_EVENT)), 0);
          }}>SEARCH THE INSTITUTION <span aria-hidden="true">⌘K</span></button>
          <span className="label" style={{ marginBottom: 18 }}>
            DIVISIONS
          </span>
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenu(false)}>
              <span>{item.code}</span>
              {item.label}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
          <span className="label" style={{ margin: '30px 0 10px' }}>
            INSTITUTION
          </span>
          {institutionNavigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenu(false)} className="mobile-panel__minor">
              <span>{item.code}</span>
              {item.label}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
          <Link href="/build" className="mobile-panel__cta" onClick={() => setMenu(false)}>
            Open the Composer
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href={authRoute ? '/' : '/account'} className="mobile-panel__access" onClick={() => setMenu(false)}>
            <span>{authRoute ? '00' : '13'}</span>
            {authRoute ? 'Return to KNOuX home' : 'Access your account'}
            <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      ) : null}
    </>
  );
}
