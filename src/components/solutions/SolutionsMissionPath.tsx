'use client';

import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import type { Solution } from '@/data/solutions';
import styles from './SolutionsMissionPath.module.css';

export type MissionRecord = Solution & { entityLinks: { id: string; name: string; route: string }[] };

/** Route-owned evolution of MissionPath; shared division and homepage scenes stay intact. */
export function SolutionsMissionPath({ missions }: { missions: MissionRecord[] }) {
  const [active, setActive] = useState(0);
  const [layerIndex, setLayerIndex] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = missions[active];
  const layer = selected.core[layerIndex] ?? selected.core[0];
  const select = (index: number) => { setActive(index); setLayerIndex(0); };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? (index + 1) % missions.length : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? (index + missions.length - 1) % missions.length : event.key === 'Home' ? 0 : event.key === 'End' ? missions.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); select(next); buttons.current[next]?.focus();
  };
  const linksFor = (ids: string[]) => selected.entityLinks.filter(entity => ids.includes(entity.id));

  return (
    <div className={`mission-path ${styles.path}`}>
      <nav className={styles.missions} aria-label="Choose a business mission">
        <p className={styles.label}>01 / CHOOSE THE NEED</p>
        {missions.map((mission, index) => <button className={`mission-path__station ${styles.station}`} key={mission.id} type="button" aria-pressed={index === active} aria-controls="solution-handoff" ref={node => { buttons.current[index] = node; }} onClick={() => select(index)} onFocus={() => select(index)} onMouseEnter={() => select(index)} onKeyDown={event => navigate(event, index)}><span className={styles.node} aria-hidden="true" /><small>{mission.code}</small><strong>{mission.title}</strong></button>)}
      </nav>

      <section id="solution-handoff" className={styles.handoff} aria-labelledby="selected-mission-title">
        <header className={styles.need}>
          <span className={styles.label}>MISSION {selected.index} / {selected.group.toUpperCase()}</span>
          <h3 id="selected-mission-title">{selected.title}</h3><p>{selected.objective}</p>
        </header>
        <div className={styles.layers}>
          <p className={styles.label}>02 / CONNECT THE CORE LAYERS</p>
          <div className={styles.layerRail}>
            {selected.core.map((entry, index) => <button key={entry.label} type="button" aria-pressed={layerIndex === index} aria-controls="solution-layer-detail" onClick={() => setLayerIndex(index)}><span aria-hidden="true">0{index + 1}</span><strong>{entry.label}</strong><small>Inspect this layer <span aria-hidden="true">↓</span></small></button>)}
          </div>
          <div id="solution-layer-detail" className={styles.layerDetail} aria-live="polite" aria-atomic="true">
            <h4>{layer.label}</h4><p>{layer.because}</p>
            <nav aria-label={`${layer.label} documented systems and services`}>
              {linksFor(layer.entityIds).map(entity => <Link key={entity.id} href={entity.route}>{entity.name} <span aria-hidden="true">↗</span></Link>)}
            </nav>
          </div>
        </div>
        <details className={styles.optional} key={selected.id}><summary>Optional paths <span>{selected.optional.length} / DEPENDS ON YOUR NEED</span></summary><div>{selected.optional.map(entry => <section key={entry.label}><h4>{entry.label}</h4><p>{entry.because}</p>{linksFor(entry.entityIds).map(entity => <Link key={entity.id} href={entity.route}>{entity.name} <span aria-hidden="true">↗</span></Link>)}</section>)}</div></details>
        <footer className={styles.next}>
          <div><span className={styles.label}>03 / AGREE THE NEXT STEP</span><p>{selected.nextStep}</p></div>
          <Link href={`/solutions/${selected.slug}`} className={styles.cta}>Explore this mission <span aria-hidden="true">↗</span></Link>
        </footer>
      </section>
    </div>
  );
}
