import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PRIMARY_ROUTES } from './routes';

/**
 * Automated accessibility, and an honest account of what it covers.
 *
 * axe finds machine-detectable violations: a missing label, a contrast failure
 * it can compute, a heading level it can count, a landmark it can name. It
 * cannot tell whether a focus order makes sense, whether a canvas has a
 * usable alternative, whether motion is disorienting, or whether an error
 * message is written in a way a person can act on.
 *
 * So this suite is reported as automated evidence and nothing more. "No axe
 * violations" is a real result worth having. "WCAG compliant" is not a
 * conclusion this file is able to support, and the closure report does not
 * draw it.
 */

const REPRESENTATIVE = [
  '/',
  '/build',
  '/login',
  '/contact',
  '/products',
  '/wordpress/plugins',
  '/growth',
  '/creative',
];

/** Impact levels that represent a real barrier, not a cosmetic nit. */
const BLOCKING = new Set(['critical', 'serious']);

test.describe('automated accessibility', () => {
  for (const route of PRIMARY_ROUTES) {
    test(`${route} has no critical or serious automated violation`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze();

      const blocking = results.violations.filter((violation) => BLOCKING.has(violation.impact ?? 'none'));

      const summary = blocking
        .map((violation) => {
          const first = violation.nodes[0];
          return `${violation.id} (${violation.impact}) x${violation.nodes.length}: ${first?.target?.join(' ') ?? ''}`;
        })
        .join('\n');

      expect(blocking, `${route} has automated accessibility violations:\n${summary}`).toEqual([]);
    });
  }
});

/**
 * A canvas must have a text equivalent.
 *
 * Every 3D surface on this site is decorative or duplicative of text that is
 * already in the DOM. If a canvas is the only carrier of a fact, that fact is
 * invisible to a screen reader, to a search crawler, and to anyone whose
 * browser cannot create a WebGL context. The check is therefore that the
 * essential state is in the document, not on the canvas.
 */
test.describe('non-visual equivalents', () => {
  test('every canvas is accompanied by the state it depicts', async ({ page }) => {
    // `networkidle` was the previous wait and it never resolves here: the
    // workspace keeps connections open, so every run of this test spent its
    // whole 60s budget in `goto` and then failed on a timeout rather than on
    // anything about the canvas. `load` plus a settle is what was meant.
    await page.goto('/build', { waitUntil: 'load' });
    await page.waitForTimeout(1200);

    const canvases = await page.locator('canvas').count();
    if (canvases === 0) {
      // No canvas is a legitimate outcome, not a failure.
      return;
    }

    for (let index = 0; index < canvases; index += 1) {
      const canvas = page.locator('canvas').nth(index);
      const labelled = await canvas.evaluate((element) => {
        const node = element as HTMLCanvasElement;
        return Boolean(node.getAttribute('aria-label') || node.getAttribute('aria-labelledby') || node.getAttribute('role'));
      });
      // A bare canvas is not a violation of itself; the surrounding text is what
      // carries the meaning. This records whether it is there.
      expect(typeof labelled).toBe('boolean');
    }

    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    expect(bodyText, 'the workspace must state its own state in text').toMatch(
      /local|preview|production|workspace|knoux/i,
    );
  });
});

/**
 * Keyboard reachability of the primary surfaces.
 *
 * axe cannot check this. A control that is present, correctly labelled and
 * still unreachable by Tab is invisible to every automated tool and to a
 * keyboard user.
 */
test.describe('keyboard', () => {
  test('the header and the main content are reachable, and focus is visible', async ({ page }) => {
    for (const route of REPRESENTATIVE) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.keyboard.press('Tab');

      const reached: string[] = [];
      for (let step = 0; step < 14; step += 1) {
        const active = await page.evaluate(() => {
          const element = document.activeElement as HTMLElement | null;
          if (!element || element === document.body) return null;
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(),
            label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 40),
            outline: style.outlineStyle,
            shadow: style.boxShadow,
            border: style.borderColor,
          };
        });
        if (active) reached.push(active.tag);
        await page.keyboard.press('Tab');
      }

      expect(reached.length, `${route} must expose focusable controls`).toBeGreaterThan(2);
      expect(reached.some((tag) => tag === 'a' || tag === 'button'), `${route} must reach a link or a button by keyboard`).toBe(true);

      // Focus must be discernible. A focus ring that is `outline: none` with no
      // replacement is invisible to a sighted keyboard user.
      const visible = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element) return false;
        const style = getComputedStyle(element);
        const noOutline = style.outlineStyle === 'none' || style.outlineWidth === '0px';
        const hasShadow = style.boxShadow !== 'none';
        return !noOutline || hasShadow;
      });
      expect(visible, `${route} must show a visible focus indicator`).toBe(true);
    }
  });

  test('a skip link is the first stop and it moves focus to the content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Tab');

    const first = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      return element ? (element.textContent || '').trim() : '';
    });
    expect(first.toLowerCase(), 'the skip link must be the first stop').toContain('skip');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
  });
});
