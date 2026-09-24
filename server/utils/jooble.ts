import {
  calculateTitleRelevanceScore,
  extractSearchAnchorPhrase,
  filterAndRankJobsByRelevance
} from './searchRelevance';
import type { JobListing, JobSearchResponse } from '~~/shared/utils/market-data';
import { buildHistogramBuckets } from '~~/shared/utils/math';

export type JoobleJobResponse = {
  totalCount: number;
  jobs: {
    title: string;
    location: string;
    snippet: string;
    salary: string;
    source: string;
    type: string;
    link: string;
    company: string;
    updated: string;
    id: number | string;
  }[];
};

/**
 * Parses the unstructured `salary` string provided by Jooble and normalizes it.
 * - Ranges (e.g., "$97k - $206k") -> uses top/maximum value.
 * - Monthly (e.g., "$5,000 per month") -> multiplied by 12.
 * - Annual/Singular (e.g., "$200k") -> extracts the numeric equivalent.
 *
 * Returns { min: number, max: number, raw: string }
 */
export const parseJoobleSalary = (
  salaryStr: string | undefined,
  jobType: string = 'full-time'
): { min: number; max: number; raw: string } => {
  const raw = salaryStr || '';
  if (!raw) {
    return { min: 0, max: 0, raw };
  }

  const str = raw.toLowerCase().trim();

  // Try to find numbers and 'k' modifiers
  // Regex to extract all numbers (with potential 'k')
  // e.g. "$97k", "120000", "5,000"
  const numRegex = /[\d,]+(\.\d+)?k?/g;
  const matches = str.match(numRegex);

  if (!matches || matches.length === 0) {
    return { min: 0, max: 0, raw };
  }

  const parseNumber = (val: string): number => {
    let clean = val.replace(/,/g, '');
    let isK = false;
    if (clean.endsWith('k')) {
      isK = true;
      clean = clean.substring(0, clean.length - 1);
    }
    let num = parseFloat(clean);
    if (isK) {
      num = num * 1000;
    }
    return num;
  };

  const nums = matches.map(parseNumber).filter((n) => !isNaN(n));
  if (nums.length === 0) {
    return { min: 0, max: 0, raw };
  }

  let min = nums[0] as number;
  let max = (nums.length > 1 ? nums[nums.length - 1] : nums[0]) as number;

  // Adjust for "per month" or "hourly" if indicated in the string
  if (str.includes('month')) {
    min = min * 12;
    max = max * 12;
  } else if (str.includes('hour')) {
    // 40 hours/week = 2080 hours, 20 hours/week = 1040 hours
    const hoursPerYear = jobType === 'part-time' ? 1040 : 2080;
    min = min * hoursPerYear;
    max = max * hoursPerYear;
  }

  return { min, max, raw };
};

type JoobleSearchParams = {
  keywords: string;
  location: string;
  page: number;
};

// Jooble's REST API body has no category/industry/sector field (confirmed against
// help.jooble.org's REST API docs — only keywords, location, radius, salary, and
// pagination exist), so an Adzuna category tag (e.g. "it-jobs") is turned into a
// plain-language keyword and folded into the search term instead.
const buildKeywordsWithCategory = (title: string, category?: string): string => {
  if (!category) {
    return title;
  }
  const categoryKeyword = category
    .replace(/-/g, ' ')
    .replace(/\bjobs\b/gi, '')
    .trim();
  return categoryKeyword ? `${title} ${categoryKeyword}` : title;
};

