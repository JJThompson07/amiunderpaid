import { describe, expect, it, vi } from 'vitest';
import type { ReedJobResponse } from '../reed';
import { fetchReedData, processReedData } from '../reed';

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
  describe('processReedData', () => {
    it('should process Reed job data, relevance-filter, and calculate mean/histogram correctly', () => {
      const mockResponse: ReedJobResponse = {
        totalResults: 5,
        results: [
          buildReedJob({
            jobId: 1,
            jobTitle: 'Developer',
            minimumSalary: 40000,
            maximumSalary: 60000 // avg 50000 -> bucket 50000
          }),
          buildReedJob({
            jobId: 2,
            employerName: 'Company B',
            jobTitle: 'Senior Developer',
            minimumSalary: 55000,
            maximumSalary: 65000 // avg 60000 -> bucket 60000
          }),
          buildReedJob({
            jobId: 3,
            employerName: 'Company C',
            jobTitle: 'Missing Salary',
            minimumSalary: null,
            maximumSalary: null
          })
        ]
      };

      const processed = processReedData(mockResponse, 'full-time', 'permanent', 'Developer');

      expect(processed.provider).toBe('reed');

      // "Missing Salary" is dropped by relevance filtering (0% token overlap
      // with the "Developer" search), so count reflects the 2 relevant jobs.
      expect(processed.count).toBe(2);

      // Mean should be (50000 + 60000) / 2 = 55000
      expect(processed.mean).toBe(55000);

      // Histogram should have 1 count at 50000 and 1 at 60000
      expect(processed.histogram).toEqual({
        50000: 1,
        60000: 1
      });

      // It should map to Adzuna format and be sorted by max salary descending
      expect(processed.results[0]).toMatchObject({
        id: 2,
        title: 'Senior Developer',
        location: { display_name: 'London', area: ['London'] },
        salary_min: 55000,
        salary_max: 65000,
        contract_time: 'full-time',
        contract_type: 'permanent',
        provider: 'reed'
      });
    });

    it('should reject off-tier results on a leadership search', () => {
      const mockResponse: ReedJobResponse = {
        totalResults: 2,
        results: [
          buildReedJob({
            jobId: 1,
            jobTitle: 'Group Head of Finance',
            minimumSalary: 90000,
            maximumSalary: 110000
          }),
          buildReedJob({
            jobId: 2,
            jobTitle: 'Finance Assistant',
            minimumSalary: 25000,
            maximumSalary: 30000
          })
        ]
      };

      const processed = processReedData(
        mockResponse,
        'full-time',
        'permanent',
        'Group Head of Finance'
      );

      expect(processed.results.map((r) => r.title)).toEqual(['Group Head of Finance']);
    });

    it('should trim an extreme salary outlier from the mean while still listing it in results', () => {
      const salaries = [50000, 55000, 60000, 62000, 65000, 500000];
      const mockResponse: ReedJobResponse = {
        totalResults: salaries.length,
        results: salaries.map((s, i) =>
          buildReedJob({ jobId: i + 1, jobTitle: 'Developer', minimumSalary: s, maximumSalary: s })
        )
      };

      const processed = processReedData(mockResponse, 'full-time', 'permanent', 'Developer');

      // The 500000 outlier is excluded from the mean (IQR-trimmed sample), but
      // the listing itself is still returned -- trimming affects statistics,
      // not which real job postings are shown.
      expect(processed.mean).toBe(58400);
      expect(processed.count).toBe(6);
      expect(processed.results.some((r) => r.salary_max === 500000)).toBe(true);
    });

    it('should handle empty results safely', () => {
      const mockResponse: ReedJobResponse = {
        totalResults: 0,
        results: []
      };

      const processed = processReedData(mockResponse, 'part-time', 'contract', 'Anything');

      expect(processed.mean).toBe(0);
      expect(processed.count).toBe(0);
      expect(processed.histogram).toEqual({});
      expect(processed.results.length).toBe(0);
      expect(processed.provider).toBe('reed');
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

    it('should quote Tier 1 keywords and stop after one call when results are sufficiently salaried', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const richResponse: ReedJobResponse = {
        totalResults: 3,
        results: [
          buildReedJob({ jobId: 1, jobTitle: 'Dev', minimumSalary: 40000, maximumSalary: 50000 }),
          buildReedJob({ jobId: 2, jobTitle: 'Dev', minimumSalary: 45000, maximumSalary: 55000 }),
          buildReedJob({ jobId: 3, jobTitle: 'Dev', minimumSalary: 50000, maximumSalary: 60000 })
        ]
      };
      const fetchMock = vi.fn().mockResolvedValue(richResponse);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchReedData('Dev', 'London', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            keywords: '"Dev"',
            locationName: 'London',
            fullTime: true,
            permanent: true
          })
        })
      );
      expect(result.count).toBe(3);
    });

    it('should OR the anchor phrase into Tier 1 keywords when extraction shortens the title', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const richResponse: ReedJobResponse = {
        totalResults: 3,
        results: [
          buildReedJob({
            jobId: 1,
            jobTitle: 'Head of Finance',
            minimumSalary: 80000,
            maximumSalary: 90000
          }),
          buildReedJob({
            jobId: 2,
            jobTitle: 'Head of Finance',
            minimumSalary: 85000,
            maximumSalary: 95000
          }),
          buildReedJob({
            jobId: 3,
            jobTitle: 'Head of Finance',
            minimumSalary: 90000,
            maximumSalary: 100000
          })
        ]
      };
      const fetchMock = vi.fn().mockResolvedValue(richResponse);
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

    it('should fall back to an unquoted Tier 2 search when Tier 1 is sparse', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const sparseResponse: ReedJobResponse = {
        totalResults: 1,
        results: [
          buildReedJob({ jobId: 1, jobTitle: 'Dev', minimumSalary: 40000, maximumSalary: 50000 })
        ]
      };
      const richResponse: ReedJobResponse = {
        totalResults: 4,
        results: [
          buildReedJob({ jobId: 1, jobTitle: 'Dev', minimumSalary: 40000, maximumSalary: 50000 }),
          buildReedJob({ jobId: 2, jobTitle: 'Dev', minimumSalary: 42000, maximumSalary: 52000 }),
          buildReedJob({ jobId: 3, jobTitle: 'Dev', minimumSalary: 44000, maximumSalary: 54000 }),
          buildReedJob({ jobId: 4, jobTitle: 'Dev', minimumSalary: 46000, maximumSalary: 56000 })
        ]
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(sparseResponse)
        .mockResolvedValueOnce(richResponse);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchReedData('Dev', '', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({ params: expect.objectContaining({ keywords: '"Dev"' }) })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({ params: expect.objectContaining({ keywords: 'Dev' }) })
      );
      expect(result.count).toBe(4);
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
  });
});
