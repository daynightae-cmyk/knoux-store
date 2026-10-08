import { EngineeringConsole } from '@/components/build/dev/EngineeringConsole';
export default async function EngineeringPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  return <EngineeringConsole area={area ?? 'overview'} />;
}
