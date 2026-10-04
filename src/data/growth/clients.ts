/**
 * KNOuX Growth — client fixtures.
 *
 * DEMO DATA. Every record here is invented for demonstration and is not a real
 * business, a real brand, or a real client of KNOuX. `origin: 'FIXTURE'` is set
 * on each one and the Command Center renders the DEMO notice wherever these
 * appear, so a fixture can never be read as a production record.
 *
 * Names are deliberately generic and non-referential. No real client brand from
 * any other KNOuX project is used, and no contact detail here is a real one.
 */

import type { Client } from '@/lib/growth/types';

const T = '2026-10-04T00:00:00.000Z';

export const DEMO_CLIENTS: readonly Client[] = [
  {
    id: 'cl_swimfit',
    name: 'SwimFit Academy',
    legalName: 'SwimFit Academy (demo record)',
    brand: {
      colors: ['#0e2a38', '#2f8fb5', '#f2f7f9'],
      fonts: ['Inter', 'Noto Kufi Arabic'],
      tone: 'Encouraging and precise. Never boastful about results.',
      arabicStyle: 'Modern Standard Arabic, warm register, short sentences.',
      englishStyle: 'Plain, active, second person. Avoid exclamation marks.',
      forbiddenClaims: [
        'No guarantee of a place, a scholarship, or a competition result.',
        'No medical, safety or injury-prevention claims beyond what the coaches are qualified to state.',
        'Do not describe any child by name or imply any child is a case study.',
      ],
      approvedAssets: ['brand/logo-primary.svg', 'brand/pool-01.jpg', 'brand/coach-portrait-set'],
      previousWinningCreativeIds: ['cr_swim_01', 'cr_swim_04'],
      products: [
        'Baby aquatics (3 months+)',
        'Junior learn-to-swim',
        'Adult beginner',
        'Private one-to-one',
        'Summer intensive',
      ],
    },
    businessCategory: 'swimming',
    country: 'AE',
    city: 'abu-dhabi',
    branches: [
      {
        id: 'br_swim_ad',
        name: 'Khalifa City',
        city: 'abu-dhabi',
        addressLine: 'Demo address, Khalifa City, Abu Dhabi',
        phone: '+971 2 000 0000',
        whatsapp: '+971 50 000 0000',
      },
      {
        id: 'br_swim_ad2',
        name: 'Al Yas Island',
        city: 'abu-dhabi',
        addressLine: 'Demo address, Al Yas Island, Abu Dhabi',
        phone: '+971 2 000 0001',
      },
    ],
    website: 'https://example.invalid/swimfit',
    phone: '+971 2 000 0000',
    whatsapp: '+971 50 000 0000',
    languages: ['ar', 'en'],
    brandNotes:
      'Demo record. Swimming academy in Abu Dhabi. Parents are the decision maker; the child is the user.',
    connectedPlatforms: [],
    autonomyMode: 'COPILOT',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cl_northbay',
    name: 'North Bay Clinic',
    legalName: 'North Bay Clinic (demo record)',
    brand: {
      colors: ['#12303a', '#4d8f9c', '#f4f6f6'],
      fonts: ['Source Sans 3', 'Noto Naskh Arabic'],
      tone: 'Calm, clinical, unhurried. No fear-based language.',
      arabicStyle: 'Clear Modern Standard Arabic.',
      englishStyle: 'Short sentences, no jargon, no urgency claims.',
      forbiddenClaims: [
        'No diagnosis, treatment promise, or cure claim.',
        'No outcome or survival statistics.',
        'Do not imply affiliation with any hospital or insurer.',
      ],
      approvedAssets: ['brand/logo-northbay.svg', 'brand/reception.jpg'],
      previousWinningCreativeIds: [],
      products: ['General consultation', 'Physiotherapy', 'Paediatric screening', 'Executive health'],
    },
    businessCategory: 'healthcare',
    country: 'AE',
    city: 'dubai',
    branches: [
      {
        id: 'br_nb_dxb',
        name: 'Dubai Marina',
        city: 'dubai',
        addressLine: 'Demo address, Dubai Marina, Dubai',
        phone: '+971 4 000 0000',
        whatsapp: '+971 50 000 0001',
      },
      {
        id: 'br_nb_sha',
        name: 'Al Majaz',
        city: 'sharjah',
        addressLine: 'Demo address, Al Majaz, Sharjah',
        phone: '+971 6 000 0000',
      },
    ],
    website: 'https://example.invalid/northbay',
    phone: '+971 4 000 0000',
    whatsapp: '+971 50 000 0001',
    languages: ['ar', 'en'],
    brandNotes: 'Demo record. Multi-branch clinic. Compliance-sensitive category: review before publishing.',
    connectedPlatforms: [],
    autonomyMode: 'ADVISOR',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cl_sands',
    name: 'Sands & Stone',
    legalName: 'Sands & Stone (demo record)',
    brand: {
      colors: ['#2b2118', '#b08d57', '#f5f1ea'],
      fonts: ['Cormorant Garamond', 'Inter'],
      tone: 'Understated and material. Describes craft, not aspiration.',
      arabicStyle: 'Formal Arabic with hospitality register.',
      englishStyle: 'Editorial, restrained, specific about materials.',
      forbiddenClaims: [
        'No discount, urgency, or scarcity language.',
        'No claims of being the only or best provider.',
        'Do not price individual items in public copy.',
      ],
      approvedAssets: ['brand/logo-sands.svg', 'brand/interior-01.jpg', 'brand/interior-02.jpg'],
      previousWinningCreativeIds: [],
      products: ['Bespoke furniture', 'Interior fit-out', 'Hospitality supply'],
    },
    businessCategory: 'furniture',
    country: 'AE',
    city: 'dubai',
    branches: [
      {
        id: 'br_ss_dxb',
        name: 'Design District',
        city: 'dubai',
        addressLine: 'Demo address, Dubai Design District, Dubai',
        phone: '+971 4 000 0010',
      },
    ],
    website: 'https://example.invalid/sandsandstone',
    phone: '+971 4 000 0010',
    languages: ['ar', 'en'],
    brandNotes: 'Demo record. B2B and private residential. Longer sales cycle; leads are not same-day.',
    connectedPlatforms: [],
    autonomyMode: 'ADVISOR',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'cl_nile',
    name: 'Nile Craft',
    legalName: 'Nile Craft (demo record)',
    brand: {
      colors: ['#123a4d', '#c9a227', '#f7f4ec'],
      fonts: ['Almarai', 'Libre Baskerville'],
      tone: 'Warm and proud without being sentimental.',
      arabicStyle: 'Egyptian-friendly Arabic, conversational.',
      englishStyle: 'Direct, concrete, uses real places and materials.',
      forbiddenClaims: [
        'No claim of being Egypt oldest or most authentic.',
        'No geopolitical or religious statements.',
      ],
      approvedAssets: ['brand/logo-nile.svg', 'brand/workshop-01.jpg'],
      previousWinningCreativeIds: [],
      products: ['Handmade pottery', 'Textile weaving', 'Bespoke orders'],
    },
    businessCategory: 'retail',
    country: 'EG',
    city: 'cairo',
    branches: [
      {
        id: 'br_nc_cir',
        name: 'Zamalek',
        city: 'cairo',
        addressLine: 'Demo address, Zamalek, Cairo',
        phone: '+20 2 0000 0000',
        whatsapp: '+20 100 000 0000',
      },
    ],
    website: 'https://example.invalid/nilecraft',
    phone: '+20 2 0000 0000',
    whatsapp: '+20 100 000 0000',
    languages: ['ar', 'en'],
    brandNotes: 'Demo record. Egypt market. Demonstrates the Egypt locale and EGP currency path.',
    connectedPlatforms: [],
    autonomyMode: 'COPILOT',
    origin: 'FIXTURE',
    createdAt: T,
    updatedAt: T,
  },
];

export function clientById(id: string): Client | undefined {
  return DEMO_CLIENTS.find((client) => client.id === id);
}

export function allClientIds(): string[] {
  return DEMO_CLIENTS.map((client) => client.id);
}