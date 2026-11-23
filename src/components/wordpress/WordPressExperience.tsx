'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { WordPressWelcome } from './WordPressWelcome';
import { WordPressStudio, type StudioJourney } from './WordPressStudio';

// Canonical addresses precede the aliases accepted by older links.
const HASH_JOURNEYS: Record<string, StudioJourney> = {
  '#studio': 'arrival',
  '#domain': 'domain',
  '#themes': 'theme',
  '#identity': 'identity',
  '#plugins': 'plugins',
  '#canvas': 'canvas',
  '#launch': 'composer',
  '#infrastructure': 'hosting',
  '#build': 'build',
  '#operate': 'operations',
  '#system': 'arrival',
  '#library': 'theme',
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
  const studioDialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    const syncFromLocation = () => {
      const requested = journeyFromHash(window.location.hash);
      closing.current = false;
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

  useEffect(() => {
    const dialog = studioDialog.current;
    if (!dialog) return;
    if (entered && !dialog.open) {
      dialog.scrollTop = 0;
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('#wordpress-studio-back')?.focus();
    } else if (!entered && dialog.open) {
      for (const panel of dialog.querySelectorAll<HTMLDialogElement>('dialog[open]')) panel.close();
      dialog.close();
      const target = trigger.current?.isConnected
        ? trigger.current
        : returnFocus.current?.querySelector<HTMLElement>('[data-enter-studio]');
      target?.focus({ preventScroll: true });
      trigger.current = null;
    }
  }, [entered]);

  const openStudio = useCallback(() => {
    const focused = document.activeElement;
    trigger.current = focused instanceof HTMLElement && returnFocus.current?.contains(focused) ? focused : null;
    setJourney('arrival');
    setEntered(true);
    if (window.location.hash !== '#studio') {
      window.history.pushState({ knouxWordPressStudio: true }, '', `${window.location.pathname}${window.location.search}#studio`);
    } else {
      window.history.replaceState({ knouxWordPressStudio: true }, '', window.location.href);
    }
  }, []);

  const closeStudio = useCallback(() => {
    if (closing.current) return;
    if (window.history.state?.knouxWordPressStudio) {
      closing.current = true;
      window.history.back();
    } else {
      setEntered(false);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  function changeJourney(next: StudioJourney) {
    setJourney(next);
    const { pathname, search } = window.location;
    const hash = Object.keys(HASH_JOURNEYS).find((key) => HASH_JOURNEYS[key] === next) ?? '#studio';
    window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`);
  }

  return (
    <div className="wp-experience" data-wordpress-experience data-phase={entered ? 'studio' : 'arrival'}>
      <div ref={returnFocus} className="wp-experience__arrival" hidden={entered}>
        <WordPressWelcome active={!entered} themesLoaded={themes.length} directoryOnline={directoryOnline} onEnter={openStudio} />
      </div>
      <dialog ref={studioDialog} className="wp-experience__studio" id="studio" aria-labelledby="wordpress-studio-title"
        onCancel={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          closeStudio();
        }}>
        <WordPressStudio themes={themes} plugins={plugins} active={journey} onJourneyChange={changeJourney} onBack={closeStudio} />
      </dialog>
    </div>
  );
}
