'use client';

/**
 * The Build entry.
 *
 * /build opens on the Welcome composition (NSIS 82231) - the whole page is
 * the reference, rendered as code. The engineering workspace opens when an
 * intent exists (a stored sentence, the entry gate, the launcher) or when the
 * visitor steps through the central particle mark. The One Platform
 * constellation (NSIS 82227) is preserved at /build/platform. The gate is
 * mounted here so ?intro=1 reaches it from either surface.
 */
import { useEffect, useRef, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { BuildEntryGate } from './BuildEntryGate';
import { BuildWelcomePage } from './BuildWelcomePage';
import { DevWorkspaceHome } from './DevWorkspaceHome';
import { cueAtmosphere } from './living-atmosphere';

export function BuildEntry() {
  const { state, dispatch } = useBuildWorkspace();
  const [entered, setEntered] = useState(false);
  const focusWorkspace = useRef(false);

  useEffect(() => {
    const sync = () => {
      const atWorkspace = window.location.hash === '#workspace';
      setEntered(atWorkspace);
      if (atWorkspace) {
        focusWorkspace.current = true;
        dispatch({ type: 'surface/active', surface: 'preview' });
      }
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [dispatch]);

  useEffect(() => {
    if (entered && focusWorkspace.current) {
      document.getElementById('build-workspace')?.focus();
      focusWorkspace.current = false;
    }
  }, [entered]);

  // The persistent particle pool lives beside the landing engine aperture.
  // On the constellation it would paint a second mark over the sphere, so it
  // rests invisible here; entering the workspace reveals the same canvas.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-build-constellation', !entered && !state.intent);
    window.dispatchEvent(new Event('knoux:build-surface'));
    return () => document.documentElement.removeAttribute('data-build-constellation');
  }, [entered, state.intent]);

  const workspace = entered || Boolean(state.intent);
  function enterWorkspace() {
    cueAtmosphere('wake');
    const { pathname, search } = window.location;
    window.history.pushState(window.history.state, '', `${pathname}${search}#workspace`);
    focusWorkspace.current = true;
    dispatch({ type: 'surface/active', surface: 'preview' });
    setEntered(true);
  }

  return <>
    <BuildEntryGate />
    {workspace ? <DevWorkspaceHome /> : <BuildWelcomePage onEnter={enterWorkspace} />}
  </>;
}
