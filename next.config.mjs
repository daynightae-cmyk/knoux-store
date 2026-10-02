import { buildSecurityHeaders } from './src/lib/security/headers.ts';

const isDevelopment = process.env.NODE_ENV !== 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Advertising the framework is free reconnaissance. The header is a
  // compatibility signal for nobody on a site with no framework-specific
  // consumer.
  poweredByHeader: false,
  // Lets a local verification build run beside another checkout or a running
  // dev server without the two fighting over the same build directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  /**
   * Applied to every response, including the routes the workspace guard
   * refuses. A 401 that carries no policy is still a 401 a browser will render.
   */
  async headers() {
    const security = buildSecurityHeaders({
      isDevelopment,
      canonicalOrigin: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://knoux.store',
    });

    return [
      { source: '/:path*', headers: security },
      { source: '/build/:path*', headers: buildSecurityHeaders({ isDevelopment, canonicalOrigin: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://knoux.store', bridgeOrigin: process.env.KNOUX_BRIDGE_URL }) },
      // Static assets are content-addressed. Marking them immutable is a
      // performance decision, not a security one, so it lives on its own rule.
      {
        source: '/:path*.(svg|png|jpg|jpeg|webp|avif|ico|woff|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
