import { WordPressCategoryPage } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import type { WordPressCategory } from '@/data/wordpress';

export const metadata = pageMetadata('Starter Sites', 'Preview starter layouts in the WordPress Studio, add their blocks to a draft and open the Composer.', '/wordpress/starter-sites');

export default function Page() {
  return <WordPressCategoryPage category={'starter-sites' as WordPressCategory} />;
}
