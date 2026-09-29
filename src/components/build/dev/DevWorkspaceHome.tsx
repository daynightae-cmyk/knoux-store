'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { softwareProducts } from '@/data/software';
import { webSystems } from '@/data/services';
import { compileBuildIntent, summariseIntent } from '@/lib/build/intent';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { PreviewSurface } from '../surfaces/PreviewSurface';
import { BuildEntryGate } from './BuildEntryGate';
import { KnouxDevParticleHero } from './KnouxDevParticleHero';
import { ProductMachine } from './ProductMachine';
import { DevPanel, DevEmpty } from './DevUI';

export function DevWorkspaceHome() {
  const { state, dispatch } = useBuildWorkspace();
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const draft = draftOverride ?? state.intent?.rawInput ?? '';
  function compile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (draft.trim()) dispatch({ type: 'intent/compiled', intent: compileBuildIntent(draft) }); }
  const configured = state.ai.providers.filter((provider) => provider.configured);
  return <>
    <BuildEntryGate />
    <KnouxDevParticleHero />
    <div className="dev-dashboard">
      <DevPanel title="Tell us what you need" className="dev-dashboard__composer"><form onSubmit={compile} className="dev-compose"><label htmlFor="dev-intent-input">DESCRIBE WHAT YOU WANT TO BUILD</label><textarea id="dev-intent-input" value={draft} onChange={(event) => setDraftOverride(event.target.value)} placeholder="Describe what you want to build…" rows={3} /><div><span>Local intent compiler · no model call</span><button type="submit" disabled={!draft.trim()}>COMPILE INTENT ↗</button></div></form>{state.intent ? <p className="dev-compose__result">{summariseIntent(state.intent)}</p> : null}</DevPanel>
      <DevPanel title="Live Preview" className="dev-dashboard__preview"><PreviewSurface /></DevPanel>
      <DevPanel title="Apps & Services" href="/build/apps" className="dev-dashboard__apps"><div className="dev-tabs-static"><span>APPS</span><span>SERVICES</span><span>REGISTRY</span></div><div className="dev-list">{softwareProducts.slice(0, 5).map((product) => <Link key={product.id} href={`/build/apps?product=${product.slug}`}><strong>{product.name}</strong><span>{product.status.toUpperCase()}</span></Link>)}</div><div className="dev-note">{webSystems.length} service categories in the public registry · runtime state unmeasured</div></DevPanel>
      <DevPanel title="Providers" href="/build/providers" className="dev-dashboard__providers"><div className="dev-list">{state.ai.providers.length ? state.ai.providers.slice(0, 4).map((provider) => <div key={provider.id}><strong>{provider.displayName}</strong><span className={provider.configured ? 'dev-tag dev-tag--ok' : 'dev-tag'}>{provider.configured ? 'CONFIGURED' : 'UNCONFIGURED'}</span></div>) : <DevEmpty title="PROVIDER STATE UNAVAILABLE" body="Configuration has not been read yet." />}</div><p className="dev-note">{configured.length} configured · online status is not measured</p></DevPanel>
      <DevPanel title="Docs & Knowledge" href="/build/docs" className="dev-dashboard__docs"><div className="dev-list">{['README.md', 'references/dev/REFERENCE_MAP.md', 'references/QA_CLOSURE.md'].map((path) => <Link key={path} href={`/build/docs?file=${encodeURIComponent(path)}`}><strong>{path}</strong><span>↗</span></Link>)}</div></DevPanel>
      <DevPanel title="Build / Verification" href="/build/pipeline" className="dev-dashboard__build"><DevEmpty title="NOT RUN HERE" body="Verification evidence is available when the adapter reports it." /></DevPanel>
      <DevPanel title="Deployments" href="/build/deployments" className="dev-dashboard__deployments"><DevEmpty title="HISTORY UNCONNECTED" body="This workspace has no deployment history adapter. The current page is the only runtime it can verify." /></DevPanel>
      <DevPanel title="PowerShell" href="/build/powershell" className="dev-dashboard__powershell"><DevEmpty title="SHELL BRIDGE UNAVAILABLE" body="The hosted workspace cannot execute PowerShell commands. No session or output is implied." /></DevPanel>
      <DevPanel title="System Status" className="dev-dashboard__status"><div className="dev-list"><div><strong>Project snapshot</strong><span>{state.project ? 'READABLE' : 'UNAVAILABLE'}</span></div><div><strong>Current runtime</strong><span>{state.runtime.url ? 'SITE SERVING' : 'UNAVAILABLE'}</span></div><div><strong>CPU / memory / network</strong><span>UNAVAILABLE</span></div><div><strong>Verification</strong><span>{state.verification ? 'EVIDENCE AVAILABLE' : 'NOT RUN HERE'}</span></div></div></DevPanel>
    </div>
    <ProductMachine />
  </>;
}
