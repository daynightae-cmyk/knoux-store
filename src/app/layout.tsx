import type { Metadata, Viewport } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CommandPalette } from '@/components/CommandPalette';
import { KnouxSentinel } from '@/components/identity/KnouxSentinel';
import { motionTokens } from '@/lib/motion';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090a',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://knoux.store'),
  title: { default: 'KNOuX — Engineering Digital Systems', template: '%s — KNOuX' },
  description:
    'KNOuX is a digital headquarters: software products, a WordPress ecosystem, web engineering, growth systems and creative work, composed into solutions.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://knoux.store' },
};

// Only verifiable facts: the institution's name, canonical URL and description.
// No invented awards, staff counts, locations, customers or claims.
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'KNOuX',
  url: 'https://knoux.store',
  description:
    'KNOuX is a digital headquarters: software products, a WordPress ecosystem, web engineering, growth systems and creative work, composed into solutions.',
  sameAs: ['https://github.com/daynightae-cmyk'],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={motionTokens() as React.CSSProperties}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <CommandPalette />
        <KnouxSentinel />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
