'use client';

import type { CSSProperties } from 'react';
import { screenFracture } from '@/lib/awakening/fracture';

export type FractureMode = 'off' | 'break' | 'drift';

/**
 * The screen, breaking.
 *
 * This is a painting layer with no pointer owner and no DOM surgery: seven
 * star impacts, seeded crack paths, shock rings, a flash and thirty-eight glass
 * shards, all driven by CSS. `break` draws the fracture; `drift` keeps the
 * shards afloat behind the final statement while the cracks fade away.
 */
export function FractureSurface({ mode }: { mode: FractureMode }) {
  if (mode === 'off') return null;
  const drifting = mode === 'drift';

  return (
    <div
      className={`awakening-fracture${drifting ? ' is-drift' : ''}`}
      data-mode={mode}
      aria-hidden="true"
    >
      <svg
        className="awakening-fracture__web"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <g className="awakening-fracture__rings">
          {screenFracture.rings.map((ring, index) => (
            <path
              key={`ring-${index}`}
              d={ring.d}
              pathLength={1}
              style={
                {
                  '--stroke': ring.width,
                  '--alpha': ring.opacity,
                  '--delay': `${ring.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </g>
        <g className="awakening-fracture__cracks">
          {screenFracture.cracks.map((line, index) => (
            <path
              key={`line-${index}`}
              d={line.d}
              pathLength={1}
              style={
                {
                  '--stroke': line.width,
                  '--alpha': line.opacity,
                  '--delay': `${line.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </g>
      </svg>

      <div className="awakening-fracture__impacts">
        {screenFracture.impacts.map((impact, index) => (
          <span
            key={`impact-${index}`}
            style={
              {
                '--ix': `${(impact.x / 10).toFixed(1)}%`,
                '--iy': `${(impact.y / 10).toFixed(1)}%`,
                '--idelay': `${impact.delay}s`,
                '--ipower': impact.power,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="awakening-fracture__shards">
        {screenFracture.shards.map((shard, index) => (
          <span
            key={`shard-${index}`}
            className="awakening-shard"
            style={
              {
                left: `${shard.x}%`,
                top: `${shard.y}%`,
                '--tx': `${shard.tx}vw`,
                '--ty': `${shard.ty}vh`,
                '--rot': `${shard.rotate}deg`,
                '--sdelay': `${shard.delay}s`,
                '--sopacity': shard.opacity,
              } as CSSProperties
            }
          >
            <span
              className="awakening-shard__face"
              data-variant={shard.variant}
              style={{
                width: `${shard.size}px`,
                height: `${(shard.size * 0.72).toFixed(1)}px`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
