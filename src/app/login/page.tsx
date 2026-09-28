import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { authRouteMetadata } from '@/data/auth';

/**
 * Sign in.
 *
 * A real, deep-linkable route. The page is public, as the whole headquarters
 * is: nothing here gates any other part of the site.
 */
export const metadata: Metadata = authRouteMetadata('/login', 'Sign In', 'Access your KNOuX account.');

export default function LoginPage() {
  return (
    <AuthShell route="/login" labelledBy="login-heading">
      <LoginForm />
    </AuthShell>
  );
}
