import { test, expect } from '@playwright/test';
import { PRIMARY_ROUTES, EVIDENCE_DIR, RESPONSIVE_MATRIX } from './routes';
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

      // Landmarks: a main region and a way past the navigation.
      await expect(page.locator('main, [role="main"]').first()).toBeVisible();
      await expect(page.locator('nav').first()).toBeVisible();
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
  test('desktop content uses a meaningful share of the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const route of PRIMARY_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const geometry = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('main, [role="main"]');
        if (!main) return null;
        const rect = main.getBoundingClientRect();
        const doc = document.documentElement;
        return {
          width: rect.width,
          viewport: doc.clientWidth,
          height: rect.height,
          viewportHeight: doc.clientHeight,
          scrollHeight: document.body.scrollHeight,
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

      // A page taller than eight viewports is usually a min-height that was set
      // to fill rather than to compose.
      expect(
        geometry.scrollHeight,
        `${route} is ${Math.round(geometry.scrollHeight / geometry.viewportHeight)} viewports tall`,
      ).toBeLessThan(geometry.viewportHeight * 8);
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
      test.slow();
      await page.setViewportSize({ width: size.width, height: size.height });

      for (const route of PRIMARY_ROUTES) {
        await page.goto(route, { waitUntil: 'networkidle' }).catch(() => page.goto(route));
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
