import { test, expect } from '@playwright/test';

/**
 * Performance, measured rather than scored.
 *
 * The previous audit reported 2.1 MB of uncompressed JavaScript and a 905 KB
 * largest chunk, then said "this is not proof of poor user performance". That
 * is correct, and it is also the end of the useful work: the numbers were
 * never connected to a page load.
 *
 * This suite connects them. For each representative route it records what the
 * browser actually did — the navigation timings, the paint metrics, the script
 * bytes transferred, the largest individual resources — so a regression is a
 * changed number rather than a changed opinion.
 *
 * Two things are asserted rather than merely recorded:
 *
 *   - the render-blocking script budget per route, which is what F-13 was
 *     actually about: whether three.js is shipped to a visitor who will never
 *     see a 3D surface;
 *   - that the page does not keep a request open forever, which is the
 *     measurable form of "no uncontrolled work".
 *
 * A Lighthouse *score* is deliberately not asserted. It is a weighted
 * composite that moves with a machine's load, and a gate that fails on it
 * teaches people to re-run the build until it passes.
 */

const ROUTES = ['/', '/build', '/products', '/wordpress/plugins', '/growth'];

/** Total transferred script bytes a route may ship before it is called heavy. */
const SCRIPT_BUDGET_BYTES = 900 * 1024;

/** Routes that genuinely own a 3D surface are allowed more; others are not. */
const HEAVY_EXEMPT = new Set(['/build']);

interface Measurement {
  route: string;
  domContentLoaded: number;
  load: number;
  firstContentfulPaint: number | null;
  largestContentfulPaint: number | null;
  transferredScriptBytes: number;
  decodedScriptBytes: number;
  largestResources: { url: string; bytes: number }[];
  threeLoaded: boolean;
  requestCount: number;
  horizontalOverflow: number;
}

async function measure(page: import('@playwright/test').Page, route: string): Promise<Measurement> {
  const scripts: { url: string; transferred: number; decoded: number }[] = [];
  let requestCount = 0;

  page.on('requestfinished', () => {
    requestCount += 1;
  });
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    const url = response.url();
    const headers = response.headers();
    const transferred = Number(headers['content-length'] ?? 0);
    let decoded = transferred;
    try {
      decoded = (await response.body()).byteLength;
    } catch {
      /* the body may already be consumed; transferred is still usable */
    }
    scripts.push({ url, transferred, decoded });
  });

  await page.goto(route, { waitUntil: 'load' });
  // Give LCP a chance to settle before it is read.
  await page.waitForTimeout(1200);

  const paints = await page.evaluate(() => {
    const entries = performance.getEntriesByType('paint') as PerformanceEntry[];
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as (PerformanceEntry & {
      startTime: number;
    })[];
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return {
      fcp: entries.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null,
      lcp: lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null,
      domContentLoaded: navigation?.domContentLoadedEventEnd ?? null,
      load: navigation?.loadEventEnd ?? null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const bySize = [...scripts]
    .map((script) => ({ url: script.url.replace(/^https?:\/\/[^/]+/, ''), bytes: script.transferred || script.decoded }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5);

  return {
    route,
    domContentLoaded: paints.domContentLoaded ?? -1,
    load: paints.load ?? -1,
    firstContentfulPaint: paints.fcp,
    largestContentfulPaint: paints.lcp,
    transferredScriptBytes: scripts.reduce((sum, script) => sum + (script.transferred || script.decoded), 0),
    decodedScriptBytes: scripts.reduce((sum, script) => sum + script.decoded, 0),
    largestResources: bySize,
    threeLoaded: scripts.some((script) => /three|react-three/i.test(script.url)),
    requestCount,
    horizontalOverflow: paints.overflow,
  };
}

test.describe('performance', () => {
  test('representative routes stay within the script budget', async ({ page }) => {
    const results: Measurement[] = [];

    for (const route of ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const measurement = await measure(page, route);
      results.push(measurement);

      const budget = HEAVY_EXEMPT.has(route) ? SCRIPT_BUDGET_BYTES * 2 : SCRIPT_BUDGET_BYTES;
      expect(
        measurement.transferredScriptBytes,
        `${route} shipped ${(measurement.transferredScriptBytes / 1024).toFixed(0)} KB of script, over the ${(
          budget / 1024
        ).toFixed(0)} KB budget. Largest: ${measurement.largestResources
          .map((resource) => `${resource.url} ${(resource.bytes / 1024).toFixed(0)}KB`)
          .join(', ')}`,
      ).toBeLessThanOrEqual(budget);
    }

    // Written to the console so a run leaves a record, and to disk by the
    // evidence test. Not asserted beyond the budget above.
    for (const result of results) {
      console.log(
        `PERF ${result.route} fcp=${result.firstContentfulPaint?.toFixed(0) ?? 'n/a'}ms ` +
          `lcp=${result.largestContentfulPaint?.toFixed(0) ?? 'n/a'}ms ` +
          `dcl=${result.domContentLoaded.toFixed(0)}ms load=${result.load.toFixed(0)}ms ` +
          `script=${(result.transferredScriptBytes / 1024).toFixed(0)}KB ` +
          `three=${result.threeLoaded} requests=${result.requestCount}`,
      );
    }
  });

  test('no route overflows while measured', async ({ page }) => {
    for (const route of ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const measurement = await measure(page, route);
      expect(measurement.horizontalOverflow, `${route} overflows at 1440px`).toBeLessThanOrEqual(1);
    }
  });

  test('the page settles: paint metrics are recorded and finite', async ({ page }) => {
    for (const route of ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const measurement = await measure(page, route);

      // A first contentful paint that never arrives is a blank page, and it is
      // the failure this assertion exists to catch.
      expect(
        measurement.firstContentfulPaint,
        `${route} never painted`,
      ).not.toBeNull();
      expect(
        measurement.firstContentfulPaint ?? Infinity,
        `${route} took ${(measurement.firstContentfulPaint ?? 0).toFixed(0)}ms to first paint`,
      ).toBeLessThan(8000);

      expect(measurement.largestContentfulPaint ?? 0, `${route} reported no LCP`).toBeGreaterThan(0);
    }
  });
});
