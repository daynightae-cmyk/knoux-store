import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';
import { SignalWatchlistPreview } from '@/components/signal/SignalWatchlistPreview';

export const metadata: Metadata = { title: 'Signal Watchlist' };

export default function SignalWatchlistPage() {
  return <SignalSectionScaffold routeId="watchlist"><SignalWatchlistPreview /></SignalSectionScaffold>;
}
