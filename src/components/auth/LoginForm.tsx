'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signInAction } from '@/lib/auth/actions';
import { IDLE_STATE } from '@/lib/auth/state';
import { AuthField } from '@/components/auth/AuthField';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthSubmit, ProviderButtons } from '@/components/auth/ProviderButtons';
import { ChamberIdentity } from '@/components/auth/ChamberIdentity';

/**
 * Sign in.
 *
 * The chamber's primary surface. The submit path is a Server Action, so the
 * credentials are judged on the server and the answer comes back as state the
 * interface renders. Nothing about the outcome is decided in the browser.
 */
export function LoginForm({ callbackError = false }: { callbackError?: boolean }) {
  const initialState = callbackError
    ? { ...IDLE_STATE, status: 'error' as const, message: 'Provider sign-in could not be completed. Please try again.' }
    : IDLE_STATE;
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form className="auth-form" action={formAction} noValidate>
      <ChamberIdentity index="01" />
      <h1 className="auth-form__heading" id="login-heading" data-stagger="heading">
        Access KNOuX
      </h1>
      <p className="auth-form__statement" data-stagger="statement">
        Enter the headquarters.
      </p>

      <AuthField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.errors.email}
      />

      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        toggleable
        error={state.errors.password}
      />

      <div className="auth-form__options" data-stagger="options">
        <span className="auth-form__session-note">Secure session via Supabase</span>
        <Link className="auth-link" href="/forgot-password">
          Forgot password
        </Link>
      </div>

      <AuthSubmit pendingLabel="Checking…">Sign In</AuthSubmit>

      <AuthStatus state={state} />

      <ProviderButtons />

      <p className="auth-form__foot" data-stagger="foot">
        No account yet?{' '}
        <Link className="auth-link" href="/register">
          Create one
        </Link>
      </p>
    </form>
  );
}
