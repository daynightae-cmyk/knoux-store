/**
 * SPECIALIZED REFERENCE ONLY.
 * Do not import this file directly into production without adapting it.
 * Text/data truth must stay in src/data/software.ts.
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
};

export const productVisualProfiles: readonly ProductVisualProfile[] = [

  {
    slug: 'knoux-one',
    motif: 'system-nucleus',
    loaderVerb: 'Resolving system workspace',
    sceneLabel: 'Windows intelligence field',
    geometry: ['modular nodes', 'service shells', 'layered operating planes'],
    motion: ['ordered assembly', 'bounded path pulse', 'subtle pointer depth'],
  },
  {
    slug: 'kforge',
    motif: 'repository-topology',
    loaderVerb: 'Resolving engineering topology',
    sceneLabel: 'Repository and workflow graph',
    geometry: ['branch graph', 'code planes', 'pipeline traces'],
    motion: ['dependency resolve', 'branch focus', 'trace propagation'],
  },
  {
    slug: 'knoux-repair',
    motif: 'diagnostic-rings',
    loaderVerb: 'Preparing diagnostic workspace',
    sceneLabel: 'Repair and diagnostics field',
    geometry: ['diagnostic rings', 'tool sectors', 'bounded scan arcs'],
    motion: ['scan', 'isolate', 'resolve'],
  },

  {
    slug: 'knoux-smartorganizer',
    motif: 'file-clusters',
    loaderVerb: 'Organising workspace',
    sceneLabel: 'File and storage constellation',
    geometry: ['file tiles', 'folder clusters', 'storage bands'],
    motion: ['scatter to cluster', 'stable grouping', 'local focus'],
  },
  {
    slug: 'knoux-rec',
    motif: 'capture-timeline',
    loaderVerb: 'Preparing capture workspace',
    sceneLabel: 'Capture and timeline field',
    geometry: ['capture corners', 'waveform ribbon', 'timeline lanes'],
    motion: ['frame resolve', 'timeline grow', 'waveform breathe'],
  },
  {
    slug: 'knoux-x',
    motif: 'media-spectrum',
    loaderVerb: 'Preparing playback workspace',
    sceneLabel: 'Playback and signal field',
    geometry: ['playback ring', 'spectral bands', 'subtitle tracks'],
    motion: ['spectrum drift', 'timeline move', 'ring response'],
  },

  {
    slug: 'knoux-clipboard-ai',
    motif: 'guarded-clipboard',
    loaderVerb: 'Preparing guarded workspace',
    sceneLabel: 'Clipboard privacy flow',
    geometry: ['clipboard cards', 'guard boundary', 'inspection gates'],
    motion: ['item ingress', 'guard pass', 'bounded route'],
  },
];

export function visualProfileFor(slug: string): ProductVisualProfile | undefined {
  return productVisualProfiles.find((profile) => profile.slug === slug);
}

/**
 * Production rule:
 * - resolve real product via findSoftwareProduct(slug)
 * - resolve presentation via visualProfileFor(slug)
 * - resolve logo from audited local assets
 * - never duplicate repository truth here
 */

