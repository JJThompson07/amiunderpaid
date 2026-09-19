import crypto from 'node:crypto';
import { ADZUNA_LOCATION_MAP } from '../constants/locations';
import { extractSearchAnchorPhrase, filterAndRankJobsByRelevance } from './searchRelevance';
import type {
  JobListing,
  JobSearchResponse,
  SalaryDistributionResponse
} from '~~/shared/utils/market-data';
import {
  buildHistogramBuckets,
  filterSanitySalaries,
  trimSalaryOutliersIqr
} from '~~/shared/utils/math';
import { sanitizeAdzunaData } from '~~/shared/utils/sanitize';

// Below this many relevance-filtered results with valid salaries (or, for the
// histogram endpoint, this many populated buckets), Tier 1's full-title
// `title_only` match is judged too sparse and Tier 2 (the shorter
// extractSearchAnchorPhrase result, which relaxes the title_only AND-match)
// is retried instead. See design.md sec 3b for the live-verified Adzuna
// query counts behind this design.
const MIN_TIER1_SALARIED_RESULTS = 3;
const MIN_TIER1_HISTOGRAM_BUCKETS = 3;

export const generateCacheKey = (
  title: string,
  location: string,
  country: string,
  category?: string
): string => {
  // Allow alphanumeric, plus +, #, . (for C++, C#, .NET)
  // Replace other characters with -
  const t = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.]+/g, '-');
  const l = location
    ? location
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9+#.]+/g, '-')
    : '';
  const c = category
    ? category
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9+#.]+/g, '-')
    : '';

  // v2- prefix so that a deployment of this change automatically bypasses
  // stale, unversioned cache records written by the pre-Reed-preference
  // Adzuna-only code path, without requiring a manual Firestore wipe.
  const rawKey = `v2-${country}-${l}-${t}${c ? `-cat-${c}` : ''}`;

  if (rawKey.length > 200) {
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 16);
    return `${rawKey.substring(0, 180)}-${hash}`;
  }

  return rawKey;
};

type AdzunaRawSearchResponse = {
  count?: number;
  results?: JobListing[];
};

type AdzunaRawHistogramResponse = {
  histogram?: Record<string, number>;
};

const resolveAdzunaLocation = (location: string): string | undefined => {
  if (location.trim() === '') {
    return undefined;
  }
  let cleanLocation = location.split(',')[0]!.trim();
  const slug = cleanLocation.toLowerCase().replace(/\s+/g, '-');
  if (ADZUNA_LOCATION_MAP[slug]) {
    cleanLocation = ADZUNA_LOCATION_MAP[slug];
  }
  return cleanLocation;
};

/**
 * Relevance-filters/ranks raw Adzuna job listings against the original search
 * title, then recomputes mean/histogram/count from the IQR-trimmed salary
 * sample -- the same post-processing pipeline as Reed's processReedData, so
 * neither provider lets an off-tier or off-topic phrase/word match skew
 * statistics regardless of which query tier produced it.
 */
export const processAdzunaJobs = (
  jobs: JobListing[],
  searchTitle: string,
  jobType: string = 'full-time',
  countryCode: string = 'gb'
): JobSearchResponse => {
  const relevantJobs = filterAndRankJobsByRelevance(jobs, searchTitle);

  const rawSalaries = relevantJobs
    .filter((job) => job.salary_min && job.salary_max)
    .map((job) => (job.salary_min + job.salary_max) / 2);
  const sanitizedSalaries = filterSanitySalaries(
    rawSalaries,
    jobType,
    countryCode === 'us' ? 'us' : 'gb'
  );
  const trimmedSalaries = trimSalaryOutliersIqr(sanitizedSalaries);

  const mean =
    trimmedSalaries.length > 0
      ? Math.round(trimmedSalaries.reduce((sum, s) => sum + s, 0) / trimmedSalaries.length)
      : 0;
  const histogram = buildHistogramBuckets(trimmedSalaries, 7);

  const sortedJobs = [...relevantJobs].sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));

  return {
    mean,
    count: sortedJobs.length,
    histogram,
    results: sortedJobs,
    provider: 'adzuna' as const
  };
};

