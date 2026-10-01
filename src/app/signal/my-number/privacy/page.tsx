import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Privacy' };

export default function SignalPrivacyPage() {
  return <SignalSectionScaffold routeId="privacy" note="Visibility, label consent and viewer disclosure controls live here." />;
}
