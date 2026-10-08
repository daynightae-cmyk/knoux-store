'use client';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { EngineeringPlan } from '@/lib/build/engineering-plan';
import { buildPlanGraph } from '@/lib/build/plan-graph';
import { deriveTopology } from '@/lib/build/topology/derive';
import { layoutTopology } from '@/lib/build/topology/layout';
import styles from './generator.module.css';

export function PlanSystemMap({ plan, draft = false }: { plan: Partial<EngineeringPlan>; draft?: boolean }) {
  const [view, setView] = useState<'sections' | 'product'>('sections');
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const graph = useMemo(() => buildPlanGraph(plan), [plan]);
  const topology = useMemo(() => deriveTopology(plan), [plan]);
  const product = useMemo(() => layoutTopology(topology), [topology]);
  const nodes = view === 'sections' ? graph.sections : product.map((node) => ({ ...node, provenance: [node.provenance] }));
  const index = Math.min(active, Math.max(0, nodes.length - 1));
  const selected = nodes[index];
  const dense = nodes.length > 80;
  const lanes = new Map<number, number>();
  product.forEach((node) => lanes.set(node.x, (lanes.get(node.x) ?? 0) + 1));
  const mapHeight = view === 'product' ? Math.max(550, Math.max(1, ...lanes.values()) * 150) : 550;
  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next = index;
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % nodes.length;
    else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index - 1 + nodes.length) % nodes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = nodes.length - 1;
    else if (event.key === 'Escape') { setDetail(false); event.preventDefault(); return; }
    else return;
    event.preventDefault(); setActive(next); buttons.current[next]?.focus();
  };
  return <section className={styles.systemMap} aria-label={draft ? 'Draft architecture formation' : 'Plan system map'} data-map-state={draft ? 'draft' : 'proposal'}>
    <header className={styles.mapHeading}><div><span>{draft ? 'CONFIRMED STREAM SECTIONS / DRAFT' : 'PLAN-DERIVED SYSTEM / PROPOSAL'}</span><h2>{draft ? 'Architecture taking shape.' : 'A system, connected.'}</h2><p>{topology.product} · {graph.sections.length} sections · {topology.nodes.length} source lines · {topology.edges.length} explicit relationships</p></div><div className={styles.mapViews} role="group" aria-label="Map view"><button type="button" aria-pressed={view === 'sections'} onClick={() => { setView('sections'); setActive(0); setDetail(false); }}>Plan sections</button><button type="button" aria-pressed={view === 'product'} onClick={() => { setView('product'); setActive(0); setDetail(false); }}>Product topology</button></div></header>
    <p className={styles.note}>{draft ? 'Only complete arrays received from the provider appear here. This is not a validated plan yet.' : 'Read-only proposal. Connections represent section membership or explicit references in the source.'} Arrow keys move; Enter opens verbatim evidence; Escape closes it.</p>
    <div className={styles.mapSpace} data-dense={dense} style={{ '--map-height': `${mapHeight}px` } as React.CSSProperties}>
      {!dense ? <svg className={styles.mapLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {view === 'sections' ? <><ellipse cx="50" cy="50" rx="34" ry="37" />{graph.sections.map((node) => <path key={node.id} d={`M50 50 Q${50 + (node.x - 50) * .2} ${node.y} ${node.x} ${node.y}`} />)}</> : topology.edges.map((edge) => { const from = product.find((node) => node.id === edge.from), to = product.find((node) => node.id === edge.to); return from && to ? <path key={edge.id} d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 4} ${to.x} ${to.y}`} /> : null; })}
      </svg> : null}
      {view === 'sections' && !dense ? <div className={styles.mapCore} aria-hidden="true"><span>KNOuX</span><small>{draft ? 'FORMING' : 'PROPOSAL'}</small></div> : null}
      <ul className={styles.mapNodes} aria-label={view === 'sections' ? 'Plan section nodes' : 'Source-derived product nodes'}>
        {nodes.map((node, item) => <li key={node.id} style={{ '--node-x': `${node.x}%`, '--node-y': `${node.y}%` } as React.CSSProperties}><button ref={(element) => { buttons.current[item] = element; }} type="button" tabIndex={index === item ? 0 : -1} aria-expanded={detail && index === item} aria-label={`${node.label} · ${node.provenance[0].section}, line ${node.provenance[0].line}`} onKeyDown={key} onClick={() => { setActive(item); setDetail(true); }}><span className={styles.nodeDot} aria-hidden="true" /><span>{node.label}</span><small>{view === 'sections' ? `${node.provenance.length} source ${node.provenance.length === 1 ? 'line' : 'lines'}` : `§${node.provenance[0].section} · line ${node.provenance[0].line}`}</small></button></li>)}
      </ul>
    </div>
    {detail && selected ? <aside className={styles.provenance} aria-label="Verbatim plan provenance"><header><h3>{view === 'sections' ? selected.label : 'Source evidence'}</h3><button type="button" className={styles.textButton} onClick={() => { setDetail(false); buttons.current[index]?.focus(); }}>Close source evidence</button></header><ul>{selected.provenance.map((source) => <li key={`${source.section}-${source.line}`}><small>§{source.section} · line {source.line}</small><p>{source.source}</p></li>)}</ul></aside> : null}
  </section>;
}
