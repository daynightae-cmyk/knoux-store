export type SignalCountryCode = string;

export type SignalLineType = 'mobile' | 'fixed' | 'voip' | 'unknown';

export type SignalPhoneFacts = {
  input: string;
  valid: boolean;
  e164: string | null;
  countryCode: SignalCountryCode;
  nationalNumber: string | null;
  lineType: SignalLineType;
  reason?: string;
};

export type SignalAlias = {
  label: string;
  normalizedLabel: string;
  category: 'personal' | 'business' | 'professional' | 'service' | 'other';
  count: number;
};

export type SignalPublicProfile = {
  claimed: boolean;
  verified: boolean;
  displayName: string | null;
  businessName: string | null;
  profileKind: 'person' | 'business' | null;
  communityAliasesEnabled: boolean;
};

export type SignalPublicMention = {
  title: string;
  url: string;
  domain: string;
  snippet: string | null;
};

export type SignalBusinessMatch = {
  name: string;
  category: string | null;
  countryCode: string | null;
  locality: string | null;
  sourceKey: string;
  sourceName: string;
  sourceUrl: string | null;
  attributionRequired: boolean;
};

export type SignalSourceStatus = {
  key: string;
  name: string;
  kind: string;
  status: 'approved' | 'quarantined';
  license: string | null;
  publisher: string | null;
  homepage: string | null;
  licenseUrl: string | null;
  ingestionMode: string;
  attributionRequired: boolean;
  enabled: boolean;
  priority: number;
  accessRequirement: string | null;
  contains: Record<string, boolean>;
};

export type SignalLookupPayload = {
  number: {
    e164: string;
    countryCode: SignalCountryCode;
    nationalNumber: string;
    lineType: SignalLineType;
  };
  profile: SignalPublicProfile | null;
  aliases: SignalAlias[];
  reputation: Record<string, number>;
  publicMentions: SignalPublicMention[];
  businessMatches: SignalBusinessMatch[];
};

export type SignalLookupResponse = {
  ok: boolean;
  query: SignalPhoneFacts;
  data: SignalLookupPayload | null;
  storage: {
    available: boolean;
    reason?: string;
  };
  providers: {
    community: 'live' | 'unavailable';
    licensedIdentity: 'not_configured';
    publicSearch: 'live' | 'error' | 'not_configured';
  };
};

export type SignalActivity = {
  searchesTotal: number;
  profileViewsTotal: number;
  searches30d: number;
  profileViews30d: number;
  visibleViewers: Array<{
    label: string;
    viewCount: number;
    lastViewedAt: string;
  }>;
};