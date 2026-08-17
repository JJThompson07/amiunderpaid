import { REED_LOCATION_MAP } from '../constants/locations';
import { type JobSearchResponse } from '~~/shared/utils/market-data';
import { buildHistogramBuckets } from '~~/shared/utils/math';

export interface ReedJobResponse {
  results: Array<{
    jobId: number;
    employerName: string;
    jobTitle: string;
    locationName: string;
    minimumSalary: number | null;
    maximumSalary: number | null;
    currency: string;
    jobDescription: string;
    jobUrl: string;
  }>;
  totalResults: number;
}

export const fetchReedData = async (
  title: string,
  location: string,
  jobType: string,
  contractType: string
) => {
  const config = useRuntimeConfig();
  // Credentials are always read from private runtimeConfig (server-only).
  // Never access via process.env directly — this bypasses Nuxt's validation layer.
  const apiKey = config.reedApiKey;

  const isDevOrE2e = process.dev || process.env.E2E === 'true';

  if (!apiKey) {
    if (isDevOrE2e) {
      return {
        provider: 'reed',
        count: 1,
        mean: 50000,
        histogram: { '50000': 1 },
        results: [{
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
          provider: 'reed'
        }]
      };
    }
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const params: Record<string, any> = {
    keywords: title,
    resultsToTake: 100 // Fetch a good sample size to calculate statistics
  };

  if (location.trim() !== '') {
    let cleanLocation = location.split(',')[0]!.trim();
    const slug = cleanLocation.toLowerCase().replace(/\s+/g, '-');
    if (REED_LOCATION_MAP[slug]) {
      cleanLocation = REED_LOCATION_MAP[slug];
    }
    params.locationName = cleanLocation;
  }

  if (jobType === 'full-time') params.fullTime = true;
  if (jobType === 'part-time') params.partTime = true;
  
  if (contractType === 'permanent') params.permanent = true;
  if (contractType === 'contract') params.contract = true;
  if (contractType === 'temp') params.temp = true;

  // Basic Auth: key as username, empty password
  const authHeader = 'Basic ' + btoa(`${apiKey}:`);

  try {
    const response = await $fetch<ReedJobResponse>('https://www.reed.co.uk/api/1.0/search', {
      params,
      headers: {
        Authorization: authHeader
      }
    });

    return processReedData(response, jobType, contractType);
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch from Reed API',
      data: e
    });
  }
};

export const processReedData = (response: ReedJobResponse, jobType: string, contractType: string): JobSearchResponse => {
  const jobs = response.results || [];
  
  let totalSalary = 0;
  let validSalaryCount = 0;
  const rawSalaries: number[] = [];

  const mappedJobs = jobs.map((job) => {
    // Map to Adzuna structure so frontend doesn't break
    const mapped = {
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
    };

    // Calculate stats
    if (job.minimumSalary && job.maximumSalary) {
      const avg = (job.minimumSalary + job.maximumSalary) / 2;
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
    count: response.totalResults,
    histogram,
    results: sortedJobs,
    provider: 'reed' as const
  };
};
