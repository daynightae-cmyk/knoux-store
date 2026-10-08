'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const AI_TABS = [
  { id: 'providers', label: 'Providers', href: '/build/providers', icon: '✣' },
  { id: 'models', label: 'Models', href: '/build/ai/models', icon: '◇' },
  { id: 'control', label: 'Control', href: '/build/ai/control', icon: '⚙' },
  { id: 'router', label: 'Router', href: '/build/ai/router', icon: '⇄' },
  { id: 'senshial', label: 'Senshial', href: '/build/ai/senshial', icon: '◈' },
  { id: 'arena', label: 'Arena', href: '/build/ai/arena', icon: '⊗' },
  { id: 'usage', label: 'Usage', href: '/build/ai/usage', icon: '▣' },
] as const;

export function AiCenterNav() {
  const pathname = usePathname();
  return (
    <nav className="dev-tabs" role="tablist" aria-label="AI Center sections">
      {AI_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={`dev-tab ${active ? 'dev-tab--active' : ''}`}
          >
            <span aria-hidden="true" style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AiCenterPage({ heading, children, embedded = false }: Readonly<{ heading: ReactNode; children: ReactNode; embedded?: boolean }>) {
  if (embedded) return <section aria-label="Provider runtime">{heading}{children}</section>;
  return (
    <div className="dev-route">
      <header className="dev-page-heading">
        <span className="dev-mini-label">KNOuX AI RUNTIME / PHASE B</span>
        {/* The single `<h1>` for every AI Center route. Each screen renders its
            own heading as an `<h2>` beneath this one, so exactly one top-level
            heading exists per page in every state — including the loading
            states, where a screen passes `heading={null}` and would otherwise
            leave the route with no `<h1>` at all. */}
        <h1>AI Command Center</h1>
        <p>Real provider adapters, live model discovery, generation, streaming, and structured output. Every capability state is measured — never assumed.</p>
      </header>
      <AiCenterNav />
      <div style={{ height: 20 }} />
      {heading}
      {children}
    </div>
  );
}
