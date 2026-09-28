import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { authRouteMetadata } from '@/data/auth';
import { getAuthCapabilities } from '@/lib/auth/capabilities';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = authRouteMetadata('/login', 'Sign In', 'Access your KNOuX account.');

export default async function LoginPage() {
  const supabase = await createClient();
  const [{ data }, capabilities] = await Promise.all([
    supabase.auth.getUser(),
    getAuthCapabilities(),
  ]);
  if (data.user) redirect('/account');

  return (
    <AuthShell route="/login" labelledBy="login-heading">
      <LoginForm capabilities={capabilities} />
    </AuthShell>
  );
}
