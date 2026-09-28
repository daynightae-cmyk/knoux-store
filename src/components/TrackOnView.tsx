'use client';

import { useEffect } from 'react';
import { track, type AnalyticsEvent } from '@/lib/analytics';

/**
 * Fires a single analytics event when a page becomes visible.
 *
 * Server components cannot reach the analytics surface directly, so routes
 * mount this instead. It renders nothing.
 */
export function TrackOnView({ event }: { event: AnalyticsEvent }) {
  useEffect(() => {
    track(event);
    // Intentionally fires once per mount for the given event.
  }, [event]);
  return null;
}