export const fetchAdzunaJobs = async (
  title: string,
  location: string,
  countryCode: string,
  jobType: string,
  contractType: string,
  category?: string
): Promise<JobSearchResponse> => {
  const config = useRuntimeConfig();
  // Credentials are always read from private runtimeConfig (server-only).
  // Never access via process.env directly — this bypasses Nuxt's validation layer.
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const baseParams: Record<string, string | number> = {
    app_id: appId,
    app_key: appKey,
    results_per_page: 100,
    'content-type': 'application/json'
  };

  if (jobType === 'part-time') {
    baseParams.part_time = 1;
  } else if (jobType === 'full-time') {
    baseParams.full_time = 1;
  }

  if (contractType === 'contract') {
    baseParams.contract = 1;
  } else if (contractType === 'permanent') {
    baseParams.permanent = 1;
  }

  const where = resolveAdzunaLocation(location);
  if (where) {
    baseParams.where = where;
    // Default search radius so Adzuna doesn't return 0 jobs for a small town.
    baseParams.distance = 20;
  }

  if (category) {
    baseParams.category = category;
  }

  // Does NOT catch/wrap network errors here: the gateway (jobs.ts) needs the
  // real HTTP status (429/403/404) off the raw ofetch error to decide whether
  // to fall back to Jooble (US) — collapsing it to a generic 500 here would
  // destroy that signal.
  const search = async (titleOnly: string): Promise<AdzunaRawSearchResponse> =>
    sanitizeAdzunaData(
      await $fetch<AdzunaRawSearchResponse>(
        `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`,
        {
          params: { ...baseParams, title_only: titleOnly },
          timeout: 6000
        }
      )
    );

  const anchorPhrase = extractSearchAnchorPhrase(title);

  const tier1Raw = await search(title);
  const tier1Result = processAdzunaJobs(tier1Raw.results || [], title, jobType, countryCode);
  const tier1SalariedCount = tier1Result.results.filter((r) => r.salary_min && r.salary_max).length;

  // Skip Tier 2 entirely when the anchor phrase is a no-op (no scope modifier
  // was stripped from the title) -- it would send Adzuna an identical
  // title_only request for no benefit.
  if (tier1SalariedCount >= MIN_TIER1_SALARIED_RESULTS || anchorPhrase === title) {
    return tier1Result;
  }

  const tier2Raw = await search(anchorPhrase);
  return processAdzunaJobs(tier2Raw.results || [], title, jobType, countryCode);
};

export const fetchAdzunaHistogram = async (
  title: string,
  location: string,
  countryCode: string,
  category?: string
): Promise<SalaryDistributionResponse> => {
  const config = useRuntimeConfig();
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const baseParams: Record<string, string> = {
    app_id: appId,
    app_key: appKey,
    'content-type': 'application/json'
  };

  const where = resolveAdzunaLocation(location);
  if (where) {
    baseParams.where = where;
  }
  if (category) {
    baseParams.category = category;
  }

  // See fetchAdzunaJobs — errors are intentionally left unwrapped so the
  // gateway can inspect the real HTTP status.
  const search = async (titleOnly: string): Promise<AdzunaRawHistogramResponse> =>
    sanitizeAdzunaData(
      await $fetch<AdzunaRawHistogramResponse>(
        `https://api.adzuna.com/v1/api/jobs/${countryCode}/histogram`,
        {
          params: { ...baseParams, title_only: titleOnly },
          timeout: 6000
        }
      )
    );

  const anchorPhrase = extractSearchAnchorPhrase(title);

  const tier1Raw = await search(title);
  const tier1Histogram = tier1Raw.histogram || {};

  // Skip Tier 2 entirely when the anchor phrase is a no-op -- see
  // fetchAdzunaJobs for the same short-circuit and its rationale.
  if (Object.keys(tier1Histogram).length >= MIN_TIER1_HISTOGRAM_BUCKETS || anchorPhrase === title) {
    return { histogram: tier1Histogram, provider: 'adzuna' as const };
  }

  const tier2Raw = await search(anchorPhrase);
  return { histogram: tier2Raw.histogram || {}, provider: 'adzuna' as const };
};
