'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signUpAction } from '@/lib/auth/actions';
import { IDLE_STATE } from '@/lib/auth/state';
import type { AuthCapabilities } from '@/lib/auth/capabilities';
import { AuthField } from '@/components/auth/AuthField';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthSubmit, ProviderButtons } from '@/components/auth/ProviderButtons';
import { ChamberIdentity } from '@/components/auth/ChamberIdentity';

export function RegisterForm({ capabilities }: { capabilities: AuthCapabilities }) {
  const [state, formAction] = useActionState(signUpAction, IDLE_STATE);

  return (
    <div className="auth-form">
      <ChamberIdentity index="02" />
      <h1 className="auth-form__heading" id="register-heading" data-stagger="heading">Open an account</h1>
      <p className="auth-form__statement" data-stagger="statement">One identity for the KNOuX systems you use.</p>

      <form className="auth-credentials" action={formAction} noValidate>
        <AuthField label="Full name" name="name" autoComplete="name" error={state.errors.name} />
        <AuthField label="Email" name="email" type="email" autoComplete="email" error={state.errors.email} />
        <AuthField label="Password" name="password" type="password" autoComplete="new-password" toggleable error={state.errors.password} />
        <AuthField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" toggleable error={state.errors.confirmPassword} />
        <AuthSubmit pendingLabel="Creating…">Create Account</AuthSubmit>
        <AuthStatus state={state} />
      </form>

      <ProviderButtons capabilities={capabilities} />

      <p className="auth-form__foot" data-stagger="foot">
        Already have an account? <Link className="auth-link" href="/login">Sign in</Link>
      </p>
    </div>
  );
}
