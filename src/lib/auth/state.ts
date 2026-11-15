import type { FieldErrors } from '@/lib/auth/validation';

export type AuthFormState = {
  status: 'idle' | 'not-configured' | 'error' | 'success';
  errors: FieldErrors;
  message: string;
  provider: 'google' | 'github' | null;
};

export const IDLE_STATE: AuthFormState = {
  status: 'idle',
  errors: {},
  message: '',
  provider: null,
};
