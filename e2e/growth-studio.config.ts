import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/** Owned fixture server. External intake transports are explicitly absent. */
export default defineConfig({
  testDir: '.',
  testMatch: 'growth-studio.spec.ts',
  outputDir: './.artifacts/growth',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: fileURLToPath(new URL('./.artifacts/growth-report.json', import.meta.url)) }]],
  use: { baseURL: 'http://127.0.0.1:3415', ...(process.env.KNOUX_E2E_BROWSER_CHANNEL ? { channel: process.env.KNOUX_E2E_BROWSER_CHANNEL } : {}), viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command: 'npx next start -p 3415 -H 127.0.0.1',
    url: 'http://127.0.0.1:3415',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VERCEL_ENV: 'production', KNOUX_GROWTH_DATA_SOURCE: 'fixture', KNOUX_GROWTH_AUTH_ENFORCED: 'false', RESEND_API_KEY: '', CONTACT_WEBHOOK_URL: '' },
  },
});
