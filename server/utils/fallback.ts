import type { JobSearchResponse } from '~~/shared/utils/market-data';

/**
 * Orchestrates geographic fallback routing when the primary market data provider fails.
 * UK -> Reed
 * US -> Jooble
 */
export const executeMarketFallback = async (
  title: string,
  location: string,
  countryCode: string,
  type: string = '',
  contract: string = ''
): Promise<JobSearchResponse> => {
  if (countryCode === 'us') {
    const { fetchJoobleData } = await import('./jooble');
    return await fetchJoobleData(title, location, type, contract);
  } else {
    const { fetchReedData } = await import('./reed');
    return await fetchReedData(title, location, type, contract);
  }
};
