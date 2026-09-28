import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { authRouteMetadata } from '@/data/auth';

/** Password recovery entry for the configured Supabase Auth flow. */
export const metadata: Metadata = authRouteMetadata(
  '/forgot-password',
  'Reset Password',
  'Request a password reset for your KNOuX account.',
);

export default function ForgotPasswordPage() {
  return (
    <AuthShell route="/forgot-password" labelledBy="forgot-heading">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
