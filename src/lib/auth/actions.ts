'use server';

import {
  isAuthConfigured,
  unconfiguredProvider,
  type AuthOutcome,
  type SignInInput,
  type SignUpInput,
  type PasswordResetInput,
} from '@/lib/auth/provider';
import {
  hasErrors,
  normaliseEmail,
  validatePasswordReset,
  validateSignIn,
  validateSignUp,
  type FieldErrors,
} from '@/lib/auth/validation';
import { type AuthFormState } from '@/lib/auth/state';

/**
 * Auth Server Actions.
 *
 * Credentials are captured, judged on the server, and then handed to the
 * provider contract. They are never logged, never echoed back, never stored and
 * never placed in a token. The password is read from the submission, handed
 * straight to the contract, and then goes out of scope.
 *
 * When no provider is configured every action resolves to `not-configured`.
 * The form keeps what the visitor typed and says so. It does not redirect, does
 * not clear, and does not pretend a session exists.
 *
 * The returned state type and its initial value live in `@/lib/auth/state`,
 * because a `'use server'` module may only export async functions.
 */

const NOT_CONFIGURED = 'Authentication is not connected on this deployment.';

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

/** Named submit buttons carry the provider they represent. */
function readProvider(formData: FormData): AuthFormState['provider'] {
  const requested = read(formData, 'provider');
  return requested === 'google' || requested === 'github' ? requested : null;
}

/** Turns a contract outcome into the state the interface renders. */
function fromOutcome(outcome: AuthOutcome, provider: AuthFormState['provider'] = null): AuthFormState {
  if (outcome.status === 'not-configured') {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider };
  }
  return { status: 'idle', errors: {}, message: outcome.message, provider };
}

function invalid(errors: FieldErrors, message: string): AuthFormState {
  return { status: 'idle', errors, message, provider: null };
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  // The provider buttons submit the same form, so a press on Google is judged
  // here and reported through the same live region as the credential path.
  const provider = readProvider(formData);
  if (provider) {
    if (!isAuthConfigured()) {
      return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider };
    }
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider };
  }

  const input: SignInInput = {
    email: read(formData, 'email'),
    password: read(formData, 'password'),
    remember: read(formData, 'remember') === 'on',
  };

  const errors = validateSignIn(input);
  if (hasErrors(errors)) {
    return invalid(errors, 'Check the highlighted fields.');
  }

  if (!isAuthConfigured()) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  // A configured deployment reaches this seam; the adapter is swapped for the
  // real provider call here.
  return fromOutcome(await unconfiguredProvider.signIn({ ...input, email: normaliseEmail(input.email) }));
}

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = {
    name: read(formData, 'name'),
    email: read(formData, 'email'),
    password: read(formData, 'password'),
    confirmPassword: read(formData, 'confirmPassword'),
  };

  const errors = validateSignUp(input);
  if (hasErrors(errors)) {
    return invalid(errors, 'Check the highlighted fields.');
  }

  if (!isAuthConfigured()) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  const signUp: SignUpInput = {
    name: input.name.trim(),
    email: normaliseEmail(input.email),
    password: input.password,
  };
  return fromOutcome(await unconfiguredProvider.signUp(signUp));
}

export async function requestPasswordResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const input: PasswordResetInput = { email: read(formData, 'email') };

  const errors = validatePasswordReset(input);
  if (hasErrors(errors)) {
    return invalid(errors, 'Check the highlighted field.');
  }

  if (!isAuthConfigured()) {
    return { status: 'not-configured', errors: {}, message: NOT_CONFIGURED, provider: null };
  }

  return fromOutcome(await unconfiguredProvider.requestPasswordReset({ email: normaliseEmail(input.email) }));
}
