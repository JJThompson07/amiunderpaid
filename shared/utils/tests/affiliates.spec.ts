import { describe, expect, it } from 'vitest';

import {
  AFFILIATE_OFFERS,
  AFFILIATE_PARTNERS,
  getAffiliateToastCopyKeys,
  getAffiliateUrl,
  getLeadAffiliateOffer,
  getOrderedAffiliateOffers
} from '../affiliates';
import enGBSections from '~~/i18n/locales/en-GB/sections.json';
import enGBToast from '~~/i18n/locales/en-GB/toast.json';
import enUSSections from '~~/i18n/locales/en-US/sections.json';
import enUSToast from '~~/i18n/locales/en-US/toast.json';
import type { SalaryVerdict } from '../verdict';

const COUNTRIES = ['UK', 'USA'] as const;
const VERDICTS: SalaryVerdict[] = ['underpaid', 'fair', 'overpaid', 'unknown'];

const LOCALES = {
  'en-GB': { sections: enGBSections, toast: enGBToast },
  'en-US': { sections: enUSSections, toast: enUSToast }
};

// resolves a dotted i18n key (e.g. 'toast.affiliate.purple-cv.fair.title') against a locale
const translate = (locale: keyof typeof LOCALES, key: string): unknown => {
  const [namespace, ...path] = key.split('.');
  let node: unknown = LOCALES[locale][namespace as 'sections' | 'toast'];
  for (const segment of path) {
    node = (node as Record<string, unknown> | undefined)?.[segment];
  }
  return node;
};

const slugs = (country: string, verdict: SalaryVerdict): string[] =>
  getOrderedAffiliateOffers(country, verdict).map((offer) => offer.slug);

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

describe('getOrderedAffiliateOffers', () => {
  it.each(['underpaid', 'unknown'] as const)(
    'leads UK %s users with Salary Negotiator',
    (verdict) => {
      expect(slugs('UK', verdict)).toEqual(['salary-negotiator', 'purple-cv', 'cv-library']);
    }
  );

  it.each(['fair', 'overpaid'] as const)('leads UK %s users with PurpleCV', (verdict) => {
    expect(slugs('UK', verdict)).toEqual(['purple-cv', 'salary-negotiator', 'cv-library']);
  });

  it.each(VERDICTS)('only offers Salary Negotiator to %s US users', (verdict) => {
    expect(slugs('USA', verdict)).toEqual(['salary-negotiator']);
  });

  it('offers nothing for an unsupported country', () => {
    expect(getOrderedAffiliateOffers('FR', 'fair')).toEqual([]);
  });

  it('does not reorder the shared registry', () => {
    getOrderedAffiliateOffers('UK', 'fair');
    expect(AFFILIATE_OFFERS.map((offer) => offer.slug)).toEqual([
      'salary-negotiator',
      'purple-cv',
      'cv-library'
    ]);
  });
});

describe('getLeadAffiliateOffer', () => {
  it('returns the first ordered offer', () => {
    expect(getLeadAffiliateOffer('UK', 'overpaid')?.slug).toBe('purple-cv');
    expect(getLeadAffiliateOffer('USA', 'overpaid')?.slug).toBe('salary-negotiator');
  });

  it('returns null when no offer serves the country', () => {
    expect(getLeadAffiliateOffer('FR', 'underpaid')).toBeNull();
  });
});

describe('affiliate copy coverage', () => {
  describe.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])('%s', (locale) => {
    it.each(COUNTRIES.flatMap((country) => VERDICTS.map((verdict) => [country, verdict] as const)))(
      'has toast copy for the %s %s lead offer',
      (country, verdict) => {
        const lead = getLeadAffiliateOffer(country, verdict);
        expect(lead).not.toBeNull();

        const keys = getAffiliateToastCopyKeys(lead!.slug, verdict);
        expect(translate(locale, keys.title)).toEqual(expect.any(String));
        expect(translate(locale, keys.message)).toEqual(expect.any(String));
        expect(translate(locale, keys.cta)).toEqual(expect.any(String));
        expect(translate(locale, 'toast.affiliate.sponsored')).toEqual(expect.any(String));
      }
    );

    it.each(AFFILIATE_OFFERS.map((offer) => [offer.slug, offer] as const))(
      'has grid card copy for %s',
      (_slug, offer) => {
        for (const key of [
          offer.titleKey,
          offer.straplineKey,
          offer.bodyHtmlKey,
          offer.nameKey,
          offer.ctaTextKey
        ]) {
          expect(translate(locale, key)).toEqual(expect.any(String));
        }
      }
    );
  });
});
