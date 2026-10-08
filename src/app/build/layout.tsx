import type { ReactNode } from 'react';
import { BuildStateProvider } from '@/components/build/workspace/KnouxBuildWorkspace';
import { DevWorkspaceShell } from '@/components/build/dev/DevWorkspaceShell';
import '@/components/build/workspace/build-os.css';
import '@/components/build/dev/dev-workspace.css';
import '@/components/build/dev/dev-cinematic.css';
import '@/components/build/dev/dev-connected.css';
import '@/components/build/dev/engineering-os.css';

export const dynamic = 'force-dynamic';

export default function BuildLayout({ children }: { children: ReactNode }) {
  return <BuildStateProvider><DevWorkspaceShell>{children}</DevWorkspaceShell></BuildStateProvider>;
}
