import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { NextLink } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { TrackOnView } from '@/components/TrackOnView';
import { KnouxBuildWorkspace } from '@/components/build/workspace/KnouxBuildWorkspace';

/**
 * The Composer reads `useSearchParams()` for its preset deep-link, which makes
 * a statically prerendered route bail out to client-side rendering for the whole
 * subtree. The workspace would then ship no server-rendered markup at all.
 *
 * Rendering this route per request is the fix that keeps the Composer
 * untouched, which the closure brief requires. `/build` is an interactive
 * workspace rather than a prerendered brochure, so a per-request render costs
 * nothing that matters.
 */
export const dynamic = 'force-dynamic';

export const metadata = pageMetadata(
  'KNOuX Build OS',
  'An engineering workspace inside KNOuX. Compile a specification from the registries, inspect real source, preview a real runtime, and read the verification state of the deployment you are looking at.',
  '/build',
);

export default function BuildPage() {
  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'division_opened', division: 'composer', route: '/build' }} />
      <PageIntro
        index="07"
        label="Build OS"
        title="KNOuX opens into"
        italic="an engineering machine."
        description="The Composer is the genesis layer and is preserved unchanged. Around it: a deterministic specification reader, real source inspection, a live preview of this deployment, the project topology read from disk, and a verification ledger that will not call an unverified thing green."
      />
      <div style={{ paddingBottom: 'clamp(60px, 8vw, 120px)' }}>
        <Suspense fallback={<div style={{ minHeight: 420 }} />}>
          <KnouxBuildWorkspace />
        </Suspense>
      </div>
      <div className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <NextLink label="Back to" name="Solutions by need" href="/solutions" />
      </div>
    </main>
  );
}
