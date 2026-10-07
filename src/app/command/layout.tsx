import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { WorkspaceProvider } from '@/components/command/workspace-context';
import { growthAuthEnforced } from '@/lib/growth/auth/enforcement';
import { resolvePrincipal } from '@/lib/growth/auth/session';
import { loadDemoWorkspace, loadLiveWorkspace } from '@/lib/growth/persistence/workspace';
import type { WorkspaceDataset } from '@/lib/growth/persistence/workspace-data';
import './command-shell.css';

export const metadata: Metadata = {
  title: 'Social Command Center',
  description:
    'KNOuX Growth: the social and advertising operating system. One intelligence, every channel, every client.',
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * The Command Center currently shows public, explicitly labelled demo workspaces.
 * Configured agent calls require an authenticated operator at the server boundary.
 *
 * It sits outside the marketing layout on purpose: the public site header, footer
 * and command palette are for the storefront, and putting a console inside them
 * would frame an operational tool as a division. The workspace provides its own
 * shell, client switcher and command dock.
 */
export default async function CommandLayout({ children }: Readonly<{ children: ReactNode }>) {
  let initialData: WorkspaceDataset;
  if (growthAuthEnforced()) {
    const resolution = await resolvePrincipal();
    if (resolution.state === 'ANONYMOUS') redirect('/login?next=/command');
    if (resolution.state !== 'ALLOWED') redirect('/account?notice=growth-not-authorised');
    const stored = await loadLiveWorkspace(resolution.principal.clientIds);
    if (!stored.ok) return <div className="command-root"><h1>Growth workspace unavailable</h1><p>{stored.failure}: {stored.message}</p><p>Live data could not be loaded. No demo data was substituted.</p></div>;
    initialData = stored.data.value;
    if (initialData.clients.length === 0) return <div className="command-root"><h1>No accessible client workspaces</h1><p>Your authenticated memberships have no stored client records.</p></div>;
  } else {
    initialData = await loadDemoWorkspace();
  }

  return (
    <div className="command-root">
      <WorkspaceProvider initialData={initialData}>{children}</WorkspaceProvider>
    </div>
  );
}
