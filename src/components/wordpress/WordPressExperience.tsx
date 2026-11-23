'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { WordPressWelcome } from './WordPressWelcome';
import { WordPressStudio } from './WordPressStudio';

type StudioJourney = 'arrival' | 'domain' | 'theme' | 'identity' | 'plugins' | 'canvas' | 'composer' | 'hosting' | 'build' | 'operations';

const HASH_JOURNEYS: Record<string, StudioJourney> = {
  '#studio': 'arrival',
  '#system': 'arrival',
  '#domain': 'domain',
  '#library': 'theme',
  '#infrastructure': 'hosting',
  '#operate': 'operations',
  '#launch': 'composer',
};

function journeyFromHash(hash: string): StudioJourney | null {
  return HASH_JOURNEYS[hash.toLowerCase()] ?? null;
}

/**
 * The canonical WordPress application shell.
 *
 * Arrival and Studio are two states of one full-viewport card, not two page
 * sections. Both stay mounted after the first entry so theme/plugin choices,
 * form drafts and canvas state survive Back/Close. The hash keeps the existing
 * direct links useful and gives the browser's own Back/Forward the same state.
 */
export function WordPressExperience({
  themes,
  plugins,
  directoryOnline,
}: Readonly<{
  themes: Readonly<ExternalItem[]>;
  plugins: Readonly<ExternalItem[]>;
  directoryOnline: boolean;
}>) {
  const [entered, setEntered] = useState(false);
  const [journey, setJourney] = useState<StudioJourney>('arrival');
  const returnFocus = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncFromLocation = () => {
      const requested = journeyFromHash(window.location.hash);
      setEntered(requested !== null);
      if (requested) setJourney(requested);
    };
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, []);

  const openStudio = useCallback(() => {
    setJourney('arrival');
    setEntered(true);
    if (window.location.hash !== '#studio') {
      window.history.pushState({ knouxWordPressStudio: true }, '', `${window.location.pathname}${window.location.search}#studio`);
    } else {
      window.history.replaceState({ knouxWordPressStudio: true }, '', window.location.href);
    }
    window.requestAnimationFrame(() => document.getElementById('wordpress-studio-back')?.focus());
  }, []);

  const closeStudio = useCallback(() => {
    if (window.history.state?.knouxWordPressStudio) {
      window.history.back();
    } else {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      setEntered(false);
    }
    window.requestAnimationFrame(() => returnFocus.current?.querySelector<HTMLAnchorElement>('[data-enter-studio]')?.focus());
  }, []);

  return (
    <div className="wp-experience" data-wordpress-experience data-phase={entered ? 'studio' : 'arrival'}>
      <div ref={returnFocus} className="wp-experience__arrival" hidden={entered}>
        <WordPressWelcome themesLoaded={themes.length} directoryOnline={directoryOnline} onEnter={openStudio} />
      </div>
      <div className="wp-experience__studio" id="studio" hidden={!entered}>
        <WordPressStudio themes={themes} plugins={plugins} requestedJourney={journey} onBack={closeStudio} />
      </div>
    </div>
  );
}
