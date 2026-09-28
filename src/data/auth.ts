import type { Metadata } from 'next';

/**
 * Auth route metadata.
 *
 * The three account routes are private in the sense that they concern a person's
 * account, not in the sense that they hold anything. They stay indexable and
 * followable like the rest of the site, because nothing behind them is
 * confidential and an account page nobody can find is not a service.
 *
 * Kept in one place so the three routes cannot drift into three different
 * titles, canonicals and social cards.
 */
export function authRouteMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `https://knoux.store${path}` },
    openGraph: {
      title: `${title} — KNOuX`,
      description,
      url: `https://knoux.store${path}`,
      siteName: 'KNOuX',
      type: 'website',
    },
  };
}
