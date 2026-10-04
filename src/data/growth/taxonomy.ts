/**
 * KNOuX Growth — geography and category taxonomy for the Community Hub.
 *
 * The hierarchy is real geography, because relevance for community
 * distribution is almost entirely geographic and category based. UAE and Egypt
 * are the two markets KNOuX operates in.
 *
 * This file holds structure only. It contains no communities, so nothing here
 * can be mistaken for a discovered record.
 */

import type { CommunityPlatform, CountryCode, LanguageCode } from '@/lib/growth/types';

export type CityNode = {
  slug: string;
  name: string;
  /** Cities with no community records still appear, so a zero result reads as
   *  "nothing recorded here" rather than "this place does not exist". */
  regions?: string[];
};

export type CountryNode = {
  code: CountryCode;
  name: string;
  currency: string;
  defaultLanguage: LanguageCode;
  cities: CityNode[];
};

export const COMMUNITY_GEOGRAPHY: readonly CountryNode[] = [
  {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    defaultLanguage: 'ar',
    cities: [
      { slug: 'abu-dhabi', name: 'Abu Dhabi', regions: ['Abu Dhabi Island', 'Al Yas Island', 'Khalifa City', 'Al Wahda', 'Mussafah', 'Yas Island'] },
      { slug: 'dubai', name: 'Dubai', regions: ['Dubai Marina', 'Jumeirah', 'Downtown Dubai', 'Business Bay', 'Deira', 'Bur Dubai', 'Al Barsha', 'Jebel Ali'] },
      { slug: 'sharjah', name: 'Sharjah', regions: ['Al Majaz', 'Aljada', 'Muweilah', 'University City'] },
      { slug: 'ajman', name: 'Ajman', regions: ['Al Jurf', 'Al Rawda'] },
      { slug: 'ras-al-khaimah', name: 'Ras Al Khaimah', regions: ['Al Hamra', 'Al Marjan'] },
      { slug: 'fujairah', name: 'Fujairah', regions: ['Al Fujairah'] },
      { slug: 'umm-al-quwain', name: 'Umm Al Quwain', regions: ['Al Khor'] },
    ],
  },
  {
    code: 'EG',
    name: 'Egypt',
    currency: 'EGP',
    defaultLanguage: 'ar',
    cities: [
      { slug: 'cairo', name: 'Cairo', regions: ['Maadi', 'Zamalek', 'Heliopolis', 'Nasr City', '6th of October', 'New Cairo'] },
      { slug: 'giza', name: 'Giza', regions: ['Dokki', 'Mohandessin', 'Haram', '6th of October'] },
      { slug: 'alexandria', name: 'Alexandria', regions: ['Smouha', 'Sidi Gaber', 'Montaza'] },
      { slug: 'mansoura', name: 'Mansoura', regions: [] },
      { slug: 'port-said', name: 'Port Said', regions: [] },
      { slug: 'suez', name: 'Suez', regions: [] },
      { slug: 'ismailia', name: 'Ismailia', regions: [] },
      { slug: 'shubra-el-kheima', name: 'Shubra El Kheima', regions: [] },
    ],
  },
];

export function countryByCode(code: CountryCode): CountryNode | undefined {
  return COMMUNITY_GEOGRAPHY.find((country) => country.code === code);
}

export function cityBySlug(countryCode: CountryCode, citySlug: string): CityNode | undefined {
  return countryByCode(countryCode)?.cities.find((city) => city.slug === citySlug);
}

export function citiesFor(code: CountryCode): CityNode[] {
  return countryByCode(code)?.cities ?? [];
}

/* ------------------------------------------------------------- categories */

export type CategoryNode = {
  slug: string;
  label: string;
  /** Business categories this community type tends to be relevant to. */
  businessCategories: string[];
};

/**
 * Categories, as the mission enumerates them. `businessCategories` is what makes
 * a community useful to a client rather than merely large: a parents group is a
 * poor fit for a swimming academy and a good fit for a family restaurant.
 */
