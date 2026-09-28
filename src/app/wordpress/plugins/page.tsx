import { WordPressCategoryPage } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import type { WordPressCategory } from '@/data/wordpress';

export const metadata = pageMetadata(
  'Plugins',
  'Live plugin discovery from the official WordPress.org plugin directory, kept separate from the KNOuX first-party plugin registry. Official icons, ratings, install counts and compatibility as published upstream.',
  '/wordpress/plugins',
);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WordPressCategoryPage category={'plugins' as WordPressCategory} searchParams={await searchParams} />;
}
