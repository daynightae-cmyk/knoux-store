/**
 * Auth field validation.
 *
 * Deliberately small and shared by the three routes so the same address is
 * judged the same way everywhere. The rules describe what the interface can
 * honestly guarantee, nothing more: a malformed address is rejected, a name is
 * required, two passwords must match.
 *
 * The password rule is a length floor only. No identity provider has been
 * chosen, so composition rules would be the interface inventing a security
 * policy on the backend's behalf. When a provider is wired in, this constant is
 * the single place that changes.
 */

export const PASSWORD_MINIMUM = 8;

/** The same permissive-but-real test the request intake endpoint uses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const email = normaliseEmail(value);
  // A trailing dot or whitespace is a typo, not an address.
  return email.length <= 254 && EMAIL.test(email) && !email.endsWith('.');
}

export function validateSignIn(input: {
  email: string;
  password: string;
}): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};
  if (!input.email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(input.email)) errors.email = 'That does not look like an email address.';
  if (!input.password) errors.password = 'Enter your password.';
  return errors;
}

export function validateSignUp(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FieldErrors<'name' | 'email' | 'password' | 'confirmPassword'> {
  const errors: FieldErrors<'name' | 'email' | 'password' | 'confirmPassword'> = {};
  if (!input.name.trim()) errors.name = 'Enter your name.';
  else if (input.name.trim().length < 2) errors.name = 'Enter your full name.';
  if (!input.email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(input.email)) errors.email = 'That does not look like an email address.';
  if (!input.password) errors.password = 'Choose a password.';
  else if (input.password.length < PASSWORD_MINIMUM) {
    errors.password = `Use at least ${PASSWORD_MINIMUM} characters.`;
  }
  // Only report a mismatch once both fields hold something, so the message is
  // never a reaction to a half-typed form.
  if (input.confirmPassword && input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Those passwords do not match.';
  } else if (!input.confirmPassword) {
    errors.confirmPassword = 'Repeat your password.';
  }
  return errors;
}

export function validatePasswordReset(input: { email: string }): FieldErrors<'email'> {
  const errors: FieldErrors<'email'> = {};
  if (!input.email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(input.email)) errors.email = 'That does not look like an email address.';
  return errors;
}

/** True when a field error set is empty. */
export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
