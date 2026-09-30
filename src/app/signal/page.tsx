import type { Metadata } from 'next';
import { SignalExperience } from '@/components/signal/SignalExperience';

export const metadata: Metadata = {
  title: 'Signal',
  description: 'KNOuX Signal — phone identity, reputation and consent-based community intelligence.',
  alternates: { canonical: 'https://knoux.store/signal' },
};

export default function SignalPage() {
  return <SignalExperience context="KN / SIGNAL" />;
}
