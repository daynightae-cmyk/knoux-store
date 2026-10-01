'use client';

import Link from 'next/link';
import { useRef, useState, type CSSProperties } from 'react';

import { softwareProducts } from '@/data/software';
import { solutions } from '@/data/solutions';
import { divisions } from '@/lib/entities';
import { growthChannelsDetail } from '@/data/growth';
import { webSystems } from '@/data/services';

import { AtelierLab } from '@/components/creative/AtelierLab';




const divisionPoints = [
  [13, 22], [38, 16], [76, 20], [88, 43],
  [76, 75], [52, 82], [24, 73], [11, 49],
];

export function ArchitecturalMap() {
  const [active, setActive] = useState<number | null>(null);
  return <div className="architecture-map spatial-surface" data-spatial data-active={active ?? ''}>
    <div className="spatial-grain" aria-hidden="true" />
    <span className="architecture-map__coordinate">KN / INSTITUTION<br />SPATIAL INDEX 001—008</span>
    <svg className="architecture-map__routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {divisionPoints.map(([x, y], index) => <line key={index} x1="50" y1="49" x2={x} y2={y} className={active === index ? 'is-active' : ''} />)}
      <circle cx="50" cy="49" r="25" className="architecture-map__orbit" />
    </svg>
    <div className="architecture-map__core" aria-hidden="true"><span>KNOuX</span><small>ONE PRACTICE</small></div>
    {divisions.map((division, index) => <Link
      key={division.id}
      href={division.route}
      className={`architecture-map__zone ${active === index ? 'is-active' : ''}`}
      style={{ '--zone-x': `${divisionPoints[index][0]}%`, '--zone-y': `${divisionPoints[index][1]}%` } as CSSProperties}
      onMouseEnter={() => setActive(index)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(index)}
      onBlur={() => setActive(null)}
    ><span className="architecture-map__index">{division.index} / WING</span><strong>{division.label}</strong><span className="architecture-map__detail">{division.statement}</span><span className="architecture-map__enter">ENTER ↗</span></Link>)}
    <span className="architecture-map__footer">EIGHT WINGS / ONE DIGITAL INSTITUTION</span>
  </div>;
}

/**
 * A featured archive: one verified system at a time, advanced by controls.
 *
 * This stays on `/products`, where it is a secondary way through the registry.
 * The homepage's second block is not this. A carousel shows no relationship
 * between systems and no depth, so Home now uses an editorial system field.
 * This remains a linear reading of the same audited data on /products.
 */
export function ProjectRail() {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const product = softwareProducts[index];
  const move = (delta: number) => setIndex((value) => (value + delta + softwareProducts.length) % softwareProducts.length);
  return <div className="project-rail spatial-surface" data-spatial onKeyDown={(event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  }} onTouchStart={(event) => { startX.current = event.touches[0].clientX; }} onTouchEnd={(event) => {
    const distance = event.changedTouches[0].clientX - startX.current;
    if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
  }}>
    <div className="project-rail__top"><span className="label label--signal">ORBITAL ARCHIVE / VERIFIED SOFTWARE</span><span className="mono">{String(index + 1).padStart(2, '0')} / {String(softwareProducts.length).padStart(2, '0')}</span></div>
    <div className="project-rail__body" key={product.id}>
      <div className="project-rail__geometry" aria-hidden="true"><span /><span /><span /><i>{product.code}</i></div>
      <div className="project-rail__copy"><p className="eyebrow">{product.family} / {product.status.toUpperCase()}</p><h3>{product.name}</h3><p>{product.statement}</p><Link href={`/products/${product.slug}`} className="action">OPEN SYSTEM <span className="action-arrow">↗</span></Link></div>
    </div>
    <div className="project-rail__bottom"><button type="button" onClick={() => move(-1)} aria-label="Previous product">← PREVIOUS</button><div className="project-rail__track" role="group" aria-label="Choose a product">{softwareProducts.map((entry, position) => <button key={entry.id} type="button" className={position === index ? 'is-current' : ''} onClick={() => setIndex(position)} aria-label={`Show ${entry.name}`} aria-pressed={position === index} />)}</div><button type="button" onClick={() => move(1)} aria-label="Next product">NEXT →</button></div>
  </div>;
}

