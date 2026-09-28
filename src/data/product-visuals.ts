/**
 * Product visual profiles.
 *
 * Presentation guidance only. Text/data truth remains in src/data/software.ts.
 * This layer controls only loader choreography, scene motif, geometry vocabulary,
 * motion vocabulary, accent tokens, and optional local logo asset keys.
 */

export type ProductVisualMotif =
  | 'system-nucleus'
  | 'repository-topology'
  | 'diagnostic-rings'
  | 'file-clusters'
  | 'capture-timeline'
  | 'media-spectrum'
  | 'guarded-clipboard';

export type ProductVisualProfile = {
  slug: string;
  motif: ProductVisualMotif;
  loaderVerb: string;
  sceneLabel: string;
  geometry: readonly string[];
  motion: readonly string[];
  accentIntensity: 'subtle' | 'moderate' | 'pronounced';
  /** Optional local logo asset key under public/products/{slug}/logo.svg */
  localLogoKey?: string;
};

export const productVisualProfiles: readonly ProductVisualProfile[] = [
  {
    slug: 'knoux-one',
    motif: 'system-nucleus',
    loaderVerb: 'Resolving system workspace',
    sceneLabel: 'Windows intelligence field',
    geometry: ['modular nodes', 'service shells', 'layered operating planes'],
    motion: ['ordered assembly', 'bounded path pulse', 'subtle pointer depth'],
    accentIntensity: 'moderate',
  },
  {
    slug: 'kforge',
    motif: 'repository-topology',
    loaderVerb: 'Resolving engineering topology',
    sceneLabel: 'Repository and workflow graph',
    geometry: ['branch graph', 'code planes', 'pipeline traces'],
    motion: ['dependency resolve', 'branch focus', 'trace propagation'],
    accentIntensity: 'moderate',
  },
  {
    slug: 'knoux-repair',
    motif: 'diagnostic-rings',
    loaderVerb: 'Preparing diagnostic workspace',
    sceneLabel: 'Repair and diagnostics field',
    geometry: ['diagnostic rings', 'tool sectors', 'bounded scan arcs'],
    motion: ['scan', 'isolate', 'resolve'],
    accentIntensity: 'subtle',
  },
  {
    slug: 'knoux-smartorganizer',
    motif: 'file-clusters',
    loaderVerb: 'Organising workspace',
    sceneLabel: 'File and storage constellation',
    geometry: ['file tiles', 'folder clusters', 'storage bands'],
    motion: ['scatter to cluster', 'stable grouping', 'local focus'],
    accentIntensity: 'subtle',
  },
  {
    slug: 'knoux-rec',
    motif: 'capture-timeline',
    loaderVerb: 'Preparing capture workspace',
    sceneLabel: 'Capture and timeline field',
    geometry: ['capture corners', 'waveform ribbon', 'timeline lanes'],
    motion: ['frame resolve', 'timeline grow', 'waveform breathe'],
    accentIntensity: 'moderate',
  },
  {
    slug: 'knoux-x',
    motif: 'media-spectrum',
    loaderVerb: 'Preparing playback workspace',
    sceneLabel: 'Playback and signal field',
    geometry: ['playback ring', 'spectral bands', 'subtitle tracks'],
    motion: ['spectrum drift', 'timeline move', 'ring response'],
    accentIntensity: 'pronounced',
  },
  {
    slug: 'knoux-clipboard-ai',
    motif: 'guarded-clipboard',
    loaderVerb: 'Preparing guarded workspace',
    sceneLabel: 'Clipboard privacy flow',
    geometry: ['clipboard cards', 'guard boundary', 'inspection gates'],
    motion: ['item ingress', 'guard pass', 'bounded route'],
    accentIntensity: 'subtle',
  },
];

export function visualProfileFor(slug: string): ProductVisualProfile | undefined {
  return productVisualProfiles.find((profile) => profile.slug === slug);
}

/**
 * Resolves logo strategy for a product.
 * Returns the path if a verified local logo exists, otherwise null to use
 * the canonical KNOuX mark + product shortName.
 */
export function resolveProductLogo(slug: string): string | null {
  const profile = visualProfileFor(slug);
  if (profile?.localLogoKey) {
    return `/products/${slug}/${profile.localLogoKey}`;
  }
  return null;
}

/**
 * Validates that every canonical software product has a visual profile.
 * Used by tests to prevent silent fallbacks.
 */
export function validateVisualProfiles(softwareSlugs: readonly string[]): { missing: string[]; extra: string[] } {
  const profileSlugs = new Set(productVisualProfiles.map((p) => p.slug));
  const missing = softwareSlugs.filter((slug) => !profileSlugs.has(slug));
  const extra = productVisualProfiles.filter((p) => !softwareSlugs.includes(p.slug)).map((p) => p.slug);
  return { missing, extra };
}