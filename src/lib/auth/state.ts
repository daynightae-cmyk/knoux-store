import type { FieldErrors } from '@/lib/auth/validation';

/**
 * The shape the auth interface renders from.
 *
 * Kept out of the Server Action module on purpose: a `'use server'` file may
 * only export async functions, so the state it returns is declared here where
 * both the actions and the forms can import it.
 */
export type AuthFormState = {
  /** `idle` until the visitor submits; `not-configured` is a real, terminal state. */
  status: 'idle' | 'not-configured';
  /** Field-level messages, keyed by field name. */
  errors: FieldErrors;
  /** Visible and announced status line. */
  message: string;
  /** Which provider the visitor asked to use, if any. */
  provider: 'google' | 'github' | null;
};

/** The state a form holds before the visitor has done anything. */
export const IDLE_STATE: AuthFormState = {
  status: 'idle',
  errors: {},
  message: '',
  provider: null,
};
