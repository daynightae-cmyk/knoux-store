import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { WorkspaceProvider } from '@/components/command/workspace-context';
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
 * The Command Center is an authenticated operating surface, not a public page.
 *
 * It sits outside the marketing layout on purpose: the public site header, footer
 * and command palette are for the storefront, and putting a console inside them
 * would frame an operational tool as a division. The workspace provides its own
 * shell, client switcher and command dock.
 */
export default function CommandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="command-root">
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </div>
  );
}