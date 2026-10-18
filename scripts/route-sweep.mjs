/**
 * Cross-route defect sweep.
 *
 * Walks every public route family at three viewports against a running server
 * and reports only machine-checkable defects: horizontal overflow, clipped text,
 * unreadable type, unnamed controls, broken images and console errors.
 *
 * It reports; it does not judge. Every finding is a measurement that a human
 * (or an agent with eyes) has to look at before it is called a defect.
 *
 *   node scripts/route-sweep.mjs http://localhost:3050 "/growth,/creative"
 */
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3050';
const only = process.argv[3]
  ? process.argv[3].split(',').map((value) => value.trim()).filter(Boolean)
  : null;

const FAMILIES = [
  '/',
  '/products',
  '/products/knoux-one',
  '/engineering',
  '/wordpress',
  '/wordpress/themes',
  '/wordpress/plugins',
  '/wordpress/blocks',
  '/wordpress/patterns',
  '/wordpress/starter-sites',
  '/wordpress/solutions',
  '/web',
  '/web/ecommerce',
  '/growth',
  '/growth/google-ads',
  '/creative',
  '/solutions',
  '/build',
  '/build/providers',
  '/build/terminal',
  '/build/ai',
  '/command',
  '/command/connections',
  '/work',
  '/labs',
  '/about',
  '/contact',
  '/login',
  '/account',
  '/signal',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];

/** Measured in the page. Runs once per route and viewport, returns a list. */
const PROBE = () => {
  const describe = (element) => {
    const id = element.id ? `#${element.id}` : '';
    const cls = typeof element.className === 'string' && element.className
      ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}`
      : '';
    const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return `${element.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`;
  };

  const hiddenFromSight = (element) =>
    Boolean(
      element.closest('.sr-only, .visually-hidden, [aria-hidden="true"]') ??
        (() => {
          // An element inside a horizontal scroll strip is meant to be wider than
          // its port; the visitor scrolls to it. That is layout, not clipping.
          for (let node = element.parentElement; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (/(auto|scroll)/.test(style.overflowX)) return true;
            if (node.tagName === 'BODY') break;
          }
          return false;
        })(),
    );

  const findings = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) {
    findings.push({
      kind: 'overflow-x',
      detail: `document scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`,
    });
    // Name the widest offenders so the finding is actionable.
    for (const element of document.querySelectorAll('body *')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.right <= doc.clientWidth + 1) continue;
      if (element.closest('svg')) continue;
      findings.push({
        kind: 'overflow-element',
        detail: `${describe(element)} right=${Math.round(rect.right)}`,
      });
      if (findings.length > 12) break;
    }
  }

  // Type too small to read, ignoring decorative/legal micro labels by threshold.
  const tiny = new Set();
  for (const element of document.querySelectorAll('p, li, dd, dt, td, th, span, a, button, h1, h2, h3, h4')) {
    if (!element.textContent?.trim()) continue;
    if (element.querySelector('p, li, span, a')) continue;
    if (hiddenFromSight(element)) continue;
    const size = Number.parseFloat(getComputedStyle(element).fontSize);
    if (size && size < 11) tiny.add(`${describe(element)} ${size}px`);
  }
  for (const item of [...tiny].slice(0, 8)) findings.push({ kind: 'tiny-type', detail: item });

  // A reveal-gated block that is still transparent was never observed. This is
  // invisible content rather than a cosmetic difference, so it is reported
  // separately from the styling checks below.
  const unrevealed = [];
  for (const element of document.querySelectorAll('[data-reveal]')) {
    const style = getComputedStyle(element);
    if (Number.parseFloat(style.opacity) < 0.9 && !element.closest('.sr-only, .visually-hidden')) {
      unrevealed.push(`${describe(element)} opacity=${style.opacity}`);
    }
  }
  for (const item of [...new Set(unrevealed)].slice(0, 8)) {
    findings.push({ kind: 'unrevealed-block', detail: item });
  }

  // Content wider than its own box: clipped words, dead space, hidden copy.
  // `.process-architecture li` is a known exception: the connector arc is drawn
  // by `li::after { right: -18px }`, which reaches into the column gap on
  // purpose (visual-system-v2.css). A pseudo-element has no rect, so the row
  // measures 18px wider while nothing is actually cut off.
  const INTENTIONAL_WIDE = '.process-architecture li';
  const clipped = new Set();
  for (const element of document.querySelectorAll('p, h1, h2, h3, h4, li, dd, span.option__sub, td')) {
    if (!element.textContent?.trim()) continue;
    if (hiddenFromSight(element)) continue;
    if (element.matches(INTENTIONAL_WIDE)) continue;
    const style = getComputedStyle(element);
    if (style.overflow !== 'visible' && style.overflow !== '') continue;
    if (style.textOverflow === 'ellipsis' && style.whiteSpace === 'nowrap') continue;
    if (element.scrollWidth > element.clientWidth + 2 && element.clientWidth > 0) {
      clipped.add(`${describe(element)} ${element.scrollWidth}>${element.clientWidth}`);
    }
  }
  for (const item of [...clipped].slice(0, 8)) findings.push({ kind: 'clipped-text', detail: item });

  // Controls with no accessible name.
  const unnamed = new Set();
  for (const element of document.querySelectorAll('a, button, input, select, textarea')) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const name = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.labels?.[0]?.textContent,
      element.textContent,
      element.getAttribute('alt'),
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    const placeholderName = element.getAttribute('placeholder')?.trim() ?? '';
    if (!name && !placeholderName) unnamed.add(describe(element));
  }
  for (const item of [...unnamed].slice(0, 8)) findings.push({ kind: 'unnamed-control', detail: item });

  // Images that finished loading with no pixels. A lazy image below the fold is
// not yet loaded, which is not a defect, so only a completed load counts.
  for (const image of document.querySelectorAll('img')) {
    if (image.complete && image.naturalWidth === 0) {
      findings.push({ kind: 'broken-image', detail: image.currentSrc || image.src || '(no src)' });
    }
    if (image.alt === null) findings.push({ kind: 'image-without-alt', detail: image.src });
  }

  return findings;
};

const routes = only ?? FAMILIES;
const browser = await chromium.launch();
let total = 0;

try {
  for (const route of routes) {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
      });
      const errors = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.slice(0, 200)}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text().slice(0, 200)}`);
      });
      // Name the actual resource behind a failed request instead of the console noise.
      page.on('response', (response) => {
        if (response.status() >= 400) errors.push(`http-${response.status()}: ${response.url().replace(base, '')}`);
      });

      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(900);
      // Walk the page so reveal-gated blocks are observed before they are judged.
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 110));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(700);

      const status = response?.status() ?? 0;
      const findings = await page.evaluate(PROBE);
      for (const error of errors) findings.push({ kind: 'runtime-error', detail: error });

      if (status !== 200) findings.unshift({ kind: 'http', detail: `status ${status}` });
      if (findings.length) {
        total += findings.length;
        console.log(`\n${route} @ ${viewport.name} (${viewport.width})`);
        const seen = new Set();
        for (const finding of findings) {
          const line = `  [${finding.kind}] ${finding.detail}`;
          if (seen.has(line)) continue;
          seen.add(line);
          console.log(line);
        }
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\nsweep complete: ${total} finding line(s) across ${routes.length} route(s)`);