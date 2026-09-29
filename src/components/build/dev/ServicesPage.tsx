'use client';

import Link from 'next/link';
import { useState } from 'react';
import { webSystems } from '@/data/services';
import { DevPageHeading, DevPanel } from './DevUI';

export function ServicesPage() {
  const [selectedId, setSelectedId] = useState(webSystems[0].id);
  const selected = webSystems.find((service) => service.id === selectedId) ?? webSystems[0];
  return <div className="dev-route"><DevPageHeading eyebrow="SERVICES / CATALOGUE" title="Engineering services" description="The service registry describes work KNOuX offers. It does not report running infrastructure." detail={`${webSystems.length} service types · operational telemetry unavailable`} /><div className="dev-apps-grid"><DevPanel title="Service types"><div className="dev-list dev-list--select">{webSystems.map((service) => <button type="button" key={service.id} className={selectedId === service.id ? 'dev-list--selected' : ''} onClick={() => setSelectedId(service.id)}><span><strong>{service.title}</strong><small>{service.tagline}</small></span><span>{service.code}</span></button>)}</div></DevPanel><DevPanel title="Service detail"><div className="dev-app-detail"><span className="dev-mini-label">{selected.code} / {selected.category.toUpperCase()}</span><h2>{selected.title}</h2><p>{selected.statement}</p><h3>Deliverables</h3><ul>{selected.artefacts.map((item) => <li key={item}>{item}</li>)}</ul><h3>Architecture questions</h3><ul>{selected.qualifiers.map((item) => <li key={item}>{item}</li>)}</ul><div className="dev-actions"><Link href={`/web/${selected.slug}`}>VIEW SERVICE ↗</Link></div></div></DevPanel></div></div>;
}
