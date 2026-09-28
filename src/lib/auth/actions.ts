'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAuthCapabilities, type AuthProviderName } from '@/lib/auth/capabilities';
import { type AuthFormState } from '@/lib/auth/state';
import {
  hasErrors,
  normaliseEmail,
  validatePasswordReset,
  validatePasswordUpdate,
  validateSignIn,
  validateSignUp,
  type FieldErrors,
} from '@/lib/auth/validation';

const NOT_CONFIGURED = 'Authentication is not connected on this deployment.';

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function invalid(errors: FieldErrors, message = 'Check the highlighted fields.'): AuthFormState {
  return { status: 'error', errors, message, provider: null };
}

function failure(message: string, provider: AuthProviderName | null = null): AuthFormState {
  return { status: 'error', errors: {}, message, provider };
}

function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'The email or password is incorrect.';
    case 'email_not_confirmed':
      return 'Confirm your email address before signing in.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account already exists for this email address.';
    case 'weak_password':
      return 'Choose a stronger password.';
    case 'over_email_send_rate_limit':
      return 'Too many email requests. Wait a moment and try again.';
    case 'over_request_rate_limit':
      return 'Too many attempts. Wait a moment and try again.';
    default:
      return 'Authentication could not be completed. Try again.';
  }
}

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  if (!host) return 'https://knoux.store';
  const proto =
    requestHeaders.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const input = {
    email: read(formData, 'email'),
    password: read(formData, 'password'),
  };

  const errors = validateSignIn(input);
  if (hasErrors(errors)) return invalid(errors);

  const capabilities = await getAuthCapabilities();
  if (!capabilities.configured || !capabilities.email) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normaliseEmail(input.email),
    password: input.password,
  });
  if (error) return failure(friendlyAuthError(error));

  redirect('/account');
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const input = {
    name: read(formData, 'name'),
    email: read(formData, 'email'),
    password: read(formData, 'password'),
    confirmPassword: read(formData, 'confirmPassword'),
  };

  const errors = validateSignUp(input);
  if (hasErrors(errors)) return invalid(errors);

  const capabilities = await getAuthCapabilities();
  if (!capabilities.configured || !capabilities.email) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: normaliseEmail(input.email),
    password: input.password,
    options: {
      data: { full_name: input.name.trim() },
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) return failure(friendlyAuthError(error));
  if (data.session) redirect('/account');

  return {
    status: 'success',
    errors: {},
    message: 'Check your email to confirm your account, then return here to sign in.',
    provider: null,
  };
}

export async function oauthSignInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const requested = read(formData, 'provider');
  if (requested !== 'google' && requested !== 'github') {
    return failure('That sign-in provider is not supported.');
  }

  const provider: AuthProviderName = requested;
  const capabilities = await getAuthCapabilities();
  if (!capabilities.configured || !capabilities[provider]) {
    return {
      status: 'not-configured',
      errors: {},
      message: `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not connected on this deployment.`,
      provider,
    };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=/account`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) return failure(error ? friendlyAuthError(error) : 'OAuth could not be started.', provider);
  redirect(data.url);
}

export async function requestPasswordResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const input = { email: read(formData, 'email') };
  const errors = validatePasswordReset(input);
  if (hasErrors(errors)) return invalid(errors, 'Check the highlighted field.');

  const capabilities = await getAuthCapabilities();
  if (!capabilities.configured || !capabilities.email) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(normaliseEmail(input.email), {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) return failure(friendlyAuthError(error));
  return {
    status: 'success',
    errors: {},
    message: 'If an account exists for that address, a recovery email has been requested.',
    provider: null,
  };
}

export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const input = {
    password: read(formData, 'password'),
    confirmPassword: read(formData, 'confirmPassword'),
  };
  const errors = validatePasswordUpdate(input);
  if (hasErrors(errors)) return invalid(errors);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) return failure(friendlyAuthError(error));

  redirect('/account');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
