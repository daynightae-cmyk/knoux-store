import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Update Password',
  description: 'Set a new password for your KNOuX account.',
  robots: { index: false, follow: false },
};

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect('/forgot-password');

  return (
    <AuthShell route="/update-password" labelledBy="update-password-heading">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
