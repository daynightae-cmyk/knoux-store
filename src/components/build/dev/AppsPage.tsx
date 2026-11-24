'use client';

/**
 * Applications management for the published registry and paired local projects.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { softwareProducts, type SoftwareProduct } from '@/data/software';
import { ParticleMark } from '@/components/brand/ParticleMark';
import { DevEmpty, DevPanel } from './DevUI';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import styles from './application-hub.module.css';
import operational from './operational-v3.module.css';

type HubTool = { label: string; description: string; href: string; icon: string; action: string; x: number; y: number };

/** The eight stations of reference 08, each bound to a route that exists. */
const HUB_TOOLS: readonly HubTool[] = [
  { label: 'AI Command Center', description: 'Route, control, and execute model requests.', href: '/build/ai/control', action: 'Open', x: 50, y: 11, icon: 'M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16' },
  { label: 'Model Discovery', description: 'Find, inspect, and evaluate available models.', href: '/build/ai/models', action: 'Open', x: 23, y: 27, icon: 'm12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5' },
  { label: 'Model Routing', description: 'Score-based routing with policies and fallbacks.', href: '/build/ai/router', action: 'Open', x: 77, y: 27, icon: 'M6 4v6a4 4 0 0 0 4 4h4m0 0-3-3m3 3-3 3M6 20v-2m12-14v4m0 0a3 3 0 1 0 0 .01' },
  { label: 'Providers', description: 'Configure and manage model providers.', href: '/build/providers', action: 'Open', x: 15, y: 53, icon: 'M9 3v5m6-5v5M7 8h10v4a5 5 0 0 1-10 0Zm5 9v4' },
  { label: 'Docs & Knowledge', description: 'Project documentation, runbooks, and knowledge.', href: '/build/docs', action: 'Open', x: 85, y: 53, icon: 'M6 3h9l4 4v14H6Zm9 0v4h4M9 12h7M9 16h7' },
  { label: 'Engineering', description: 'Active environment, hosts, and capabilities.', href: '/build/engineering', action: 'Open', x: 23, y: 79, icon: 'M4 5h16v14H4Zm3 4 3 3-3 3m5 0h5' },
  { label: 'Build', description: 'Create, test, and verify builds and configurations.', href: '/build/pipeline', action: 'Launch', x: 77, y: 79, icon: 'm12 3 4 2.3v4.6L12 12l-4-2.1V5.3Zm-6 8 4 2.3v4.6L6 20l-4-2.1v-4.6Zm12 0 4 2.3v4.6L18 20l-4-2.1v-4.6Z' },
  { label: 'Settings', description: 'Workspace, bridge, and project configuration.', href: '/build/settings', action: 'Open', x: 50, y: 91, icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4-2.1-.6a6.6 6.6 0 0 0-.6-1.5l1.1-1.9-1.9-1.9-1.9 1.1a6.6 6.6 0 0 0-1.5-.6L13 4.5h-2l-.6 2.1a6.6 6.6 0 0 0-1.5.6L7 6.1 5.1 8l1.1 1.9a6.6 6.6 0 0 0-.6 1.5l-2.1.6v2l2.1.6c.15.53.35 1.03.6 1.5L5.1 18 7 19.9l1.9-1.1c.47.25.97.45 1.5.6l.6 2.1h2l.6-2.1a6.6 6.6 0 0 0 1.5-.6l1.9 1.1 1.9-1.9-1.1-1.9c.25-.47.45-.97.6-1.5l2.1-.6Z' },
];

const FAMILY_ICONS: Record<string, string> = {
  'Windows Intelligence': '✦',
  'Engineering Tooling': '⬡',
  'System Maintenance': '⚙',
  'File Management': '▤',
  'Capture & Media': '◉',
  'Developer Productivity': '⌁',
};

function ProductPreview({ product }: { product: SoftwareProduct }) {
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(1, (width || 900) / 900, 420 / 600);
  return <div className="dev-app-preview"><div ref={stage} className="dev-app-preview__stage"><div style={{ width: 900 * scale, height: 600 * scale }}><iframe src={`/products/${product.slug}`} title={`Product page preview for ${product.name}`} loading="lazy" sandbox="allow-same-origin allow-scripts allow-popups" style={{ width: 900, height: 600, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }} /></div></div><p className="dev-note">Live preview of this deployment&apos;s product dossier. This does not establish that a separate product runtime is online.</p><Link href={`/products/${product.slug}`}>OPEN PRODUCT PAGE ↗</Link></div>;
}

export function AppsPage() {
  const { state, dispatch } = useBuildWorkspace();
  const params = useSearchParams();
  const requested = params.get('product');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [tab, setTab] = useState<'overview' | 'preview'>('overview');
  const reduced = state.preferences.motion === 'reduced';
  const selected = softwareProducts.find((product) => product.id === selectedId) ?? softwareProducts.find((product) => product.slug === requested) ?? softwareProducts[0];
  const families = useMemo(() => [...new Set(softwareProducts.map((product) => product.family))], []);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return softwareProducts.filter((product) => {
      if (family !== 'all' && product.family !== family) return false;
      if (!needle) return true;
      return [product.name, product.tagline, product.family, product.code, ...product.searchTerms].join(' ').toLowerCase().includes(needle);
    });
  }, [query, family]);

  const inspector = (
    <DevPanel title="Product inspector">
      <div className="dev-app-tabs">
        <button type="button" aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}>OVERVIEW</button>
        <button type="button" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>PREVIEW</button>
      </div>
      {tab === 'preview' ? <ProductPreview product={selected} /> : (
        <div className="dev-app-detail">
          <span className="dev-mini-label">{selected.code} / {selected.family.toUpperCase()}</span>
          <h2>{selected.name}</h2>
          <p>{selected.statement}</p>
          <dl className="dev-kv"><dt>Status</dt><dd>{selected.status}</dd><dt>Platform</dt><dd>{selected.platform}</dd><dt>Version</dt><dd>{selected.version ?? 'NOT DECLARED'}</dd><dt>Evidence</dt><dd>{selected.evidence.map((item) => item.source).join(', ')}</dd></dl>
          <h3>Stated limitations</h3>
          <ul>{selected.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="dev-actions"><Link href={`/products/${selected.slug}`}>VIEW PRODUCT ↗</Link><a href={selected.repository} target="_blank" rel="noreferrer">OPEN REPOSITORY ↗</a>{selected.liveUrl ? <a href={selected.liveUrl} target="_blank" rel="noreferrer">DECLARED PREVIEW ↗</a> : null}</div>
        </div>
      )}
    </DevPanel>
  );

  return (
    <div className={`dev-route ${operational.page} ${styles.page}`} data-reduced={reduced ? '' : undefined}>
      <header className={styles.masthead}>
        <h1>Applications</h1>
        <p>Inspect published products, open your local projects, and review workspace activity.</p>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Product families">
          <button type="button" aria-pressed={family === 'all'} onClick={() => setFamily('all')}>All apps</button>
          {families.map((item) => (
            <button key={item} type="button" aria-pressed={family === item} onClick={() => setFamily(item)}>
              <span aria-hidden="true">{FAMILY_ICONS[item] ?? '◇'}</span>{item}
            </button>
          ))}
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.search}>
            <span aria-hidden="true">⌕</span>
            <label className="dev-visually-hidden" htmlFor="dev-app-search">Search apps, capabilities, or keywords</label>
            <input id="dev-app-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps, capabilities, or keywords…" />
          </div>
          <div className={styles.viewToggle} role="group" aria-label="Registry layout">
            <button type="button" aria-pressed={layout === 'grid'} aria-label="Grid view" onClick={() => setLayout('grid')}>
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
            </button>
            <button type="button" aria-pressed={layout === 'list'} aria-label="List view" onClick={() => setLayout('list')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg>
            </button>
          </div>
        </div>
      </div>

      <details className={styles.toolsDrawer}>
      <summary>Workspace tools</summary>
      <nav className={styles.orbitStage} aria-label="Workspace tools">
        <svg className={styles.connectors} viewBox="0 0 1000 600" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <ellipse cx="500" cy="312" rx="330" ry="128" stroke="#bb8ef2" strokeOpacity=".28" strokeWidth="1" strokeDasharray="3 5" transform="rotate(-7 500 312)" />
          <ellipse cx="500" cy="312" rx="430" ry="188" stroke="#c9a2ff" strokeOpacity=".18" strokeWidth="1" strokeDasharray="2 6" transform="rotate(5 500 312)" />
          {HUB_TOOLS.map((tool) => {
            const tx = tool.x * 10;
            const ty = tool.y * 6;
            const mx = (500 + tx) / 2;
            return (
              <g key={tool.href}>
                <path d={`M500 312 Q ${mx} ${ty} ${tx} ${ty}`} stroke="#a97fe0" strokeOpacity=".38" strokeWidth="1" strokeDasharray="4 5" />
                <circle data-node cx={mx} cy={(312 + ty) / 2 + (ty - 312) / 8} r="3.4" fill="#c07cff" opacity=".8" />
                <circle cx={mx} cy={(312 + ty) / 2 + (ty - 312) / 8} r="1.5" fill="#fff" />
              </g>
            );
          })}
        </svg>
        <div className={styles.core}>
          <ParticleMark patternId="application-hub-mark" className={styles.coreMark} dense />
          <strong>KNOUX APPS</strong>
          <small>BUILD · RUN · OPERATE</small>
        </div>
        {HUB_TOOLS.map((tool, index) => (
          <Link key={tool.href} href={tool.href} className={styles.station} style={{ insetInlineStart: `${tool.x}%`, top: `${tool.y}%`, animationDelay: `${index * 70}ms` }}>
            <span className={styles.stationIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={tool.icon} /></svg>
            </span>
            <span className={styles.stationText}>
              <strong>{tool.label}</strong>
              <small>{tool.description}</small>
            </span>
            <span className={styles.stationOpen}>{tool.action} <span aria-hidden="true">{tool.action === 'Launch' ? '▸' : '↗'}</span></span>
          </Link>
        ))}
      </nav>
      </details>

      <div className={styles.registryHead}>
        <h2>Product registry</h2>
        <span>{visible.length} OF {softwareProducts.length} REGISTRY ENTRIES · RUNTIME STATE NOT MEASURED</span>
      </div>

      <div className={styles.registryLayout}>
      {layout === 'grid' ? (
          <div className={styles.productGrid} role="group" aria-label="Published products">
            {visible.length ? visible.map((product) => (
              <button type="button" key={product.id} className={styles.productCard} aria-pressed={selected.id === product.id} onClick={() => { setSelectedId(product.id); setTab('overview'); }}>
                <header><strong>{product.name}</strong><span>{product.code}</span></header>
                <small>{product.tagline}</small>
                <em>{product.family.toUpperCase()}</em>
              </button>
            )) : <DevEmpty title="NO MATCHING PRODUCTS" body="Try another name, capability or family from the verified registry." />}
          </div>
      ) : (
          <DevPanel title="Published products">
            <div className={`dev-list dev-list--select ${styles.registryList}`}>
              {visible.length ? visible.map((product) => (
                <button type="button" key={product.id} className={selected.id === product.id ? 'dev-list--selected' : ''} onClick={() => { setSelectedId(product.id); setTab('overview'); }}>
                  <span><strong>{product.name}</strong><small>{product.tagline}</small></span>
                  <span>{product.code} ↗</span>
                </button>
              )) : <DevEmpty title="NO MATCHING PRODUCTS" body="Try another name, capability or family from the verified registry." />}
            </div>
          </DevPanel>
      )}
      {inspector}
      </div>

      <DevPanel title="Local workspace projects">
        <p className="dev-note">Separate from the published KNOuX product registry. Local projects require their paired bridge.</p>
        <div className="dev-list">
          {state.recentProjects.length ? state.recentProjects.map((project) => (
            <button type="button" key={project.path} onClick={() => dispatch({ type: 'project/activate', path: project.path, name: project.name })}>{project.name} · {project.path}</button>
          )) : <p>No local projects imported in this session.</p>}
        </div>
        <div className="dev-actions"><Link href="/build/pipeline">Inspect build activity ↗</Link><Link href="/build/deployments">Inspect deployments ↗</Link></div>
      </DevPanel>
    </div>
  );
}
