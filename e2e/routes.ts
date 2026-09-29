/**
 * The route inventory, derived rather than typed.
 *
 * The route list is read from the App Router on disk. A hand-maintained list in
 * a test is a list that silently stops covering a route someone added last
 * month, and the resulting green run is worse than no run at all.
 *
 * Only routes that a visitor can reach without an account are included. The
 * account and password routes redirect, and asserting on a redirect here would
 * test the proxy rather than the page; they are covered in `auth.test.mjs`
 * against a running server.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { softwareProducts } from '@/data/software';
import { solutions } from '@/data/solutions';
import { growthChannelsDetail } from '@/data/growth';
import { creativeDisciplines, webSystems } from '@/data/services';

export const APP_DIR = join(process.cwd(), 'src', 'app');

/** Route families that are public surfaces. */
const PUBLIC_PREFIXES = [
  '/',
  '/about',
  '/account',
  '/build',
  '/contact',
  '/creative',
  '/engineering',
  '/growth',
  '/labs',
  '/login',
  '/register',
  '/forgot-password',
  '/products',
  '/solutions',
  '/update-password',
  '/web',
  '/wordpress',
  '/work',
];

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry.startsWith('@')) continue;
    const full = join(dir, entry);
    let isDirectory = false;
    try {
      isDirectory = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (!isDirectory) continue;

    const hasPage = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some((name) => {
      try {
        return statSync(join(full, name)).isFile();
      } catch {
        return false;
      }
    });

    if (hasPage) {
      const route = '/' + relative(APP_DIR, full).split(/[\\/]/).join('/');
      out.push(route === '/' ? '/' : route);
    }
    walk(full, out);
  }
}

/**
 * A representative slug per dynamic segment, read from the repository's own
 * data rather than typed here.
 *
 * A hard-coded sample is a guess: `/growth/knoux-one` is a 404, and a 404 in
 * this suite is indistinguishable from a genuinely broken route, so a guess
 * either produces false failures or, worse, gets "fixed" by deleting the
 * assertion. Every dynamic route family derives its slugs from exactly one
 * module, and that module is also what `generateStaticParams` uses, so the
 * sample is a real published route by construction.
 */
const SEGMENT_SAMPLES: Record<string, string> = {
  creative: creativeDisciplines[0]?.slug,
  growth: growthChannelsDetail[0]?.slug,
  products: softwareProducts[0]?.slug,
  solutions: solutions[0]?.slug,
  web: webSystems[0]?.slug,
} as Record<string, string>;

/**
 * Every dynamic segment on this site is named `[slug]`, so the sample has to be
 * chosen by family rather than by segment name. A family with no sample is a
 * family this suite cannot honestly claim to cover, so it is a loud failure
 * rather than a route string containing `undefined`.
 */
function resolveDynamic(route: string): string {
  const segments = route.split('/');
  const family = segments.filter(Boolean)[0];
  if (!segments.some((segment) => segment.startsWith('['))) return route;

  const sample = SEGMENT_SAMPLES[family];
  if (!sample) {
    throw new Error(
      `No real slug is registered for /${family}. Add its data module to SEGMENT_SAMPLES ` +
        `so the suite covers a published route rather than an invented one.`,
    );
  }
  return segments.map((segment) => (segment.startsWith('[') ? sample : segment)).join('/');
}

export function publicRoutes(): string[] {
  const found: string[] = [];
  walk(APP_DIR, found);
  return found
    .map((route) => resolveDynamic(route).replace(/\/\/$/, '/'))
    .filter((route) => {
      const base = '/' + route.split('/').filter(Boolean)[0];
      return PUBLIC_PREFIXES.some((prefix) => base === prefix);
    })
    .filter((route) => !/\/(login|register|forgot-password|update-password|account)$/.test(route))
    .sort();
}

/** Routes a browser visitor is expected to land on directly. */
export const PRIMARY_ROUTES = publicRoutes();

/**
 * The largest uninterrupted vertical band on the page that contains nothing.
 *
 * This is injected into the page by `routes.spec.ts`. It is a function rather
 * than a constant because the measurement is only meaningful against a rendered
 * document, and it has to run inside the browser to see computed style.
 *
 * A band counts as occupied when any element crossing it renders text, is a
 * media or form element, or paints a background, border or image. The previous
 * check was a proxy — "a page taller than eight viewports" — and it was wrong in
 * both directions: `/creative` is ten viewports of real, dense, correctly
 * composed content, and a page that filled 4000px with an empty `min-height`
 * would have been eight viewports of nothing. Measuring the empty band catches
 * the failure the check was written for and stops punishing the pages that do
 * the opposite.
 *
 * Exported as source text so the intent travels with the measurement.
 */
export const LARGEST_BLANK_BAND_SOURCE = `
function largestBlankBand() {
  const docHeight = document.documentElement.scrollHeight;
  if (docHeight === 0) return 0;
  const occupied = new Uint8Array(docHeight);

  for (const element of document.querySelectorAll('body *')) {
    const style = getComputedStyle(element);
    if (element.offsetParent === null && style.position !== 'fixed') continue;

    const rect = element.getBoundingClientRect();
    if (rect.height < 2 || rect.width < 2) continue;

    const hasText = Array.from(element.childNodes).some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 0,
    );
    const isMedia = /^(IMG|CANVAS|SVG|VIDEO|INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(element.tagName);
    const hasPaint =
      (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') ||
      style.borderTopWidth !== '0px' ||
      style.backgroundImage !== 'none';

    if (!hasText && !isMedia && !hasPaint) continue;

    const top = Math.max(0, Math.round(rect.top + window.scrollY));
    const bottom = Math.min(docHeight, Math.round(rect.bottom + window.scrollY));
    for (let y = top; y < bottom; y += 1) occupied[y] = 1;
  }

  let longest = 0;
  let run = 0;
  for (let y = 0; y < docHeight; y += 1) {
    if (occupied[y] === 1) {
      run = 0;
    } else {
      run += 1;
      if (run > longest) longest = run;
    }
  }
  return longest;
}
`;

/** The widths the responsive claim is made about. */
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
} as const;

/** The full matrix the visual record covers. */
export const RESPONSIVE_MATRIX = [
  { name: '1904x880', width: 1904, height: 880, class: 'desktop' },
  { name: '1600x1000', width: 1600, height: 1000, class: 'desktop' },
  { name: '1440x900', width: 1440, height: 900, class: 'desktop' },
  { name: '1366x768', width: 1366, height: 768, class: 'desktop' },
  { name: '1280x800', width: 1280, height: 800, class: 'desktop' },
  { name: '1024x768', width: 1024, height: 768, class: 'desktop' },
  { name: '820x1180', width: 820, height: 1180, class: 'tablet' },
  { name: '768x1024', width: 768, height: 1024, class: 'tablet' },
  { name: '430x932', width: 430, height: 932, class: 'mobile' },
  { name: '390x844', width: 390, height: 844, class: 'mobile' },
  { name: '375x812', width: 375, height: 812, class: 'mobile' },
] as const;

export const EVIDENCE_DIR = join(process.cwd(), 'references', 'visual-audit', 'closure');
