import { BuildPlatformEntry } from '@/components/build/dev/BuildPlatformEntry';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata(
  'One Platform',
  'The KNOuX Build constellation: services, apps, intelligence and control on one platform.',
  '/build/platform'
);

export default function Page() {
  return <BuildPlatformEntry />;
}
