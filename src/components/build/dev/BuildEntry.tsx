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
import { useEffect, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { BuildEntryGate } from './BuildEntryGate';
import { BuildWelcomePage } from './BuildWelcomePage';
import { DevWorkspaceHome } from './DevWorkspaceHome';
import { cueAtmosphere } from './living-atmosphere';

export function BuildEntry() {
  const { state } = useBuildWorkspace();
  const [entered, setEntered] = useState(false);

  // The persistent particle pool lives beside the landing engine aperture.
  // On the constellation it would paint a second mark over the sphere, so it
  // rests invisible here; entering the workspace reveals the same canvas.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-build-constellation', !entered && !state.intent);
    window.dispatchEvent(new Event('knoux:build-surface'));
    return () => document.documentElement.removeAttribute('data-build-constellation');
  }, [entered, state.intent]);

  const workspace = entered || Boolean(state.intent);
  return <>
    <BuildEntryGate />
    {workspace ? <DevWorkspaceHome /> : <BuildWelcomePage onEnter={() => { cueAtmosphere('wake'); setEntered(true); }} />}
  </>;
}