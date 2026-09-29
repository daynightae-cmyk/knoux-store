/**
 * Response security policy.
 *
 * Every directive here is derived from something the application actually
 * does. A CSP written by copying a generic template is a CSP that either breaks
 * the site or, worse, is quietly widened until it does not. The evidence this
 * file is built from:
 *
 *   fonts        system stack only — `--sans: Arial, Helvetica, sans-serif`
 *                and friends. No `next/font`, no `@font-face`, no webfont host.
 *   images       every third-party image is requested through `/api/wp-image`,
 *                so the browser only ever loads an image from this origin.
 *   frames       the workspace previews are same-origin (`/products/[slug]`).
 *   connect      the Supabase browser client is the only outbound call the
 *                bundle makes, so only the project's own origin is allowed.
 *   scripts      Next.js emits a per-page inline hydration payload and the
 *                chamber boot marker is an inline script, so `'unsafe-inline'`
 *                is present. See the note below.
 *   styles       React inline `style` props are used throughout the interface.
 *
 * On `'unsafe-inline'` for scripts, stated plainly rather than buried:
 *
 * The strict alternative is a per-request nonce, which Next.js supports through
 * `proxy.ts`. It is not used here because a nonce can only be attached during
 * a request, so every page would have to become dynamically rendered: no static
 * generation, no CDN caching, no `Cache-Control` reuse, and a server round trip
 * for every public page. That is a real cost on a site whose public half is
 * entirely static, and it is a deliberate trade rather than an oversight.
 *
 * What the policy still buys, and what it does not, is recorded in
 * `audit/closure/FINAL_CLOSURE_REPORT.md`. Do not read a green header check as
 * "the application is XSS-proof"; it is a restriction policy, not a proof.
 *
 * Pure and framework-free, so the policy can be asserted on directly.
 */

export type HeaderPolicyOptions = {
  isDevelopment: boolean;
  /** Public origin, used only for HSTS. Absent on a local run. */
  canonicalOrigin?: string | undefined;
};

export type Header = { key: string; value: string };

/** The Supabase project the browser client talks to. */
const SUPABASE_ORIGIN = 'https://cnkddxxhcfceokxzaaot.supabase.co';

export function buildContentSecurityPolicy(options: HeaderPolicyOptions): string {
  const dev = options.isDevelopment;

  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    // React uses `eval` in development to reconstruct server stack traces in the
    // browser. It does not in production, so the escape hatch is not shipped.
    ['script-src', dev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'", "'unsafe-inline'"]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    // All third-party imagery is same-origin through the proxy.
    ['img-src', ["'self'", 'blob:', 'data:']],
    ['font-src', ["'self'", 'data:']],
    // Supabase auth: HTTPS for REST and a WebSocket for realtime.
    ['connect-src', ["'self'", SUPABASE_ORIGIN, 'wss://cnkddxxhcfceokxzaaot.supabase.co']],
    // Workspace previews frame this origin only.
    ['frame-src', ["'self'"]],
    ['worker-src', ["'self'", 'blob:']],
    ['manifest-src', ["'self'"]],
    // No plugin content, ever.
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    // A form may only post to this origin, which also covers the server
    // actions behind it.
    ['form-action', ["'self'"]],
    // Product previews are framed by this origin. Foreign origins remain
    // blocked; X-Frame-Options mirrors this for older browsers.
    ['frame-ancestors', ["'self'"]],
  ];

  // A development page is served over plain http on localhost; telling the
  // browser to upgrade it would break the dev server.
  if (!dev) directives.push(['upgrade-insecure-requests', []]);

  return directives
    .map(([name, values]) => (values.length ? `${name} ${values.join(' ')}` : name))
    .join('; ');
}

export function buildSecurityHeaders(options: HeaderPolicyOptions): Header[] {
  const headers: Header[] = [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      // The site asks for no device capability. `self` is granted for the
      // clipboard only, because the workspace copies a build report.
      value: 'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), xr-spatial-tracking=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ];

  // HSTS is only meaningful — and only safe — over a real origin. Emitting it
  // from a `localhost` dev server would pin `localhost` to https in the
  // developer's own browser profile.
  if (!options.isDevelopment && options.canonicalOrigin) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }

  return headers;
}
