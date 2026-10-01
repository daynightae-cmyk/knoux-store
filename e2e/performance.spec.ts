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

const ROUTES = ['/', '/build', '/products', '/wordpress/plugins', '/growth', '/work'];

/** Total transferred script bytes a route may ship before it is called heavy. */
const SCRIPT_BUDGET_BYTES = 900 * 1024;

/**
 * How long a route is given to present its 3D surface before it is recorded as
 * having none.
 *
 * This exists because the surface is mounted by a `dynamic()` import of three.js
 * behind a client boundary, so it appears some time after `load`. Reading the
 * DOM at a fixed moment made the answer a race, and a race in this particular
 * assertion is expensive: `ownsCanvas` selects the budget, so losing the race
 * halves the allowance on the heaviest route in the suite and reports a
 * plausible-looking byte overage instead of the real defect.
 */
const THREE_SURFACE_TIMEOUT_MS = 8_000;

/**
 * What the route actually presented for its 3D surface, once settled.
 *
 * `canvas`    a sized canvas, so the route is genuinely drawing in 3D.
 * `fallback`  the static identity the mark renders when WebGL is unavailable.
 *             Still 3D weight on the wire, so the exemption still applies.
 * `absent`    nothing. A route that ships three.js and presents no surface has
 *             leaked 3D weight onto a page that never draws it, which is the
 *             regression this budget exists to catch.
 */
type ThreeSurface = 'canvas' | 'fallback' | 'absent';

interface Measurement {
  route: string;
  domContentLoaded: number;
  load: number;
  firstContentfulPaint: number | null;
  largestContentfulPaint: number | null;
  transferredScriptBytes: number;
  decodedScriptBytes: number;
  largestResources: { url: string; bytes: number }[];
  /** What the route settled on for its 3D surface. */
  threeSurface: ThreeSurface;
  /**
   * Whether the route shipped more script than a page with no 3D surface may.
   *
   * Recorded rather than asserted inline, because the diagnosis for "over
   * budget" and the diagnosis for "3D weight with nothing to show for it" are
   * different problems with different fixes, and a run that merges them into
   * one byte count sends the reader to the wrong file.
   */
  exceedsBaseBudget: boolean;
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

  /**
   * Wait for the 3D surface to present, then record what it is.
   *
   * The previous version asked `document.querySelectorAll('canvas').length > 0`
   * at one instant, which is a question with two answers. The mark and the DEV
   * hero both mount their canvas from a `dynamic()` import behind a client
   * boundary, so on a slow runner the honest answer at 1.2s is "not yet" — and
   * "not yet" was silently treated as "this page has no 3D surface", which
   * halved the budget on the heaviest route in the suite and turned a timing
   * detail into a red gate.
   *
   * So the wait is explicit and bounded, and the recorded state distinguishes
   * three outcomes rather than two. A canvas that mounted but has no layout box
   * does not count: `display: none` or a zero-size host is not a surface a
   * visitor ever saw, and letting it earn the exemption would reintroduce the
   * same hole from the other direction.
   */
  const threeSurface = await settleThreeSurface(page);

