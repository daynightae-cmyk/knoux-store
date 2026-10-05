import { divisions, type DivisionId } from '@/lib/entities';
import type { CapabilityDivisionId } from '@/data/capabilities';
import { creativeDisciplines, findCreativeDiscipline, findWebSystem, webSystems } from '@/data/services';
import { signalRoutes } from '@/data/signal';
import { COMMAND_AREAS_BY_SLUG } from '@/data/growth/areas';

/**
 * Site navigation.
 *
 * The header carries divisions, not pages. Long tails live behind their
 * division and are reachable from the command palette, the division subrail
 * and the sitemap. Keeping the top level short is what stops the site
 * presenting as a storefront with a mega-menu.
 */

export type NavItem = { label: string; href: string; code: string };

export const primaryNavigation: readonly NavItem[] = [
  { label: 'Software', href: '/products', code: '01' },
  { label: 'WordPress', href: '/wordpress', code: '02' },
  { label: 'Web', href: '/web', code: '03' },
  { label: 'Growth', href: '/growth', code: '04' },
  { label: 'Creative', href: '/creative', code: '05' },
  { label: 'Solutions', href: '/solutions', code: '06' },
  { label: 'Build', href: '/build', code: '07' },
];

export const institutionNavigation: readonly NavItem[] = [
  { label: 'Signal', href: '/signal', code: 'SG' },
  { label: 'Labs', href: '/labs', code: '08' },
  { label: 'Work', href: '/work', code: '09' },
  { label: 'Engineering', href: '/engineering', code: '10' },
  { label: 'About', href: '/about', code: '11' },
  { label: 'Contact', href: '/contact', code: '12' },
];

/** Per-division subrails. Rendered as a thin index, never a dropdown grid. */
export type DivisionSubnav = {
  division: DivisionId;
  label: string;
  items: NavItem[];
};

export const divisionSubnavs: readonly DivisionSubnav[] = [
  {
    division: 'software',
    label: 'Software',
    items: [
      { label: 'Universe', href: '/products', code: 'SW' },
      { label: 'Ledger', href: '/products#ledger', code: 'LDG' },
      { label: 'Labs', href: '/labs', code: 'LAB' },
      { label: 'Composer', href: '/build', code: 'CMP' },
    ],
  },
  {
    division: 'wordpress',
    label: 'WordPress',
    items: [
      { label: 'Overview', href: '/wordpress', code: 'WP' },
      { label: 'Themes', href: '/wordpress/themes', code: 'WP-01' },
      { label: 'Plugins', href: '/wordpress/plugins', code: 'WP-02' },
      { label: 'Blocks', href: '/wordpress/blocks', code: 'WP-03' },
      { label: 'Starter Sites', href: '/wordpress/starter-sites', code: 'WP-04' },
      { label: 'Bundles', href: '/wordpress/solutions', code: 'WP-05' },
    ],
  },
  {
    division: 'web',
    label: 'Web',
    items: [
      { label: 'Systems Studio', href: '/web', code: 'WEB' },
      ...webSystems.map((system) => ({ label: system.shortName, href: `/web/${system.slug}`, code: system.code })),
      { label: 'Capability Matrix', href: '/web#matrix', code: 'MTX' },
      { label: 'Engineering', href: '/engineering', code: 'ENG' },
    ],
  },
  {
    division: 'growth',
    label: 'Growth',
    items: [
      { label: 'Overview', href: '/growth', code: 'GR' },
      // The operational workspace sits beside the public division rather than
      // replacing it: /growth is the marketing page and stays that way.
      { label: 'Command Center', href: '/command', code: 'GR-OPS' },
      { label: 'Google Ads', href: '/growth/google-ads', code: 'GR-01' },
      { label: 'Meta Ads', href: '/growth/meta-ads', code: 'GR-02' },
      { label: 'Social', href: '/growth/social', code: 'GR-03' },
      { label: 'Content', href: '/growth/content', code: 'GR-04' },
      { label: 'SEO', href: '/growth/seo', code: 'GR-05' },
    ],
  },
  {
    division: 'creative',
    label: 'Creative',
    items: [
      { label: 'Capabilities', href: '/creative', code: 'CR' },
      ...creativeDisciplines.map((discipline) => ({ label: discipline.shortName, href: `/creative/${discipline.slug}`, code: discipline.code })),
      { label: 'Work', href: '/work', code: 'WK' },
    ],
  },
  {
    division: 'solutions',
    label: 'Solutions',
    items: [
      { label: 'By Need', href: '/solutions', code: 'SOL' },
      { label: 'Composer', href: '/build', code: 'CMP' },
      { label: 'Contact', href: '/contact', code: 'CT' },
    ],
  },
];

