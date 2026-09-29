'use client';

import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';

export function PowerShellPage() {
  const { state } = useBuildWorkspace();
  return <div className="dev-route"><DevPageHeading eyebrow="TOOLS / POWERSHELL" title="PowerShell" description="Windows PowerShell requires a trusted machine bridge. The web deployment has no access to your local shell." detail="BRIDGE UNAVAILABLE" /><div className="dev-route__grid"><DevPanel title="PowerShell session"><div className="dev-console dev-console--terminal"><div className="dev-console__bar"><span>POWERSHELL / WINDOWS</span><span>DISCONNECTED</span></div><DevEmpty title="NO POWERSHELL BRIDGE" body="No Windows host, authenticated bridge or executable adapter is connected. No commands have run." /></div></DevPanel><DevPanel title="Execution contract"><dl className="dev-kv"><dt>Host</dt><dd>UNCONNECTED</dd><dt>Session</dt><dd>NONE</dd><dt>Permission</dt><dd>{state.adapter.capabilities['command.arbitrary']?.toUpperCase() ?? 'UNKNOWN'}</dd><dt>Output</dt><dd>NONE</dd></dl></DevPanel></div></div>;
}
