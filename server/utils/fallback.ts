import type {
  JobListing,
  JobSearchResponse,
  MarketDataProvider
} from '~~/shared/utils/market-data';

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

// Static fixture used ONLY when running e2e tests (process.env.E2E === 'true',
// see isE2E in server/api/market-data/{jobs,salary}.ts) with a devProviderOverride
// set — this is distinct from the manual local-dev provider toggle
// (AmIDevProviderToggle.vue), which still exercises the real Reed/Jooble APIs via
// executeMarketFallback above so a developer can verify real integration behavior.
// e2e assertions should never depend on those live third-party calls succeeding.
const mockFallbackListing = (provider: MarketDataProvider): JobListing => ({
  id: 1,
  title: 'Software Engineer',
  description: 'A great software engineering role.',
  location: { display_name: 'London, UK', area: ['UK', 'London'] },
  salary_min: 50000,
  salary_max: 70000,
  category: { label: 'IT Jobs', tag: 'it-jobs' },
  company: { display_name: 'Acme Corp' },
  contract_type: 'permanent',
  contract_time: 'full_time',
  redirect_url: 'https://example.com/job/1',
  provider
});

export const getMockFallbackJobs = (provider: MarketDataProvider): JobSearchResponse => ({
  mean: 60000,
  count: 1,
  results: [mockFallbackListing(provider)],
  provider
});

export const getMockFallbackHistogram = (
  provider: MarketDataProvider
): { histogram: Record<string, number>; provider: MarketDataProvider } => ({
  histogram: { 50000: 3, 60000: 5, 70000: 2 },
  provider
});
