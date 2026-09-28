import { WordPressCategoryPage } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import type { WordPressCategory } from '@/data/wordpress';

export const metadata = pageMetadata(
  'Themes',
  'Live theme discovery from the official WordPress.org theme directory, with the screenshots, ratings and tags published upstream. KNOuX first-party theme releases are reported separately.',
  '/wordpress/themes',
);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WordPressCategoryPage category={'themes' as WordPressCategory} searchParams={await searchParams} />;
}
