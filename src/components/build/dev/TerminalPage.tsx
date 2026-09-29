'use client';

import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';

export function TerminalPage() {
  const { state } = useBuildWorkspace();
  return <div className="dev-route"><DevPageHeading eyebrow="TOOLS / TERMINAL" title="Terminal" description="Command access follows the adapter capability contract. This hosted workspace does not present a simulated shell." detail={state.adapter.capabilities['terminal.interactive']?.toUpperCase() ?? 'UNKNOWN'} /><div className="dev-route__grid"><DevPanel title="Session"><div className="dev-console dev-console--terminal"><div className="dev-console__bar"><span>TERMINAL / SESSION</span><span>NO CONNECTION</span></div><DevEmpty title="INTERACTIVE TERMINAL BLOCKED" body={state.adapter.blockers['terminal.interactive'] ?? 'No terminal bridge is configured in this environment.'} /></div></DevPanel><DevPanel title="Available actions"><div className="dev-list"><div><strong>Read project source</strong><span>{state.adapter.capabilities['project.read']?.toUpperCase()}</span></div><div><strong>Run allowlisted verification</strong><span>{state.adapter.capabilities['command.allowlisted']?.toUpperCase()}</span></div><div><strong>Arbitrary commands</strong><span>{state.adapter.capabilities['command.arbitrary']?.toUpperCase()}</span></div></div><p className="dev-note">Use Build to inspect the four allowlisted verification tasks when the runner is enabled on a trusted host.</p></DevPanel></div></div>;
}
