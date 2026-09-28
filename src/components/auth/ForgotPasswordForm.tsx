'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordResetAction } from '@/lib/auth/actions';
import { IDLE_STATE } from '@/lib/auth/state';
import { AuthField } from '@/components/auth/AuthField';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthSubmit } from '@/components/auth/ProviderButtons';
import { ChamberIdentity } from '@/components/auth/ChamberIdentity';

/**
 * Password recovery.
 *
 * Deliberately does not say a message has been sent. No mail transport is
 * configured, so the action reports the deployment's real state and the page
 * never implies a recovery email is on its way.
 */
export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, IDLE_STATE);

  return (
    <form className="auth-form" action={formAction} noValidate>
      <ChamberIdentity index="03" />
      <h1 className="auth-form__heading" id="forgot-heading" data-stagger="heading">
        Reset your password
      </h1>
      <p className="auth-form__statement" data-stagger="statement">
        State the address on the account and the chamber will say what it can do.
      </p>

      <AuthField label="Email" name="email" type="email" autoComplete="email" error={state.errors.email} />

      <AuthSubmit pendingLabel="Checkingâ€¦">Request Reset</AuthSubmit>

      <AuthStatus state={state} />

      <p className="auth-form__foot" data-stagger="foot">
        <Link className="auth-link" href="/login">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
