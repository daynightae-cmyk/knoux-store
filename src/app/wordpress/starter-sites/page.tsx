import { WordPressCategoryPage } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import type { WordPressCategory } from '@/data/wordpress';

export const metadata = pageMetadata('Starter Sites', 'KNOuX WordPress starter sites by business vertical. Filters fixed ahead of the catalogue; no template published yet.', '/wordpress/starter-sites');

export default function Page() {
  return <WordPressCategoryPage category={'starter-sites' as WordPressCategory} />;
}
