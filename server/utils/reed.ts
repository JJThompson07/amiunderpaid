import { REED_LOCATION_MAP } from '../constants/locations';
import { extractSearchAnchorPhrase, filterAndRankJobsByRelevance } from './searchRelevance';
import type { JobSearchResponse } from '~~/shared/utils/market-data';
import {
  buildHistogramBuckets,
  filterSanitySalaries,
  trimSalaryOutliersIqr
} from '~~/shared/utils/math';

// Below this many relevance-filtered results with valid salaries, Tier 1's
// exact-phrase precision is judged too sparse and Tier 2 (unquoted full-title
// search, still relevance-filtered post-fetch) is executed instead. 15 is a
// statistically robust floor for IQR quartile estimation and 7-bucket
// histogram generation -- a floor of 3 (the prior value) let sparse Tier 1
// samples of ~4% of the available market (e.g. 18/548 for "lead software
// engineer") satisfy the gate and permanently starve Tier 2. See design.md
// sec 3 for the live-verified Reed query counts behind this design.
const MIN_TIER1_SALARIED_RESULTS = 15;

export type ReedJobResponse = {
  results: {
    jobId: number;
    employerName: string;
    jobTitle: string;
    locationName: string;
    minimumSalary: number | null;
    maximumSalary: number | null;
    currency: string;
    jobDescription: string;
    jobUrl: string;
  }[];
  totalResults: number;
};

type ReedSearchParams = {
  keywords: string;
  resultsToTake: number;
  locationName?: string;
  fullTime?: boolean;
  partTime?: boolean;
  permanent?: boolean;
  contract?: boolean;
  temp?: boolean;
};

// Reed's search API has no sector/category/industry parameter (confirmed against
// reed.co.uk/developers/jobseeker — only keywords, locationName, distance, salary
// bounds, and contract/time flags exist), so an Adzuna category tag (e.g.
// "it-jobs") is turned into a plain-language keyword and folded into the search
// term instead.
const buildCategoryKeyword = (category?: string): string => {
  if (!category) {
    return '';
  }
  return category
    .replace(/-/g, ' ')
    .replace(/\bjobs\b/gi, '')
    .trim();
};

// Tier 1: exact-phrase precision. Quoting both the full title and (when
// extraction changes it) the anchor phrase, OR'd together, was live-verified
// against the Reed API to genuinely union two exact-phrase result sets (see
// design.md sec 3) rather than silently falling back to loose keyword search.
const buildTier1Keywords = (
  title: string,
  anchorPhrase: string,
  categoryKeyword: string
): string => {
  const phraseQuery = anchorPhrase !== title ? `"${title}" OR "${anchorPhrase}"` : `"${title}"`;
  return categoryKeyword ? `${phraseQuery} ${categoryKeyword}` : phraseQuery;
};

// Tier 2: unquoted fallback for when Tier 1's exact-phrase search is too sparse.
// Relies on filterAndRankJobsByRelevance post-fetch to strip the loose matches
// Reed's unquoted keyword search otherwise lets through.
const buildTier2Keywords = (title: string, categoryKeyword: string): string =>
  categoryKeyword ? `${title} ${categoryKeyword}` : title;

