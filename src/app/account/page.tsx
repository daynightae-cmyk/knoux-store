import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOutAction } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Your authenticated KNOuX account.',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const provider = user.app_metadata?.provider ?? 'email';
  const displayName =
    profile?.display_name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    'KNOuX member';

  return (
    <main id="main-content" className="account-page">
      <section className="shell account-shell">
        <div className="account-kicker">AUTHENTICATED / KNOuX</div>
        <div className="account-grid">
          <div className="account-intro">
            <span className="label label--signal">ACCOUNT</span>
            <h1 className="account-title">Identity confirmed.</h1>
            <p className="account-lede">
              This page is rendered from the active Supabase session. No local fake session is used.
            </p>
          </div>

          <dl className="account-card">
            <div>
              <dt>Name</dt>
              <dd>{displayName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{String(provider).toUpperCase()}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{(profile?.role ?? 'user').toUpperCase()}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd className="account-mono">{user.id}</dd>
            </div>
          </dl>
        </div>

        <div className="account-actions">
          <form action={signOutAction}>
            <button type="submit" className="action action--primary">
              Sign out
              <span className="action-arrow" aria-hidden="true">↗</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
