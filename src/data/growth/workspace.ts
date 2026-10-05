/**
 * KNOuX Growth — campaign, performance, lead, content and creative fixtures.
 *
 * DEMO DATA throughout. Every metric carries `origin: 'FIXTURE'`, which the UI
 * renders with the DEMO notice. This is deliberate and it is the point: the
 * Command Center is fully usable and fully reviewable before a single provider
 * credential exists, and the interface between "demo" and "real" is a single
 * field that is never guessed.
 *
 * The performance rows deliberately do NOT all report the same metrics. Meta
 * rows have no revenue, Google Ads rows have no reach. That mirrors the real
 * providers and it exercises the null-preservation path in the analytics screen
 * rather than hiding it behind a table of uniformly populated numbers.
 */

import { fixture } from '@/lib/growth/states';
import type {
  Campaign,
  ContentItem,
  CreativeDraft,
  GoogleLocation,
  Lead,
  PerformanceRow,
} from '@/lib/growth/types';

const T = '2026-10-04T00:00:00.000Z';

/* -------------------------------------------------------------- campaigns */

export const DEMO_CAMPAIGNS: readonly Campaign[] = [
  {
    id: 'cmp_swim_intro',
    clientId: 'cl_swimfit',
    name: 'Junior learn-to-swim — autumn intake',
    objective: 'LEADS',
    platforms: ['facebook', 'instagram'],
    budgetMinor: 75000,
    currency: 'AED',
    startDate: '2026-10-06',
    endDate: '2026-10-13',
    locations: ['Abu Dhabi', 'Khalifa City', 'Al Yas Island'],
    languages: ['ar', 'en'],
    audienceNotes:
      'Parents of children aged 3 to 10 within 8km of the Khalifa City branch. Exclude existing bookings.',
    creativeSetIds: ['cr_swim_01', 'cr_swim_04'],
    landingPageUrl: 'https://example.invalid/swimfit/junior',
    conversionTarget: 'WhatsApp conversation started',
    status: 'READY_FOR_REVIEW',
    remoteCampaignIds: {},
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cmp_swim_whatsapp',
    clientId: 'cl_swimfit',
    name: 'Adult beginner — WhatsApp enquiries',
    objective: 'WHATSAPP',
    platforms: ['facebook'],
    budgetMinor: 40000,
    currency: 'AED',
    startDate: '2026-10-15',
    endDate: '2026-10-29',
    locations: ['Abu Dhabi'],
    languages: ['ar', 'en'],
    audienceNotes: 'Adults 25 to 45 who have not swum in five years or more.',
    creativeSetIds: ['cr_swim_02'],
    landingPageUrl: 'https://example.invalid/swimfit/adult',
    conversionTarget: 'WhatsApp conversation started',
    status: 'DRAFT',
    remoteCampaignIds: {},
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cmp_nb_search',
    clientId: 'cl_northbay',
    name: 'Brand search defence — Dubai',
    objective: 'CALLS',
    platforms: ['google_search'],
    budgetMinor: 120000,
    currency: 'AED',
    startDate: '2026-10-01',
    endDate: '2026-11-01',
    locations: ['Dubai', 'Sharjah'],
    languages: ['ar', 'en'],
    audienceNotes: 'Exact and phrase match on the clinic brand name only.',
    creativeSetIds: ['cr_nb_01'],
    landingPageUrl: 'https://example.invalid/northbay',
    conversionTarget: 'Call initiated from Business Profile',
    status: 'APPROVED',
    remoteCampaignIds: {},
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cmp_nb_maps',
    clientId: 'cl_northbay',
    name: 'Local presence — Dubai Marina',
    objective: 'WEBSITE',
    platforms: ['google_maps'],
    budgetMinor: 60000,
    currency: 'AED',
    startDate: '2026-09-01',
    endDate: '2026-10-01',
    locations: ['Dubai Marina'],
    languages: ['en'],
    audienceNotes: 'Within 5km of the Marina branch.',
    creativeSetIds: ['cr_nb_01'],
    landingPageUrl: 'https://example.invalid/northbay/marina',
    conversionTarget: 'Website click from Business Profile',
    status: 'LIVE',
    // Populated in a fixture only to show how a confirmed live campaign reads.
    // It is labelled DEMO and no provider call produced it.
    remoteCampaignIds: { google_maps: 'demo_placeholder_id' },
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cmp_sands_awareness',
    clientId: 'cl_sands',
    name: 'Autumn collection awareness',
    objective: 'AWARENESS',
    platforms: ['instagram', 'facebook'],
    budgetMinor: 200000,
    currency: 'AED',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    locations: ['Dubai'],
    languages: ['en'],
    audienceNotes: 'Interior designers and architects, 28 to 50.',
    creativeSetIds: ['cr_ss_01'],
    landingPageUrl: 'https://example.invalid/sandsandstone',
    conversionTarget: 'Landing page view',
    status: 'CHANGES_REQUESTED',
    remoteCampaignIds: {},
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cmp_nile_launch',
    clientId: 'cl_nile',
    name: 'Zamalek store opening',
    objective: 'AWARENESS',
    platforms: ['facebook'],
    budgetMinor: 90000,
    currency: 'EGP',
    startDate: '2026-10-20',
    endDate: '2026-11-20',
    locations: ['Cairo', 'Zamalek'],
    languages: ['ar'],
    audienceNotes: 'Within Cairo metro. Arabic only for the opening window.',
    creativeSetIds: ['cr_nc_01'],
    landingPageUrl: 'https://example.invalid/nilecraft',
    conversionTarget: 'Landing page view',
    status: 'DRAFT',
    remoteCampaignIds: {},
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
];

export function campaignsFor(clientId: string): Campaign[] {
  return DEMO_CAMPAIGNS.filter((campaign) => campaign.clientId === clientId);
}

/* ---------------------------------------------------- performance rows */

/**
 * Fixture-sourced rows, shaped to mirror real provider coverage.
 *
 * Meta rows carry reach and no revenue. Google Ads rows carry revenue and no
 * reach. A row with neither a spend nor a lead count is included so the
 * analytics screen has to render an unavailable state honestly.
 */
export const DEMO_PERFORMANCE_ROWS: readonly PerformanceRow[] = [
  {
    key: 'perf_swim_meta',
    clientId: 'cl_swimfit',
    campaignId: 'cmp_swim_intro',
    platformLabel: 'Meta — Facebook & Instagram',
    metrics: {
      spend: fixture(1250.0),
      impressions: fixture(184_200),
      reach: fixture(61_400),
      clicks: fixture(2_890),
      leads: fixture(38),
      whatsappStarts: fixture(22),
    },
    derived: {
      ctr: fixture(1.57),
      cpc: fixture(0.43),
      cpm: fixture(6.79),
      roas: null,
      costPerLead: fixture(32.89),
      costPerQualifiedLead: fixture(61.6),
      costPerBooking: null,
    },
  },
  {
    key: 'perf_nb_ads',
    clientId: 'cl_northbay',
    campaignId: 'cmp_nb_search',
    platformLabel: 'Google Ads — Search',
    metrics: {
      spend: fixture(980.0),
      impressions: fixture(31_500),
      // No reach: Search does not report one.
      clicks: fixture(4_410),
      leads: fixture(27),
      calls: fixture(19),
      revenue: fixture(0),
    },
    derived: {
      ctr: fixture(14.0),
      cpc: fixture(0.22),
      cpm: fixture(31.11),
      roas: null,
      costPerLead: fixture(36.3),
      costPerQualifiedLead: fixture(72.6),
      costPerBooking: null,
    },
  },
  {
    key: 'perf_nb_business',
    clientId: 'cl_northbay',
    campaignId: 'cmp_nb_maps',
    platformLabel: 'Google Business Profile',
    metrics: {
      clicks: fixture(640),
      calls: fixture(88),
      bookings: fixture(31),
      leads: fixture(104),
    },
    derived: {
      ctr: null,
      cpc: null,
      cpm: null,
      roas: null,
      costPerLead: null,
      costPerQualifiedLead: null,
      costPerBooking: null,
    },
  },
  {
    key: 'perf_sands_meta',
    clientId: 'cl_sands',
    platformLabel: 'Meta — Instagram',
    metrics: {
      spend: fixture(2400.0),
      impressions: fixture(402_000),
      reach: fixture(158_000),
      clicks: fixture(3_120),
      leads: fixture(14),
    },
    derived: {
      ctr: fixture(0.78),
      cpc: fixture(0.77),
      cpm: fixture(5.97),
      roas: null,
      costPerLead: fixture(171.43),
      costPerQualifiedLead: null,
      costPerBooking: null,
    },
  },
  {
    key: 'perf_nile_meta',
    clientId: 'cl_nile',
    platformLabel: 'Meta — Facebook',
    metrics: {
      spend: fixture(620.0),
      impressions: fixture(74_500),
      reach: fixture(31_200),
      clicks: fixture(910),
      leads: fixture(9),
    },
    derived: {
      ctr: fixture(1.22),
      cpc: fixture(0.68),
      cpm: fixture(8.32),
      roas: null,
      costPerLead: fixture(68.89),
      costPerQualifiedLead: null,
      costPerBooking: null,
    },
  },
];

export function performanceRowsFor(clientId: string): PerformanceRow[] {
  return DEMO_PERFORMANCE_ROWS.filter((row) => row.clientId === clientId);
}

/* ------------------------------------------------------------------ leads */

/**
 * DEMO leads. Contact fields are present because a lead form collects them —
 * that is the legitimate origin. Nothing here is real: the numbers are in
 * reserved ranges and the names are placeholders.
 */
export const DEMO_LEADS: readonly Lead[] = [
  {
    id: 'ld_001',
    clientId: 'cl_swimfit',
    source: 'WhatsApp',
    platform: 'whatsapp',
    campaignId: 'cmp_swim_intro',
    adName: 'Junior — Arabic',
    name: 'Demo Parent A',
    phone: '+971 50 000 0010',
    occurredAt: '2026-10-02T09:14:00.000Z',
    status: 'QUALIFIED',
    qualification: 'QUALIFIED',
    assignedTo: 'operator@knoux.store',
    notes: 'Demo record. Wants weekday evening lessons, Khalifa City branch.',
    bookedAt: '2026-10-07T15:00:00.000Z',
    saleValueMinor: 120000,
    currency: 'AED',
    origin: 'FIXTURE',
  },
  {
    id: 'ld_002',
    clientId: 'cl_swimfit',
    source: 'Instagram',
    platform: 'instagram',
    campaignId: 'cmp_swim_intro',
    adName: 'Junior — English',
    name: 'Demo Parent B',
    occurredAt: '2026-10-03T11:02:00.000Z',
    status: 'NEW',
    qualification: 'UNQUALIFIED',
    origin: 'FIXTURE',
  },
  {
    id: 'ld_003',
    clientId: 'cl_swimfit',
    source: 'Community post',
    platform: 'facebook',
    adName: 'Abu Dhabi Parents',
    name: 'Demo Parent C',
    occurredAt: '2026-10-03T18:40:00.000Z',
    status: 'CONTACTED',
    qualification: 'UNQUALIFIED',
    notes: 'Demo record. Arrived from a manually posted community message.',
    origin: 'FIXTURE',
  },
  {
    id: 'ld_004',
    clientId: 'cl_northbay',
    source: 'Google Ads',
    platform: 'google_ads',
    campaignId: 'cmp_nb_search',
    adName: 'Brand — exact',
    name: 'Demo Caller D',
    phone: '+971 50 000 0011',
    occurredAt: '2026-10-01T08:05:00.000Z',
    status: 'BOOKED',
    qualification: 'HOT',
    bookedAt: '2026-10-06T10:30:00.000Z',
    saleValueMinor: 60000,
    currency: 'AED',
    origin: 'FIXTURE',
  },
  {
    id: 'ld_005',
    clientId: 'cl_northbay',
    source: 'Business Profile',
    platform: 'google_business',
    campaignId: 'cmp_nb_maps',
    occurredAt: '2026-10-04T07:22:00.000Z',
    status: 'LOST',
    qualification: 'UNQUALIFIED',
    notes: 'Demo record. Wrong branch, referred on.',
    origin: 'FIXTURE',
  },
  {
    id: 'ld_006',
    clientId: 'cl_sands',
    source: 'Instagram',
    platform: 'instagram',
    name: 'Demo Enquiry E',
    email: 'demo@example.invalid',
    occurredAt: '2026-09-28T13:55:00.000Z',
    status: 'CONTACTED',
    qualification: 'QUALIFIED',
    notes: 'Demo record. Hospitality project, awaiting drawings.',
    origin: 'FIXTURE',
  },
  {
    id: 'ld_007',
    clientId: 'cl_nile',
    source: 'Community post',
    platform: 'facebook',
    adName: 'Cairo Families',
    name: 'Demo Enquiry F',
    occurredAt: '2026-10-01T16:10:00.000Z',
    status: 'WON',
    qualification: 'HOT',
    saleValueMinor: 450000,
    currency: 'EGP',
    origin: 'FIXTURE',
  },
  {
    id: 'ld_008',
    clientId: 'cl_nile',
    source: 'Facebook',
    platform: 'facebook',
    occurredAt: '2026-10-03T19:30:00.000Z',
    status: 'NEW',
    qualification: 'UNQUALIFIED',
    origin: 'FIXTURE',
  },
];

export function leadsFor(clientId: string): Lead[] {
  return DEMO_LEADS.filter((lead) => lead.clientId === clientId);
}

/* ---------------------------------------------------------------- content */

export const DEMO_CONTENT: readonly ContentItem[] = [
  {
    id: 'ct_001',
    clientId: 'cl_swimfit',
    campaignId: 'cmp_swim_intro',
    platforms: ['facebook', 'instagram'],
    copy: 'Demo draft. Autumn junior learn-to-swim intake is open at our Khalifa City branch. Two trial sessions before you decide.',
    mediaAssetIds: ['brand/pool-01.jpg'],
    scheduledFor: '2026-10-06T08:00:00.000Z',
    status: 'APPROVAL_REQUIRED',
    author: 'operator@knoux.store',
    aiGenerated: true,
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'ct_002',
    clientId: 'cl_swimfit',
    platforms: ['instagram'],
    copy: 'Demo draft. Ten metres is not a small thing for a four-year-old. Here is what the first month looks like.',
    mediaAssetIds: [],
    scheduledFor: '2026-10-09T12:00:00.000Z',
    status: 'DRAFT',
    author: 'operator@knoux.store',
    aiGenerated: true,
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'ct_003',
    clientId: 'cl_swimfit',
    platforms: ['facebook'],
    copy: 'Demo draft. Al Yas Island branch timetable for the winter term is now posted.',
    mediaAssetIds: [],
    status: 'SCHEDULED',
    scheduledFor: '2026-10-11T09:00:00.000Z',
    author: 'operator@knoux.store',
    aiGenerated: false,
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'ct_004',
    clientId: 'cl_northbay',
    platforms: ['facebook'],
    copy: 'Demo draft. Winter physio appointments at our Marina branch open on the first of the month.',
    mediaAssetIds: ['brand/reception.jpg'],
    status: 'APPROVAL_REQUIRED',
    author: 'operator@knoux.store',
    aiGenerated: true,
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'ct_005',
    clientId: 'cl_sands',
    platforms: ['instagram'],
    copy: 'Demo draft. New showroom pieces in solid walnut and unlacquered brass.',
    mediaAssetIds: ['brand/interior-01.jpg'],
    status: 'DRAFT',
    author: 'operator@knoux.store',
    aiGenerated: true,
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'ct_006',
    clientId: 'cl_nile',
    platforms: ['facebook'],
    copy: 'Demo draft. The Zamalek workshop opens this month. Visitors welcome.',
    mediaAssetIds: ['brand/workshop-01.jpg'],
    status: 'SCHEDULED',
    scheduledFor: '2026-10-20T10:00:00.000Z',
    author: 'operator@knoux.store',
    aiGenerated: false,
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
];

export function contentFor(clientId: string): ContentItem[] {
  return DEMO_CONTENT.filter((item) => item.clientId === clientId);
}

/* -------------------------------------------------------------- creative */

export const DEMO_CREATIVES: readonly CreativeDraft[] = [
  {
    id: 'cr_swim_01',
    clientId: 'cl_swimfit',
    campaignId: 'cmp_swim_intro',
    format: 'SHORT_VIDEO',
    concept: 'Demo concept. Ten metres, filmed from the child side of the pool.',
    hooks: ['She swam ten metres today.', 'Nobody told her she could not.'],
    headline: 'Autumn junior intake is open',
    primaryText:
      'Demo copy. Two trial sessions at Khalifa City. We do not promise a level. We start where your child actually is.',
    cta: 'Send a message',
    visualPrompt:
      'Demo prompt. Pool-level camera, single child in the water, natural light, no text overlay.',
    videoScript: [
      'Demo script. Open on an empty lane, quiet.',
      'Cut to the child entering the water, unhurried.',
      'Coach speaks off camera. No claims, no statistics.',
      'End on the poolside and a single line of text.',
    ],
    languages: ['en', 'ar'],
    aiGenerated: true,
    status: 'DRAFT',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cr_swim_04',
    clientId: 'cl_swimfit',
    campaignId: 'cmp_swim_intro',
    format: 'CAROUSEL',
    concept: 'Demo concept. What the first month actually contains.',
    hooks: ['What happens in month one.'],
    cta: 'Learn more',
    languages: ['en'],
    aiGenerated: false,
    status: 'APPROVED',
    reviewedBy: 'operator@knoux.store',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cr_swim_02',
    clientId: 'cl_swimfit',
    format: 'IMAGE',
    concept: 'Demo concept. Adult beginner, still image.',
    hooks: ['Adults who cannot swim are not a lost cause.'],
    cta: 'Send a message',
    languages: ['ar', 'en'],
    aiGenerated: true,
    status: 'DRAFT',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cr_nb_01',
    clientId: 'cl_northbay',
    format: 'RESPONSIVE_SEARCH',
    concept: 'Demo concept. Brand-only search defence.',
    hooks: [],
    headline: 'North Bay Clinic — Marina',
    cta: 'Call',
    languages: ['en', 'ar'],
    aiGenerated: false,
    status: 'APPROVED',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cr_ss_01',
    clientId: 'cl_sands',
    format: 'IMAGE',
    concept: 'Demo concept. Material detail, no model.',
    hooks: [],
    headline: 'Autumn collection',
    cta: 'Enquire',
    languages: ['en'],
    aiGenerated: true,
    status: 'IN_REVIEW',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cr_nc_01',
    clientId: 'cl_nile',
    format: 'IMAGE',
    concept: 'Demo concept. Workshop opening.',
    hooks: [],
    headline: 'Zamalek workshop, open this month',
    cta: 'Learn more',
    languages: ['ar'],
    aiGenerated: true,
    status: 'DRAFT',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
];

export function creativesFor(clientId: string): CreativeDraft[] {
  return DEMO_CREATIVES.filter((creative) => creative.clientId === clientId);
}

/* ------------------------------------------------------- google presence */

export const DEMO_GOOGLE_LOCATIONS: readonly GoogleLocation[] = [
  {
    id: 'gl_nb_marina',
    clientId: 'cl_northbay',
    name: 'North Bay Clinic — Dubai Marina',
    addressLine: 'Demo address, Dubai Marina',
    city: 'dubai',
    category: 'Clinic',
    rating: fixture(4.6),
    reviewCount: fixture(212),
    websiteClicks: fixture(640),
    directionRequests: fixture(104),
    calls: fixture(88),
    origin: 'FIXTURE',
  },
  {
    id: 'gl_nb_majaz',
    clientId: 'cl_northbay',
    name: 'North Bay Clinic — Al Majaz',
    addressLine: 'Demo address, Al Majaz, Sharjah',
    city: 'sharjah',
    category: 'Clinic',
    // Deliberately no rating and no clicks: a location with no reviews is a
    // real state, and the presence screen must show it as unavailable.
    calls: fixture(31),
    origin: 'FIXTURE',
  },
  {
    id: 'gl_swim_khalifa',
    clientId: 'cl_swimfit',
    name: 'SwimFit Academy — Khalifa City',
    addressLine: 'Demo address, Khalifa City, Abu Dhabi',
    city: 'abu-dhabi',
    category: 'Sports club',
    calls: fixture(44),
    origin: 'FIXTURE',
  },
  {
    id: 'gl_nile_zamalek',
    clientId: 'cl_nile',
    name: 'Nile Craft — Zamalek',
    addressLine: 'Demo address, Zamalek, Cairo',
    city: 'cairo',
    category: 'Retail store',
    rating: fixture(4.8),
    reviewCount: fixture(76),
    websiteClicks: fixture(190),
    calls: fixture(52),
    origin: 'FIXTURE',
  },
];

export function locationsFor(clientId: string): GoogleLocation[] {
  return DEMO_GOOGLE_LOCATIONS.filter((location) => location.clientId === clientId);
}