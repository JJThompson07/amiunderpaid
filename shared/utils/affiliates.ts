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

// ==========================================
// 🎯 VERDICT-RELEVANT OFFERS
// ==========================================

// Data only - this file is server-importable, so Tailwind classes and icons live in the
// components that render these offers, keyed by slug
export type AffiliateOfferConfig = {
  slug: AffiliatePartnerSlug;
  url: string;
  titleKey: string;
  straplineKey: string;
  bodyHtmlKey: string;
  nameKey: string;
  ctaTextKey: string;
  countries: readonly string[];
  // verdicts this offer leads for; everything else falls back to `priority` order
  leadVerdicts: readonly SalaryVerdict[];
  priority: number;
  premier: boolean;
  sponsored: boolean;
};

const offerCopyKeys = (
  slug: AffiliatePartnerSlug
): Pick<
  AffiliateOfferConfig,
  'titleKey' | 'straplineKey' | 'bodyHtmlKey' | 'nameKey' | 'ctaTextKey'
> => ({
  titleKey: `sections.negotiation.${slug}.title`,
  straplineKey: `sections.negotiation.${slug}.strapline`,
  bodyHtmlKey: `sections.negotiation.${slug}.body-html`,
  nameKey: `sections.negotiation.${slug}.name`,
  ctaTextKey: `sections.negotiation.${slug}.cta`
});

export const AFFILIATE_OFFERS: readonly AffiliateOfferConfig[] = [
  {
    ...AFFILIATE_PARTNERS['salary-negotiator'],
    ...offerCopyKeys('salary-negotiator'),
    countries: ['UK', 'USA'],
    leadVerdicts: ['underpaid', 'unknown'],
    priority: 1,
    premier: true,
    sponsored: true
  },
  {
    ...AFFILIATE_PARTNERS['purple-cv'],
    ...offerCopyKeys('purple-cv'),
    // UK CV-writing service - not offered to US users
    countries: ['UK'],
    leadVerdicts: ['fair', 'overpaid'],
    priority: 2,
    premier: true,
    sponsored: true
  },
  {
    ...AFFILIATE_PARTNERS['cv-library'],
    ...offerCopyKeys('cv-library'),
    countries: ['UK'],
    leadVerdicts: [],
    priority: 3,
    premier: false,
    sponsored: true
  }
];

export const getOrderedAffiliateOffers = (
  country: string,
  verdict: SalaryVerdict
): AffiliateOfferConfig[] => {
  const rank = (offer: AffiliateOfferConfig): number =>
    (offer.leadVerdicts.includes(verdict) ? 0 : AFFILIATE_OFFERS.length) + offer.priority;

  return AFFILIATE_OFFERS.filter((offer) => offer.countries.includes(country)).sort(
    (a, b) => rank(a) - rank(b)
  );
};

export const getLeadAffiliateOffer = (
  country: string,
  verdict: SalaryVerdict
): AffiliateOfferConfig | null => getOrderedAffiliateOffers(country, verdict)[0] ?? null;

export const getAffiliateToastCopyKeys = (
  partner: AffiliatePartnerSlug,
  verdict: SalaryVerdict
): { title: string; message: string; cta: string } => ({
  title: `toast.affiliate.${partner}.${verdict}.title`,
  message: `toast.affiliate.${partner}.${verdict}.message`,
  cta: `toast.affiliate.${partner}.cta`
});
