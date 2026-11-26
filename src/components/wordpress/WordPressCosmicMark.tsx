'use client';

/**
 * The canonical KNOuX particle mark, painted from `MARK_PATHS` — never a
 * raster. Same geometry language as the Build welcome sphere: gradient body,
 * particle grain, luminous rim and the four-point star at the junction.
 * Shared by the WordPress arrival gateway so both divisions carry one mark.
 */
import { useId } from 'react';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';

export function WordPressCosmicMark({ className, label = 'KNOuX particle mark', tone = 'violet' }: Readonly<{ className?: string; label?: string; tone?: 'violet' | 'starlight' }>) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const bodyId = `wp-mark-body-${uid}`;
  const dotId = `wp-mark-dot-${uid}`;
  const rimId = `wp-mark-rim-${uid}`;
  const coreId = `wp-mark-core-${uid}`;
  const grainId = `wp-mark-grain-${uid}`;
  const clipId = `wp-mark-clip-${uid}`;
  const glowId = `wp-mark-glow-${uid}`;
  const star = tone === 'starlight';
  return (
    <svg className={className} viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={!label || undefined}>
      <defs>
        <linearGradient id={bodyId} x1="0.08" y1="0" x2="0.9" y2="1">
          {star ? (
            <>
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.1" stopColor="#f8f1ff" />
              <stop offset="0.28" stopColor="#e9d5ff" />
              <stop offset="0.48" stopColor="#d2b0f5" />
              <stop offset="0.68" stopColor="#b98ae8" />
              <stop offset="0.84" stopColor="#9968d2" />
              <stop offset="1" stopColor="#7448ab" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#f7efff" />
              <stop offset="0.08" stopColor="#d8b4fe" />
              <stop offset="0.22" stopColor="#a855f7" />
              <stop offset="0.4" stopColor="#7c3aed" />
              <stop offset="0.6" stopColor="#5b21b6" />
              <stop offset="0.8" stopColor="#3b0764" />
              <stop offset="1" stopColor="#1e0b3a" />
            </>
          )}
        </linearGradient>
        <radialGradient id={dotId} cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor={star ? '#f8f2ff' : '#f3e8ff'} />
          <stop offset="0.58" stopColor={star ? '#e9d5ff' : '#c084fc'} />
          <stop offset="0.82" stopColor={star ? '#c084fc' : '#7c3aed'} />
          <stop offset="1" stopColor={star ? '#8b5cf6' : '#4c1d95'} />
        </radialGradient>
        <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.38" stopColor="#f1e2ff" />
          <stop offset="0.7" stopColor="#c99bff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <radialGradient id={coreId}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.18" stopColor="#fbf5ff" stopOpacity="0.98" />
          <stop offset="0.44" stopColor="#e9d5ff" stopOpacity="0.72" />
          <stop offset="0.72" stopColor="#c084fc" stopOpacity="0.28" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <pattern id={grainId} width="71" height="57" patternUnits="userSpaceOnUse" patternTransform="rotate(11)">
          <circle cx="4" cy="6" r="2.2" fill="#ffffff" opacity="0.95" />
          <circle cx="13" cy="12" r="1.2" fill="#f5e8ff" opacity="0.8" />
          <circle cx="22" cy="3" r="1.8" fill="#ffffff" opacity="0.75" />
          <circle cx="31" cy="18" r="2.8" fill="#ffffff" opacity="0.98" />
          <circle cx="42" cy="8" r="1.1" fill="#e9d5ff" opacity="0.7" />
          <circle cx="53" cy="15" r="1.7" fill="#ffffff" opacity="0.85" />
          <circle cx="64" cy="4" r="1.3" fill="#ffffff" opacity="0.65" />
          <circle cx="7" cy="22" r="1.4" fill="#ffffff" opacity="0.7" />
          <circle cx="17" cy="31" r="2.3" fill="#ffffff" opacity="0.92" />
          <circle cx="28" cy="40" r="1.2" fill="#f5e8ff" opacity="0.7" />
          <circle cx="38" cy="27" r="1.6" fill="#ffffff" opacity="0.8" />
          <circle cx="48" cy="34" r="2.6" fill="#ffffff" opacity="0.95" />
          <circle cx="59" cy="24" r="1.1" fill="#e9d5ff" opacity="0.6" />
          <circle cx="67" cy="41" r="1.9" fill="#ffffff" opacity="0.85" />
          <circle cx="3" cy="44" r="1.8" fill="#ffffff" opacity="0.8" />
          <circle cx="11" cy="52" r="1.1" fill="#f5e8ff" opacity="0.65" />
          <circle cx="24" cy="50" r="1.5" fill="#ffffff" opacity="0.75" />
          <circle cx="34" cy="55" r="2.1" fill="#ffffff" opacity="0.9" />
          <circle cx="46" cy="47" r="1.3" fill="#ffffff" opacity="0.65" />
          <circle cx="56" cy="52" r="1.6" fill="#ffffff" opacity="0.8" />
          <circle cx="63" cy="48" r="1" fill="#e9d5ff" opacity="0.55" />
        </pattern>
        <clipPath id={clipId}>
          {MARK_PATHS.map(({ id, d }) => <path key={id} d={d} />)}
        </clipPath>
        <filter id={glowId} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      <circle cx="256" cy="264" r="78" fill={`url(#${coreId})`} opacity="0.5" />
      <g filter={`url(#${glowId})`} opacity="0.52">
        {MARK_PATHS.map(({ id, d }) => <path key={id} d={d} fill="#a855f7" />)}
      </g>
      <g>
        {MARK_PATHS.map(({ id, d }) => (
          <path key={id} d={d} fill={`url(#${id === 'dot' ? dotId : bodyId})`} stroke="#3b0764" strokeOpacity="0.72" strokeWidth="3" strokeLinejoin="round" />
        ))}
      </g>
      <g clipPath={`url(#${clipId})`}>
        <rect width={MARK_VIEW_BOX.width} height={MARK_VIEW_BOX.height} fill={`url(#${grainId})`} opacity="0.96" />
        <ellipse cx="118" cy="190" rx="150" ry="88" fill="#ffffff" opacity="0.06" transform="rotate(-34 118 190)" />
      </g>
      <g fill="none" strokeLinejoin="round">
        {MARK_PATHS.map(({ id, d }) => (
          <path key={id} d={d} stroke={`url(#${rimId})`} strokeWidth="2.1" strokeOpacity="0.9" />
        ))}
        {MARK_PATHS.map(({ id, d }) => (
          <path key={`${id}-hair`} d={d} stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.55" />
        ))}
      </g>
      <g>
        <circle cx="212" cy="300" r="58" fill={`url(#${coreId})`} />
        <path d="M212 172v256M84 300h256" stroke="#e9d5ff" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M212 232v136M144 300h136" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.92" />
        <circle cx="212" cy="300" r="5" fill="#ffffff" />
        <circle cx="212" cy="300" r="2" fill="#ffffff" />
      </g>
    </svg>
  );
}
