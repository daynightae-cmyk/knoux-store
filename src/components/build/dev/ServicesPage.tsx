'use client';

import Link from 'next/link';
import { useState } from 'react';
import { webSystems } from '@/data/services';
import { DevPageHeading, DevPanel } from './DevUI';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import styles from './operational-v3.module.css';

export function ServicesPage() {
  const { state } = useBuildWorkspace();
  const [selectedId, setSelectedId] = useState(webSystems[0].id);
  const selected = webSystems.find((service) => service.id === selectedId) ?? webSystems[0];
  return <div className={`dev-route ${styles.page} ${styles.services}`} data-reduced={state.preferences.motion === 'reduced' ? '' : undefined}>
    <DevPageHeading eyebrow="SERVICES / CATALOGUE" title="Engineering services" description="Explore the systems and deliverables KNOuX offers." detail={`${webSystems.length} service types`} />
    <div className={styles.catalog} role="group" aria-label="Service types">
      {webSystems.map((service) => <button type="button" key={service.id} aria-pressed={selectedId === service.id} onClick={() => setSelectedId(service.id)}>
        <span>{service.category.toUpperCase()}</span><strong>{service.title}</strong><small>{service.tagline}</small>
      </button>)}
    </div>
    <DevPanel title="Service detail">
      <div className="dev-app-detail">
        <span className="dev-mini-label">{selected.code} / {selected.category.toUpperCase()}</span>
        <h2>{selected.title}</h2>
        <p>{selected.statement}</p>
        <h3>Deliverables</h3><ul>{selected.artefacts.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Architecture questions</h3><ul>{selected.qualifiers.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className="dev-actions"><Link href={`/web/${selected.slug}`}>VIEW SERVICE ↗</Link></div>
      </div>
    </DevPanel>
  </div>;
}
