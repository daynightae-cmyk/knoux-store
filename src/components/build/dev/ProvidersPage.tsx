'use client';

import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';

export function ProvidersPage() {
  const { state } = useBuildWorkspace();
  const configured = state.ai.providers.filter((provider) => provider.configured).length;
  return <div className="dev-route"><DevPageHeading eyebrow="AI / PROVIDERS" title="Providers" description="Configuration signals are reported without exposing values. Connection health and model execution have not been measured." detail={`${configured} configured / ${state.ai.providers.length} defined`} /><div className="dev-route__grid"><DevPanel title="Provider registry"><div className="dev-provider-grid">{state.ai.providers.length ? state.ai.providers.map((provider) => <article key={provider.id} className="dev-provider-card"><div className="dev-provider-card__head"><span className="dev-provider-card__icon">✣</span><span className={`dev-tag ${provider.configured ? 'dev-tag--ok' : ''}`}>{provider.configured ? 'CONFIGURED' : 'UNCONFIGURED'}</span></div><h2>{provider.displayName}</h2><p>{provider.reason}</p><dl className="dev-kv"><dt>Required signals</dt><dd>{provider.requiredEnv.join(', ') || 'NONE'}</dd><dt>Online status</dt><dd>UNMEASURED</dd><dt>Execution</dt><dd>UNCONNECTED</dd></dl></article>) : <DevEmpty title="PROVIDER STATE UNAVAILABLE" body="The environment projection could not be read." />}</div></DevPanel><DevPanel title="Routing boundary"><p className="dev-note">Intent composition runs locally and does not call a provider. A configured environment variable proves only that a signal is present; it does not prove network reachability or a working execution adapter.</p></DevPanel></div></div>;
}
