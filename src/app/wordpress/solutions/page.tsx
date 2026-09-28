import { WordPressCategoryPage } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import type { WordPressCategory } from '@/data/wordpress';

export const metadata = pageMetadata('Bundles', 'KNOuX WordPress bundles: software, extensions and operating work configured for one outcome.', '/wordpress/solutions');

export default function Page() {
  return <WordPressCategoryPage category={'solutions' as WordPressCategory} />;
}
