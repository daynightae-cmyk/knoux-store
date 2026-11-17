'use client';

import type { CSSProperties } from 'react';
import { buildFireFracture } from '@/lib/awakening/fire-fracture';

/**
 * Heat, released.
 *
 * The fracture itself is glass; this is what comes through it. A scorch bloom
 * at each impact, a plume that lifts out of it, and embers thrown along the
 * same seeded vents — all CSS, all `pointer-events: none`, all authored from
 * `fire-fracture.ts` so the geometry is deterministic.
 *
 * It renders in two states rather than one animation:
 *   - `flare`  the instant of the break: vents open, plumes lift, embers are
 *              thrown and die out.
 *   - `settle` after the break: the plumes keep breathing slowly behind the
 *              reveal, so the light under the final image is alive instead of
 *              frozen at the moment the glass broke.
 *
 * Under reduced motion it paints one static frame — the bloom and the plume at
 * their widest, no embers in flight — because the point of the layer is light,
 * and light can be held still.
 */

const fracture = buildFireFracture();

export type HeatMode = 'off' | 'flare' | 'settle';

export function HeatSurface({ mode, reduced = false }: { mode: HeatMode; reduced?: boolean }) {
  if (mode === 'off') return null;

  return (
    <div
      className="awakening-heat"
      data-mode={mode}
      data-reduced={reduced ? 'true' : 'false'}
      aria-hidden="true"
    >
      <div className="awakening-heat__vents">
        {fracture.vents.map((vent, index) => (
          <span
            key={`vent-${index}`}
            className="awakening-vent"
            style={
              {
                '--vx': `${vent.x}%`,
                '--vy': `${vent.y}%`,
                '--vpower': vent.power,
                '--vdelay': `${vent.delay}s`,
                '--vrise': `${vent.rise * 3.6}px`,
                '--vlife': `${vent.life}s`,
              } as CSSProperties
            }
          >
            <i className="awakening-vent__bloom" />
            <i className="awakening-vent__plume" />
          </span>
        ))}
      </div>

      {!reduced ? (
        <div className="awakening-heat__embers">
          {fracture.embers.map((ember, index) => (
            <span
              key={`ember-${index}`}
              className="awakening-ember"
              data-heat={ember.heat >= 1 ? 'white' : ember.heat >= 0.6 ? 'hot' : 'gold'}
              style={
                {
                  left: `${ember.x.toFixed(2)}%`,
                  top: `${ember.y.toFixed(2)}%`,
                  '--ex': `${ember.tx.toFixed(2)}vw`,
                  '--ey': `${ember.ty.toFixed(2)}vh`,
                  '--size': `${ember.size.toFixed(2)}px`,
                  '--edelay': `${ember.delay.toFixed(2)}s`,
                  '--eduration': `${ember.duration.toFixed(2)}s`,
                  '--eflutter': `${ember.flutter.toFixed(2)}s`,
                  '--eopacity': ember.opacity.toFixed(2),
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
