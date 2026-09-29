'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { softwareProducts } from '@/data/software';

/**
 * Where a node sits on the orbit.
 *
 * The stylesheet positions `.dev-machine__node` with `left: var(--node-x)` and
 * `top: var(--node-y)`. Nothing ever set those two properties, so every node
 * resolved them to their initial `auto` and fell back to its static position —
 * which meant all of them stacked in the top-left corner, overlapping, and the
 * section that claims to be "one connected machine" was a pile of cards next to
 * a circle. The rings were worse: `.dev-machine__ring` had rules and no markup.
 *
 * So the placement is computed here, once, from the node's index, and handed to
 * the stylesheet through the custom properties it already expected. Percentages
 * are used rather than pixels so the layout follows the orbit at any width, and
 * the vertical radius is a separate value because the orbit is not square — one
 * radius on both axes would flatten the arrangement.
 */
const ORBIT_RADIUS_X = 32;
const ORBIT_RADIUS_Y = 36;

function orbitPosition(index: number, total: number): CSSProperties {
  // Start at the top and step clockwise, so the order in the registry is the
  // order a reader traces the machine in.
  const degrees = -90 + (360 / total) * index;
  const radians = (degrees * Math.PI) / 180;
  return {
    '--node-x': `${(50 + ORBIT_RADIUS_X * Math.cos(radians)).toFixed(3)}%`,
    '--node-y': `${(50 + ORBIT_RADIUS_Y * Math.sin(radians)).toFixed(3)}%`,
  } as CSSProperties;
}

export function ProductMachine() {
  const [selectedId, setSelectedId] = useState(softwareProducts[0].id);
  const selected = softwareProducts.find((product) => product.id === selectedId) ?? softwareProducts[0];

  return (
    <section className="dev-machine" aria-labelledby="machine-title">
      <div className="dev-machine__title">
        <span className="dev-mini-label">PRODUCT REGISTRY / EVIDENCE</span>
        <h2 id="machine-title">ONE CONNECTED <em>MACHINE.</em></h2>
        <p>Select a real product to inspect its repository evidence, scope and limits.</p>
      </div>
      <div className="dev-machine__body">
        <div className="dev-machine__orbit" role="group" aria-label="KNOuX products">
          <div className="dev-machine__device-head"><span>KNOuX / PRODUCT SYSTEM</span><span>{softwareProducts.length.toString().padStart(2, '0')} REGISTERED</span></div>
          {/* Decorative only: the layout is carried by the nodes' own positions,
              and the rings are hidden from assistive technology rather than
              announced as decoration nobody asked for. */}
          <div className="dev-machine__ring" aria-hidden="true" />
          <div className="dev-machine__ring dev-machine__ring--two" aria-hidden="true" />
          <div className="dev-machine__core"><strong>KNOuX</strong><span>ENGINEERING INSTITUTION</span></div>
          <div className="dev-machine__registry">
            {softwareProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                style={orbitPosition(index, softwareProducts.length)}
                className={`dev-machine__node ${selectedId === product.id ? 'dev-machine__node--active' : ''}`}
                onClick={() => setSelectedId(product.id)}
                aria-pressed={selectedId === product.id}
              >
                <span>{product.code}</span>
                <strong>{product.shortName}</strong>
                <small>{product.status.toUpperCase()}</small>
              </button>
            ))}
          </div>
        </div>
        <aside className="dev-machine__detail" aria-live="polite">
          <div className="dev-mini-label">SELECTED PRODUCT / {selected.code}</div>
          <h3>{selected.name}</h3>
          <p>{selected.tagline}</p>
          <dl>
            <dt>STATUS</dt><dd>{selected.status}</dd>
            <dt>FAMILY</dt><dd>{selected.family}</dd>
            <dt>PLATFORM</dt><dd>{selected.platform}</dd>
            <dt>EVIDENCE</dt><dd>{selected.evidence[0]?.source ?? 'UNAVAILABLE'}</dd>
          </dl>
          <div className="dev-machine__links">
            <Link href={`/products/${selected.slug}`}>Product page ↗</Link>
            <a href={selected.repository} target="_blank" rel="noreferrer">Repository ↗</a>
          </div>
        </aside>
      </div>
    </section>
  );
}
