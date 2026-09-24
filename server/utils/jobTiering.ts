import { filterAndRankJobsByRelevance } from './searchRelevance';
import type {
  JobListing,
  JobSearchResponse,
  MarketDataProvider
} from '~~/shared/utils/market-data';
import {
  buildHistogramBuckets,
  filterSanitySalaries,
  trimSalaryOutliersIqr
} from '~~/shared/utils/math';

const sortBySalaryDesc = (jobs: JobListing[]): JobListing[] =>
  [...jobs].sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));

/**
 * Combines a provider's raw Tier 1 (exact) and Tier 2 (broader) job listings
 * into a deduplicated dual-tier JobSearchResponse. Both tiers are
 * independently relevance-filtered/ranked, Tier 2 is deduplicated against
 * Tier 1 by `id`, and mean/histogram are computed from the combined (Tier 1 +
 * deduped Tier 2) IQR-trimmed salary sample rather than Tier 1 alone -- see
 * openspec/changes/live-job-search-and-tier-split design.md Decision 2.
 */
export const buildTieredJobResponse = (
  tier1Jobs: JobListing[],
  tier2Jobs: JobListing[],
  searchTitle: string,
  jobType: string,
  countryCode: 'gb' | 'us',
  provider: MarketDataProvider
): JobSearchResponse => {
  const relevantTier1 = filterAndRankJobsByRelevance(tier1Jobs, searchTitle);
  const relevantTier2 = filterAndRankJobsByRelevance(tier2Jobs, searchTitle);

  const tier1Ids = new Set(relevantTier1.map((job) => job.id));
  const dedupedTier2 = relevantTier2.filter((job) => !tier1Ids.has(job.id));

  const combined = [...relevantTier1, ...dedupedTier2];
  const rawSalaries = combined
    .filter((job) => job.salary_min && job.salary_max)
    .map((job) => (job.salary_min + job.salary_max) / 2);
  const sanitizedSalaries = filterSanitySalaries(rawSalaries, jobType, countryCode);
  const trimmedSalaries = trimSalaryOutliersIqr(sanitizedSalaries);

  const mean =
    trimmedSalaries.length > 0
      ? Math.round(trimmedSalaries.reduce((sum, s) => sum + s, 0) / trimmedSalaries.length)
      : 0;
  const histogram = buildHistogramBuckets(trimmedSalaries, 7);

  const results = sortBySalaryDesc(relevantTier1);
  const similarResults = sortBySalaryDesc(dedupedTier2);

  return {
    mean,
    count: results.length + similarResults.length,
    histogram,
    results,
    similarResults,
    provider
  };
};
