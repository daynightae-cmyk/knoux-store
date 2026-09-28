import { WordPressCategoryPage } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import type { WordPressCategory } from '@/data/wordpress';

export const metadata = pageMetadata(
  'Blocks',
  'Block discovery through the documented WordPress Block Directory search contract, reported separately from the KNOuX first-party block registry.',
  '/wordpress/blocks',
);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WordPressCategoryPage category={'blocks' as WordPressCategory} searchParams={await searchParams} />;
}
