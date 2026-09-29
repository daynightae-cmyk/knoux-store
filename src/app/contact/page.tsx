import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { RequestForm } from '@/components/RequestForm';
import { pageMetadata } from '@/lib/metadata';
import { divisions } from '@/lib/entities';

export const metadata = pageMetadata(
  'Contact',
  'Send KNOuX a project or service enquiry. The form adapts to the division you arrived from and does not claim delivery without a configured service.',
  '/contact',
);

const CONTACT_EMAIL = 'knouxio@zohomail.com';

export default function ContactPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <PageIntro
        index="08"
        label="Contact"
        title="Start a"
        italic="conversation."
        description="One form for every division. It asks for what your request actually needs and nothing else."
      />

      <section className="shell" style={{ paddingTop: 'clamp(50px, 6vw, 100px)', paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="contact-layout">
          <aside className="contact-aside">
            <span className="label label--signal">DIRECT</span>
            <p className="contact-aside__line">
              <a href={`mailto:${CONTACT_EMAIL}`} className="mono">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="contact-aside__note">
              The address is published from the KNOuX project repositories. It is the working route on this
              deployment.
            </p>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 26, marginTop: 30 }}>
              <span className="label">DIVISIONS</span>
              <ul className="contact-aside__list">
                {divisions.map((division) => (
                  <li key={division.id}>
                    <span className="mono">{division.index}</span>
                    {division.label}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 26, marginTop: 30 }}>
              <span className="label">WHAT HAPPENS NEXT</span>
              <ol className="contact-aside__steps">
                <li>The request arrives with the division, items and context you selected.</li>
                <li>Scope is discussed before anything is quoted or committed.</li>
                <li>No figure on this site is a price, a deadline or a promised result.</li>
              </ol>
            </div>
          </aside>

          <div className="contact-form-panel">
            <Suspense fallback={<div style={{ minHeight: 480 }} />}>
              <RequestForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
