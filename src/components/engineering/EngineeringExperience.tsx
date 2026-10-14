'use client';

import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import { softwareProducts, softwareAuditDate } from '@/data/software';
import styles from './EngineeringExperience.module.css';

// Original engineering stages, recovered from the headquarters baseline.
const stages = [
  { title: 'Interface', body: 'How someone understands and uses a system.', layer: 'The point of contact', evidence: 0 },
  { title: 'Runtime', body: 'How it responds, remains stable and handles change.', layer: 'The execution boundary', evidence: 1 },
  { title: 'Data', body: 'How information is modeled and protected.', layer: 'The protection path', evidence: 3 },
  { title: 'Delivery', body: 'How the system is tested, released and maintained.', layer: 'The evidence boundary', evidence: null },
] as const;

export function EngineeringExperience() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const product = softwareProducts[0];
  const stage = stages[active];
  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % stages.length;
    else if (event.key === 'ArrowLeft') next = (index + stages.length - 1) % stages.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = stages.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className={`shell ${styles.experience}`} aria-labelledby="engineering-title">
      <nav className={styles.crumb} aria-label="Breadcrumb"><Link href="/">KNOuX</Link><span aria-hidden="true">/</span><span>Engineering</span></nav>
      <header className={styles.intro}>
        <div><p className={styles.eyebrow}>02 / ENGINEERING</p><h1 id="engineering-title">Systems are<br /><em>relationships.</em></h1></div>
        <div className={styles.purpose}><p>A technical archive of what is implemented, what is constrained, and where the evidence lives. Interface claims stop where repository evidence stops.</p><a href="#engineering-dossiers">Inspect the dossiers <span aria-hidden="true">↓</span></a></div>
      </header>

      <div className={styles.workspace}>
        <div className={styles.workspaceHead}>
          <div><p className={styles.eyebrow}>A CONTINUOUS PRACTICE</p><h2>From surface to system.</h2></div>
          <div className={styles.tabs} role="tablist" aria-label="Engineering workflow">
            {stages.map((item, index) => <button key={item.title} ref={node => { tabs.current[index] = node; }} id={`engineering-stage-${index}`} role="tab" aria-selected={active === index} aria-controls="engineering-stage-panel" tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => selectWithKeyboard(event, index)}><span>0{index + 1}</span>{item.title}</button>)}
          </div>
        </div>

        <div className={styles.panel} id="engineering-stage-panel" role="tabpanel" aria-labelledby={`engineering-stage-${active}`} tabIndex={0}>
          <div className={styles.blueprint} data-stage={active}>
            <div className={styles.blueprintTitle}><span>{product.code} / {product.name}</span><span>DECLARED ARCHITECTURE</span></div>
            <div className={styles.lattice} aria-label="KNOUX ONE architecture, from interface through typed commands to protected native operations">
              <svg className={styles.connections} viewBox="0 0 700 360" preserveAspectRatio="none" aria-hidden="true"><path d="M180 65H520M180 65V185H520V295M520 65V185M180 185V295M180 295H520" /><path className={styles.path} d={active === 0 ? 'M180 65H520' : active === 1 ? 'M180 65V185H520' : active === 2 ? 'M520 185V295H180' : 'M180 65V185V295H520V185V65H180'} /></svg>
              <div className={styles.layer} data-active={active === 0 || active === 3}>
                <span className={styles.axis}>01 / SURFACE</span>
                <div className={styles.node}><span>React 19 · TypeScript</span><strong>Desktop shell</strong><p>One interface over nineteen modules</p></div>
                <div className={styles.node}><span>Registry-driven navigation</span><strong>Module registry</strong><p>Arabic / English search</p></div>
              </div>
              <div className={styles.layer} data-active={active === 1 || active === 3}>
                <span className={styles.axis}>02 / RUNTIME</span>
                <div className={styles.node}><span>Tauri 2</span><strong>Typed command bridge</strong><p>Allowlisted renderer → Rust commands</p></div>
                <div className={styles.node}><span>Rust</span><strong>Native workspaces</strong><p>No arbitrary shell endpoint</p></div>
              </div>
              <div className={styles.layer} data-active={active === 2 || active === 3}>
                <span className={styles.axis}>03 / PROTECTION</span>
                <div className={styles.node}><span>Cross-volume quarantine</span><strong>Copy → flush → verify</strong><p>BLAKE3 before source removal</p></div>
                <div className={styles.node}><span>Developer Studio</span><strong>Bounded cache paths</strong><p>Credential payloads refused</p></div>
              </div>
            </div>
            <p className={styles.blueprintNote}>Repository-declared structure. Browser preview declines desktop operations.</p>
          </div>

          <div className={styles.inspector}>
            <p className={styles.eyebrow}>0{active + 1} / {stage.layer.toUpperCase()}</p>
            <h3>{stage.title}</h3><p className={styles.stageBody}>{stage.body}</p>
            <div className={styles.evidence}><span className={styles.eyebrow}>{active === 3 ? 'DECLARED LIMIT' : 'IMPLEMENTATION RECORD'}</span><p>{stage.evidence === null ? product.limitations[0] : product.capabilities[stage.evidence]}</p></div>
            <div className={styles.source}><span className={styles.eyebrow}>CHECKABLE SOURCE</span><a href={`${product.repository}/blob/main/${active === 3 ? '.github/workflows/m03-native-validation.yml' : 'README.md'}`} target="_blank" rel="noopener noreferrer">{active === 3 ? 'Native validation workflow' : 'README · implementation & limits'} <span aria-hidden="true">↗</span></a><span>Repository audit / {softwareAuditDate}</span></div>
            <a className={styles.dossierLink} href={`#engineering-${product.slug}`}>Read the complete dossier <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <p className={styles.boundary}>Implementation evidence and runtime verification are separate. Explore every system’s capabilities, constraints and sources below.</p>
      </div>
    </section>
  );
}
