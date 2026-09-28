/**
 * Authentication contract.
 *
 * The Arrival Chamber ships its interface now; the identity provider is a
 * deployment decision that has not been made. This module is the seam between
 * the two, and it is deliberately provider-neutral so wiring Supabase, Auth.js,
 * Clerk or an in-house issuer later is a change to one file rather than a
 * change to the interface.
 *
 * The single rule this module exists to enforce: with no provider configured,
 * every operation resolves to `not-configured`. It never returns success,
 * never mints a token, never persists a session and never reports a session
 * that does not exist. The same discipline the request intake endpoint already
 * applies when `CONTACT_WEBHOOK_URL` is absent.
 */

/** Terminal states a real provider would resolve to. */
export type AuthOutcome =
  | { status: 'not-configured' }
  | { status: 'invalid'; message: string }
  | { status: 'success'; message: string };

export type SignInInput = {
  email: string;
  password: string;
  remember: boolean;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
};

export type PasswordResetInput = {
  email: string;
};

/**
 * Providers are detected from server-side environment only. The browser bundle
 * never sees these names, so a service-role key cannot be shipped to a client
 * by this module even if one is later added to the environment.
 */
const PROVIDER_SIGNALS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'NEXTAUTH_SECRET',
  'AUTH_SECRET',
  'CLERK_PUBLISHABLE_KEY',
  'FIREBASE_API_KEY',
] as const;

/**
 * True only when a real identity provider has been configured for this
 * deployment. Read on the server; the result is passed to the client as a
 * plain boolean, never as the environment itself.
 */
export function isAuthConfigured(): boolean {
  return PROVIDER_SIGNALS.some((name) => Boolean(process.env[name]));
}

/**
 * The unconfigured adapter.
 *
 * `signIn` and `signUp` are the two operations that must never be faked, so
 * they resolve to `not-configured` and the message the interface shows is
 * stated here rather than in the form, keeping the wording in one place.
 */
export const unconfiguredProvider = {
  async signIn(_input: SignInInput): Promise<AuthOutcome> {
    return { status: 'not-configured' };
  },
  async signUp(_input: SignUpInput): Promise<AuthOutcome> {
    return { status: 'not-configured' };
  },
  async requestPasswordReset(_input: PasswordResetInput): Promise<AuthOutcome> {
    return { status: 'not-configured' };
  },
  /**
   * Password recovery genuinely cannot be performed without a mail transport,
   * so the interface states that plainly instead of implying a message was
   * sent. A configured provider replaces this with its own transport.
   */
  resetDeliveryNote: 'No recovery mail transport is configured on this deployment.',
} as const;