  const paints = await page.evaluate(() => {
    const entries = performance.getEntriesByType('paint') as PerformanceEntry[];
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return {
      fcp: entries.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null,
      /**
       * LCP is read from the observer installed before navigation, not from
       * `getEntriesByType`.
       *
       * `largest-contentful-paint` is a buffered-only entry type: it is never
       * appended to the performance timeline, so `getEntriesByType` returns an
       * empty array for it and the previous version of this file reported "no
       * LCP" for every route while the pages painted in under 400ms. The
       * observer is registered by `installLargestContentfulPaint` before the
       * document loads, which is the only way to capture the value.
       */
      lcp: (window as unknown as { __knouxLcp: number | null }).__knouxLcp,
      domContentLoaded: navigation?.domContentLoadedEventEnd ?? null,
      load: navigation?.loadEventEnd ?? null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const bySize = [...scripts]
    .map((script) => ({ url: script.url.replace(/^https?:\/\/[^/]+/, ''), bytes: script.transferred || script.decoded }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5);

  const transferredScriptBytes = scripts.reduce((sum, script) => sum + (script.transferred || script.decoded), 0);

  return {
    route,
    domContentLoaded: paints.domContentLoaded ?? -1,
    load: paints.load ?? -1,
    firstContentfulPaint: paints.fcp,
    largestContentfulPaint: paints.lcp,
    transferredScriptBytes,
    decodedScriptBytes: scripts.reduce((sum, script) => sum + script.decoded, 0),
    largestResources: bySize,
    threeSurface,
    exceedsBaseBudget: transferredScriptBytes > SCRIPT_BUDGET_BYTES,
    requestCount,
    horizontalOverflow: paints.overflow,
  };
}

/**
 * What the route presents for 3D, once it has had its chance to present it.
 *
 * Three outcomes, because "has a canvas" was never the question the budget was
 * asking. The budget asks whether three.js on the wire is being spent on
 * something a visitor sees, and a page that ships three.js and then renders
 * the static fallback is spending it on a mark — just not an animated one. A
 * page that ships three.js and presents nothing at all is not.
 */
async function settleThreeSurface(page: import('@playwright/test').Page): Promise<ThreeSurface> {
  const read = () =>
    page.evaluate(() => {
      const sized = Array.from(document.querySelectorAll('canvas')).some((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (sized) return 'canvas' as const;
      // The mark's own static identity: a real 3D surface, deliberately not
      // animated because the browser cannot draw one.
      if (document.querySelector('.mark-fallback')) return 'fallback' as const;
      return 'absent' as const;
    });

  try {
    // `waitForFunction` rather than a sleep, so a route that presents its
    // surface immediately does not pay the full timeout, and a route that never
    // presents one is recorded as absent instead of being retried forever.
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('canvas')).some((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }) || document.querySelector('.mark-fallback') !== null,
      undefined,
      { timeout: THREE_SURFACE_TIMEOUT_MS },
    );
  } catch {
    // No surface within the budget. `read()` below reports that honestly.
  }

  return read();
}

/**
 * Installed before any document script runs, so no paint is missed.
 *
 * `buffered: true` replays candidates that were emitted before this observer
 * existed, which matters because a registration after `goto` would miss exactly
 * the element the measurement is about.
 */
async function installLargestContentfulPaint(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as { __knouxLcp: number | null };
    target.__knouxLcp = null;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) target.__knouxLcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // A browser without the API leaves the value null, and the assertion
      // below reports that honestly rather than passing on a zero.
    }
  });
}

