'use client';

import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';

export function DeploymentsPage() {
  const { state } = useBuildWorkspace();
  return <div className="dev-route"><DevPageHeading eyebrow="DEPLOYMENTS / EVIDENCE" title="Deployments" description="Current origin and deployment history are independent. A serving site does not establish a release timeline." detail="History adapter unconnected" /><div className="dev-route__grid"><DevPanel title="Active runtime"><dl className="dev-kv"><dt>Origin</dt><dd>{state.runtime.url ? <a href={state.runtime.url} target="_blank" rel="noreferrer">{state.runtime.url} ↗</a> : 'UNAVAILABLE'}</dd><dt>Environment</dt><dd>{state.adapter.environment.toUpperCase()}</dd><dt>Serving</dt><dd>{state.runtime.url ? 'CURRENT SITE IS REACHABLE' : 'UNVERIFIED'}</dd><dt>Deployment ID</dt><dd>UNAVAILABLE</dd><dt>Release commit</dt><dd>UNAVAILABLE</dd></dl></DevPanel><DevPanel title="Deployment history"><DevEmpty title="HISTORY UNCONNECTED" body="No deployment history source is configured. Builds, release IDs, success rates and timestamps cannot be shown." /></DevPanel><DevPanel title="Release action"><DevEmpty title="TRIGGER BLOCKED" body={state.adapter.blockers['deploy.trigger'] ?? 'This workspace has no verified deployment trigger.'} /></DevPanel><DevPanel title="Environments"><div className="dev-list"><div><strong>Current deployment</strong><span>{state.adapter.environment.toUpperCase()}</span></div><div><strong>Other targets</strong><span>UNCONNECTED</span></div></div></DevPanel></div></div>;
}
