import { WordPressExperience } from '@/components/wordpress/WordPressExperience';
import { queryThemes, queryPlugins } from '@/lib/wordpress/wordpress-org';
import { pageMetadata } from '@/lib/metadata';
import { TrackOnView } from '@/components/TrackOnView';

export const metadata = pageMetadata(
  'WordPress Ecosystem',
  'KNOuX WordPress Studio: one application for choosing a WordPress theme, finding a domain, planning hosting, composing a site and reviewing the operating work around a real install. Live WordPress.org data, honest provider states, no invented availability or pricing.',
  '/wordpress',
);

/**
 * /wordpress — one canonical application card.
 *
 * Arrival and the ten Studio journeys are states of a single full-viewport
 * experience. They are not a vertical stack of landing-page sections: entry,
 * selection, configuration, editing and preview all happen inside the same
 * shell. Real registry data is fetched once here; provider-backed surfaces
 * still read their own honest state at request time.
 */
export default async function WordPressPage() {
  const [themes, plugins] = await Promise.all([
    queryThemes({ perPage: 6 }),
    queryPlugins({ perPage: 6 }),
  ]);

  return (
    <main id="main-content" tabIndex={-1}>
      <TrackOnView event={{ type: 'division_opened', division: 'wordpress', route: '/wordpress' }} />
      <WordPressExperience
        themes={themes.items}
        plugins={plugins.items}
        directoryOnline={themes.state === 'ok'}
      />
    </main>
  );
}
