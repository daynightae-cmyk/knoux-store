'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signInAction } from '@/lib/auth/actions';
import { IDLE_STATE } from '@/lib/auth/state';
import type { AuthCapabilities } from '@/lib/auth/capabilities';
import { AuthField } from '@/components/auth/AuthField';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthSubmit, ProviderButtons } from '@/components/auth/ProviderButtons';
import { ChamberIdentity } from '@/components/auth/ChamberIdentity';

export function LoginForm({ capabilities }: { capabilities: AuthCapabilities }) {
  const [state, formAction] = useActionState(signInAction, IDLE_STATE);

  return (
    <div className="auth-form">
      <ChamberIdentity index="01" />
      <h1 className="auth-form__heading" id="login-heading" data-stagger="heading">Access KNOuX</h1>
      <p className="auth-form__statement" data-stagger="statement">Enter the headquarters.</p>

      <form className="auth-credentials" action={formAction} noValidate>
        <AuthField label="Email" name="email" type="email" autoComplete="email" error={state.errors.email} />
        <AuthField label="Password" name="password" type="password" autoComplete="current-password" toggleable error={state.errors.password} />
        <div className="auth-form__options" data-stagger="options">
          <span className="auth-session-note">Session stays active until you sign out.</span>
          <Link className="auth-link" href="/forgot-password">Forgot password</Link>
        </div>
        <AuthSubmit pendingLabel="Signing in…">Sign In</AuthSubmit>
        <AuthStatus state={state} />
      </form>

      <ProviderButtons capabilities={capabilities} />

      <p className="auth-form__foot" data-stagger="foot">
        No account yet? <Link className="auth-link" href="/register">Create one</Link>
      </p>
    </div>
  );
}
