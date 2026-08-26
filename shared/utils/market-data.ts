/**
 * Shared market data types used across both client (useJobs composable)
 * and server (market-data API endpoints, reed.ts utility).
 *
 * Keeping these in shared/utils ensures the client and server never drift
 * out of sync on what the API contract looks like.
 */

export type MarketDataProvider = 'adzuna' | 'reed' | 'jooble';

export type JobLocation = {
  display_name: string;
  area: string[];
};

export type JobCategory = {
  label: string;
  tag: string;
};

export type JobCompany = {
  display_name: string;
};

/** A single job listing in the unified schema (normalised from Adzuna or Reed). */
export type JobListing = {
  id: number;
  title: string;
  description: string;
  location: JobLocation;
  salary_min: number;
  salary_max: number;
  raw_salary?: string;
  category: JobCategory;
  company: JobCompany;
  contract_type: string;
  contract_time: string;
  redirect_url: string;
  provider?: MarketDataProvider;
};

/** Response shape for the /api/market-data/jobs endpoint. */
export type JobSearchResponse = {
  mean: number;
  count: number;
  results: JobListing[];
  provider: MarketDataProvider;
  histogram?: Record<number, number>;
};

/** Response shape for the /api/market-data/salary endpoint. */
export type SalaryDistributionResponse = {
  histogram: Record<number, number>;
  provider: MarketDataProvider;
};

/** A single job category entry returned by the categories endpoint. */
export type JobCategoryEntry = {
  label: string;
  tag: string;
};

/** A single month's average salary data point, as stored/returned for industry trends. */
export type HistoryPoint = {
  month: string;
  average: number;
};

/** One industry's historical trend data, as returned by /api/market-data/industry-trends. */
export type IndustryTrendEntry = {
  categoryTag: string;
  label: string;
  history: HistoryPoint[];
};

/** Response shape for the /api/market-data/industry-trends endpoint. */
export type IndustryTrendsResponse = {
  country: 'gb' | 'us';
  industries: IndustryTrendEntry[];
};
