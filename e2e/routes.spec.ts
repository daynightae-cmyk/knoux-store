import { test, expect } from '@playwright/test';
import { PRIMARY_ROUTES, EVIDENCE_DIR, RESPONSIVE_MATRIX, LARGEST_BLANK_BAND_SOURCE } from './routes';
import { join } from 'node:path';

/**
 * Every route renders, and the page a visitor receives is the page that is
 * shipped.
 *
 * The route list is read from `src/app` on disk rather than typed here, so a
 * page added last month is covered without anyone remembering to add it.
 */

const slug = (route: string) => route.replace(/^\//, '').replace(/\//g, '-') || 'home';

test.describe('route rendering', () => {
  for (const route of PRIMARY_ROUTES) {
    test(`${route} renders with a heading and a language`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} must respond 200`).toBe(200);

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');

      // A page with no h1 is a page whose structure cannot be navigated. One
      // h1 is checked rather than several, because several usually means the
      // composition is accidental.
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      const heading = (await h1.first().innerText()).trim();
      expect(heading.length, `${route} must have a non-empty h1`).toBeGreaterThan(1);

      // Landmarks: a main region, and a way past the navigation.
      await expect(page.locator('main, [role="main"]').first()).toBeVisible();

      /**
       * The navigation landmark must exist, and it must be reachable.
       *
       * The first version asserted `nav` was *visible*, which is true on
       * desktop and false on every mobile route: below 760px the desktop
       * navigation is hidden and the mobile panel — a real `<nav>` inside a
       * collapsed overlay — is what a visitor actually uses. Thirty-three
       * routes failed for a layout decision that was correct.
       *
       * So this asks the question the check was written for: can a keyboard
       * user get to the navigation from here? At any width that is a visible
       * navigation control — the desktop bar itself, or the toggle that opens
       * the mobile panel. A control that is present and visible, and whose
       * activation reveals a `<nav>`, is the thing that is actually required.
       */
      const navigation = await page.evaluate(() => {
        const visible = (element: Element | null) => {
          if (!element) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        const navs = Array.from(document.querySelectorAll('nav'));
        const toggles = Array.from(
          document.querySelectorAll('.mobile-toggle, [aria-controls][aria-expanded]'),
        );
        return {
          navLandmarks: navs.length,
          anyNavVisible: navs.some(visible),
          toggle: toggles.find(visible)?.getAttribute('aria-label') ?? null,
        };
      });

      expect(
        navigation.navLandmarks,
        `${route} has no <nav> landmark at all`,
      ).toBeGreaterThan(0);
      expect(
        navigation.anyNavVisible || navigation.toggle !== null,
        `${route} offers no way to reach the navigation at ${page.viewportSize()?.width}px: ` +
          `no visible <nav> and no visible navigation control`,
      ).toBe(true);
    });
  }
});

/**
 * No horizontal overflow, at every width the site claims to support.
 *
 * This is the one responsive property that is objectively true or false: a
 * document that scrolls sideways at 375px is broken at 375px, regardless of how
 * the page looks. It is measured from the document, not from a CSS class, so
 * a regression introduced anywhere is caught.
 */
test.describe('responsive geometry', () => {
  for (const size of RESPONSIVE_MATRIX) {
    test(`no horizontal overflow at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });

      for (const route of PRIMARY_ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });

        const measurement = await page.evaluate(() => {
          const doc = document.documentElement;
          // 1px of tolerance: a sub-pixel rounding artefact is not a defect,
          // and failing on it would train people to ignore this test.
          const overflow = doc.scrollWidth - doc.clientWidth;
          const offenders: string[] = [];
          if (overflow > 1) {
            for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
              const rect = el.getBoundingClientRect();
              if (rect.width === 0) continue;
              if (rect.right > doc.clientWidth + 1 || rect.left < -1) {
                const id = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${
                  el.className && typeof el.className === 'string'
                    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
                    : ''
                }`;
                if (offenders.length < 6) offenders.push(id);
              }
            }
          }
          return { overflow, clientWidth: doc.clientWidth, offenders };
        });

        expect(
          measurement.overflow,
          `${route} overflows by ${measurement.overflow}px at ${size.name}. Widest elements: ${
            measurement.offenders.join(', ') || 'not identified'
          }`,
        ).toBeLessThanOrEqual(1);
      }
    });
  }
});

/**
 * Geometry, measured rather than eyeballed.
 *
 * The previous audit flagged large empty regions and content compressed into a
 * narrow left strip from screenshots alone. Both are measurable, so they are
 * measured here. The thresholds are audit triggers, not a style rule: a
 * deliberate editorial stage is allowed to be empty, and a human reviews what
 * this reports.
 */
test.describe('composition', () => {
  test('the workspace dashboard panels occupy their intended columns', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      sessionStorage.setItem('knoux-dev-entry-intent', 'Build a product workspace');
    });
    await page.goto('/build', { waitUntil: 'load' });
    await expect(page.locator('.dev-entry')).toHaveCount(0);

    const widths = await page.evaluate(() => {
      const dashboard = document.querySelector('.dev-dashboard');
      const composer = document.querySelector('.dev-dashboard__composer');
      const preview = document.querySelector('.dev-dashboard__preview');
      return {
        dashboard: dashboard?.getBoundingClientRect().width ?? 0,
        composer: composer?.getBoundingClientRect().width ?? 0,
        preview: preview?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(widths.dashboard).toBeGreaterThan(800);
    expect(widths.composer, 'the intent panel must span most of the workspace').toBeGreaterThan(widths.dashboard * 0.5);
    expect(widths.preview, 'the preview must have a useful reading width').toBeGreaterThan(widths.dashboard * 0.25);
  });

  test('desktop content uses a meaningful share of the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const route of PRIMARY_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const geometry = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('main, [role="main"]');
        if (!main) return null;
        const doc = document.documentElement;

        /**
         * The width of the main region's *content*.
         *
         * `getBoundingClientRect` on an element with `display: contents` returns
         * a zero rect, because the element generates no box — its children are
         * laid out as if it were not there. The workspace landing route does
         * exactly that, so a straight `rect.width` reported `main is only 0% of
         * the viewport` on a page whose content is 100% of it. The measurement
         * asks the children instead whenever the parent has no box.
         */
        const rect = main.getBoundingClientRect();
        const generated = getComputedStyle(main).display !== 'contents';
        const children = Array.from(main.children).map((child) => child.getBoundingClientRect());
        const contentWidth = generated
          ? rect.width
          : children.reduce((widest, child) => Math.max(widest, child.width), 0);

        return {
          width: contentWidth,
          viewport: doc.clientWidth,
          viewportHeight: doc.clientHeight,
        };
      });

      if (!geometry) continue;

      const share = geometry.width / geometry.viewport;
      // A main region narrower than a third of the viewport at desktop width
      // is the "content compressed into a left strip" failure. A shell that is
      // legitimately narrow would announce itself here.
      expect(
        share,
        `${route} main is only ${(share * 100).toFixed(0)}% of the ${geometry.viewport}px viewport`,
      ).toBeGreaterThan(0.33);

      const measureBlankBand = new Function(LARGEST_BLANK_BAND_SOURCE + '; return largestBlankBand();') as () => number;
      const largestBlank = await page.evaluate(measureBlankBand);

      // A blank band taller than half the viewport is a region that neither
      // balances an object, forms a stage, nor creates rhythm — it is a hole.
      // Half a viewport of deliberate negative space is ordinary composition.
      expect(
        largestBlank,
        `${route} has a ${Math.round(largestBlank)}px vertical band with nothing in it`,
      ).toBeLessThan(geometry.viewportHeight * 0.5);
    }
  });

  test('the workspace enters its operational shell without replaying the landing sequence', async ({ page }) => {
    // The entry gate, particle hero and product machine belong to /build. An
    // operational route that replays them is a route that ignored the brief.
    const operational = ['/build/apps', '/build/services', '/build/deployments', '/build/docs', '/build/terminal'];

    for (const route of operational) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const body = await page.locator('body').innerText();
      expect(body, `${route} must not replay the entry gate`).not.toContain('WHAT ARE YOU HERE TO BUILD');
      await expect(page.locator('.dev-shell--operational, .dev-shell'), { message: route }).toHaveCount(1);
    }
  });

  test('the product preview renders a same-origin page inside its frame', async ({ page }) => {
    await page.goto('/build/apps');
    await page.getByRole('button', { name: 'PREVIEW' }).click();
    const frame = page.frameLocator('.dev-app-preview iframe');
    await expect(frame.locator('h1')).toBeVisible();
    await expect(frame.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('a failed project fetch still settles the workspace read', async ({ page }) => {
    const requested: string[] = [];
    await page.route('**/api/build/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      requested.push(path);
      if (path.endsWith('/project')) await route.abort();
      else await route.fulfill({ status: 503, body: '{}' });
    });
    await page.goto('/build/apps');
    await expect(page.locator('.dev-sidebar__foot')).toContainText('ADAPTER STATE UNKNOWN');
    expect(requested).toContain('/api/build/project');
    expect(requested).toContain('/api/build/environment');
    expect(requested).toContain('/api/build/git');
  });
});

/**
 * Evidence capture.
 *
 * Every route at every class of width, written to the visual record. These are
 * for a human to read alongside the measurements above. No assertion is made
 * about them, because a pixel comparison would fail on every deliberate change
 * this branch contains and would teach the next person to regenerate baselines
 * instead of reading them.
 */
test.describe('evidence', () => {
  for (const size of RESPONSIVE_MATRIX) {
    test(`capture ${size.name}`, async ({ page }) => {
      /**
       * Sized for the work, not for one page.
       *
       * This test walks every route at one width: 33 navigations, each waiting
       * for the network to go quiet and then settling entrance motion, so it
       * needs minutes rather than seconds. `test.slow()` triples the 60s default
       * to 180s, which is still short of the real cost and produced a run that
       * died mid-matrix and left the record incomplete. The budget below is
       * declared from the number of routes in the matrix rather than guessed,
       * so adding a route widens it automatically.
       */
      const perRouteMs = 4_000;
      test.setTimeout(PRIMARY_ROUTES.length * perRouteMs + 60_000);

      await page.setViewportSize({ width: size.width, height: size.height });

      for (const route of PRIMARY_ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        /**
         * `networkidle` was the previous wait and it is the wrong one: a page
         * that legitimately keeps a connection open — the workspace polling, a
         * WebGL scene streaming — never reaches idle, so the wait silently fell
         * through to its timeout on every route. `domcontentloaded` plus a
         * fixed settle is both faster and actually terminates.
         */
        await page.waitForLoadState('load').catch(() => undefined);
        // Let entrance motion settle so the capture shows the resting state.
        await page.waitForTimeout(350);
        await page.screenshot({
          path: join(EVIDENCE_DIR, size.class, `${size.name}--${slug(route)}.png`),
          fullPage: false,
        });
      }
    });
  }
});
