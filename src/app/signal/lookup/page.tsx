import type { Metadata } from 'next';
import { SignalLookupClient } from '@/components/signal/SignalLookupClient';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Lookup' };

export default function SignalLookupPage() {
  return (
    <SignalSectionScaffold routeId="lookup">
      <SignalLookupClient />
    </SignalSectionScaffold>
  );
}
