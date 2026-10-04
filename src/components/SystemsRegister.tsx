'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { softwareProducts, softwareAuditDate, type SoftwareProduct } from '@/data/software';
import { track } from '@/lib/analytics';
import { qualityEvent, type QualityTier } from '@/components/QualityControl';
import { SYSTEMS_DUST, drawSystemsField, motifFor, relatedNodes, type FieldFrame } from '@/lib/systemsField';

/**
 * The KNOuX Systems Register.
 *
 * An engineering instrument and editorial systems archive. The composition
 * answers the accepted Hero directly — a particle field in deep black,
 * architecture in hairlines, one violet signal, large editorial type and
 * technical monospace metadata — and it inherits the same section rhythm, so
 * scrolling out of the arrival sequence reads as one continuous descent into the
 * institution rather than as a change of website.
 *
 * Architecture: a contextual identity panel (left, anchored) holds the active
 * system's field, metadata and links while a vertically-scrolling sequence of
 * records (right) drives system selection as records cross the reading line.
 * Hover and focus can preview without fighting scroll. Keyboard reaches
 * everything. Reduced-motion collapses the canvas to a single static frame.
 * The canvas is aria-hidden; every fact it appears to express is also in the DOM.
 *
 * Ported from the Stellar Seal donor (de6072446d3ee9034b3d7143b35c61c81004b1f8).
 * Data authority is origin/main (ae7c0d3). Donor data superseded where main
 * has newer canonical facts.
 */

type Tier = Exclude<QualityTier, 'auto'>;

const MAX_DPR = 2;
/** Where a record activates as it crosses the reading line. */
const READING_LINE = '-46% 0px -46% 0px';
const PANEL_ID = 'systems-register-panel';

function readTier(): Tier {
  const saved = localStorage.getItem('knoux-quality');
  if (saved === 'high' || saved === 'balanced' || saved === 'low') return saved;
  const cores = navigator.hardwareConcurrency || 8;
  return cores <= 4 ? 'low' : cores >= 12 ? 'high' : 'balanced';
}