export const subnavFor = (division: DivisionId): readonly NavItem[] =>
  divisionSubnavs.find((entry) => entry.division === division)?.items ?? [];

export type Breadcrumb = { label: string; href: string | null };

/** Breadcrumb resolver. Unknown segments resolve to their own division. */
export function breadcrumbFor(path: string): Breadcrumb[] {
  const trail: Breadcrumb[] = [{ label: 'KNOuX', href: '/' }];
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return trail;

  const [first, second] = segments;
  const divisionEntry: Record<string, Breadcrumb> = {
    products: { label: 'Software', href: '/products' },
    wordpress: { label: 'WordPress', href: '/wordpress' },
    web: { label: 'Web', href: '/web' },
    growth: { label: 'Growth', href: '/growth' },
    command: { label: 'Command Center', href: '/command' },
    creative: { label: 'Creative', href: '/creative' },
    solutions: { label: 'Solutions', href: '/solutions' },
    build: { label: 'Composer', href: null },
    signal: { label: 'Signal', href: '/signal' },
    labs: { label: 'Labs', href: null },
    work: { label: 'Work', href: null },
    engineering: { label: 'Engineering', href: null },
    about: { label: 'About', href: null },
    contact: { label: 'Contact', href: null },
  };

  // The Command Center has its own area names, which are more specific than a
  // generic segment de-slugging would produce ("Community Hub", not "communities").
  if (first === 'command') {
    trail.push({ label: 'Command Center', href: '/command' });
    if (second) {
      const area = COMMAND_AREAS_BY_SLUG[second];
      trail.push({ label: area?.label ?? second.replace(/-/g, ' '), href: null });
    }
    return trail;
  }

  if (first === 'products' && second) {
    trail.push({ label: 'Software', href: '/products' });
    trail.push({ label: segments[2] ? segments[2].replace(/-/g, ' ') : 'Overview', href: null });
    return trail;
  }
  if (first === 'solutions' && second) {
    trail.push({ label: 'Solutions', href: '/solutions' });
    trail.push({ label: segments[2]?.replace(/-/g, ' ') ?? 'Overview', href: null });
    return trail;
  }
  if (first === 'web' && second) {
    const system = findWebSystem(second);
    trail.push({ label: 'Web', href: '/web' });
    trail.push({ label: system?.title ?? second.replace(/-/g, ' '), href: null });
    return trail;
  }
  if (first === 'creative' && second) {
    const discipline = findCreativeDiscipline(second);
    trail.push({ label: 'Creative', href: '/creative' });
    trail.push({ label: discipline?.title ?? second.replace(/-/g, ' '), href: null });
    return trail;
  }
  if (first === 'signal') {
    trail.push({ label: 'Signal', href: second ? '/signal' : null });
    if (!second) return trail;

    let currentPath = '/signal';
    for (let index = 1; index < segments.length; index += 1) {
      currentPath += `/${segments[index]}`;
      const route = signalRoutes.find((item) => item.href === currentPath);
      const isLast = index === segments.length - 1;
      trail.push({
        label: route?.label ?? segments[index].replace(/-/g, ' '),
        href: isLast ? null : currentPath,
      });
    }
    return trail;
  }

  const entry = divisionEntry[first];
  if (entry) {
    trail.push({ label: entry.label, href: entry.href });
    if (second) trail.push({ label: second.replace(/-/g, ' '), href: null });
  } else {
    trail.push({ label: first.replace(/-/g, ' '), href: null });
  }
  return trail;
}

/** Capability matrix axes, shared by /web and /creative. */
export const capabilityMatrixDivisions: ReadonlyArray<{ id: CapabilityDivisionId; label: string }> = [
  { id: 'software', label: 'Software' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'web', label: 'Web' },
  { id: 'growth', label: 'Growth' },
  { id: 'creative', label: 'Creative' },
];

export { divisions };
export type { DivisionId };
