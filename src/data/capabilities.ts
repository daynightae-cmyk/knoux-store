/**
 * Capability vocabulary.
 *
 * One shared axis vocabulary lets the capability matrix compare divisions
 * against each other and lets the Composer and global search reason about
 * intent in the visitor's language. Each capability is a real thing KNOuX
 * does or a real thing a published KNOuX product does.
 */

/** Divisions that can deliver a capability. Narrower than the full division set. */
export type CapabilityDivisionId = 'software' | 'wordpress' | 'web' | 'growth' | 'creative';

export type Capability = {
  id: string;
  label: string;
  /** Division ids that can deliver this capability. */
  providedBy: CapabilityDivisionId[];
  searchTerms: string[];
};

export const capabilities: readonly Capability[] = [
  // Web engineering
  { id: 'web-corporate', label: 'Corporate Website', providedBy: ['web', 'wordpress'], searchTerms: ['company website', 'business site', 'corporate site', 'company page'] },
  { id: 'web-ecommerce', label: 'E-Commerce', providedBy: ['web', 'wordpress'], searchTerms: ['online store', 'shop', 'sell online', 'storefront', 'checkout'] },
  { id: 'web-application', label: 'Web Application', providedBy: ['web'], searchTerms: ['web app', 'saas app', 'custom application', 'web platform'] },
  { id: 'web-portal', label: 'Customer Portal', providedBy: ['web', 'wordpress'], searchTerms: ['client portal', 'member area', 'customer login area', 'account area'] },
  { id: 'web-dashboard', label: 'Admin Dashboard', providedBy: ['web'], searchTerms: ['admin panel', 'internal dashboard', 'reporting dashboard', 'back office'] },
  { id: 'web-booking', label: 'Booking System', providedBy: ['web', 'wordpress'], searchTerms: ['booking', 'appointments', 'reservations', 'schedule'] },
  { id: 'web-landing', label: 'Landing Experience', providedBy: ['web', 'creative', 'growth'], searchTerms: ['landing page', 'campaign page', 'single page site'] },
  { id: 'web-performance-audit', label: 'Performance Audit', providedBy: ['web', 'wordpress'], searchTerms: ['site is slow', 'speed up website', 'core web vitals', 'page speed'] },
  { id: 'web-headless', label: 'Headless Delivery', providedBy: ['web', 'wordpress'], searchTerms: ['headless wordpress', 'decoupled cms', 'nextjs frontend'] },
  { id: 'web-internal-tools', label: 'Internal Tools', providedBy: ['web', 'software'], searchTerms: ['internal tool', 'workflow tool', 'staff utility'] },

  // WordPress
  { id: 'wordpress-theme', label: 'Theme System', providedBy: ['wordpress'], searchTerms: ['wordpress theme', 'site design', 'theme'] },
  { id: 'wordpress-plugin', label: 'Plugin Extension', providedBy: ['wordpress'], searchTerms: ['wordpress plugin', 'extension', 'addon'] },
  { id: 'wordpress-blocks', label: 'Block Library', providedBy: ['wordpress'], searchTerms: ['gutenberg blocks', 'reusable blocks', 'block editor'] },
  { id: 'wordpress-starter', label: 'Starter Foundation', providedBy: ['wordpress'], searchTerms: ['starter site', 'template site', 'starter template'] },
  { id: 'wordpress-migration', label: 'Migration', providedBy: ['wordpress'], searchTerms: ['move my wordpress site', 'migrate website', 'rehost'] },
  { id: 'wordpress-security', label: 'Hardening & Security', providedBy: ['wordpress', 'software'], searchTerms: ['wordpress hacked', 'secure my site', 'hardening', 'malware'] },
  { id: 'wordpress-backups', label: 'Backup & Recovery', providedBy: ['wordpress'], searchTerms: ['wordpress backup', 'site backup', 'restore my site'] },
  { id: 'wordpress-maintenance', label: 'Maintenance', providedBy: ['wordpress'], searchTerms: ['maintain my website', 'word press updates', 'care plan'] },

  // Growth
  { id: 'growth-google-ads', label: 'Google Advertising', providedBy: ['growth'], searchTerms: ['google ads', 'adwords', 'ppc', 'paid search', 'google campaign'] },
  { id: 'growth-meta-ads', label: 'Meta Advertising', providedBy: ['growth'], searchTerms: ['facebook ads', 'instagram ads', 'meta ads', 'paid social'] },
  { id: 'growth-social', label: 'Social Media', providedBy: ['growth', 'creative'], searchTerms: ['social media management', 'instagram', 'tiktok', 'content calendar'] },
  { id: 'growth-content', label: 'Content Systems', providedBy: ['growth', 'creative'], searchTerms: ['content marketing', 'blog', 'articles', 'copywriting', 'content strategy'] },
  { id: 'growth-technical-seo', label: 'SEO', providedBy: ['growth', 'web'], searchTerms: ['seo', 'rank on google', 'search engine', 'organic traffic', 'seo audit'] },
  { id: 'growth-conversion-tracking', label: 'Conversion Tracking', providedBy: ['growth', 'web'], searchTerms: ['track conversions', 'analytics setup', 'measurement', 'tracking', 'ga4'] },
  { id: 'growth-local-visibility', label: 'Local Visibility', providedBy: ['growth'], searchTerms: ['local seo', 'near me', 'google business profile', 'map pack'] },
  { id: 'growth-campaign-strategy', label: 'Campaign Strategy', providedBy: ['growth'], searchTerms: ['marketing strategy', 'campaign plan', 'acquisition plan'] },
  { id: 'growth-optimization', label: 'Optimization & Reporting', providedBy: ['growth'], searchTerms: ['optimise campaigns', 'campaign reporting', 'reduce cost per lead', 'optimization'] },

  // Creative
  { id: 'creative-brand-identity', label: 'Brand Identity', providedBy: ['creative'], searchTerms: ['logo', 'brand identity', 'visual identity', 'brand guidelines'] },
  { id: 'creative-ui-ux', label: 'UI / UX Architecture', providedBy: ['creative', 'web'], searchTerms: ['ux design', 'ui design', 'user experience', 'wireframe', 'prototype'] },
  { id: 'creative-editorial', label: 'Web Art Direction', providedBy: ['creative'], searchTerms: ['art direction', 'editorial design', 'web design direction'] },
  { id: 'creative-campaign', label: 'Campaign Creative', providedBy: ['creative', 'growth'], searchTerms: ['ad creative', 'banner design', 'campaign design', 'ad creative'] },
  { id: 'creative-social-content', label: 'Social Content', providedBy: ['creative'], searchTerms: ['social posts', 'reels', 'tiktok content', 'instagram content'] },
  { id: 'creative-motion', label: 'Motion', providedBy: ['creative'], searchTerms: ['motion design', 'animation', 'video animation', 'kinetic'] },
  { id: 'creative-product-visuals', label: 'Product Visuals', providedBy: ['creative'], searchTerms: ['product photography', 'product renders', 'product visuals'] },
  { id: 'creative-launch-content', label: 'Launch Content', providedBy: ['creative', 'growth'], searchTerms: ['launch assets', 'launch campaign content', 'go to market assets'] },
  { id: 'creative-presentation', label: 'Presentation Systems', providedBy: ['creative'], searchTerms: ['pitch deck', 'presentation design', 'slide deck'] },

  // Software
  { id: 'software-desktop', label: 'Desktop Software', providedBy: ['software'], searchTerms: ['desktop app', 'windows app', 'mac app', 'native app'] },
  { id: 'software-maintenance', label: 'System Maintenance', providedBy: ['software'], searchTerms: ['pc maintenance', 'clean my pc', 'tune up computer'] },
  { id: 'software-media', label: 'Media Tooling', providedBy: ['software'], searchTerms: ['video tool', 'recording tool', 'media tool'] },
  { id: 'software-security', label: 'Local Security', providedBy: ['software'], searchTerms: ['encrypt files', 'local security tool', 'privacy tool'] },
  { id: 'software-productivity', label: 'Productivity Tooling', providedBy: ['software'], searchTerms: ['productivity tool', 'clipboard', 'file organization'] },
  { id: 'software-engineering', label: 'Engineering Tooling', providedBy: ['software'], searchTerms: ['developer tool', 'engineering tool', 'code tool'] },
];

export const capabilityById = new Map(capabilities.map((capability) => [capability.id, capability]));

export function capabilityLabel(id: string): string {
  return capabilityById.get(id)?.label ?? id;
}

/** Matrix rows: one per division, one column per capability the division offers. */
export function capabilitiesFor(division: CapabilityDivisionId): Capability[] {
  return capabilities.filter((capability) => capability.providedBy.includes(division));
}
