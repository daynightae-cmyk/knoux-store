import { isSupabaseConfigured } from '@/lib/supabase/config';

export type AuthOutcome =
  | { status: 'not-configured' }
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

export function isAuthConfigured(): boolean {
  return isSupabaseConfigured();
}
