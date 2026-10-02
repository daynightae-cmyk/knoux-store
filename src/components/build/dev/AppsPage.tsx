'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { softwareProducts, type SoftwareProduct } from '@/data/software';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';

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
  const [tab, setTab] = useState<'overview' | 'preview'>('overview');
  const selected = softwareProducts.find((product) => product.id === selectedId) ?? softwareProducts.find((product) => product.slug === requested) ?? softwareProducts[0];
  const families = [...new Set(softwareProducts.map((product) => product.family))];
  const visible = softwareProducts.filter((product) => (family === 'all' || product.family === family) && `${product.name} ${product.tagline} ${product.family}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="dev-route"><DevPageHeading eyebrow="APPS / VERIFIED REGISTRY" title="Applications" description="Published KNOuX product records with their stated repository evidence and limitations." detail={`${softwareProducts.length} registry entries · runtime state not measured`} />
    <DevPanel title="Local workspace projects"><p className="dev-note">Separate from the published KNOuX product registry. Local projects require their paired bridge.</p><div className="dev-list">{state.recentProjects.length ? state.recentProjects.map((project) => <button type="button" key={project.path} onClick={() => dispatch({ type: 'project/activate', path: project.path, name: project.name })}>{project.name} · {project.path}</button>) : <p>No local projects imported in this session.</p>}</div></DevPanel><div className="dev-app-filters"><label htmlFor="dev-app-search">SEARCH PRODUCTS<input id="dev-app-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search applications…" /></label><label htmlFor="dev-app-family">FAMILY<select id="dev-app-family" value={family} onChange={(event) => setFamily(event.target.value)}><option value="all">All families</option>{families.map((item) => <option key={item}>{item}</option>)}</select></label><span>{visible.length} SHOWN</span></div>
    <div className="dev-apps-grid"><DevPanel title="Product registry"><div className="dev-list dev-list--select">{visible.length ? visible.map((product) => <button type="button" key={product.id} className={selected.id === product.id ? 'dev-list--selected' : ''} onClick={() => { setSelectedId(product.id); setTab('overview'); }}><span><strong>{product.name}</strong><small>{product.tagline}</small></span><span>{product.code} ↗</span></button>) : <DevEmpty title="NO MATCHING PRODUCTS" body="Try another name or family from the verified registry." />}</div></DevPanel>
    <DevPanel title="Product inspector"><div className="dev-app-tabs"><button type="button" aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}>OVERVIEW</button><button type="button" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>PREVIEW</button></div>{tab === 'preview' ? <ProductPreview product={selected} /> : <div className="dev-app-detail"><span className="dev-mini-label">{selected.code} / {selected.family.toUpperCase()}</span><h2>{selected.name}</h2><p>{selected.statement}</p><dl className="dev-kv"><dt>Status</dt><dd>{selected.status}</dd><dt>Platform</dt><dd>{selected.platform}</dd><dt>Version</dt><dd>{selected.version ?? 'NOT DECLARED'}</dd><dt>Evidence</dt><dd>{selected.evidence.map((item) => item.source).join(', ')}</dd></dl><h3>Stated limitations</h3><ul>{selected.limitations.map((item) => <li key={item}>{item}</li>)}</ul><div className="dev-actions"><Link href={`/products/${selected.slug}`}>VIEW PRODUCT ↗</Link><a href={selected.repository} target="_blank" rel="noreferrer">OPEN REPOSITORY ↗</a>{selected.liveUrl ? <a href={selected.liveUrl} target="_blank" rel="noreferrer">DECLARED PREVIEW ↗</a> : null}</div></div>}</DevPanel></div>
  </div>;
}
