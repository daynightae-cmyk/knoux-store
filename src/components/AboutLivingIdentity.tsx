'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';

const LivingParticleMark = dynamic(
  () => import('@/components/three/LivingParticleMark').then((module) => module.LivingParticleMark),
  { ssr: false },
);

/** The canonical mark remains a static SVG until this part of About is in view. */
export function AboutLivingIdentity() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '180px' },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} className="about-identity" aria-hidden="true">
      <div className="about-identity__datum"><span>KN / INSTITUTION</span><span>IDENTITY FIELD — 001</span></div>
      <div className="about-identity__axis" />
      <div className="about-identity__mark">
        {visible ? <LivingParticleMark /> : (
          <svg viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} focusable="false">
            {MARK_PATHS.map((path) => <path key={path.id} d={path.d} />)}
          </svg>
        )}
      </div>
      <div className="about-identity__base"><span>ONE MARK</span><span>EIGHT DISCIPLINES</span></div>
    </div>
  );
}
