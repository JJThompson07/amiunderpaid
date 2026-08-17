import { type JobSearchResponse } from '~~/shared/utils/market-data';
import { buildHistogramBuckets } from '~~/shared/utils/math';

export interface JoobleJobResponse {
  totalCount: number;
  jobs: Array<{
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
  }>;
}

/**
 * Parses the unstructured `salary` string provided by Jooble and normalizes it.
 * - Ranges (e.g., "$97k - $206k") -> uses top/maximum value.
 * - Monthly (e.g., "$5,000 per month") -> multiplied by 12.
 * - Annual/Singular (e.g., "$200k") -> extracts the numeric equivalent.
 * 
 * Returns { min: number, max: number, raw: string }
 */
export const parseJoobleSalary = (salaryStr: string | undefined, jobType: string = 'full-time'): { min: number, max: number, raw: string } => {
  const raw = salaryStr || '';
  if (!raw) return { min: 0, max: 0, raw };

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

  const nums = matches.map(parseNumber).filter(n => !isNaN(n));
  if (nums.length === 0) return { min: 0, max: 0, raw };

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

export const fetchJoobleData = async (
  title: string,
  location: string,
  jobType: string,
  contractType: string
): Promise<JobSearchResponse> => {
  const config = useRuntimeConfig();
  // Credentials are read from private runtimeConfig (server-only).
  const apiKey = config.joobleApiKey;

  const isDevOrE2e = process.dev || process.env.E2E === 'true';

  if (!apiKey) {
    if (isDevOrE2e) {
      return {
        provider: 'jooble' as const,
        count: 1,
        mean: 60000,
        histogram: { '60000': 1 },
        results: [{
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
        }]
      };
    }
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const url = `https://jooble.org/api/${apiKey}`;
  
  const params: Record<string, any> = {
    keywords: title,
    location: location,
    page: 1
  };

  try {
    const response = await $fetch<JoobleJobResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: params
    });

    return processJoobleData(response, jobType, contractType);
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Market data temporarily unavailable.',
      data: e
    });
  }
};

export const processJoobleData = (response: JoobleJobResponse, jobType: string, contractType: string): JobSearchResponse => {
  const jobs = response.jobs || [];
  
  let totalSalary = 0;
  let validSalaryCount = 0;
  const rawSalaries: number[] = [];

  const mappedJobs = jobs.map((job) => {
    const parsedSalary = parseJoobleSalary(job.salary, jobType);

    // Map to Adzuna structure so frontend doesn't break
    const mapped = {
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

    // Calculate stats
    if (parsedSalary.min && parsedSalary.max) {
      const avg = (parsedSalary.min + parsedSalary.max) / 2;
      totalSalary += avg;
      validSalaryCount++;
      rawSalaries.push(avg);
    }

    return mapped;
  });

  const mean = validSalaryCount > 0 ? Math.round(totalSalary / validSalaryCount) : 0;
  const histogram = buildHistogramBuckets(rawSalaries, 7);

  // Sort jobs by highest maximum salary descending
  const sortedJobs = mappedJobs.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));

  return {
    mean,
    count: response.totalCount || 0,
    histogram,
    results: sortedJobs,
    provider: 'jooble' as const
  };
};