export function MissionPath() {
  const [active, setActive] = useState(0);
  const selected = solutions[active];
  return <div className="mission-path spatial-surface" data-spatial>
    <div className="mission-path__line" aria-hidden="true" />
    <nav className="mission-path__stations" aria-label="Choose a business mission">{solutions.map((solution, index) => <button key={solution.id} type="button" className={`mission-path__station ${active === index ? 'is-active' : ''}`} onClick={() => setActive(index)} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} aria-pressed={active === index}><span className="mission-path__node" /><small>{solution.code}</small><strong>{solution.title}</strong></button>)}</nav>
    <div className="mission-path__focus" key={selected.id}><span className="label label--signal">MISSION {selected.index} / {selected.group.toUpperCase()}</span><h3>{selected.title}</h3><p>{selected.objective}</p><div className="mission-path__layers"><span>CORE LAYERS / {selected.core.map((layer) => layer.label).join(' · ')}</span><span>OPTIONAL / {selected.optional.length} PATHS</span></div><Link href={`/solutions/${selected.slug}`} className="action">EXPLORE THIS MISSION <span className="action-arrow">↗</span></Link></div>
  </div>;
}

/*
 * `EcosystemRack` was removed here rather than left unused.
 *
 * It was a five-slot rack of the WordPress category routes, rendered on
 * /wordpress. The ecosystem restructure replaced that surface with
 * `WordPressLibraryGateway`, which routes into the same four directories while
 * also carrying the per-category presentation, the source provenance and the
 * separate KNOuX Releases rail. Keeping both would have put two different
 * category lists on one page, disagreeing about how many categories exist —
 * this one counted five, the gateway counts the four official WordPress.org
 * directories, which is the number a visitor can actually browse.
 *
 * The two routes this rack also linked, /wordpress/starter-sites and
 * /wordpress/solutions, are still linked from /wordpress and still in the
 * division subrail. Nothing became unreachable; a redundant second list did.
 */

export function SystemBlueprint() {
  const [active, setActive] = useState(0);
  const system = webSystems[active];
  const nodes = ['DATA MODEL', 'AUTHORISATION', 'INTERFACE STATES', 'OPERATIONS', 'DEPLOYMENT'];
  return <div className="system-blueprint spatial-surface" data-spatial><div className="system-blueprint__head"><span className="label label--signal">SYSTEM BLUEPRINT</span><span className="mono">SELECT A SYSTEM TYPE</span></div><div className="system-blueprint__body"><div className="system-blueprint__systems" role="group" aria-label="System types">{webSystems.map((entry, index) => <button key={entry.id} type="button" aria-pressed={active === index} className={active === index ? 'is-active' : ''} onClick={() => setActive(index)}><small>{entry.code}</small>{entry.title}</button>)}</div><div className="system-blueprint__diagram"><svg viewBox="0 0 600 380" preserveAspectRatio="none" aria-hidden="true"><path d="M300 190 L100 60 M300 190 L500 60 M300 190 L100 320 M300 190 L500 320 M300 190 L300 30" /></svg><div className="system-blueprint__origin">{system.shortName}</div>{nodes.map((node, index) => <span key={node} className={`system-blueprint__node system-blueprint__node--${index}`}>{node}</span>)}</div></div><div className="system-blueprint__foot"><p>{system.statement}</p><Link href={`/web/${system.slug}`} className="action">EXPLORE SYSTEM <span className="action-arrow">↗</span></Link></div></div>;
}

export function SignalField() {
  const [active, setActive] = useState(0);
  const channel = growthChannelsDetail[active];
  return <div className="signal-field spatial-surface" data-spatial><div className="signal-field__core"><small>BUSINESS<br />OBJECTIVE</small><span /></div><div className="signal-field__channels" role="group" aria-label="Growth channels">{growthChannelsDetail.map((entry, index) => <button key={entry.id} type="button" className={active === index ? 'is-active' : ''} onClick={() => setActive(index)} onFocus={() => setActive(index)} onMouseEnter={() => setActive(index)} aria-pressed={active === index}><small>{entry.code}</small><strong>{entry.name}</strong></button>)}</div><div className="signal-field__readout" key={channel.id}><span className="label label--signal">ACTIVE SIGNAL / {channel.index}</span><h3>{channel.name}</h3><p>{channel.statement}</p><dl><div><dt>INPUT</dt><dd>{channel.prerequisites[0]}</dd></div><div><dt>OUTPUT</dt><dd>{channel.outputs[0]}</dd></div></dl><Link href={`/growth/${channel.slug}`} className="action">OPEN CHANNEL <span className="action-arrow">↗</span></Link></div></div>;
}

/** MaterialLab is now the full AtelierLab — re-exported for backward compat */
export function MaterialLab() {
  return <AtelierLab />;
}
