'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { DeterministicSignature } from '@/components/DeterministicSignature';
import { softwareProducts } from '@/data/software';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';

/** An editorial reading of the same audited registry used by the full universe. */
export function HomeSoftwareField() {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const selected = softwareProducts[active] ?? softwareProducts[0];

  useEffect(() => {
    const root = host.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-software-index]'));
    const observer = new IntersectionObserver((entries) => {
      if (root.matches(':hover') || root.contains(document.activeElement)) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.softwareIndex));
    }, { rootMargin: '-18% 0px -22% 0px', threshold: [0.2, 0.55, 0.85] });
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} className="software-field">
      <aside className="software-field__identity" aria-label="Focused product">
        <div className="software-field__top"><span>KN / SYSTEM FIELD</span><span>{selected.code}</span></div>
        <div className="software-field__visual" key={selected.id}>
          <span className="software-field__serial" aria-hidden="true">{selected.index}</span>
          <svg className="software-field__emblem" viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} aria-hidden="true" focusable="false">
            {MARK_PATHS.map((path) => <path key={path.id} d={path.d} />)}
          </svg>
          <div className="software-field__reticle" aria-hidden="true" />
          <DeterministicSignature seed={active + 41} label={selected.code} />
        </div>
        <div className="software-field__caption">
          <span className="label label--signal">VERIFIED SYSTEM / {selected.family.toUpperCase()}</span>
          <h3>{selected.name}</h3>
          <p>{selected.tagline}</p>
          <div className="software-field__facts"><span>{selected.status.toUpperCase()}</span><span>{selected.platform}</span></div>
          <Link href={`/products/${selected.slug}`}>EXPLORE {selected.shortName} <span aria-hidden="true">↗</span></Link>
        </div>
      </aside>
      <div className="software-field__records" aria-label="Verified KNOuX software products">
        {softwareProducts.map((product, index) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="software-field__record"
            data-software-index={index}
            data-serial={product.index}
            data-active={active === index ? 'true' : 'false'}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
          >
            <span className="software-field__index">{product.index} / {product.code}</span>
            <strong>{product.name}</strong>
            <span className="software-field__discipline">{product.discipline} / {product.family}</span>
            <span className="software-field__arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
        <p className="software-field__source">Every record resolves to its current registry dossier and repository evidence.</p>
      </div>
    </div>
  );
}
