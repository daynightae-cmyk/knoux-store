import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { authRouteMetadata } from '@/data/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = authRouteMetadata('/login', 'Sign In', 'Access your KNOuX account.');

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect('/account');

  const params = await searchParams;
  const callbackError = params.error === 'oauth_callback';

  return (
    <AuthShell route="/login" labelledBy="login-heading">
      <LoginForm callbackError={callbackError} />
    </AuthShell>
  );
}
