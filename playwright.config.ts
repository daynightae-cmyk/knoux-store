import { defineConfig, devices } from '@playwright/test';

/**
 * Browser verification for KNOuX.
 *
 * The previous audit never ran a browser, so nothing in the repository could
 * evidence a claim about layout, responsiveness or accessibility. This is that
 * capability, and it is deliberately small: one browser, a production build,
 * and assertions about properties that are either true or false rather than
 * about how a page looks today.
 *
 * Three things are checked, and they are different kinds of claim:
 *
 *   routes      every primary route renders, with its heading and landmarks
 *   geometry    no horizontal overflow at any supported width, and no dead
 *               region that a viewport measurement can justify
 *   a11y        an automated axe pass, which finds machine-detectable problems
 *               and explicitly cannot find most of the rest
 *
 * Screenshots are written for every route at every class of width so a human
 * can review what the numbers mean. They are evidence, not a snapshot test:
 * a visual-regression baseline would fail on any deliberate change, and this
 * branch contains deliberate changes.
 *
 * The production build is used rather than `next dev` because a dev server
 * compiles on demand, serves unbundled modules and adds HMR. None of that is
 * what a visitor receives.
 */

const PORT = Number(process.env.KNOUX_E2E_PORT ?? 3311);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'e2e/.artifacts/report.json' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    ...(process.env.KNOUX_E2E_BROWSER_CHANNEL === 'chrome' ? { channel: 'chrome' } : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Reduced motion is honoured throughout: the suite must not be measuring an
    // animation that a user has asked the system not to run.
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, isMobile: false },
    },
    {
      name: 'mobile',
      // A real mobile profile, not a narrow desktop window: the user agent,
      // touch points and device scale all change what a page must handle.
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: `npx next start -p ${PORT} -H 127.0.0.1`,
    url: BASE_URL,
    // A server from another checkout can serve stale HTML against new assets.
    // Occupied ports must fail instead of silently reusing an unknown process.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // The workspace boundary is exercised as a deployment would answer, so
      // the browser suite sees the same 401 a public visitor would.
      VERCEL_ENV: 'production',
    },
  },
});
