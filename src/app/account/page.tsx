import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOutAction } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Your KNOuX account.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://knoux.store/account' },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, role, created_at')
    .eq('id', data.user.id)
    .maybeSingle();

  const provider =
    typeof data.user.app_metadata?.provider === 'string'
      ? data.user.app_metadata.provider
      : 'email';

  const displayName =
    profile?.display_name ??
    data.user.user_metadata?.full_name ??
    data.user.user_metadata?.name ??
    'KNOuX member';

  return (
    <main id="main-content" tabIndex={-1} className="account-page">
      <section className="account-shell" aria-labelledby="account-heading">
        <span className="eyebrow">KN / AUTH — LIVE SESSION</span>
        <h1 id="account-heading">{displayName}</h1>
        <p className="account-shell__intro">
          Your identity is verified by Supabase Auth and this page is rendered from the active server session.
        </p>

        <dl className="account-facts">
          <div><dt>Email</dt><dd>{data.user.email ?? 'Unavailable'}</dd></div>
          <div><dt>Provider</dt><dd>{provider}</dd></div>
          <div><dt>Role</dt><dd>{profile?.role ?? 'user'}</dd></div>
          <div><dt>User ID</dt><dd>{data.user.id}</dd></div>
        </dl>

        <form action={signOutAction}>
          <button className="auth-submit account-signout" type="submit">Sign Out</button>
        </form>
      </section>
    </main>
  );
}
