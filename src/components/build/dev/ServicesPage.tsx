'use client';

/**
 * Services — Build V3 reference 09, composed as the entire page.
 *
 * The reference's left rail + service-card constellation is rebuilt with the
 * real registry: the six published web systems grouped by their five real
 * categories. Every card links to its published service page and to the
 * intake that starts a real request. No service is invented, no "RUNNING"
 * health is fabricated: the registry panel reports the registry itself, and
 * runtime health stays explicitly unmeasured until a runtime reports.
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { webSystems, webSystemCategories, type WebSystem } from '@/data/services';
import { ParticleMark } from '@/components/brand/ParticleMark';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import styles from './services-platform.module.css';

type View = 'overview' | 'catalog' | 'running' | 'policies';
const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'running', label: 'Running' },
  { id: 'policies', label: 'Policies' },
];

const CATEGORY_ICONS: Record<string, string> = {
  site: 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2Z',
  commerce: 'M4 7h16l-1.5 12h-13Z M8 7a4 4 0 0 1 8 0',
  application: 'M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16',
  platform: 'M4 5h16v14H4Z M4 10h16 M9 10v9',
  experience: 'm12 3 8 4.5v9L12 21l-8-4.5v-9Z M12 12l8-4.5M12 12v9M12 12 4 7.5',
};

function ServiceCard({ service, compact }: { service: WebSystem; compact?: boolean }) {
  return (
    <article className={compact ? `${styles.card} ${styles.cardCompact}` : styles.card}>
      <header>
        <span className={styles.cardIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={CATEGORY_ICONS[service.category]} /></svg>
        </span>
        <span className={styles.cardTitle}>
          <strong>{service.title}</strong>
          <small>{service.code} · {service.category.toUpperCase()}</small>
        </span>
        <span className={styles.cardState}>PUBLISHED</span>
      </header>
      <p>{service.tagline}</p>
      {!compact ? <p className={styles.cardStatement}>{service.statement}</p> : null}
      <footer>
        <Link className={styles.open} href={`/web/${service.slug}`}>Open <span aria-hidden="true">→</span></Link>
        <Link className={styles.configure} href={`/contact?requestType=web&system=${service.slug}`}>Start a request</Link>
      </footer>
    </article>
  );
}

export function ServicesPage() {
  const { state } = useBuildWorkspace();
  const [view, setView] = useState<View>('overview');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const reduced = state.preferences.motion === 'reduced';

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return webSystems.filter((service) => {
      if (category !== 'all' && service.category !== category) return false;
      if (!needle) return true;
      return [service.title, service.tagline, service.code, service.category].join(' ').toLowerCase().includes(needle);
    });
  }, [query, category]);

  const grouped = webSystemCategories
    .map((entry) => ({ ...entry, services: filtered.filter((service) => service.category === entry.id) }))
    .filter((group) => group.services.length > 0);

  const runtimeOnline = state.runtime.status === 'running' && Boolean(state.runtime.url);

  return (
    <div className={`dev-route ${styles.page}`} data-reduced={reduced ? '' : undefined}>
      <div className={styles.masthead}>
        <div className={styles.mastheadText}>
          <span className="dev-mini-label">SERVICES / PLATFORM</span>
          <h1>Services</h1>
          <p>Composable engineering services for sites, commerce, applications and platforms. Discover what KNOuX actually builds, open the published detail, and start a real request.</p>
          <div className={styles.tabs} role="tablist" aria-label="Services views">
            {VIEWS.map((entry) => (
              <button key={entry.id} type="button" role="tab" id={`svc-tab-${entry.id}`} aria-selected={view === entry.id} aria-controls="svc-panel" onClick={() => setView(entry.id)}>{entry.label}</button>
            ))}
          </div>
        </div>
        <div className={styles.mastheadScene} aria-hidden="true">
          <svg className={styles.orbit} viewBox="0 0 420 240" fill="none">
            <ellipse cx="210" cy="120" rx="190" ry="74" stroke="#bb8ef2" strokeOpacity=".45" strokeWidth="1" transform="rotate(-8 210 120)" />
            <ellipse cx="210" cy="120" rx="120" ry="44" stroke="#c9a2ff" strokeOpacity=".35" strokeWidth="1" transform="rotate(6 210 120)" />
            {[[40, 150], [120, 60], [300, 52], [382, 140], [250, 196]].map(([x, y]) => (
              <g key={`${x}-${y}`}><circle cx={x} cy={y} r="4" fill="#c07cff" opacity=".85" /><circle cx={x} cy={y} r="1.8" fill="#fff" /></g>
            ))}
          </svg>
          <ParticleMark patternId="services-platform-mark" className={styles.mark} dense />
        </div>
        <aside className={styles.registry} aria-label="Service registry">
          <header><span className={styles.registryPulse} aria-hidden="true" />Service registry</header>
          <p><strong>{webSystems.length}</strong> published services · <strong>{webSystemCategories.length}</strong> categories</p>
          <p className={styles.registryRuntime}>{runtimeOnline ? 'Workspace runtime reports RUNNING' : 'Runtime health NOT MEASURED'}</p>
        </aside>
      </div>

      <div id="svc-panel" role="tabpanel" aria-labelledby={`svc-tab-${view}`}>
        {view === 'overview' || view === 'catalog' ? (
          <>
            <div className={styles.toolbar}>
              <div className={styles.search}>
                <span aria-hidden="true">⌕</span>
                <label className="dev-visually-hidden" htmlFor="svc-search">Find a service</label>
                <input id="svc-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a service…" />
              </div>
              <label className={styles.select}>
                <span className="dev-visually-hidden">Filter by category</span>
                <select id="svc-category" aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">All categories</option>
                  {webSystemCategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
              </label>
              <Link className={styles.register} href="/contact">+ Start a service request</Link>
            </div>

            {grouped.length === 0 ? (
              <p className={styles.empty} role="note">No published service matches “{query}”. The registry holds {webSystems.length} services; clear the search to see them all.</p>
            ) : view === 'overview' ? (
              <div className={styles.rows}>
                {grouped.map((group) => (
                  <section key={group.id} className={styles.row} aria-label={`${group.label} services`}>
                    <div className={styles.rail}>
                      <span className={styles.railIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={CATEGORY_ICONS[group.id]} /></svg>
                      </span>
                      <h2>{group.label.toUpperCase()}</h2>
                      <p>{group.question}</p>
                      <span className={styles.railCount}>{group.services.length} {group.services.length === 1 ? 'SERVICE' : 'SERVICES'}</span>
                    </div>
                    <div className={styles.rowCards}>
                      {group.services.map((service) => <ServiceCard key={service.id} service={service} />)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className={styles.grid}>
                {filtered.map((service) => <ServiceCard key={service.id} service={service} compact />)}
              </div>
            )}
          </>
        ) : null}

        {view === 'running' ? (
          <div className={styles.runningPanel}>
            <h2>Runtime execution</h2>
            {runtimeOnline ? (
              <p>The connected workspace runtime reports RUNNING at {state.runtime.url}. Service execution evidence appears in the pipeline once a verification run is recorded.</p>
            ) : (
              <p>No runtime has reported to this workspace. Nothing is shown as running because nothing has been measured — a service card is a published contract, not a live process.</p>
            )}
            <div className={styles.runningActions}>
              <Link href="/build/pipeline">Open verification pipeline ↗</Link>
              <Link href="/build/terminal">Open terminal surface ↗</Link>
            </div>
          </div>
        ) : null}

        {view === 'policies' ? (
          <div className={styles.runningPanel}>
            <h2>Operating boundaries</h2>
            <ul className={styles.policyList}>
              <li>Every service is delivered inside an explicitly authorized project workspace; no write happens through a public page.</li>
              <li>Installation, deployment and destructive operations require user-controlled approval through the trusted executor.</li>
              <li>Prices, delivery windows and performance guarantees are not published because none are established facts.</li>
              <li>Provider credentials stay in the authenticated vault; a service request never carries a secret.</li>
            </ul>
            <div className={styles.runningActions}>
              <Link href="/build/settings">Inspect workspace settings ↗</Link>
              <Link href="/build/providers">Inspect provider boundaries ↗</Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
