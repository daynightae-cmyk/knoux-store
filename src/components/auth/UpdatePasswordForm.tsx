'use client';

import { useActionState } from 'react';
import { updatePasswordAction } from '@/lib/auth/actions';
import { IDLE_STATE } from '@/lib/auth/state';
import { AuthField } from '@/components/auth/AuthField';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthSubmit } from '@/components/auth/ProviderButtons';
import { ChamberIdentity } from '@/components/auth/ChamberIdentity';

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, IDLE_STATE);

  return (
    <form className="auth-form" action={formAction} noValidate>
      <ChamberIdentity index="04" />
      <h1 className="auth-form__heading" id="update-password-heading" data-stagger="heading">
        Choose a new password
      </h1>
      <p className="auth-form__statement" data-stagger="statement">
        This session came from a verified recovery link.
      </p>
      <AuthField label="New password" name="password" type="password" autoComplete="new-password" toggleable error={state.errors.password} />
      <AuthField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" toggleable error={state.errors.confirmPassword} />
      <AuthSubmit pendingLabel="Updating…">Update Password</AuthSubmit>
      <AuthStatus state={state} />
    </form>
  );
}
