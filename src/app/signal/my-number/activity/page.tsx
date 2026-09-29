import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Activity' };

export default function SignalActivityPage() {
  return <SignalSectionScaffold routeId="activity" note="This surface will consume the owner-only /api/signal/activity contract." />;
}
