import { describe, expect, it } from 'vitest';

import { AFFILIATE_PARTNERS, getAffiliateUrl } from '../affiliates';

describe('AFFILIATE_PARTNERS', () => {
  it('keys every partner by its own slug', () => {
    for (const [key, partner] of Object.entries(AFFILIATE_PARTNERS)) {
      expect(partner.slug).toBe(key);
    }
  });

  it('only links to https destinations', () => {
    for (const partner of Object.values(AFFILIATE_PARTNERS)) {
      expect(new URL(partner.url).protocol).toBe('https:');
    }
  });

  it('keeps each partner referral id on its url', () => {
    expect(AFFILIATE_PARTNERS['salary-negotiator'].url).toBe(
      'https://thesalarynegotiator.com/courses?ref=ndlknjh'
    );
    expect(AFFILIATE_PARTNERS['purple-cv'].url).toBe(
      'https://purplecv.co.uk/cv-writing?wpam_id=1293'
    );
    expect(AFFILIATE_PARTNERS['cv-library'].url).toBe(
      'https://www.cv-library.co.uk/register?id=107202'
    );
  });
});

describe('getAffiliateUrl', () => {
  it('returns the registered url for a partner', () => {
    expect(getAffiliateUrl('purple-cv')).toBe(AFFILIATE_PARTNERS['purple-cv'].url);
    expect(getAffiliateUrl('cv-library')).toBe(AFFILIATE_PARTNERS['cv-library'].url);
  });
});