export const fetchReedData = async (
  title: string,
  location: string,
  jobType: string,
  contractType: string,
  category?: string
): Promise<JobSearchResponse> => {
  const config = useRuntimeConfig();
  // Credentials are always read from private runtimeConfig (server-only).
  // Never access via process.env directly — this bypasses Nuxt's validation layer.
  const apiKey = config.reedApiKey;

  const isDevOrE2e = import.meta.dev || process.env.E2E === 'true';

  if (!apiKey) {
    if (isDevOrE2e) {
      return {
        provider: 'reed' as const,
        count: 1,
        mean: 50000,
        histogram: { '50000': 1 },
        results: [
          {
            id: 1,
            title: 'Software Engineer (Mocked Reed)',
            description: 'Mock Reed description',
            category: { label: 'IT', tag: 'it' },
            redirect_url: 'http://reed.co.uk',
            company: { display_name: 'Reed Corp' },
            location: { display_name: 'London', area: ['London'] },
            salary_min: 40000,
            salary_max: 60000,
            contract_time: 'full_time',
            contract_type: 'permanent',
            provider: 'reed' as const
          }
        ]
      };
    }
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const categoryKeyword = buildCategoryKeyword(category);
  const anchorPhrase = extractSearchAnchorPhrase(title);

  const baseParams: Omit<ReedSearchParams, 'keywords'> = {
    resultsToTake: 100 // Fetch a good sample size to calculate statistics
  };

  if (location.trim() !== '') {
    let cleanLocation = location.split(',')[0]!.trim();
    const slug = cleanLocation.toLowerCase().replace(/\s+/g, '-');
    if (REED_LOCATION_MAP[slug]) {
      cleanLocation = REED_LOCATION_MAP[slug];
    }
    baseParams.locationName = cleanLocation;
  }

  if (jobType === 'full-time') {
    baseParams.fullTime = true;
  }
  if (jobType === 'part-time') {
    baseParams.partTime = true;
  }

  if (contractType === 'permanent') {
    baseParams.permanent = true;
  }
  if (contractType === 'contract') {
    baseParams.contract = true;
  }
  if (contractType === 'temp') {
    baseParams.temp = true;
  }

  // Basic Auth: key as username, empty password
  const authHeader = 'Basic ' + btoa(`${apiKey}:`);

  const search = async (keywords: string): Promise<ReedJobResponse> => {
    const params: ReedSearchParams = { ...baseParams, keywords };
    try {
      return await $fetch<ReedJobResponse>('https://www.reed.co.uk/api/1.0/search', {
        params,
        headers: {
          Authorization: authHeader
        }
      });
    } catch (e) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch from Reed API',
        data: e
      });
    }
  };

  const tier1Response = await search(buildTier1Keywords(title, anchorPhrase, categoryKeyword));
  const tier1Result = processReedData(tier1Response, jobType, contractType, title);
  const tier1SalariedCount = tier1Result.results.filter((r) => r.salary_min && r.salary_max).length;

  if (tier1SalariedCount >= MIN_TIER1_SALARIED_RESULTS) {
    return tier1Result;
  }

  const tier2Response = await search(buildTier2Keywords(title, categoryKeyword));
  return processReedData(tier2Response, jobType, contractType, title);
};

export const processReedData = (
  response: ReedJobResponse,
  jobType: string,
  contractType: string,
  searchTitle: string
): JobSearchResponse => {
  const jobs = response.results || [];

  const mappedJobs = jobs.map((job) => ({
    // Map to Adzuna structure so frontend doesn't break
    id: job.jobId,
    title: job.jobTitle,
    description: job.jobDescription,
    location: {
      display_name: job.locationName,
      area: [job.locationName]
    },
    salary_min: job.minimumSalary || 0,
    salary_max: job.maximumSalary || 0,
    category: { label: 'Unknown', tag: 'unknown' },
    company: { display_name: job.employerName },
    contract_time: jobType,
    contract_type: contractType,
    redirect_url: job.jobUrl,
    provider: 'reed' as const
  }));

  // Relevance-filter and rank before computing any statistics, so an
  // exact-phrase OR-widened (or Tier 2 unquoted) search never lets an
  // off-tier or off-topic match skew the mean/histogram.
  const relevantJobs = filterAndRankJobsByRelevance(mappedJobs, searchTitle);

  const rawSalaries = relevantJobs
    .filter((job) => job.salary_min && job.salary_max)
    .map((job) => (job.salary_min + job.salary_max) / 2);
  // Reed only ever serves UK (gb) listings.
  const sanitizedSalaries = filterSanitySalaries(rawSalaries, jobType, 'gb');
  const trimmedSalaries = trimSalaryOutliersIqr(sanitizedSalaries);

  const mean =
    trimmedSalaries.length > 0
      ? Math.round(trimmedSalaries.reduce((sum, s) => sum + s, 0) / trimmedSalaries.length)
      : 0;
  const histogram = buildHistogramBuckets(trimmedSalaries, 7);

  // Sort jobs by highest maximum salary descending
  const sortedJobs = [...relevantJobs].sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));

  return {
    mean,
    count: sortedJobs.length,
    histogram,
    results: sortedJobs,
    provider: 'reed' as const
  };
};
