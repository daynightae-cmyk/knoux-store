'use client';

import type { AuthFormState } from '@/lib/auth/state';

export function AuthStatus({ state }: { state: AuthFormState }) {
  const unavailable = state.status === 'not-configured';
  const error = state.status === 'error';
  const success = state.status === 'success';

  const classes = [
    'auth-status',
    unavailable ? 'auth-status--unavailable' : '',
    error ? 'auth-status--error' : '',
    success ? 'auth-status--success' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <p className={classes} role="status" aria-live="polite" data-stagger="status">
      {state.message ? <span className="auth-status__rule" aria-hidden="true" /> : <span className="auth-status__idle" aria-hidden="true" />}
      <span className="auth-status__text">
        {state.message}
        {unavailable && state.provider ? ' ' + providerName(state.provider) + ' is unavailable.' : ''}
      </span>
    </p>
  );
}

function providerName(provider: 'google' | 'github') {
  return provider === 'google' ? 'Google sign-in' : 'GitHub sign-in';
}
