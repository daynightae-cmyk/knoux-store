import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Reputation' };

export default function SignalReputationPage() {
  return <SignalSectionScaffold routeId="reputation" note="Reports remain categorized evidence, never an automatic accusation." />;
}
