'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signUpAction } from '@/lib/auth/actions';
import { IDLE_STATE } from '@/lib/auth/state';
import { AuthField } from '@/components/auth/AuthField';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthSubmit } from '@/components/auth/ProviderButtons';
import { ChamberIdentity } from '@/components/auth/ChamberIdentity';

/**
 * Create an account.
 *
 * The same chamber, the same field component, the same status region as sign
 * in. Only the field set and the heading differ, so the three auth routes read
 * as one system rather than three pages that happen to be about accounts.
 */
export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, IDLE_STATE);

  return (
    <form className="auth-form" action={formAction} noValidate>
      <ChamberIdentity index="02" />
      <h1 className="auth-form__heading" id="register-heading" data-stagger="heading">
        Open an account
      </h1>
      <p className="auth-form__statement" data-stagger="statement">
        One identity for the KNOuX systems you use.
      </p>

      <AuthField label="Full name" name="name" autoComplete="name" error={state.errors.name} />

      <AuthField label="Email" name="email" type="email" autoComplete="email" error={state.errors.email} />

      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        toggleable
        error={state.errors.password}
      />

      <AuthField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        toggleable
        error={state.errors.confirmPassword}
      />

      <AuthSubmit pendingLabel="Checkingâ€¦">Create Account</AuthSubmit>

      <AuthStatus state={state} />

      <p className="auth-form__foot" data-stagger="foot">
        Already have an account?{' '}
        <Link className="auth-link" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
