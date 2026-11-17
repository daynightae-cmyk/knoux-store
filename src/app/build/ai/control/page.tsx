import { AiControlPage } from '@/components/build/ai/AiControlPage';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const selection = Object.fromEntries(['providerId', 'modelId', 'profileId', 'workspaceId'].map(key => [key, typeof params[key] === 'string' ? params[key] : '']));
    return <AiControlPage selection={selection} />;
}
