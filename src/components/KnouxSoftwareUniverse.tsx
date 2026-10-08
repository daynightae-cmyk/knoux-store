'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { softwareUniverseProductById, softwareUniverseProducts } from '@/data/software-universe';
import '../../public/knoux-universe/knoux-software-universe.css';

export function KnouxSoftwareUniverse() {
  const rootRef = useRef<HTMLElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onSelect = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id) return;
      const product = softwareUniverseProductById(detail.id);
      if (product) router.push(product.route);
    };

    root.addEventListener('knoux:product-select', onSelect);
    let cancelled = false;
    let destroy: ((target: HTMLElement) => void) | undefined;

    void import('@/lib/knouxSoftwareUniverseRuntime').then((runtime) => {
      if (cancelled || !rootRef.current) return;
      destroy = runtime.destroyUniverse;
      void runtime.initUniverse(rootRef.current);
    });

    return () => {
      cancelled = true;
      root.removeEventListener('knoux:product-select', onSelect);
      destroy?.(root);
    };
  }, [router]);

  return (
    <section className="ksu ksu--static" id="knoux-software-universe" data-ksu data-task03-universe ref={rootRef}>
      <div className="ksu-stage" tabIndex={0} aria-label="Interactive KNOuX software universe">
        <canvas className="ksu-canvas" aria-hidden="true" />
        <div className="ksu-progress" aria-hidden="true" />

        <div className="ksu-dots" aria-hidden="true">
          <span className="ksu-dot is-active" />
          <span className="ksu-dot" />
          <span className="ksu-dot" />
          <span className="ksu-dot" />
          <span className="ksu-dot" />
        </div>

        <div className="ksu-loader" role="status" aria-live="polite">
          <div className="ksu-loader-logo">KNOuX</div>
          <div className="ksu-loader-track"><span className="ksu-loader-fill" /></div>
          <div className="ksu-loader-pct">0%</div>
        </div>

        <div className="ksu-static-head">
          <span className="ksu-num">KNOuX / SOFTWARE UNIVERSE</span>
          <h2 className="ksu-title">Ten identities. One system.</h2>
          <p className="ksu-body">Explore ten connected tools for creating, organizing and operating your digital world.</p>
        </div>

        <article className="ksu-info" aria-live="polite">
          <span className="ksu-info-badge">01 / 10</span>
          <strong className="ksu-info-name">KNOUX ONE</strong>
          <span className="ksu-info-slogan">One Core. Total Command.</span>
          <span className="ksu-info-role">Unified command layer for the KNOuX software stack.</span>
          <button className="ksu-info-link" type="button">Open record</button>
        </article>

        <ol className="ksu-rail" aria-label="KNOuX software universe products">{softwareUniverseProducts.map((product) => <li key={product.id}><a href={product.route}><Image src={product.image} alt={product.name} width={112} height={112} /><span>{product.name}</span></a></li>)}</ol>
      </div>

      <div className="ksu-content">
        <section className="ksu-sec ksu-s1">
          <div className="ksu-eyebrow">KNOuX / SOFTWARE UNIVERSE</div>
          <h2 className="ksu-h-title" data-ksu-split>Built as one.<br />Shipped as ten.</h2>
          <p className="ksu-h-sub">Explore the KNOuX constellation. Each identity opens a dedicated product record.</p>
          <button className="ksu-cta" type="button" data-ksu-jump="1"><span>Enter universe</span><span aria-hidden="true">↘</span></button>
          <div className="ksu-scroll" aria-hidden="true"><span>Scroll</span><span className="ksu-s-line" /></div>
        </section>

        <section className="ksu-sec ksu-s2">
          <div className="ksu-panel">
            <span className="ksu-num">01 / CONTROL</span>
            <h2 className="ksu-title">One core.<br />Every surface.</h2>
            <p className="ksu-body">Command, engineering, repair and organization form the operational side of the KNOuX software family.</p>
          </div>
        </section>

        <section className="ksu-sec ksu-s3">
          <div className="ksu-panel">
            <span className="ksu-num">02 / CREATE</span>
            <h2 className="ksu-title">Capture.<br />Build. Publish.</h2>
            <p className="ksu-body">Recording, playback, clipboard intelligence and writing share one restrained visual language without changing their evidence status.</p>
          </div>
        </section>

        <section className="ksu-sec ksu-s4">
          <div className="ksu-panel">
            <span className="ksu-num">03 / INDEX</span>
            <h2 className="ksu-title">Navigate by intent.</h2>
            <p className="ksu-body">The ten visual identities resolve to real destinations: seven product dossiers, Signal, and two explicitly labelled Labs records.</p>
            <div className="ksu-cats" role="navigation" aria-label="Software universe clusters">
              <button className="ksu-cat" type="button" data-ksu-product="0"><span className="ksu-cat-n">01</span><span className="ksu-cat-t">CONTROL</span></button>
              <button className="ksu-cat" type="button" data-ksu-product="3"><span className="ksu-cat-n">02</span><span className="ksu-cat-t">ORGANIZE</span></button>
              <button className="ksu-cat" type="button" data-ksu-product="4"><span className="ksu-cat-n">03</span><span className="ksu-cat-t">CREATE</span></button>
              <button className="ksu-cat" type="button" data-ksu-product="9"><span className="ksu-cat-n">04</span><span className="ksu-cat-t">RESEARCH</span></button>
            </div>
          </div>
        </section>

        <section className="ksu-sec ksu-s5">
          <span className="ksu-num">KNOuX / 10 IDENTITIES</span>
          <h2 className="ksu-close-title">Pick the tool.<br />Keep the system.</h2>
          <p className="ksu-close-sub">KNOuX software universe / recovered 2026</p>
          <button className="ksu-cta ksu-mag" type="button" data-ksu-product="0"><span>Return to KNOUX ONE</span></button>
          <div className="ksu-micro"><span>Sadek Elgazar</span><span>Software universe / 2026</span></div>
        </section>
      </div>
    </section>
  );
}
