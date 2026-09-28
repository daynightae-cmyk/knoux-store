import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { authRouteMetadata } from '@/data/auth';

/**
 * Create an account.
 *
 * Shares the chamber, the field component and the status region with sign in.
 */
export const metadata: Metadata = authRouteMetadata(
  '/register',
  'Create Account',
  'Open a KNOuX account.',
);

export default function RegisterPage() {
  return (
    <AuthShell route="/register" labelledBy="register-heading">
      <RegisterForm />
    </AuthShell>
  );
}
