'use client';

/**
 * BuildAtmosphere — the Build shell's name for the shared cosmic sky.
 *
 * The renderer itself lives in `@/components/cosmic/CosmicSky` so Build and
 * WordPress mount the exact same universe: real-clock day/night phases, event
 * pulses, storms and the activation lifecycle. This wrapper keeps the historic
 * component name and the `dev-cosmic-field` class that the shell CSS and the
 * atmosphere e2e contracts measure.
 */
import { CosmicSky } from '@/components/cosmic/CosmicSky';

export function BuildAtmosphere({ reduced }: Readonly<{ reduced: boolean }>) {
  return <CosmicSky reduced={reduced} className="dev-cosmic-field" />;
}
