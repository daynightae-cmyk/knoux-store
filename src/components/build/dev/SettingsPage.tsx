'use client';

import { useEffect, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevPageHeading, DevPanel } from './DevUI';

type Preferences = { compact: boolean; showEvidence: boolean };
const KEY = 'knoux-dev-preferences';

export function SettingsPage() {
  const { state } = useBuildWorkspace();
  const [prefs, setPrefs] = useState<Preferences>({ compact: false, showEvidence: true });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { queueMicrotask(() => { try { const saved = localStorage.getItem(KEY); if (saved) { const parsed = JSON.parse(saved) as Preferences; setPrefs({ compact: !!parsed.compact, showEvidence: parsed.showEvidence !== false }); } } catch { /* defaults are safe */ } setLoaded(true); }); }, []);
  function update(next: Preferences) { setPrefs(next); localStorage.setItem(KEY, JSON.stringify(next)); document.documentElement.classList.toggle('dev-shell--compact', next.compact); document.documentElement.classList.toggle('dev-shell--less-evidence', !next.showEvidence); }
  return <div className="dev-route"><DevPageHeading eyebrow="WORKSPACE / SETTINGS" title="Settings" description="Local display preferences and the current adapter contract. Preferences stay in this browser." detail="BROWSER-LOCAL PREFERENCES" /><div className="dev-route__grid"><DevPanel title="Display preferences"><div className="dev-settings-list"><label><span><strong>Compact lists</strong><small>Reduce row spacing in the DEV workspace.</small></span><input type="checkbox" checked={prefs.compact} disabled={!loaded} onChange={(event) => update({ ...prefs, compact: event.target.checked })} /></label><label><span><strong>Show evidence detail</strong><small>Show provenance rows in the application inspector.</small></span><input type="checkbox" checked={prefs.showEvidence} disabled={!loaded} onChange={(event) => update({ ...prefs, showEvidence: event.target.checked })} /></label></div><p className="dev-note">Saved to this browser only. The workspace does not claim account-wide synchronisation.</p></DevPanel><DevPanel title="Current environment"><dl className="dev-kv"><dt>Adapter</dt><dd>{state.adapter.label}</dd><dt>Environment</dt><dd>{state.adapter.environment}</dd><dt>Project</dt><dd>{state.project?.name ?? 'UNAVAILABLE'}</dd><dt>Source write</dt><dd>{state.adapter.capabilities['project.write']?.toUpperCase()}</dd><dt>Deploy trigger</dt><dd>{state.adapter.capabilities['deploy.trigger']?.toUpperCase()}</dd></dl></DevPanel></div></div>;
}
