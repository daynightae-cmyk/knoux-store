'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { softwareProducts } from '@/data/software';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { workspaceFacts } from './workspace-facts';

const LivingMark = dynamic(() => import('./BuildLivingMarkBackdrop').then((mod) => mod.BuildLivingMarkBackdrop), { ssr: false });
const Launcher = dynamic(() => import('./ProjectLauncher').then((mod) => mod.ProjectLauncher));
const Palette = dynamic(() => import('./WorkspaceUtilities').then((mod) => mod.WorkspaceCommandPalette));
const Activity = dynamic(() => import('./WorkspaceUtilities').then((mod) => mod.WorkspaceActivity));

export const DEV_DESTINATIONS = [
  { label: 'Getting Started', href: '/build', code: '01', icon: '◱' },
  { label: 'Engineering', href: '/build/engineering', code: 'OS', icon: '◈' },
  { label: 'Build', href: '/build/pipeline', code: '02', icon: '⌁' },
  { label: 'Apps', href: '/build/apps', code: '03', icon: '⬡' },
  { label: 'Services', href: '/build/services', code: '04', icon: '⌘' },
  { label: 'Deployments', href: '/build/deployments', code: '05', icon: '◉' },
  { label: 'Docs & Knowledge', href: '/build/docs', code: '06', icon: '▤' },
  { label: 'Terminal', href: '/build/terminal', code: '07', icon: '▸' },
  { label: 'PowerShell', href: '/build/powershell', code: '08', icon: '▷' },
  { label: 'Providers', href: '/build/providers', code: '09', icon: '✣' },
  { label: 'Models', href: '/build/ai/models', code: 'AI', icon: '◈' },
  { label: 'Model Routing', href: '/build/ai/router', code: 'RT', icon: '◈' },
  { label: 'Settings', href: '/build/settings', code: '10', icon: '⚙' },
] as const;

export function DevWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useBuildWorkspace();
  const facts = workspaceFacts(state);
  const [navOpen, setNavOpen] = useState(false);
  const [utility, setUtility] = useState<'launcher' | 'palette' | 'activity' | null>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setNavOpen(false); setUtility((value) => value === 'palette' ? null : 'palette'); } };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const current = DEV_DESTINATIONS.find((item) => pathname === item.href);

  useEffect(() => {
    if (!navOpen) return;
    const rail = sidebar.current;
    const toggle = menu.current;
    const controls = () => Array.from(rail?.querySelectorAll<HTMLElement>('a, button:not(:disabled)') ?? []);
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setNavOpen(false); event.preventDefault(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { last?.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first?.focus(); event.preventDefault(); }
    };
    const onResize = () => { if (window.innerWidth > 1024) setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); toggle?.focus(); };
  }, [navOpen]);

  return <div className={`dev-shell dev-cinematic ${pathname === '/build' ? 'dev-shell--landing' : 'dev-shell--operational'}`}>
    <div className="dev-shell__top"><Link href="/" className="dev-shell__identity" aria-label="KNOuX Store home">KNOuX <strong>BUILD</strong></Link><span className="dev-mini-label">{current?.label ?? 'Workspace'}</span><button ref={menu} type="button" className="dev-menu-button" aria-label="Open workspace navigation" aria-expanded={navOpen} aria-controls="dev-sidebar" onClick={() => setNavOpen((open) => !open)}>☰ MENU</button></div>
    <div className="dev-shell__grid">
      {navOpen ? <button type="button" className="dev-nav-backdrop" tabIndex={-1} aria-label="Close workspace navigation" onClick={() => setNavOpen(false)} /> : null}
      <aside ref={sidebar} id="dev-sidebar" className={`dev-sidebar ${navOpen ? 'dev-sidebar--open' : ''}`} aria-label="KNOuX DEV workspace" role={navOpen ? 'dialog' : undefined} aria-modal={navOpen ? true : undefined}>
        <div className="dev-sidebar__brand"><Link href="/" aria-label="KNOuX Store home"><span className="dev-dot" aria-hidden="true" />KNOuX <small>BUILD</small></Link><button className="dev-sidebar__close" type="button" onClick={() => setNavOpen(false)} aria-label="Close workspace navigation">×</button></div>
        <button type="button" className="dev-sidebar__action" onClick={() => { setNavOpen(false); setUtility('launcher'); }}>New build <span aria-hidden="true">↗</span></button>
        <nav aria-label="Workspace destinations">{DEV_DESTINATIONS.map((item) => <Link key={item.href} href={item.href} className={`dev-nav-link ${pathname === item.href ? 'dev-nav-link--active' : ''}`} aria-current={pathname === item.href ? 'page' : undefined} onClick={() => setNavOpen(false)}><span aria-hidden="true">{item.icon}</span><small>{item.code}</small>{item.label}</Link>)}</nav>
        <div className="dev-sidebar__projects"><div className="dev-mini-label">PROJECTS <button type="button" onClick={() => { setNavOpen(false); setUtility('launcher'); }} aria-label="Add or open project">+</button></div>{softwareProducts.slice(0, 4).map((product) => <Link key={product.id} href={`/build/apps?product=${product.slug}`} onClick={() => setNavOpen(false)}>{product.name}</Link>)}</div>
        <dl className="dev-sidebar__facts"><dt>ADAPTER STATUS</dt><dd>{facts.adapter}</dd><dt>PROJECT STATUS</dt><dd>{facts.project}</dd><dt>ENVIRONMENT</dt><dd>{facts.environment}</dd></dl>
      </aside>
      <div className="dev-shell__stage" inert={navOpen}><LivingMark /><main id="main-content" tabIndex={0} className="dev-shell__content"><div className="dev-crumb"><span>KN / DEV</span> / {current?.label ?? 'Workspace'}<span className="dev-crumb__right">{facts.environment}</span></div>{children}</main><footer className="dev-status-rail" aria-label="Workspace status"><div className="dev-utility-actions"><button type="button" onClick={() => setUtility('palette')}>COMMANDS · Ctrl K</button><button type="button" onClick={() => setUtility('activity')}>ACTIVITY · {state.activity.length}</button></div><span><i aria-hidden="true" />{facts.runtime}</span><Link href="/build/pipeline">{facts.verification}</Link><Link href="/build/deployments">DEPLOYMENT · {facts.deployment}</Link><Link href="/build/providers">{facts.provider}</Link></footer></div>
    </div>
    {utility === 'launcher' ? <Launcher onClose={() => setUtility(null)} /> : utility === 'palette' ? <Palette onClose={() => setUtility(null)} onLaunch={() => setUtility('launcher')} /> : utility === 'activity' ? <Activity onClose={() => setUtility(null)} /> : null}
  </div>;
}
