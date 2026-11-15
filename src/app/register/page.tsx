import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { authRouteMetadata } from '@/data/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = authRouteMetadata(
  '/register',
  'Create Account',
  'Open a KNOuX account.',
);

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect('/account');

  return (
    <AuthShell route="/register" labelledBy="register-heading">
      <RegisterForm />
    </AuthShell>
  );
}
