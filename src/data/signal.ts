export type SignalRouteId =
  | 'home'
  | 'lookup'
  | 'my-number'
  | 'activity'
  | 'labels'
  | 'reputation'
  | 'privacy'
  | 'claim'
  | 'watchlist'
  | 'business'
  | 'settings';

export type SignalRouteDefinition = {
  id: SignalRouteId;
  label: string;
  href: string;
  code: string;
  description: string;
  parent?: SignalRouteId;
  requiresAuth?: boolean;
  requiresVerifiedOwner?: boolean;
};

export const signalRoutes: readonly SignalRouteDefinition[] = [
  {
    id: 'home',
    label: 'Signal',
    href: '/signal',
    code: 'SG',
    description: 'Identity, contact-label and reputation intelligence.',
  },  {
    id: 'lookup',
    label: 'Lookup',
    href: '/signal/lookup',
    code: 'SG-01',
    description: 'Search a phone number and resolve available Signal evidence.',
    parent: 'home',
  },
  {
    id: 'my-number',
    label: 'My Number',
    href: '/signal/my-number',
    code: 'SG-02',
    description: 'Owner control center for a verified phone profile.',
    parent: 'home',
    requiresAuth: true,
    requiresVerifiedOwner: true,
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/signal/my-number/activity',
    code: 'SG-03',
    description: 'Aggregate searches, profile views and consent-visible viewers.',
    parent: 'my-number',
    requiresAuth: true,
    requiresVerifiedOwner: true,
  },
  {
    id: 'labels',
    label: 'Labels',
    href: '/signal/my-number/labels',
    code: 'SG-04',
    description: 'Community aliases and normalized identity clusters.',
    parent: 'my-number',
    requiresAuth: true,
    requiresVerifiedOwner: true,
  },  {
    id: 'reputation',
    label: 'Reputation',
    href: '/signal/my-number/reputation',
    code: 'SG-05',
    description: 'Reputation reports, categories and change history.',
    parent: 'my-number',
    requiresAuth: true,
    requiresVerifiedOwner: true,
  },
  {
    id: 'privacy',
    label: 'Privacy',
    href: '/signal/my-number/privacy',
    code: 'SG-06',
    description: 'Visibility, community-label and viewer-disclosure controls.',
    parent: 'my-number',
    requiresAuth: true,
    requiresVerifiedOwner: true,
  },
  {
    id: 'claim',
    label: 'Claim Number',
    href: '/signal/claim',
    code: 'SG-07',
    description: 'Claim a phone profile after account-level phone verification.',
    parent: 'home',
    requiresAuth: true,
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    href: '/signal/watchlist',
    code: 'SG-08',
    description: 'Reserved surface for user-selected Signal change monitoring.',
    parent: 'home',
    requiresAuth: true,
  },  {
    id: 'business',
    label: 'Business',
    href: '/signal/business',
    code: 'SG-09',
    description: 'Verified business identity and reputation analytics.',
    parent: 'home',
    requiresAuth: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/signal/settings',
    code: 'SG-10',
    description: 'Signal-specific account and disclosure preferences.',
    parent: 'home',
    requiresAuth: true,
  },
] as const;

export const signalRoute = (id: SignalRouteId) =>
  signalRoutes.find((route) => route.id === id);

export const signalChildren = (parent: SignalRouteId) =>
  signalRoutes.filter((route) => route.parent === parent);
