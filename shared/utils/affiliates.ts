import type { SalaryVerdict } from './verdict';

// ==========================================
// 🤝 AFFILIATE PARTNERS
// ==========================================

export type AffiliatePartnerSlug = 'salary-negotiator' | 'purple-cv' | 'cv-library';

// 'toast' is reserved for the delayed offer toast added by verdict-relevant-affiliate-offers
export type AffiliatePlacement = 'negotiation-grid' | 'standalone-xl' | 'toast';

export type AffiliatePartner = {
  slug: AffiliatePartnerSlug;
  url: string;
};

// Analytics payload - must never carry salary figures or anything identifying the user
export type AffiliateTrackingPayload = {
  partner: AffiliatePartnerSlug;
  placement: AffiliatePlacement;
  country: string;
  verdict: SalaryVerdict;
};

export const AFFILIATE_PARTNERS: Record<AffiliatePartnerSlug, AffiliatePartner> = {
  'salary-negotiator': {
    slug: 'salary-negotiator',
    url: 'https://thesalarynegotiator.com/courses?ref=ndlknjh'
  },
  'purple-cv': {
    slug: 'purple-cv',
    url: 'https://purplecv.co.uk/cv-writing?wpam_id=1293'
  },
  'cv-library': {
    slug: 'cv-library',
    url: 'https://www.cv-library.co.uk/register?id=107202'
  }
};

export const getAffiliateUrl = (partner: AffiliatePartnerSlug): string =>
  AFFILIATE_PARTNERS[partner].url;
