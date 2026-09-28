'use client';

import type { AuthFormState } from '@/lib/auth/state';

export function AuthStatus({ state }: { state: AuthFormState }) {
  const unavailable = state.status === 'not-configured';
  const success = state.status === 'success';
  const error = state.status === 'error';

  return (
    <p
      className={[
        'auth-status',
        unavailable ? 'auth-status--unavailable' : '',
        success ? 'auth-status--success' : '',
        error ? 'auth-status--error' : '',
      ].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      data-stagger="status"
    >
      {state.message ? <span className="auth-status__rule" aria-hidden="true" /> : <span className="auth-status__idle" aria-hidden="true" />}
      <span className="auth-status__text">{state.message}</span>
    </p>
  );
}
