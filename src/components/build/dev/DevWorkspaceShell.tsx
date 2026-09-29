'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { softwareProducts } from '@/data/software';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';

/**
 * The DEV navigation contract. Order, labels and routes are fixed by the
 * approved reference; nothing here is generated from a menu registry.
 */
export const DEV_DESTINATIONS = [
  { label: 'Dev Workspace', href: '/build', code: '001', icon: '◱' },
  { label: 'Build', href: '/build/pipeline', code: '002', icon: '⚒' },
  { label: 'Apps', href: '/build/apps', code: '003', icon: '⬡' },
  { label: 'Services', href: '/build/services', code: '004', icon: '⌘' },
  { label: 'Deployments', href: '/build/deployments', code: '005', icon: '◉' },
  { label: 'Docs & Knowledge', href: '/build/docs', code: '006', icon: '▤' },
  { label: 'Terminal', href: '/build/terminal', code: '007', icon: '▸' },
  { label: 'PowerShell', href: '/build/powershell', code: '008', icon: '▷' },
  { label: 'Providers', href: '/build/providers', code: '009', icon: '✣' },
  { label: 'Settings', href: '/build/settings', code: '010', icon: '⚙' },
] as const;

function isCurrent(pathname: string, href: string) {
  return pathname === href;
}

export function DevWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useBuildWorkspace();
  const [navOpen, setNavOpen] = useState(false);

  const current = DEV_DESTINATIONS.find((item) => isCurrent(pathname, item.href));
  // Access is a fact about this deployment, not a loading artefact. Saying
  // "adapter online" while every read was refused would be the interface
  // claiming a connection it does not have.
  const adapterLabel =
    state.access === 'refused'
      ? 'SIGN IN TO OPERATE'
      : state.status === 'ready'
        ? 'ADAPTER ONLINE'
        : state.status === 'loading'
          ? 'READING PROJECT'
          : 'ADAPTER STATE UNKNOWN';

  const isLanding = pathname === '/build';

  return (
    <div className={`dev-shell ${isLanding ? 'dev-shell--landing' : 'dev-shell--operational'}`}>
      <div className="dev-shell__top">
        <div className="dev-shell__identity"><span className="dev-dot" />KNOuX <strong>DEV</strong></div>
        <div className="dev-shell__descriptor">KN / DEV — {current?.code ?? '000'} · {state.adapter.environment.toUpperCase()} · {state.adapter.label}</div>
        <button
          type="button"
          className="dev-menu-button"
          aria-expanded={navOpen}
          aria-controls="dev-sidebar"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span> MENU
        </button>

      </div>
      <div className="dev-shell__grid">
        <aside
          id="dev-sidebar"
          className={`dev-sidebar ${navOpen ? 'dev-sidebar--open' : ''}`}
          aria-label="KNOuX DEV workspace"
        >
          <div className="dev-sidebar__brand">
            <span className="dev-dot" aria-hidden="true" /> KNOuX <small>DEV / 001</small>
          </div>

          <nav aria-label="Workspace destinations">
            {DEV_DESTINATIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`dev-nav-link ${isCurrent(pathname, item.href) ? 'dev-nav-link--active' : ''}`}
                aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
                onClick={() => setNavOpen(false)}
              >
                <span aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="dev-sidebar__projects">
            <div className="dev-mini-label">PROJECTS
            <button
              type="button"
              title="No project creation adapter is connected in this environment"
              aria-label="Add project — not available in this environment"
              disabled
            >
              +
            </button>
            </div>
            {softwareProducts.slice(0, 4).map((product) => (
              <Link key={product.id} href={`/build/apps?product=${product.slug}`}>{product.shortName}</Link>
            ))}
          </div>

          <p className="dev-sidebar__foot">
            {adapterLabel}
            <br />
            {state.project
              ? state.project.name
              : state.access === 'refused'
                ? 'PROJECT WITHHELD'
                : 'PROJECT UNAVAILABLE'}
          </p>
        </aside>

        <main id="main-content" tabIndex={-1} className="dev-shell__content">
          <div className="dev-crumb"><span>KN / DEV</span> / {current?.label ?? 'Workspace'}<span className="dev-crumb__right">{state.adapter.environment.toUpperCase()} · {state.adapter.label}</span></div>
          {children}
        </main>
      </div>
    </div>
  );
}
