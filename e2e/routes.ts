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

/** A representative slug per dynamic segment, taken from the repo's own data. */
const SEGMENT_SAMPLES: Record<string, string> = {
  slug: 'knoux-one',
};

export function publicRoutes(): string[] {
  const found: string[] = [];
  walk(APP_DIR, found);
  return found
    .map((route) =>
      route
        .split('/')
        .map((segment) => (segment.startsWith('[') ? SEGMENT_SAMPLES.slug : segment))
        .join('/')
        .replace(/\/\/$/, '/'),
    )
    .filter((route) => {
      const base = '/' + route.split('/').filter(Boolean)[0];
      return PUBLIC_PREFIXES.some((prefix) => base === prefix);
    })
    .filter((route) => !/\/(login|register|forgot-password|update-password|account)$/.test(route))
    .sort();
}

/** Routes a browser visitor is expected to land on directly. */
export const PRIMARY_ROUTES = publicRoutes();

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
