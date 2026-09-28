import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';
import { authRouteMetadata } from '@/data/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = authRouteMetadata(
  '/update-password',
  'Choose New Password',
  'Set a new password for your KNOuX account.',
);

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  return (
    <AuthShell route="/update-password" labelledBy="update-password-heading">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
