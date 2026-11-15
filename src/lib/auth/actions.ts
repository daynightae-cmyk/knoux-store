'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  authErrorMessage,
  isAuthConfigured,
  type OAuthProvider,
  type PasswordResetInput,
  type SignInInput,
  type SignUpInput,
} from '@/lib/auth/provider';
import {
  PASSWORD_MINIMUM,
  hasErrors,
  normaliseEmail,
  validatePasswordReset,
  validateSignIn,
  validateSignUp,
  type FieldErrors,
} from '@/lib/auth/validation';
import type { AuthFormState } from '@/lib/auth/state';
import { createClient } from '@/lib/supabase/server';

const NOT_CONFIGURED = 'Authentication is not connected on this deployment.';

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function readProvider(formData: FormData): OAuthProvider | null {
  const requested = read(formData, 'provider');
  return requested === 'google' || requested === 'github' ? requested : null;
}

function invalid(errors: FieldErrors, message = 'Check the highlighted fields.'): AuthFormState {
  return { status: 'error', errors, message, provider: null };
}

function failure(message: string, provider: OAuthProvider | null = null): AuthFormState {
  return { status: 'error', errors: {}, message, provider };
}

function success(message: string): AuthFormState {
  return { status: 'success', errors: {}, message, provider: null };
}

async function authOrigin(): Promise<string> {
  const incoming = await headers();
  const origin = incoming.get('origin');
  if (origin?.startsWith('http://') || origin?.startsWith('https://')) return origin;

  const forwardedHost = incoming.get('x-forwarded-host');
  const host = forwardedHost ?? incoming.get('host');
  if (host) {
    const protocol = incoming.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://knoux.store';
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isAuthConfigured()) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: readProvider(formData) };
  }

  const provider = readProvider(formData);
  const supabase = await createClient();

  if (provider) {
    const origin = await authOrigin();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=/account`,
      },
    });

    if (error || !data.url) {
      return failure(authErrorMessage(error?.message ?? 'OAuth sign-in could not start.'), provider);
    }

    redirect(data.url);
  }

  const input: SignInInput = {
    email: read(formData, 'email'),
    password: read(formData, 'password'),
  };

  const errors = validateSignIn(input);
  if (hasErrors(errors)) return invalid(errors);

  const { error } = await supabase.auth.signInWithPassword({
    email: normaliseEmail(input.email),
    password: input.password,
  });

  if (error) return failure(authErrorMessage(error.message));

  redirect('/account');
}

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const provider = readProvider(formData);

  if (!isAuthConfigured()) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider };
  }

  const supabase = await createClient();

  if (provider) {
    const origin = await authOrigin();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=/account`,
      },
    });

    if (error || !data.url) {
      return failure(authErrorMessage(error?.message ?? 'OAuth sign-up could not start.'), provider);
    }

    redirect(data.url);
  }

  const input = {
    name: read(formData, 'name'),
    email: read(formData, 'email'),
    password: read(formData, 'password'),
    confirmPassword: read(formData, 'confirmPassword'),
  };

  const errors = validateSignUp(input);
  if (hasErrors(errors)) return invalid(errors);

  const signUp: SignUpInput = {
    name: input.name.trim(),
    email: normaliseEmail(input.email),
    password: input.password,
  };

  const origin = await authOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: signUp.email,
    password: signUp.password,
    options: {
      data: { full_name: signUp.name },
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) return failure(authErrorMessage(error.message));
  if (data.session) redirect('/account');

  return success('Account created. Check your email to confirm your address, then sign in.');
}

export async function requestPasswordResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isAuthConfigured()) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  const input: PasswordResetInput = { email: read(formData, 'email') };
  const errors = validatePasswordReset(input);
  if (hasErrors(errors)) return invalid(errors, 'Check the highlighted field.');

  const origin = await authOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normaliseEmail(input.email), {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) return failure(authErrorMessage(error.message));

  return success('If an account exists for that address, a recovery email has been sent.');
}

export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isAuthConfigured()) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  const password = read(formData, 'password');
  const confirmPassword = read(formData, 'confirmPassword');
  const errors: FieldErrors<'password' | 'confirmPassword'> = {};

  if (!password) errors.password = 'Choose a password.';
  else if (password.length < PASSWORD_MINIMUM) errors.password = `Use at least ${PASSWORD_MINIMUM} characters.`;

  if (!confirmPassword) errors.confirmPassword = 'Repeat your password.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Those passwords do not match.';

  if (hasErrors(errors)) return invalid(errors);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return failure(authErrorMessage(error.message));

  return success('Password updated. Your account is ready.');
}

export async function signOutAction(): Promise<void> {
  if (isAuthConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/');
}
