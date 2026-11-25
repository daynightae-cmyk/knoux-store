'use client';

import Link from 'next/link';
import { useState } from 'react';
import { divisions } from '@/lib/entities';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import styles from './InstitutionalWings.module.css';

function stationPosition(index: number) {
  const angle = (index + .5) * Math.PI * 2 / divisions.length;
  return { x: 50 + 36 * Math.sin(angle), y: 50 - 36 * Math.cos(angle) };
}

export function InstitutionalWings() {
  const language = useSiteLanguage();
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const active = divisions[selected];
  const label = (text: string) => resolveRouteCopy(language, text);

  return (
    <div className={styles.layout}>
      <div className={styles.constellation} role="group" aria-label={resolveRouteCopy(language, 'Choose an institutional wing', 'اختَر جناح من أجنحة المؤسسة')}>
        <svg className={styles.orbits} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <circle cx="50" cy="50" r="36" vectorEffect="non-scaling-stroke" />
          <circle cx="50" cy="50" r="27" vectorEffect="non-scaling-stroke" />
          {divisions.map((division, index) => {
            const { x, y } = stationPosition(index);
            return <line key={division.id} data-traced={index === (hovered ?? focused ?? selected)} x1="50" y1="50" x2={x} y2={y} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <div className={styles.core} aria-hidden="true">
          <svg viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`}>
            {MARK_PATHS.map((path) => <path key={path.id} d={path.d} />)}
          </svg>
        </div>
        {divisions.map((division, index) => {
          const { x, y } = stationPosition(index);
          return (
            <button
              type="button"
              key={division.id}
              className={styles.station}
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-pressed={selected === index}
              aria-controls="institution-wing-record"
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(index); }}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setFocused(index)}
              onBlur={() => setFocused(null)}
              onClick={() => setSelected(index)}
            >
              <span aria-hidden="true">{division.index}</span>
              {label(division.label)}
            </button>
          );
        })}
      </div>
      <div className={styles.record} id="institution-wing-record">
        <div aria-live="polite" aria-atomic="true">
          <h3>{label(active.label)}</h3>
          <p>{label(active.statement)}</p>
        </div>
        <Link className="action" href={active.id === 'institution' ? '/about#about-point-of-view' : active.route}>
          {resolveRouteCopy(language, 'Explore this wing', 'استكشف الجناح')} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
}