test.describe('performance', () => {
  test.beforeEach(async ({ page }) => {
    await installLargestContentfulPaint(page);
  });

  test('representative routes stay within the script budget', async ({ page }) => {
    const results: Measurement[] = [];

    for (const route of ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const measurement = await measure(page, route);
      results.push(measurement);

      /**
       * The budget is derived from what the page actually presented, not from a
       * list of routes someone typed.
       *
       * An earlier version tried to detect three.js by matching the chunk URL
       * against `/three|react-three/`. A production chunk is named by content
       * hash — the one that matters here is `0j2l0w73kdknw.js` — so the test
       * never detected it, never granted the exemption, and reported the
       * homepage as over budget while the homepage was legitimately showing its
       * 3D mark. Matching a build artefact by name is not a measurement. A
       * surface in the settled document is.
       *
       * `fallback` earns the exemption alongside `canvas` because the mark is
       * still there: the browser simply cannot animate it. A visitor sees the
       * identity either way, so three.js on the wire is not waste.
       */
      const budget =
        measurement.threeSurface === 'canvas' || measurement.threeSurface === 'fallback'
          ? SCRIPT_BUDGET_BYTES * 2
          : SCRIPT_BUDGET_BYTES;
      expect(
        measurement.transferredScriptBytes,
        `${route} shipped ${(measurement.transferredScriptBytes / 1024).toFixed(0)} KB of script, over the ${(
          budget / 1024
        ).toFixed(0)} KB budget. 3D surface: ${measurement.threeSurface}. Largest: ${measurement.largestResources
          .map((resource) => `${resource.url} ${(resource.bytes / 1024).toFixed(0)}KB`)
          .join(', ')}`,
      ).toBeLessThanOrEqual(budget);

      /**
       * And the exemption is paired with the assertion that 3D only ships where
       * it is used.
       *
       * A hand-maintained list of heavy routes is a list that goes stale: a
       * route becomes exempt because someone typed its name, and a regression
       * that leaks three.js onto a page with no surface passes anyway. Deriving
       * the exemption from what the page actually presented means a route can
       * only be heavy if it is genuinely showing 3D, and any route that gains a
       * surface without gaining weight fails the same run.
       *
       * This is checked as its own assertion, and named as a missing 3D
       * surface rather than as a byte overage, because those are different
       * bugs. A page over the base budget with a surface is allowed to be
       * heavy. A page over the base budget with *no* surface shipped three.js
       * to a visitor who will never see it, and the fix is a lazy boundary in
       * the component — not a bigger number in this file. Reporting it as
       * "869 KB over budget" sent the reader to the wrong file, which is how a
       * real defect survives a run that noticed it.
       */
      if (measurement.threeSurface === 'absent' && measurement.exceedsBaseBudget) {
        expect(
          measurement.transferredScriptBytes,
          `${route} shipped ${(measurement.transferredScriptBytes / 1024).toFixed(0)} KB of script but presented ` +
            `no 3D surface at any point within ${THREE_SURFACE_TIMEOUT_MS / 1000}s of load, so none of that weight ` +
            `is spent on anything a visitor sees. This is a missing 3D surface, not a budget to raise: either the ` +
            `surface failed to mount, or weight that belongs behind a lazy boundary is being fetched eagerly. ` +
            `Largest: ${measurement.largestResources
              .map((resource) => `${resource.url} ${(resource.bytes / 1024).toFixed(0)}KB`)
              .join(', ')}`,
        ).toBeLessThanOrEqual(SCRIPT_BUDGET_BYTES);
      }
    }

    // Written to the console so a run leaves a record, and to disk by the
    // evidence test. Not asserted beyond the budget above. The surface state is
    // in the line because it is what explains the number beside it: a reader
    // seeing 1769 KB needs to know whether that was 1800 KB of 3D mark or
    // 1769 KB of nothing.
    for (const result of results) {
      console.log(
        `PERF ${result.route} fcp=${result.firstContentfulPaint?.toFixed(0) ?? 'n/a'}ms ` +
          `lcp=${result.largestContentfulPaint?.toFixed(0) ?? 'n/a'}ms ` +
          `dcl=${result.domContentLoaded.toFixed(0)}ms load=${result.load.toFixed(0)}ms ` +
          `script=${(result.transferredScriptBytes / 1024).toFixed(0)}KB ` +
          `surface=${result.threeSurface} requests=${result.requestCount}`,
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

      // LCP must be a real measurement, not a zero and not a null. `?? 0` here
      // would let a missing metric pass a `> 0` check in neither direction: a
      // null became 0, which failed, and that failure was previously blamed on
      // the page rather than on the observer. It is asserted directly.
      expect(
        measurement.largestContentfulPaint,
        `${route} reported no LCP. The observer is installed before navigation, so a null here means ` +
          `the browser emitted no largest-contentful-paint candidate.`,
      ).not.toBeNull();
      expect(
        measurement.largestContentfulPaint ?? Infinity,
        `${route} took ${(measurement.largestContentfulPaint ?? 0).toFixed(0)}ms for its largest paint`,
      ).toBeLessThan(8000);
    }
  });
});
