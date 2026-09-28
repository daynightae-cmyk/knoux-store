import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { Composer } from '@/components/Composer';
import { NextLink } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { TrackOnView } from '@/components/TrackOnView';

export const metadata = pageMetadata(
  'KNOuX Composer',
  'Describe what you need and assemble a KNOuX stack from software, WordPress, web engineering, growth and creative. Deterministic matching against the KNOuX registries.',
  '/build',
);

export default function BuildPage() {
  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'division_opened', division: 'composer', route: '/build' }} />
      <PageIntro
        index="07"
        label="Composer"
        title="Tell us what"
        italic="you need."
        description="A deterministic intent engine over the KNOuX registries. It resolves what you wrote into a stack of real products, services and systems. It never estimates price, delivery or outcome."
      />
      <div className="shell" style={{ paddingTop: 'clamp(40px, 5vw, 80px)', paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <Suspense fallback={<div style={{ minHeight: 420 }} />}>
          <Composer />
        </Suspense>
      </div>
      <div className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <NextLink label="Back to" name="Solutions by need" href="/solutions" />
      </div>
    </main>
  );
}
