import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';
import { SignalSubmissionForm } from '@/components/signal/SignalSubmissionForm';

export const metadata: Metadata = { title: 'Claim Number — Signal' };

export default function SignalClaimPage() {
  return <SignalSectionScaffold routeId="claim" note="Claiming requires the same phone number to be verified on the signed-in KNOuX account."><SignalSubmissionForm mode="claim" /></SignalSectionScaffold>;
}
