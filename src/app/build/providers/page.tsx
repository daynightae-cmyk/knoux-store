import { ProviderCenter } from '@/components/build/providers/ProviderCenter';
import { providerDefinitions } from '@/lib/ai/provider-os/definitions';

export default function Page() {
  return <ProviderCenter initialDefinitions={providerDefinitions()} />;
}
