import { describe, expect, it } from 'vitest';
import { buildTieredJobResponse } from '../jobTiering';
import type { JobListing } from '~~/shared/utils/market-data';

const buildJob = (overrides: Partial<JobListing> = {}): JobListing => ({
  id: 1,
  title: 'Developer',
  description: 'A great job',
  location: { display_name: 'London', area: ['London'] },
  salary_min: 40000,
  salary_max: 60000,
  category: { label: 'IT', tag: 'it-jobs' },
  company: { display_name: 'Company A' },
  contract_type: 'permanent',
  contract_time: 'full_time',
  redirect_url: 'http://example.com/1',
  ...overrides
});

describe('buildTieredJobResponse', () => {
  it('separates relevant Tier 1 and Tier 2 listings, computing stats from the combined pool', () => {
    const tier1 = [buildJob({ id: 1, title: 'Developer', salary_min: 40000, salary_max: 60000 })];
    const tier2 = [
      buildJob({ id: 2, title: 'Developer', salary_min: 60000, salary_max: 80000 }),
      buildJob({ id: 3, title: 'Unrelated Role', salary_min: 10000, salary_max: 20000 })
    ];

    const result = buildTieredJobResponse(tier1, tier2, 'Developer', 'full-time', 'gb', 'reed');

    expect(result.provider).toBe('reed');
    expect(result.results.map((j) => j.id)).toEqual([1]);
    // "Unrelated Role" has 0 relevance overlap with "Developer" and is dropped.
    expect(result.similarResults?.map((j) => j.id)).toEqual([2]);
    expect(result.count).toBe(2);
    // Mean of the combined [50000, 70000] pool.
    expect(result.mean).toBe(60000);
  });

  it('deduplicates a Tier 2 listing that also appears in Tier 1 by id', () => {
    const tier1 = [buildJob({ id: 1, title: 'Developer' })];
    const tier2 = [
      buildJob({ id: 1, title: 'Developer' }),
      buildJob({ id: 2, title: 'Developer' })
    ];

    const result = buildTieredJobResponse(tier1, tier2, 'Developer', 'full-time', 'gb', 'adzuna');

    expect(result.results.map((j) => j.id)).toEqual([1]);
    expect(result.similarResults?.map((j) => j.id)).toEqual([2]);
    expect(result.count).toBe(2);
  });

  it('sorts each tier independently by salary_max descending', () => {
    const tier1 = [
      buildJob({ id: 1, title: 'Developer', salary_min: 40000, salary_max: 50000 }),
      buildJob({ id: 2, title: 'Developer', salary_min: 60000, salary_max: 90000 })
    ];
    const tier2 = [
      buildJob({ id: 3, title: 'Developer', salary_min: 30000, salary_max: 35000 }),
      buildJob({ id: 4, title: 'Developer', salary_min: 45000, salary_max: 70000 })
    ];

    const result = buildTieredJobResponse(tier1, tier2, 'Developer', 'full-time', 'gb', 'reed');

    expect(result.results.map((j) => j.id)).toEqual([2, 1]);
    expect(result.similarResults?.map((j) => j.id)).toEqual([4, 3]);
  });

  it('sorts a listing with no salary_max to the bottom of its tier', () => {
    const tier1 = [
      buildJob({ id: 1, title: 'Developer', salary_min: 0, salary_max: 0 }),
      buildJob({ id: 2, title: 'Developer', salary_min: 60000, salary_max: 90000 })
    ];

    const result = buildTieredJobResponse(tier1, [], 'Developer', 'full-time', 'gb', 'reed');

    expect(result.results.map((j) => j.id)).toEqual([2, 1]);
  });

  it('handles empty Tier 1 and Tier 2 arrays safely', () => {
    const result = buildTieredJobResponse([], [], 'Developer', 'full-time', 'gb', 'reed');

    expect(result.results).toEqual([]);
    expect(result.similarResults).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.mean).toBe(0);
    expect(result.histogram).toEqual({});
  });

  it('applies the country-specific sanity floor to the combined salary pool', () => {
    const tier1 = [buildJob({ id: 1, title: 'Developer', salary_min: 20000, salary_max: 22000 })]; // avg 21000
    const tier2 = [buildJob({ id: 2, title: 'Developer', salary_min: 40000, salary_max: 60000 })]; // avg 50000

    const resultUs = buildTieredJobResponse(tier1, tier2, 'Developer', 'full-time', 'us', 'adzuna');
    // 21000 dropped under the $25k US floor -- mean is 50000 alone.
    expect(resultUs.mean).toBe(50000);

    const resultGb = buildTieredJobResponse(tier1, tier2, 'Developer', 'full-time', 'gb', 'adzuna');
    // Both retained under the £15k GB floor.
    expect(resultGb.mean).toBe(35500);
  });
});