export const COMMUNITY_CATEGORIES: readonly CategoryNode[] = [
  { slug: 'parents', label: 'Parents', businessCategories: ['swimming', 'education', 'family-restaurant', 'healthcare', 'retail'] },
  { slug: 'schools', label: 'Schools', businessCategories: ['education', 'swimming', 'stationery', 'transport'] },
  { slug: 'sports', label: 'Sports', businessCategories: ['swimming', 'fitness', 'sportswear', 'physiotherapy'] },
  { slug: 'swimming', label: 'Swimming', businessCategories: ['swimming', 'fitness', 'sportswear'] },
  { slug: 'football', label: 'Football', businessCategories: ['sportswear', 'fitness', 'sports'] },
  { slug: 'buy-sell', label: 'Buy & Sell', businessCategories: ['retail', 'ecommerce'] },
  { slug: 'local-business', label: 'Local Businesses', businessCategories: ['retail', 'services', 'hospitality'] },
  { slug: 'residents', label: 'Residents', businessCategories: ['real-estate', 'services', 'hospitality'] },
  { slug: 'jobs', label: 'Jobs', businessCategories: ['recruitment', 'hr'] },
  { slug: 'services', label: 'Services', businessCategories: ['services', 'maintenance', 'cleaning'] },
  { slug: 'women', label: 'Women', businessCategories: ['healthcare', 'fashion', 'hospitality', 'education'] },
  { slug: 'families', label: 'Families', businessCategories: ['family-restaurant', 'retail', 'healthcare', 'education'] },
  { slug: 'arab-communities', label: 'Arab Communities', businessCategories: ['services', 'retail', 'hospitality'] },
  { slug: 'egyptians-abroad', label: 'Egyptians Abroad', businessCategories: ['travel', 'remittance', 'education'] },
  { slug: 'local-communities', label: 'Local Communities', businessCategories: ['services', 'retail', 'hospitality'] },
  { slug: 'directories', label: 'Directories', businessCategories: ['services', 'retail', 'hospitality'] },
];

export function categoryBySlug(slug: string): CategoryNode | undefined {
  return COMMUNITY_CATEGORIES.find((category) => category.slug === slug);
}

/* --------------------------------------------------------------- platforms */

export type PlatformNode = {
  id: CommunityPlatform;
  label: string;
  /**
   * Whether KNOuX can post there automatically. Facebook is `false` and that is
   * a platform fact, not a missing feature: there is no general Groups API for
   * arbitrary group publishing, so the product uses a manual-assisted queue.
   */
  automaticPosting: boolean;
  /** What KNOuX does instead. */
  mechanism: string;
};

export const COMMUNITY_PLATFORMS: readonly PlatformNode[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    automaticPosting: false,
    mechanism:
      'Manual-assisted posting queue. KNOuX prepares the post and the destination; an operator opens the group, posts, and marks it posted. No member list is read and no message is sent by KNOuX.',
  },
  {
    id: 'discord',
    label: 'Discord',
    automaticPosting: false,
    mechanism:
      'Manual-assisted queue where the server requires human moderation. KNOuX prepares content for an operator to submit.',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    automaticPosting: false,
    mechanism:
      'Manual-assisted queue. Public channel posting is subject to channel rules; an operator confirms before posting.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    automaticPosting: false,
    mechanism:
      'Not a discovery source. WhatsApp Communities do not offer public discovery, and KNOuX sends no messages.',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    automaticPosting: false,
    mechanism:
      'Manual-assisted queue. Subreddit rules govern promotion and KNOuX does not post autonomously.',
  },
  {
    id: 'directory',
    label: 'Directory',
    automaticPosting: true,
    mechanism:
      'Directory submissions follow the directory own submission rules and are handled as an approval-gated task.',
  },
];

export function platformById(id: CommunityPlatform): PlatformNode | undefined {
  return COMMUNITY_PLATFORMS.find((platform) => platform.id === id);
}