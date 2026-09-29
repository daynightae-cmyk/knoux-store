import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { NextLink } from '@/components/blocks';
import { ExternalMarketplace, readMarketplaceQuery } from '@/components/wordpress/ExternalMarketplace';
import { FirstPartyRail } from '@/components/wordpress/FirstPartyRail';
import { queryPatterns } from '@/lib/wordpress/wordpress-org';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata(
  'Patterns',
  'Block patterns from the official WordPress.org pattern directory, attributed to their publishers and kept separate from KNOuX first-party releases.',
  '/wordpress/patterns',
);

export default async function PatternsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = readMarketplaceQuery(await searchParams);
  const patterns = await queryPatterns({ search: query.search, page: query.page, perPage: query.perPage });

  return (
    <main id="main-content" tabIndex={-1}>
      <PageIntro
        index="WP-06"
        label="WordPress"
        title="Patterns"
        italic="directory."
        description="Reusable block layouts published in the official WordPress.org pattern directory, attributed to the authors who publish them."
      />
      <SignalRail division="wordpress" path="/wordpress/patterns" />

      <FirstPartyRail type="block" label="pattern" />

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <ExternalMarketplace
          basePath="/wordpress/patterns"
          query={query}
          result={patterns}
          kindLabel="Patterns"
          kindNoun="pattern"
          kindRoute="/wordpress/blocks"
          firstPartyCount={0}
        />
        <div className="mp__footnote">
          <p>
            A pattern is a block layout. The pattern body itself is not rendered here: it is third-party block
            markup that would pull in foreign markup and foreign asset hosts. Each entry links to the source so
            the pattern can be opened, copied and edited in WordPress where it belongs.
          </p>
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <p className="meta-row" style={{ marginBottom: 30 }}>
          <span>PATTERN DIRECTORY: WORDPRESS.ORG</span>
          <span>
            <Link href="/wordpress/blocks">Blocks</Link>
          </span>
          <span>
            <Link href="/wordpress/plugins">Plugins</Link>
          </span>
        </p>
        <NextLink label="Back to" name="WordPress ecosystem" href="/wordpress" />
      </section>
    </main>
  );
}
