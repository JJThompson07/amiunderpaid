import { describe, expect, it, vi } from 'vitest';
import type { ReedJobResponse } from '../reed';
import { fetchReedData, mapReedJobs } from '../reed';

const buildReedJob = (
  overrides: Partial<ReedJobResponse['results'][number]> = {}
): ReedJobResponse['results'][number] => ({
  jobId: 1,
  employerName: 'Company A',
  jobTitle: 'Developer',
  locationName: 'London',
  minimumSalary: 40000,
  maximumSalary: 60000,
  currency: 'GBP',
  jobDescription: 'Great job',
  jobUrl: 'http://reed.co.uk/1',
  ...overrides
});

describe('Reed Utility', () => {
  describe('mapReedJobs', () => {
    it('maps raw Reed results to the unified JobListing schema', () => {
      const response: ReedJobResponse = {
        totalResults: 1,
        results: [buildReedJob({ jobId: 2, jobTitle: 'Senior Developer' })]
      };

      const mapped = mapReedJobs(response, 'full-time', 'permanent');

      expect(mapped).toEqual([
        expect.objectContaining({
          id: 2,
          title: 'Senior Developer',
          location: { display_name: 'London', area: ['London'] },
          salary_min: 40000,
          salary_max: 60000,
          contract_time: 'full-time',
          contract_type: 'permanent',
          provider: 'reed'
        })
      ]);
    });

    it('handles an empty results array safely', () => {
      expect(mapReedJobs({ totalResults: 0, results: [] }, 'full-time', 'permanent')).toEqual([]);
    });

    it('defaults null min/max salary to 0', () => {
      const response: ReedJobResponse = {
        totalResults: 1,
        results: [buildReedJob({ minimumSalary: null, maximumSalary: null })]
      };
      const [mapped] = mapReedJobs(response, 'full-time', 'permanent');
      expect(mapped?.salary_min).toBe(0);
      expect(mapped?.salary_max).toBe(0);
    });
  });

  describe('fetchReedData', () => {
    it('should throw error if API key is missing', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: null }))
      );
      vi.stubGlobal(
        'createError',
        (err: { statusMessage?: string }) => new Error(err.statusMessage)
      );

      await expect(fetchReedData('Dev', '', 'full-time', 'permanent')).rejects.toThrow(
        'Market data service is misconfigured.'
      );
    });

    it('should quote Tier 1 keywords and issue an unquoted Tier 2 query concurrently', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const tier1Response: ReedJobResponse = {
        totalResults: 1,
        results: [
          buildReedJob({ jobId: 1, jobTitle: 'Dev', minimumSalary: 40000, maximumSalary: 50000 })
        ]
      };
      const tier2Response: ReedJobResponse = {
        totalResults: 2,
        results: [
          buildReedJob({ jobId: 1, jobTitle: 'Dev', minimumSalary: 40000, maximumSalary: 50000 }),
          buildReedJob({ jobId: 2, jobTitle: 'Dev', minimumSalary: 45000, maximumSalary: 55000 })
        ]
      };
      const fetchMock = vi.fn((_url: string, opts: { params: { keywords: string } }) =>
        opts.params.keywords === '"Dev"'
          ? Promise.resolve(tier1Response)
          : Promise.resolve(tier2Response)
      );
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchReedData('Dev', 'London', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            keywords: '"Dev"',
            locationName: 'London',
            fullTime: true,
            permanent: true
          }),
          timeout: 6000
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({ params: expect.objectContaining({ keywords: 'Dev' }) })
      );
      // Tier 1: job 1 only. Tier 2: job 2 (job 1 deduplicated against Tier 1).
      expect(result.results.map((r) => r.id)).toEqual([1]);
      expect(result.similarResults?.map((r) => r.id)).toEqual([2]);
      expect(result.count).toBe(2);
    });

    it('should OR the anchor phrase into Tier 1 keywords when extraction shortens the title', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchReedData('Group Head of Finance', '', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            keywords: '"Group Head of Finance" OR "Head of Finance"'
          })
        })
      );
    });

    it('should strictly relevance-filter Tier 2 unquoted results, stripping off-domain listings', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const tier1Response: ReedJobResponse = {
        totalResults: 1,
        results: [
          buildReedJob({
            jobId: 1,
            jobTitle: 'Lead Software Engineer',
            minimumSalary: 80000,
            maximumSalary: 90000
          })
        ]
      };
      // Tier 2's unquoted search returns a mix of on-domain and off-domain
      // "lead ... engineer" listings -- only the software one should survive
      // the post-fetch domain-token filter (and it's deduplicated against Tier 1).
      const tier2Response: ReedJobResponse = {
        totalResults: 3,
        results: [
          buildReedJob({
            jobId: 1,
            jobTitle: 'Lead Software Engineer',
            minimumSalary: 80000,
            maximumSalary: 90000
          }),
          buildReedJob({
            jobId: 2,
            jobTitle: 'Lead Mechanical Engineer',
            minimumSalary: 70000,
            maximumSalary: 85000
          }),
          buildReedJob({
            jobId: 3,
            jobTitle: 'Lead Electrical Engineer',
            minimumSalary: 72000,
            maximumSalary: 86000
          })
        ]
      };
      const fetchMock = vi.fn((_url: string, opts: { params: { keywords: string } }) =>
        opts.params.keywords.startsWith('"')
          ? Promise.resolve(tier1Response)
          : Promise.resolve(tier2Response)
      );
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchReedData('Lead Software Engineer', '', 'full-time', 'permanent');

      expect(result.results.map((r) => r.title)).toEqual(['Lead Software Engineer']);
      expect(result.similarResults).toEqual([]);
      expect(result.count).toBe(1);
    });

    it('should handle mapped locations and part-time/contract params', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchReedData('Dev', 'yorkshire and the humber, uk', 'part-time', 'contract');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            locationName: 'Yorkshire', // mapped
            partTime: true,
            contract: true
          })
        })
      );
    });

    it('should handle temp param', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchReedData('Dev', '', '', 'temp');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            temp: true
          })
        })
      );
    });

    it('should enhance keywords with a plain-language category when provided', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchReedData('Dev', 'London', 'full-time', 'permanent', 'it-jobs');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            keywords: '"Dev" it'
          })
        })
      );
    });

    it('should leave keywords unchanged when no category is provided', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchReedData('Dev', 'London', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            keywords: '"Dev"'
          })
        })
      );
    });

    it('should throw error on fetch failure', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      vi.stubGlobal(
        'createError',
        (err: { statusMessage?: string }) => new Error(err.statusMessage)
      );
      vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      await expect(fetchReedData('Dev', '', 'full-time', 'permanent')).rejects.toThrow(
        'Failed to fetch from Reed API'
      );
    });

    it('keeps results from the tier that succeeded when the other tier request fails', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      vi.stubGlobal(
        'createError',
        (err: { statusMessage?: string }) => new Error(err.statusMessage)
      );
      const tier1Response: ReedJobResponse = {
        totalResults: 1,
        results: [
          buildReedJob({ jobId: 1, jobTitle: 'Dev', minimumSalary: 40000, maximumSalary: 50000 })
        ]
      };
      const fetchMock = vi.fn((_url: string, opts: { params: { keywords: string } }) =>
        opts.params.keywords === '"Dev"'
          ? Promise.resolve(tier1Response)
          : Promise.reject(new Error('Tier 2 timed out'))
      );
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchReedData('Dev', '', 'full-time', 'permanent');

      expect(result.results.map((r) => r.id)).toEqual([1]);
      expect(result.similarResults).toEqual([]);
      expect(result.count).toBe(1);
      expect(result.provider).toBe('reed');
    });
  });
});
