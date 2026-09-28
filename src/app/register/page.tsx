import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { authRouteMetadata } from '@/data/auth';
import { getAuthCapabilities } from '@/lib/auth/capabilities';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = authRouteMetadata('/register', 'Create Account', 'Open a KNOuX account.');

export default async function RegisterPage() {
  const supabase = await createClient();
  const [{ data }, capabilities] = await Promise.all([
    supabase.auth.getUser(),
    getAuthCapabilities(),
  ]);
  if (data.user) redirect('/account');

  return (
    <AuthShell route="/register" labelledBy="register-heading">
      <RegisterForm capabilities={capabilities} />
    </AuthShell>
  );
}
