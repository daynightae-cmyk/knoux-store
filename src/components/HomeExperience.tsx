'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { softwareProducts } from '@/data/software';
import { QualityControl } from '@/components/QualityControl';
import { RevealGroup } from '@/components/blocks';
import { ArchitecturalMap, MissionPath } from '@/components/SpatialExperiences';
import { HomeSoftwareField } from '@/components/HomeSoftwareField';

const LivingParticleMark = dynamic(
  () => import('@/components/three/LivingParticleMark').then((m) => m.LivingParticleMark),
  { ssr: false, loading: () => <div className="mark-stage" aria-hidden="true" /> },
);

/**
 * Headquarters.
 *
 * The arrival sequence and the Living Particle Mark are the protected identity
 * of this site and are not modified. Everything below the fold extends the same
 * design language: indexed rows, 1px lines, monospace metadata, violet used
 * only as a signal.
 */
export function HomeExperience() {
  const [progress, setProgress] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setProgress(Math.max(0, Math.min(1, (window.scrollY - window.innerHeight * 0.08) / (window.innerHeight * 0.9))));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main id="main-content" tabIndex={-1}>
      {/* Protected arrival sequence */}
      <section className="arrival-rail" aria-label="KNOuX introduction">
        <div className="arrival-sticky">
          <div className="arrival-meta">
            <span>KN / HQ — 001</span>
            <span>DIGITAL HEADQUARTERS</span>
            <span className="meta-desktop">SCROLL TO EXPLORE ↓</span>
          </div>
          <div className="arrival-visual">
            <div className="starfield" aria-hidden="true" />
            <LivingParticleMark progress={progress} onSettled={() => setSettled(true)} />
          </div>
          <div className={`arrival-copy ${progress > 0.45 ? 'is-shifting' : ''} ${settled ? 'is-revealed' : ''}`}>
            <p className="eyebrow">
              <span className="pulse-dot" /> ENGINEERING DIGITAL SYSTEMS
            </p>
            <h1>
              KNOuX<span className="period">.</span>
            </h1>
            <p className="arrival-description">
              Eight divisions. One institution.
              <br />
              Software, systems and the work around them.
            </p>
            <div className="arrival-actions">
              <Link href="/products" className="button-primary">
                EXPLORE THE UNIVERSE <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/build" className="button-text">
                TELL US WHAT YOU NEED <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <div className="arrival-bottom">
            <span>INDEPENDENT DIGITAL ENGINEERING</span>
            <QualityControl />
            <span className="arrival-coordinates">01 / 04 — HEADQUARTERS</span>
          </div>
        </div>
      </section>

      {/* 01 — Divisions */}
      <section className="home-divisions shell" aria-labelledby="divisions-heading">
        <div className="block-index__head">
          <div>
            <p className="eyebrow">01 / THE INSTITUTION</p>
            <h2 id="divisions-heading">
              One practice,
              <br />
              <em>eight wings.</em>
            </h2>
          </div>
          <p className="block-index__statement">
            KNOuX is a headquarters rather than a shop. Every division is a different discipline sharing one data
            model, one motion grammar, one search and one request architecture.
          </p>
        </div>
        <ArchitecturalMap />
      </section>

      {/* 02 — Software */}
      <RevealGroup>
        <section className="featured-section shell" aria-labelledby="software-heading">
          <div className="block-index__head">
            <div>
              <p className="eyebrow">02 / SOFTWARE UNIVERSE</p>
              <h2 id="software-heading">
                Built to have
                <br />
                <em>a purpose.</em>
              </h2>
            </div>
            <p className="block-index__statement">
              {String(softwareProducts.length).padStart(2, '0')} audited systems. Each record below opens a real
              product dossier with its published capabilities, limits and repository evidence.
            </p>
          </div>
          <HomeSoftwareField />
          <div className="universe-foot">
            <span>{String(softwareProducts.length).padStart(2, '0')} VERIFIED SYSTEMS / ONE ENGINEERING PRACTICE</span>
            <Link href="/products">OPEN THE UNIVERSE ↗</Link>
          </div>
        </section>
      </RevealGroup>

      {/* 03 — Solutions */}
      <RevealGroup>
        <section className="home-solutions section-shell" aria-labelledby="solutions-heading">
          <div className="block-index__head">
            <div>
              <p className="eyebrow">03 / SOLUTIONS</p>
              <h2 id="solutions-heading">
                Start from
                <br />
                <em>the need.</em>
              </h2>
            </div>
            <p className="block-index__statement">
              You should not have to know which department serves you. Every solution below is assembled from the
              same registries the divisions publish.
            </p>
          </div>
          <MissionPath />
        </section>
      </RevealGroup>

      {/* 04 — Composer */}
      <RevealGroup>
        <section className="manifesto-section section-shell">
          <p className="eyebrow">04 / COMPOSER</p>
          <div>
            <h2>
              Describe it once.
              <br />
              <em>Assemble the stack.</em>
            </h2>
            <p>
              The KNOuX Composer reads a plain description of your situation and resolves it against the software,
              WordPress, web, growth and creative registries. It returns a stack you can adjust, and it never
              fabricates a product, a price, a date or a result.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/build" className="button-primary">
                OPEN THE COMPOSER <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/solutions" className="text-link">
                BROWSE SOLUTIONS <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <span className="manifesto-glyph" aria-hidden="true">
            ⌘
          </span>
        </section>
      </RevealGroup>

      {/* 05 — Institution */}
      <RevealGroup>
        <section className="three-column section-shell">
          <Link href="/labs">
            <span className="eyebrow">05 / LABS</span>
            <h3>
              What is still
              <br />
              unfinished.
            </h3>
            <span className="column-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <Link href="/work">
            <span className="eyebrow">06 / WORK</span>
            <h3>
              Evidence
              <br />
              before claims.
            </h3>
            <span className="column-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <Link href="/about">
            <span className="eyebrow">07 / INSTITUTION</span>
            <h3>
              A practice built
              <br />
              with intention.
            </h3>
            <span className="column-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        </section>
      </RevealGroup>
    </main>
  );
}
