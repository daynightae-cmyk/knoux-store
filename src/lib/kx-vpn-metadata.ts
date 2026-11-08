import type { Metadata } from 'next';

/** Product legal/support pages use a plain title; root layout appends "— KNOuX". */
export function kxVpnMetadata(title: string, description: string, path: string): Metadata {
  const url = 'https://knoux.store' + path;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: title + ' — KNOuX',
      description,
      url,
      siteName: 'KNOuX',
      type: 'website',
      images: [{ url: 'https://knoux.store/og.jpg', width: 600, height: 600, alt: 'KNOuX brand mark' }],
    },
    twitter: { card: 'summary_large_image', title: title + ' — KNOuX', description, images: ['https://knoux.store/og.jpg'] },
  };
}
