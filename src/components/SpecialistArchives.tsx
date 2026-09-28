'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { DeterministicSignature } from '@/components/DeterministicSignature';
import { softwareProducts, type SoftwareProduct } from '@/data/software';
import { solutions } from '@/data/solutions';

function useArchiveActivation(
  root: React.RefObject<HTMLElement | null>,
  selector: string,
  setActive: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    const host = root.current;
    if (!host) return;

    const targets = Array.from(host.querySelectorAll<HTMLElement>(selector));
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((target) => target.setAttribute('data-visible', 'true'));
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      targets.forEach((target) => target.setAttribute('data-visible', 'true'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          target.setAttribute('data-visible', entry.isIntersecting ? 'true' : 'false');
          if (entry.isIntersecting && entry.intersectionRatio >= 0.52) {
            const index = Number(target.dataset.archiveIndex);
            if (Number.isFinite(index)) setActive(index);
          }
        }
      },
      { rootMargin: '-12% 0px -22% 0px', threshold: [0.08, 0.52, 0.78] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [root, selector, setActive]);
}

function EvidenceSummary({ product }: { product: SoftwareProduct }) {
  return (
    <dl className="archive-context__facts">
      <div><dt>STATE</dt><dd>{product.status}</dd></div>
      <div><dt>FAMILY</dt><dd>{product.family}</dd></div>
      <div><dt>PLATFORM</dt><dd>{product.platform}</dd></div>
      <div><dt>EVIDENCE</dt><dd>{product.evidence.length} repository sources</dd></div>
    </dl>
  );
}
export function CaseFileArchive() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useArchiveActivation(root, '.case-file-record', setActive);
  const selected = softwareProducts[active] ?? softwareProducts[0];

  return (
    <div className="archive-shell archive-shell--work" ref={root}>
      <aside className="archive-context" aria-label="Selected verified product context">
        <span className="label label--signal">VERIFIED PRODUCT RECORD</span>
        <p className="archive-context__counter">{selected.code} / {selected.discipline.toUpperCase()}</p>
        <h2>{selected.name}</h2>
        <p className="archive-context__statement">{selected.tagline}</p>
        <DeterministicSignature seed={active + 1} label={selected.code} />
        <EvidenceSummary product={selected} />
        <a className="archive-context__source" href={selected.repository} target="_blank" rel="noopener noreferrer">
          INSPECT REPOSITORY EVIDENCE <span aria-hidden="true">↗</span>
        </a>
      </aside>

      <div className="case-file-list" aria-label="KNOuX verified product case files">
        {softwareProducts.map((product, index) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="case-file-record"
            data-archive-index={index}
            data-active={active === index ? 'true' : 'false'}
            data-visible="true"
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
          >
            <div className="case-file-record__visual">
              <DeterministicSignature seed={index + 1} label={product.code} compact />
            </div>
            <div className="case-file-record__copy">
              <div className="case-file-record__meta">
                <span>{product.code}</span>
                <span>{product.family}</span>
                <span>{product.status.toUpperCase()}</span>
              </div>
              <h3>{product.name}</h3>
              <p>{product.statement}</p>
              <div className="case-file-record__technology" aria-label="Verified technologies">
                {product.technologies.slice(0, 5).map((technology) => <span key={technology}>{technology}</span>)}
              </div>
              <div className="case-file-record__evidence">
                <span>EVIDENCE / {product.evidence[0]?.source ?? 'REPOSITORY'}</span>
                <span className="case-file-record__arrow" aria-hidden="true">↗</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function relatedProducts(product: SoftwareProduct) {
  return softwareProducts.filter((entry) => product.relatedIds.includes(entry.id));
}
export function EngineeringCaseFiles() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useArchiveActivation(root, '.engineering-dossier', setActive);
  const selected = softwareProducts[active] ?? softwareProducts[0];

  return (
    <div className="archive-shell archive-shell--engineering" ref={root}>
      <aside className="archive-context archive-context--engineering" aria-label="Engineering case navigation">
        <span className="label label--signal">ENGINEERING CONTEXT</span>
        <p className="archive-context__counter">{selected.code} / {selected.status.toUpperCase()}</p>
        <h2>{selected.name}</h2>
        <p className="archive-context__statement">{selected.platform}</p>
        <DeterministicSignature seed={active + 31} label={selected.code} compact />
        <nav className="engineering-context-nav" aria-label="Engineering product dossiers">
          {softwareProducts.map((product, index) => (
            <a
              key={product.id}
              href={`#engineering-${product.slug}`}
              aria-current={active === index ? 'true' : undefined}
              onFocus={() => setActive(index)}
              onMouseEnter={() => setActive(index)}
            >
              <span>{product.code}</span>{product.shortName}
            </a>
          ))}
        </nav>
      </aside>

      <div className="engineering-dossiers">
        {softwareProducts.map((product, index) => (
          <article
            id={`engineering-${product.slug}`}
            key={product.id}
            className="engineering-dossier"
            data-archive-index={index}
            data-active={active === index ? 'true' : 'false'}
            data-visible="true"
            onMouseEnter={() => setActive(index)}
            onFocusCapture={() => setActive(index)}
          >
            <header className="engineering-dossier__head">
              <div>
                <span className="label label--signal">{product.code} / {product.family.toUpperCase()}</span>
                <h2>{product.name}</h2>
                <p>{product.statement}</p>
              </div>
              <DeterministicSignature seed={index + 31} label={product.code} compact />
            </header>

            <div className="engineering-dossier__grid">
              <section aria-labelledby={`${product.id}-implementation`}>
                <h3 id={`${product.id}-implementation`}>Implementation evidence</h3>
                <ul>{product.capabilities.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section aria-labelledby={`${product.id}-constraints`}>
                <h3 id={`${product.id}-constraints`}>Constraints &amp; declared limits</h3>
                <ul>{product.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>

            <div className="engineering-dossier__evidence">
              <div>
                <span className="label">TECHNOLOGY</span>
                <p>{product.technologies.join(' · ')}</p>
              </div>
              <div>
                <span className="label">CHECKABLE SOURCES</span>
                <ul>
                  {product.evidence.map((entry) => (
                    <li key={`${entry.source}-${entry.note}`}><code>{entry.source}</code><span>{entry.note}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="label">SYSTEM RELATIONSHIPS</span>
                <div className="engineering-dossier__relations">
                  {relatedProducts(product).map((related) => (
                    <Link key={related.id} href={`/products/${related.slug}`}>{related.name} <span aria-hidden="true">↗</span></Link>
                  ))}
                </div>
              </div>
            </div>

            <footer className="engineering-dossier__footer">
              <a href={product.repository} target="_blank" rel="noopener noreferrer">REPOSITORY <span aria-hidden="true">↗</span></a>
              <Link href={`/products/${product.slug}`}>PRODUCT DOSSIER <span aria-hidden="true">↗</span></Link>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
export function SolutionMissionRows() {
  const [active, setActive] = useState(0);
  const selected = solutions[active] ?? solutions[0];

  return (
    <section className="solution-row-system shell" aria-labelledby="solution-row-title">
      <div className="solution-row-system__head">
        <div>
          <span className="label label--signal">SOLUTION MISSIONS</span>
          <h2 id="solution-row-title">Choose by mission, not package.</h2>
        </div>
        <div className="solution-row-system__context">
          <DeterministicSignature seed={active + 61} label={selected.code} compact />
          <p>{selected.objective}</p>
          <span className="mono">{selected.core.length} CORE LAYERS / {selected.optional.length} OPTIONAL PATHS</span>
        </div>
      </div>

      <div className="solution-mission-rows">
        {solutions.map((solution, index) => (
          <Link
            key={solution.id}
            href={`/solutions/${solution.slug}`}
            className="solution-mission-row"
            data-active={active === index ? 'true' : 'false'}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
          >
            <span className="solution-mission-row__index">{solution.index}</span>
            <span className="solution-mission-row__body">
              <strong>{solution.title}</strong>
              <span>{solution.objective}</span>
            </span>
            <span className="solution-mission-row__context">
              {solution.group.toUpperCase()} / {solution.core.length} CORE
            </span>
            <span className="solution-mission-row__signal" aria-hidden="true"><i /><i /><i /></span>
            <span className="solution-mission-row__arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
