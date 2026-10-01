import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'My Number — Signal' };

export default function SignalMyNumberPage() {
  return <SignalSectionScaffold routeId="my-number" note="Verified-owner controls live under this route tree." />;
}
