import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { WorkspaceProvider } from '@/components/command/workspace-context';
import { growthAuthEnforced } from '@/lib/growth/auth/enforcement';
import { resolvePrincipal } from '@/lib/growth/auth/session';
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
  if (growthAuthEnforced()) {
    const resolution = await resolvePrincipal();
    if (resolution.state === 'ANONYMOUS') redirect('/login?next=/command');
    if (resolution.state !== 'ALLOWED') redirect('/account?notice=growth-not-authorised');
  }

  return (
    <div className="command-root">
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </div>
  );
}
