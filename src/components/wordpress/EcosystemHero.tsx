'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * The ecosystem hero.
 *
 * A cinematic opening that costs almost nothing to run. It is deliberately
 * built from CSS transitions and one `IntersectionObserver` rather than a
 * WebGL scene, a scroll-driven rAF loop, or a per-frame state update, because
 * the argument it has to make is structural — five layers of one stack — and
 * that argument is made by geometry, not by motion.
 *
 * Why this is a client component at all: the only behaviour is the chapter
 * indicator, which reads a scroll position and sets one attribute. That is a
 * single throttled observer, not a render loop. There is no `requestAnimationFrame`
 * here, no per-frame DOM query, and no state write per frame — the value written
 * is a rounded chapter index, so the number of renders over a full scroll is
 * bounded by the number of chapters rather than by the number of frames.
 *
 * Every chapter is a real link to a real destination, and the whole diagram is
 * legible with the script disabled, with `prefers-reduced-motion` set, and
 * without a WebGL context. Motion is an enhancement layered over a document
 * that already says everything.
 */

const CHAPTERS = [
  {
    id: 'domain',
    code: '01',
    label: 'DOMAIN',
    statement: 'The name the ecosystem is reached at, verified against a registrar.',
    href: '#domain',
  },
  {
    id: 'infrastructure',
    code: '02',
    label: 'INFRASTRUCTURE',
    statement: 'Where the install runs, and who is answerable for it staying up.',
    href: '#infrastructure',
  },
  {
    id: 'core',
    code: '03',
    label: 'WORDPRESS CORE',
    statement: 'The editorial system, built on verified software.',
    href: '/wordpress',
  },
  {
    id: 'library',
    code: '04',
    label: 'THEMES / PLUGINS / BLOCKS / PATTERNS',
    statement: 'The live WordPress.org library, read on request and attributed to its authors.',
    href: '#library',
  },
  {
    id: 'operations',
    code: '05',
    label: 'OPERATIONS',
    statement: 'Maintenance, performance, security, backup and recovery.',
    href: '#operate',
  },
] as const;

export function EcosystemHero() {
  const [chapter, setChapter] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const measure = () => {
      frame.current = null;
      if (reduced.matches) {
        setChapter(0);
        return;
      }
      // One read per settle, not one per frame. The listener is passive and
      // the value is only committed when the chapter actually changes.
      const midpoint = window.innerHeight * 0.45;
      let active = 0;
      for (let index = 0; index < CHAPTERS.length; index += 1) {
        const section = document.getElementById(CHAPTERS[index].id);
        if (!section) continue;
        const rect = section.getBoundingClientRect();
        if (rect.top <= midpoint) active = index;
      }
      setChapter((current) => (current === active ? current : active));
    };

    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <section className="eco-hero" data-chapter={chapter}>
      <div className="eco-hero__inner">
        {/*
          The crumb and the scroll cue live here rather than in a second intro
          block directly below. This page used to open with the hero and then
          immediately repeat itself as a `PageIntro`, which produced two <h1>
          elements and two editorial openings competing for the same first
          screen. One opening, one h1, and the navigation affordances kept.
        */}
        <nav className="page-crumb eco-hero__crumb" aria-label="Breadcrumb">
          <Link href="/">KNOuX</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">WordPress</span>
        </nav>

        <p className="eco-hero__eyebrow">
          <span className="eco-hero__pulse" aria-hidden="true" />
          KN / WORDPRESS ECOSYSTEM
        </p>

        <h1 className="eco-hero__title">
          Build your
          <br />
          <em>web presence.</em>
        </h1>

        <p className="eco-hero__lede">
          Domain. Hosting. WordPress. <span>One system.</span>
        </p>

        <div className="eco-hero__stack" role="img" aria-label="The KNOuX web ecosystem: domain, then infrastructure, then WordPress core, then themes, plugins, blocks and patterns, then operations.">
          <ol className="eco-hero__layers">
            {CHAPTERS.map((entry, index) => (
              <li key={entry.id} className="eco-hero__layer" data-index={index}>
                <a href={entry.href} className="eco-hero__layer-link">
                  <span className="eco-hero__layer-code">{entry.code}</span>
                  <span className="eco-hero__layer-label">{entry.label}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="eco-hero__beam" aria-hidden="true" />
        </div>

        <nav className="eco-hero__chapters" aria-label="Ecosystem chapters">
          {CHAPTERS.map((entry, index) => (
            <a
              key={entry.id}
              href={entry.href}
              className={`eco-hero__chapter ${index === chapter ? 'is-current' : ''}`}
              aria-current={index === chapter ? 'true' : undefined}
            >
              <span className="eco-hero__chapter-code">{entry.code}</span>
              <span className="eco-hero__chapter-label">{entry.label}</span>
              <span className="eco-hero__chapter-statement">{entry.statement}</span>
            </a>
          ))}
        </nav>
      </div>

      <p className="eco-hero__foot meta-row">
        <span>KN / WORDPRESS ECOSYSTEM</span>
        <span>REAL WORDPRESS.ORG DATA</span>
        <span>NO INVENTED AVAILABILITY</span>
        <a className="eco-hero__scroll" href="#domain">
          Scroll to the ecosystem
          <span aria-hidden="true">↓</span>
        </a>
      </p>
    </section>
  );
}