export function SystemsRegister() {
  const [activeId, setActiveId] = useState<string>(softwareProducts[0].id);
  const [engagedId, setEngagedId] = useState<string | null>(null);
  const [announced, setAnnounced] = useState<string>('');

  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordRefs = useRef(new Map<string, HTMLElement>());

  const byId = useMemo(() => new Map(softwareProducts.map((product) => [product.id, product])), []);
  const active = byId.get(activeId) ?? softwareProducts[0];
  // Hover and focus only ever preview, and only from an explicit control, so a
  // preview can never yank the register out from under a reader who is scrolling.
  const engaged = engagedId && engagedId !== activeId ? engagedId : null;
  const shown = byId.get(engaged ?? activeId) ?? active;

  const subjectRef = useRef<SoftwareProduct>(shown);
  const previousRef = useRef<SoftwareProduct | null>(null);
  const transitionRef = useRef(0);

  const remember = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) recordRefs.current.set(id, element);
      else recordRefs.current.delete(id);
    },
    [],
  );

  const select = useCallback(
    (id: string, method: 'pointer' | 'keyboard' | 'scroll') => {
      setActiveId(id);
      if (method === 'scroll') return;
      const product = byId.get(id);
      if (product) track({ type: 'product_node_focused', id: product.id, method });
      setAnnounced(`${product?.name ?? ''} is now the active system.`);
    },
    [byId],
  );

  /* Progressive activation: the record crossing the reading line becomes the
     active one. No scroll hijacking, no snapping — a deliberate selection is the
     same state written by a different input. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.system;
          if (id) select(id, 'scroll');
        }
      },
      { rootMargin: READING_LINE, threshold: 0 },
    );
    for (const element of recordRefs.current.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [select]);

  /* A change of subject is a crossfade, so the field keeps its place and the
     switch reads as one field changing subject rather than as a repaint. Held in
     a ref, so a selection never has to wait on a React render to reach the
     canvas, and never rebuilds it. */
  useEffect(() => {
    if (subjectRef.current.id === shown.id) return;
    previousRef.current = subjectRef.current;
    subjectRef.current = shown;
    transitionRef.current = 1;
  }, [shown]);

  /* The field. Built once. Every later input arrives through a ref. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');

    let width = 0;
    let height = 0;
    let ratio = 1;
    let tier = readTier();
    let frame = 0;
    let running = false;
    let onScreen = false;
    let reveal = 0;
    let seconds = 0;
    let previousTime = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerTargetX = 0;
    let pointerTargetY = 0;

    const measure = () => {
      ratio = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      width = canvas.clientWidth || 1;
      height = canvas.clientHeight || 1;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const paint = () => {
      const frame2: FieldFrame = {
        seconds,
        active: subjectRef.current,
        previous: previousRef.current,
        fade: transitionRef.current,
        reveal,
        pointerX,
        pointerY,
        width,
        height,
      };
      drawSystemsField(context, frame2, motion.matches ? SYSTEMS_DUST.reduced : SYSTEMS_DUST[tier]);
    };

    const tick = (time: number) => {
      const step = previousTime === 0 ? 1 / 60 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      seconds += step;
      reveal += (1 - reveal) * Math.min(1, step * 1.6);
      transitionRef.current += (0 - transitionRef.current) * Math.min(1, step * 4.2);
      if (previousRef.current && transitionRef.current < 0.02) previousRef.current = null;
      if (fine.matches) {
        pointerX += (pointerTargetX - pointerX) * Math.min(1, step * 3.6);
        pointerY += (pointerTargetY - pointerY) * Math.min(1, step * 3.6);
      }
      paint();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || motion.matches || !onScreen) return;
      running = true;
      previousTime = 0;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };

    const still = () => {
      stop();
      reveal = 1;
      transitionRef.current = 0;
      previousRef.current = null;
      paint();
    };

    const onMotion = () => {
      if (motion.matches) still();
      else start();
    };

    const onLayout = () => {
      measure();
      if (motion.matches) still();
    };

    const onQuality = (event: Event) => {
      const detail = (event as CustomEvent<QualityTier>).detail;
      if (detail && detail !== 'auto') tier = detail;
      if (motion.matches) still();
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (onScreen) start();
    };

    const onPointer = (event: PointerEvent) => {
      if (!fine.matches) return;
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      pointerTargetX = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width - 0.5) * 2));
      pointerTargetY = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height - 0.5) * 2));
    };

    const onPointerLeave = () => {
      pointerTargetX = 0;
      pointerTargetY = 0;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false;
        if (onScreen && !document.hidden) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    observer.observe(surface);

    motion.addEventListener('change', onMotion);
    window.addEventListener('resize', onLayout);
    window.addEventListener(qualityEvent, onQuality);
    document.addEventListener('visibilitychange', onVisibility);
    surface.addEventListener('pointermove', onPointer, { passive: true });
    surface.addEventListener('pointerleave', onPointerLeave);

    measure();
    still();
    start();

    return () => {
      stop();
      observer.disconnect();
      motion.removeEventListener('change', onMotion);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener(qualityEvent, onQuality);
      document.removeEventListener('visibilitychange', onVisibility);
      surface.removeEventListener('pointermove', onPointer);
      surface.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  const related = useMemo(() => relatedNodes(shown), [shown]);
  const profile = useMemo(() => motifFor(shown), [shown]);
  const totalEvidence = useMemo(
    () => softwareProducts.reduce((total, product) => total + product.evidence.length, 0),
    [],
  );

  return (
    <div className="sr" data-spatial ref={surfaceRef}>
      {/* Accessibility live region — no visual footprint */}
      <p className="sr__announce" role="status" aria-live="polite" aria-atomic="true">
        {announced}
      </p>

      {/* Section rail */}
      <div className="sr__rail" aria-hidden="true">
        <span className="mono">KN / SYSTEMS REGISTER</span>
        <span className="mono">
          {String(softwareProducts.length).padStart(2, '0')} CANONICAL /{' '}
          AUDITED {softwareAuditDate}
        </span>
      </div>

      {/* ── Narrow-layout selector: choose rather than scroll ─────────────── */}
      <div className="sr__selector" role="group" aria-label="Choose a verified system">
        {softwareProducts.map((product) => (
          <button
            key={product.id}
            type="button"
            className={product.id === active.id ? 'is-current' : ''}
            aria-pressed={product.id === active.id}
            onClick={() => select(product.id, 'pointer')}
            onPointerEnter={() => setEngagedId(product.id)}
            onPointerLeave={() =>
              setEngagedId((current: string | null) => (current === product.id ? null : current))
            }
            onFocus={() => setEngagedId(product.id)}
            onBlur={() =>
              setEngagedId((current: string | null) => (current === product.id ? null : current))
            }
          >
            <span className="mono">{product.code}</span>
            <span>{product.shortName}</span>
          </button>
        ))}
      </div>

      <div className="sr__body">
        {/* ── Left: contextual identity panel ────────────────────────────────── */}
        <aside className="sr__panel" id={PANEL_ID} aria-label="Active system context">
          {/* The visual field — aria-hidden; every fact is also in the DOM */}
          <div className="sr__field" aria-hidden="true">
            <canvas className="sr__canvas" ref={canvasRef} aria-hidden="true" />
            {/* Corner architecture marks */}
            <span className="sr__corner sr__corner--tl" aria-hidden="true" />
            <span className="sr__corner sr__corner--tr" aria-hidden="true" />
            <span className="sr__corner sr__corner--bl" aria-hidden="true" />
            <span className="sr__corner sr__corner--br" aria-hidden="true" />
            {/* Monospace readout strip */}
            <span className="sr__readout" aria-hidden="true">
              <span className="mono">{shown.code}</span>
              <span className="mono">{profile}</span>
            </span>
          </div>

          {/* Identity copy — the accessible layer */}
          <div className="sr__identity">
            <span className="label label--signal">
              ACTIVE SYSTEM / {shown.index} OF {String(softwareProducts.length).padStart(2, '0')}
            </span>
            <h3 className="sr__name">{shown.name}</h3>
            <p className="sr__tagline">{shown.tagline}</p>

            <dl className="sr__meta">
              <div>
                <dt>Family</dt>
                <dd>{shown.family}</dd>
              </div>
              <div>
                <dt>Discipline</dt>
                <dd>{shown.discipline}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`mark mark--${shown.status}`}>{shown.status.replace('-', ' ')}</span>
                </dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>
                  {String(shown.evidence.length).padStart(2, '0')} artefacts /{' '}
                  {String(totalEvidence).padStart(2, '0')} across the register
                </dd>
              </div>
            </dl>

            {related.length > 0 && (
              <div className="sr__relations">
                <span className="label">CONNECTED IN THE REGISTRY</span>
                <ul>
                  {related.map((node) => (
                    <li key={node.product.id}>
                      <span className="mono">{node.product.code}</span>
                      <span>{node.product.shortName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link href={`/products/${shown.slug}`} className="action sr__action">
              Open dossier
              <span className="action-arrow" aria-hidden="true">↗</span>
            </Link>
          </div>
        </aside>

        {/* ── Right: scrolling records ─────────────────────────────────────── */}
        <ol className="sr__records">
          {softwareProducts.map((product) => {
            const isActive = product.id === active.id;
            return (
              <li
                key={product.id}
                ref={remember(product.id)}
                data-system={product.id}
                data-active={isActive ? '' : undefined}
                className="sr__record"
              >
                <article aria-labelledby={`${product.id}-title`}>
                  {/* Record head — code / name / activate control */}
                  <div className="sr__record-head">
                    <span className="sr__record-code mono">{product.code}</span>
                    <h4 className="sr__record-title" id={`${product.id}-title`}>
                      {product.name}
                    </h4>
                    <button
                      type="button"
                      className="sr__record-activate"
                      aria-pressed={isActive}
                      aria-controls={PANEL_ID}
                      onClick={() => select(product.id, 'pointer')}
                      onPointerEnter={() => setEngagedId(product.id)}
                      onPointerLeave={() =>
                        setEngagedId((current: string | null) => (current === product.id ? null : current))
                      }
                      onFocus={() => setEngagedId(product.id)}
                      onBlur={() =>
                        setEngagedId((current: string | null) => (current === product.id ? null : current))
                      }
                    >
                      <span className="mono">{isActive ? 'IN FIELD' : 'SHOW'}</span>
                    </button>
                  </div>

                  <p className="sr__record-tagline">{product.tagline}</p>
                  <p className="sr__record-statement">{product.statement}</p>

                  {/* Two-column capability / limitation summary */}
                  <div className="sr__record-cols">
                    <div>
                      <span className="label">STATED CAPABILITIES</span>
                      <ul className="sr__caps">
                        {product.capabilities.slice(0, 3).map((cap, i) => (
                          <li key={cap}>
                            <span className="mono">{`C${String(i + 1).padStart(2, '0')}`}</span>
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="label">
                        STATED LIMITATIONS / {String(product.limitations.length).padStart(2, '0')}
                      </span>
                      <ul className="sr__limits">
                        {product.limitations.slice(0, 2).map((limit) => (
                          <li key={limit}>{limit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Record foot — registry metadata + actions */}
                  <div className="sr__record-foot">
                    <dl className="sr__record-registry">
                      <div>
                        <dt>Family</dt>
                        <dd>{product.family}</dd>
                      </div>
                      <div>
                        <dt>Platform</dt>
                        <dd>{product.platform}</dd>
                      </div>
                      <div>
                        <dt>Stack</dt>
                        <dd>{product.technologies.join(' / ')}</dd>
                      </div>
                      <div>
                        <dt>Evidence</dt>
                        <dd>
                          {String(product.evidence.length).padStart(2, '0')} artefacts /{' '}
                          {product.evidence.length > 0 ? product.evidence[0].source : 'none published'}
                        </dd>
                      </div>
                    </dl>
                    <div className="sr__record-actions">
                      <Link
                        href={`/products/${product.slug}`}
                        className="action"
                        onClick={() =>
                          track({ type: 'product_opened', id: product.id, slug: product.slug })
                        }
                      >
                        Open dossier
                        <span className="action-arrow" aria-hidden="true">↗</span>
                      </Link>
                      <a
                        className="sr__record-link"
                        href={product.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Repository ↗
                      </a>
                      {product.liveUrl ? (
                        <a
                          className="sr__record-link"
                          href={product.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Declared preview ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>

    </div>
  );
}
