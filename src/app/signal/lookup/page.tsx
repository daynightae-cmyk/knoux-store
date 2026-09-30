import type { Metadata } from 'next';
import { SignalExperience } from '@/components/signal/SignalExperience';

export const metadata: Metadata = {
  title: 'Signal Lookup',
  alternates: { canonical: 'https://knoux.store/signal/lookup' },
};

export default function SignalLookupPage() {
  return <SignalExperience context="SG-01 / LOOKUP" />;
}
