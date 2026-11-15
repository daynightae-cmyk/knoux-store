/**
 * Real registry projection for KNOuX: THE AWAKENING.
 *
 * The sequence does not own a product catalogue. It projects five entries out
 * of `src/data/software.ts`, the canonical registry that also generates the
 * `/products/[slug]` routes. Names, taglines, families, codes, statuses and
 * routes therefore cannot drift from the dossier a visitor opens.
 *
 * Thumbnails are 256×256 derivatives of the canonical product visuals in
 * `public/knoux-universe/`. The originals remain the authority; these exist so
 * the emission costs about 12 KB per system instead of 250–307 KB.
 */

import { softwareProducts, type SoftwareProduct } from '@/data/software';
import { resolveProductLogo } from '@/data/product-visuals';

/** Curated for the main sequence: the five active systems, in registry order. */
export const AWAKENING_PRODUCT_IDS = [
  'sw-one',
  'sw-forge',
  'sw-repair',
  'sw-rec',
  'sw-player-x',
] as const;

const AWAKENING_THUMBNAILS: Readonly<Record<string, string>> = {
  'knoux-one': '/knoux-universe/forge/knoux-one.webp',
  kforge: '/knoux-universe/forge/kforge.webp',
  'knoux-repair': '/knoux-universe/forge/knoux-repair.webp',
  'knoux-rec': '/knoux-universe/forge/knoux-rec.webp',
  'knoux-x': '/knoux-universe/forge/knoux-x.webp',
};

export type AwakeningProduct = {
  id: string;
  code: string;
  index: string;
  slug: string;
  name: string;
  shortName: string;
  /** The registry's own family label, not an authored category. */
  family: string;
  discipline: string;
  /** Registry status token, kept verbatim. */
  status: SoftwareProduct['status'];
  tagline: string;
  /** The registry's own capability statements, used to ground the dialogue. */
  capabilities: readonly string[];
  /** The registry's own limitations, kept beside the capabilities. */
  limitations: readonly string[];
  /** Real same-origin dossier generated from this registry entry. */
  route: string;
  logoSrc: string;
};

function project(product: SoftwareProduct): AwakeningProduct {
  return {
    id: product.id,
    code: product.code,
    index: product.index,
    slug: product.slug,
    name: product.name,
    shortName: product.shortName,
    family: product.family,
    discipline: product.discipline,
    status: product.status,
    tagline: product.tagline,
    capabilities: product.capabilities,
    limitations: product.limitations,
    route: `/products/${product.slug}`,
    logoSrc: AWAKENING_THUMBNAILS[product.slug] ?? resolveProductLogo(product.slug) ?? '',
  };
}

/**
 * Five records in sequence order. A missing registry entry is omitted rather
 * than replaced with an authored one; the stage's defensive check turns an
 * incomplete projection into the explicit error phase instead of a fabricated
 * product.
 */
export const awakeningProducts: readonly AwakeningProduct[] = AWAKENING_PRODUCT_IDS.flatMap((id) => {
  const product = softwareProducts.find((entry) => entry.id === id);
  return product ? [project(product)] : [];
});

/** The exact number of systems the sequence emits when the registry is whole. */
export const AWAKENING_PRODUCT_COUNT = AWAKENING_PRODUCT_IDS.length;

/** True when the projection still maps one-to-one onto the canonical registry. */
export function awakeningProductsAreComplete(): boolean {
  return (
    awakeningProducts.length === AWAKENING_PRODUCT_COUNT &&
    awakeningProducts.every((product) => {
      const source = softwareProducts.find((entry) => entry.id === product.id);
      return Boolean(
        source &&
          source.slug === product.slug &&
          source.name === product.name &&
          source.tagline === product.tagline &&
          source.status === product.status &&
          source.family === product.family &&
          source.capabilities === product.capabilities &&
          source.limitations === product.limitations &&
          product.route === `/products/${source.slug}` &&
          product.logoSrc,
      );
    })
  );
}

/** The first `count` real systems, clamped to the projection. */
export function awakeningProductsFor(count: number): readonly AwakeningProduct[] {
  const bounded = Math.max(0, Math.min(awakeningProducts.length, Math.floor(count)));
  return awakeningProducts.slice(0, bounded);
}
