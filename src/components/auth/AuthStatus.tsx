'use client';

import type { AuthFormState } from '@/lib/auth/state';

/**
 * Auth status.
 *
 * A single live region for the whole form, so a screen reader hears the outcome
 * of a submission once and in order, instead of a validation message per field
 * competing with each other.
 *
 * It is a status region rather than an alert: the outcome is the expected
 * result of pressing the button, so it is announced politely. Errors that block
 * the submission are also tied to their fields through `aria-describedby`, so
 * nothing is conveyed by this region alone.
 *
 * The unavailable state is stated as a fact about the deployment. It is never
 * dressed as a success, and it never claims a message was sent.
 */
export function AuthStatus({ state }: { state: AuthFormState }) {
  const unavailable = state.status === 'not-configured';
  const invalid = state.message !== '' && !unavailable;

  return (
    <p
      className={`auth-status ${unavailable ? 'auth-status--unavailable' : ''} ${
        invalid ? 'auth-status--error' : ''
      }`}
      // Assertive is wrong here: this reports the result of a deliberate
      // action, so it must not interrupt whatever the visitor is reading.
      role="status"
      aria-live="polite"
      data-stagger="status"
    >
      {unavailable ? (
        <>
          <span className="auth-status__rule" aria-hidden="true" />
          <span className="auth-status__text">
            {state.message}
            {state.provider ? ` ${providerName(state.provider)} is not connected either.` : ''}
          </span>
        </>
      ) : (
        <>
          {/* Idle: a full-width hairline rather than a lone tick. It keeps the
              reserved line reading as part of the composition, and there is
              nothing vertical and orphaned sitting next to nothing. */}
          {state.message ? <span className="auth-status__rule" aria-hidden="true" /> : null}
          {state.message ? null : <span className="auth-status__idle" aria-hidden="true" />}
          <span className="auth-status__text">{state.message}</span>
        </>
      )}
    </p>
  );
}

function providerName(provider: 'google' | 'github') {
  return provider === 'google' ? 'Google sign-in' : 'GitHub sign-in';
}
