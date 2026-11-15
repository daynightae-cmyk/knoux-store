import { hasSupabaseConfig } from '@/lib/supabase/config';

export type AuthOutcome =
  | { status: 'not-configured'; message?: string }
  | { status: 'invalid'; message: string }
  | { status: 'success'; message: string };

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
};

export type PasswordResetInput = {
  email: string;
};

export type OAuthProvider = 'google' | 'github';

export function isAuthConfigured(): boolean {
  return hasSupabaseConfig();
}

export function authErrorMessage(message: string): string {
  const value = message.toLowerCase();

  if (value.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (value.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (value.includes('user already registered')) return 'An account already exists for this email.';
  if (value.includes('password')) return message;
  if (value.includes('rate limit')) return 'Too many attempts. Try again shortly.';

  return 'Authentication could not be completed. Please try again.';
}