export const fetchJoobleData = async (
  title: string,
  location: string,
  jobType: string,
  contractType: string,
  category?: string
): Promise<JobSearchResponse> => {
  const config = useRuntimeConfig();
  // Credentials are read from private runtimeConfig (server-only).
  const apiKey = config.joobleApiKey;

  const isDevOrE2e = import.meta.dev || process.env.E2E === 'true';

  if (!apiKey) {
    if (isDevOrE2e) {
      return {
        provider: 'jooble' as const,
        count: 1,
        mean: 60000,
        histogram: { '60000': 1 },
        results: [
          {
            id: 1,
            title: 'Software Engineer (Mocked Jooble)',
            description: 'Mock Jooble description',
            category: { label: 'IT', tag: 'it' },
            redirect_url: 'http://jooble.org',
            company: { display_name: 'Jooble Corp' },
            location: { display_name: 'New York', area: ['New York'] },
            salary_min: 50000,
            salary_max: 70000,
            contract_time: 'full_time',
            contract_type: 'permanent',
            provider: 'jooble' as const
          }
        ]
      };
    }
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const url = `https://jooble.org/api/${apiKey}`;

  // Jooble's matching behavior runs the opposite direction from Reed/Adzuna:
  // shorter queries are cleaner, longer ones are noisier (live-verified
  // 2026-09-17: anchor phrase 3044 clean results vs 11,169 noisy results for
  // the full raw title -- see design.md sec 3c). So Jooble is queried with
  // the extracted anchor phrase, not the full title.
  const params: JoobleSearchParams = {
    keywords: buildKeywordsWithCategory(extractSearchAnchorPhrase(title), category),
    location: location,
    page: 1
  };

  try {
    const response = await $fetch<JoobleJobResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: params,
      timeout: 6000
    });

    return processJoobleData(response, jobType, contractType, title);
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Market data temporarily unavailable.',
      data: e
    });
  }
};

export const processJoobleData = (
  response: JoobleJobResponse,
  jobType: string,
  contractType: string,
  searchTitle: string
): JobSearchResponse => {
  const jobs = response.jobs || [];

  const mappedJobs: JobListing[] = jobs.map((job) => {
    const parsedSalary = parseJoobleSalary(job.salary, jobType);

    // Map to Adzuna structure so frontend doesn't break
    return {
      id: Number(job.id) || Date.now() + Math.random(),
      title: job.title,
      description: job.snippet,
      location: {
        display_name: job.location,
        area: [job.location]
      },
      salary_min: parsedSalary.min,
      salary_max: parsedSalary.max,
      raw_salary: parsedSalary.raw,
      category: { label: 'Unknown', tag: 'unknown' },
      company: { display_name: job.company },
      contract_time: jobType,
      contract_type: contractType,
      redirect_url: job.link,
      provider: 'jooble' as const
    };
  });

  // Partition into Tier 1 (results, full token-overlap with the search
  // title) and Tier 2 (similarResults, partial but seniority-compatible)
  // matches. Jooble previously applied no relevance filtering at all -- this
  // also newly drops score-0 listings missing a required domain token. See
  // design.md Decision 2.
  const compatibleJobs = filterAndRankJobsByRelevance(mappedJobs, searchTitle);
  const results = compatibleJobs.filter(
    (job) => calculateTitleRelevanceScore(job.title, searchTitle) === 1
  );
  const similarResults = compatibleJobs.filter(
    (job) => calculateTitleRelevanceScore(job.title, searchTitle) < 1
  );

  const validSalaries = compatibleJobs
    .filter((job) => job.salary_min && job.salary_max)
    .map((job) => (job.salary_min + job.salary_max) / 2);
  const mean =
    validSalaries.length > 0
      ? Math.round(validSalaries.reduce((sum, s) => sum + s, 0) / validSalaries.length)
      : 0;
  const histogram = buildHistogramBuckets(validSalaries, 7);

  // Sort each tier independently by highest maximum salary descending
  const sortedResults = [...results].sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
  const sortedSimilar = [...similarResults].sort(
    (a, b) => (b.salary_max || 0) - (a.salary_max || 0)
  );

  return {
    mean,
    count: sortedResults.length + sortedSimilar.length,
    histogram,
    results: sortedResults,
    similarResults: sortedSimilar,
    provider: 'jooble' as const
  };
};
