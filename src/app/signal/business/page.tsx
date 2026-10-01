import type { Metadata } from 'next';
import { SignalSectionScaffold } from '@/components/signal/SignalSectionScaffold';

export const metadata: Metadata = { title: 'Signal Business' };

export default function SignalBusinessPage() {
  return <SignalSectionScaffold routeId="business" note="Verified business identity, label consistency and reputation analytics belong here." />;
}
