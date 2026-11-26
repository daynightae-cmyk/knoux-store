'use client';

/**
 * The WordPress division's window onto the shared cosmic sky.
 *
 * `CosmicSky` is the same renderer Build mounts, so the two divisions read as
 * one universe. It is fixed to the viewport (the WordPress pages scroll as a
 * document, unlike the Build stage), wrapped in a pointer-events-none layer
 * that also carries the painted nebula banks and the planet limb — the same
 * code-only vocabulary the Build shell uses.
 */
import { CosmicSky } from '@/components/cosmic/CosmicSky';

export function WordPressCosmos() {
  return (
    <div className="wp-cosmos__field" aria-hidden="true">
      <div className="wp-cosmos__banks" />
      <CosmicSky className="wp-cosmos__canvas" />
      <div className="wp-cosmos__limb" />
    </div>
  );
}
