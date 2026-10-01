import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Labels' };

export default function SignalLabelsPage() {
  return <SignalSectionScaffold routeId="labels" note="Community aliases stay consent-gated and evidence-backed." />;
}
