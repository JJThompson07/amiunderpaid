/**
 * Shared market data types used across both client (useJobs composable)
 * and server (market-data API endpoints, reed.ts utility).
 *
 * Keeping these in shared/utils ensures the client and server never drift
 * out of sync on what the API contract looks like.
 */

export type MarketDataProvider = 'adzuna' | 'reed';

export interface JobLocation {
  display_name: string;
  area: string[];
}

export interface JobCategory {
  label: string;
  tag: string;
}

export interface JobCompany {
  display_name: string;
}

/** A single job listing in the unified schema (normalised from Adzuna or Reed). */
export interface JobListing {
  id: number;
  title: string;
  description: string;
  location: JobLocation;
  salary_min: number;
  salary_max: number;
  category: JobCategory;
  company: JobCompany;
  contract_type: string;
  contract_time: string;
  redirect_url: string;
  provider?: MarketDataProvider;
}

/** Response shape for the /api/market-data/jobs endpoint. */
export interface JobSearchResponse {
  mean: number;
  count: number;
  results: JobListing[];
  provider: MarketDataProvider;
  histogram?: Record<number, number>;
}

/** Response shape for the /api/market-data/salary endpoint. */
export interface SalaryDistributionResponse {
  histogram: Record<number, number>;
  provider: MarketDataProvider;
}

/** A single job category entry returned by the categories endpoint. */
export interface JobCategoryEntry {
  label: string;
  tag: string;
}
