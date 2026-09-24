import type { ComputedRef } from 'vue';

type UseHostCountryReturn = {
  hostCountry: ComputedRef<'UK' | 'USA'>;
  alternateSiteBaseUrl: ComputedRef<string>;
};

// useRegion()'s currentCountry/alternateSiteUrl are derived from the i18n
// locale, which has a known, pre-existing domain-resolution bug (e.g.
// localhost:3000 -- listed as an en-GB domain in nuxt.config.ts -- resolves
// server-side to en-US), silently sending country-scoped search requests to
// the wrong site. This reads the request host directly instead, matching
// nuxt.config.ts's i18n domains lists, so search requests stay correctly
// scoped to the site the visitor is actually on.
const US_DOMAINS = ['ami-us.localhost:3000', 'bmr.us.localhost:3000', 'www.amiunderpaid.com'];

export const useHostCountry = (): UseHostCountryReturn => {
  const url = useRequestURL();

  const hostCountry = computed<'UK' | 'USA'>(() => (US_DOMAINS.includes(url.host) ? 'USA' : 'UK'));

  const alternateSiteBaseUrl = computed<string>(() => {
    const isDevHost = url.host.includes('localhost') || url.host.includes('127.0.0.1');
    if (hostCountry.value === 'USA') {
      return isDevHost ? 'http://ami-uk.localhost:3000' : 'https://www.amiunderpaid.co.uk';
    }
    return isDevHost ? 'http://ami-us.localhost:3000' : 'https://www.amiunderpaid.com';
  });

  return { hostCountry, alternateSiteBaseUrl };
};
