'use client';

import Link from 'next/link';
import { useState } from 'react';
import { softwareProducts } from '@/data/software';

export function ProductMachine() {
  const [selectedId, setSelectedId] = useState(softwareProducts[0].id);
  const selected = softwareProducts.find((product) => product.id === selectedId) ?? softwareProducts[0];
  return <section className="dev-machine" aria-labelledby="machine-title">
    <div className="dev-machine__title"><span className="dev-mini-label">PRODUCT UNIVERSE / REGISTRY EVIDENCE</span><h2 id="machine-title">ONE CONNECTED <em>MACHINE.</em></h2><p>Select a product to inspect its repository evidence, scope and limits.</p></div>
    <div className="dev-machine__body"><div className="dev-machine__orbit" role="group" aria-label="KNOuX products">
      <div className="dev-machine__ring dev-machine__ring--one" /><div className="dev-machine__ring dev-machine__ring--two" />
      <div className="dev-machine__core"><strong>KNOuX</strong><span>PRODUCT SYSTEM</span></div>
      {softwareProducts.map((product, index) => { const angle = (index / softwareProducts.length) * Math.PI * 2 - Math.PI / 2; return <button key={product.id} type="button" className={`dev-machine__node ${selectedId === product.id ? 'dev-machine__node--active' : ''}`} style={{ '--node-x': `${50 + Math.cos(angle) * 38}%`, '--node-y': `${50 + Math.sin(angle) * 38}%` } as React.CSSProperties} onClick={() => setSelectedId(product.id)} aria-pressed={selectedId === product.id}><span>{product.code}</span><strong>{product.shortName}</strong></button>; })}
    </div><aside className="dev-machine__detail" aria-live="polite"><div className="dev-mini-label">SELECTED PRODUCT / {selected.code}</div><h3>{selected.name}</h3><p>{selected.tagline}</p><dl><dt>STATUS</dt><dd>{selected.status}</dd><dt>FAMILY</dt><dd>{selected.family}</dd><dt>PLATFORM</dt><dd>{selected.platform}</dd><dt>EVIDENCE</dt><dd>{selected.evidence[0]?.source ?? 'UNAVAILABLE'}</dd></dl><div className="dev-machine__links"><Link href={`/products/${selected.slug}`}>Product page ↗</Link><a href={selected.repository} target="_blank" rel="noreferrer">Repository ↗</a></div></aside></div>
  </section>;
}
