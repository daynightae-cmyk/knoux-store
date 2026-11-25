import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';
import { SignalSubmissionForm } from '@/components/signal/SignalSubmissionForm';

export const metadata: Metadata = { title: 'Signal Reputation' };

export default function SignalReputationPage() {
  return <SignalSectionScaffold routeId="reputation" note="Reports remain categorized evidence, never an automatic accusation."><SignalSubmissionForm mode="report" /></SignalSectionScaffold>;
}
