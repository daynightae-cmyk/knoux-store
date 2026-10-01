import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Watchlist' };

export default function SignalWatchlistPage() {
  return <SignalSectionScaffold routeId="watchlist" note="The route is reserved; monitoring logic will only ship after a real backend contract exists." />;
}
