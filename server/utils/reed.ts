import { REED_LOCATION_MAP } from '../constants/locations';
import { buildTieredJobResponse } from './jobTiering';
import { extractSearchAnchorPhrase } from './searchRelevance';
import type { JobListing, JobSearchResponse } from '~~/shared/utils/market-data';

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

// Tier 2: unquoted broader search, run alongside Tier 1 (not as a fallback).
// Relies on buildTieredJobResponse's post-fetch relevance filtering to strip
// the loose matches Reed's unquoted keyword search otherwise lets through.
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
        },
        timeout: 6000
      });
    } catch (e) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch from Reed API',
        data: e
      });
    }
  };

  // Tier 1 (exact-phrase) and Tier 2 (unquoted, broader) are always run
  // concurrently -- both result sets are returned to the caller (deduplicated
  // and relevance-filtered by buildTieredJobResponse) rather than Tier 2 only
  // firing when Tier 1 is sparse. See design.md Decision 2.
  //
  // Settled independently (not Promise.all) so a transient failure on ONE
  // tier's request (timeout, rate limit) doesn't discard the other tier's
  // already-successful results -- losing good Reed data would incorrectly
  // trigger the caller's regional fallback to Adzuna even though Reed
  // genuinely had usable listings. Only a failure on BOTH tiers means Reed
  // itself is actually unreachable, which should still propagate as a
  // provider failure.
  const [tier1Outcome, tier2Outcome] = await Promise.allSettled([
    search(buildTier1Keywords(title, anchorPhrase, categoryKeyword)),
    search(buildTier2Keywords(title, categoryKeyword))
  ]);

  if (tier1Outcome.status === 'rejected' && tier2Outcome.status === 'rejected') {
    throw tier1Outcome.reason;
  }

  const emptyResponse: ReedJobResponse = { results: [], totalResults: 0 };
  const tier1Response = tier1Outcome.status === 'fulfilled' ? tier1Outcome.value : emptyResponse;
  const tier2Response = tier2Outcome.status === 'fulfilled' ? tier2Outcome.value : emptyResponse;

  return buildTieredJobResponse(
    mapReedJobs(tier1Response, jobType, contractType),
    mapReedJobs(tier2Response, jobType, contractType),
    title,
    jobType,
    'gb', // Reed only ever serves UK (gb) listings.
    'reed'
  );
};

/** Maps raw Reed API results to the unified JobListing schema (no relevance filtering or stats). */
export const mapReedJobs = (
  response: ReedJobResponse,
  jobType: string,
  contractType: string
): JobListing[] =>
  (response.results || []).map((job) => ({
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
