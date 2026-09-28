import type { FieldErrors } from '@/lib/auth/validation';

export type AuthFormState = {
  status: 'idle' | 'success' | 'error' | 'not-configured';
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
