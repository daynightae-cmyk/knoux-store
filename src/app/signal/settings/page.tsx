import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Settings' };

export default function SignalSettingsPage() {
  return <SignalSectionScaffold routeId="settings" note="Signal-specific preferences only; shared KNOuX account settings remain centralized." />;
}
