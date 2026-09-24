import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JoobleJobResponse } from '../jooble';
import { fetchJoobleData, parseJoobleSalary, processJoobleData } from '../jooble';

describe('Jooble Provider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'useRuntimeConfig',
      vi.fn(() => ({ joobleApiKey: 'test-key' }))
    );
    vi.stubGlobal('createError', (err: { statusMessage?: string }) => new Error(err.statusMessage));
    vi.stubGlobal('$fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.E2E;
  });

  describe('parseJoobleSalary', () => {
    it('should parse ranges and return the max value', () => {
      const result = parseJoobleSalary('$97k - $206k');
      expect(result.min).toBe(97000);
      expect(result.max).toBe(206000);
      expect(result.raw).toBe('$97k - $206k');
    });

    it('should parse decimal-k ranges like $104k - $176.04k', () => {
      const result = parseJoobleSalary('$104k - $176.04k');
      expect(result.min).toBe(104000);
      expect(result.max).toBe(176040);
      expect(result.raw).toBe('$104k - $176.04k');
    });

    it('should parse decimal-k ranges like $120.3k - $161.3k', () => {
      const result = parseJoobleSalary('$120.3k - $161.3k');
      expect(result.min).toBe(120300);
      expect(result.max).toBe(161300);
      expect(result.raw).toBe('$120.3k - $161.3k');
    });

    it('should parse singular decimal-k values like $189.59k', () => {
      const result = parseJoobleSalary('$189.59k');
      expect(result.min).toBe(189590);
      expect(result.max).toBe(189590);
      expect(result.raw).toBe('$189.59k');
    });

    it('should parse monthly values and multiply by 12', () => {
      const result = parseJoobleSalary('$5,000 per month');
      expect(result.min).toBe(60000);
      expect(result.max).toBe(60000);
      expect(result.raw).toBe('$5,000 per month');
    });

    it('should parse hourly values and multiply by 2080', () => {
      const result = parseJoobleSalary('$25 / hour');
      expect(result.min).toBe(52000);
      expect(result.max).toBe(52000);
      expect(result.raw).toBe('$25 / hour');
    });

    it('should parse singular annual values with k modifier', () => {
      const result = parseJoobleSalary('$200k');
      expect(result.min).toBe(200000);
      expect(result.max).toBe(200000);
      expect(result.raw).toBe('$200k');
    });

    it('should handle undefined or empty strings safely', () => {
      const result = parseJoobleSalary(undefined);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.raw).toBe('');

      const empty = parseJoobleSalary('');
      expect(empty.min).toBe(0);
      expect(empty.max).toBe(0);
      expect(empty.raw).toBe('');
    });

    it('should handle missing numbers safely', () => {
      const result = parseJoobleSalary('Competitive Salary');
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.raw).toBe('Competitive Salary');
    });

    it('should parse comma-separated ranges like $132k - $243.5k', () => {
      const result = parseJoobleSalary('$132k - $243.5k');
      expect(result.min).toBe(132000);
      expect(result.max).toBe(243500);
      expect(result.raw).toBe('$132k - $243.5k');
    });
  });

  describe('processJoobleData', () => {
    it('should map jobs to the internal interface, partition into results/similarResults, and calculate histograms', () => {
      const mockResponse = {
        totalCount: 15,
        jobs: [
          {
            title: 'Software Engineer',
            location: 'New York',
            snippet: 'Great job',
            salary: '$100k - $120k',
            source: 'jooble',
            type: 'full-time',
            link: 'https://example.com/1',
            company: 'Tech Corp',
            updated: '2023-01-01',
            id: '123'
          },
          {
            title: 'Frontend Developer',
            location: 'Remote',
            snippet: 'Another great job',
            salary: '',
            source: 'jooble',
            type: 'full-time',
            link: 'https://example.com/2',
            company: 'Startup',
            updated: '2023-01-02',
            id: '456'
          }
        ]
      };

      // 'Software Engineer' fully matches the search title (Tier 1). 'Frontend
      // Developer' has no domain-token overlap with 'Software Engineer' and is
      // dropped entirely (score 0), not classified as Tier 2.
      const result = processJoobleData(mockResponse, 'full-time', 'permanent', 'Software Engineer');

      expect(result.provider).toBe('jooble');
      expect(result.results).toHaveLength(1);
      expect(result.similarResults).toEqual([]);
      expect(result.count).toBe(1);

      const job1 = result.results[0];
      expect(job1?.title).toBe('Software Engineer');
      expect(job1?.company.display_name).toBe('Tech Corp');
      expect(job1?.salary_min).toBe(100000);
      expect(job1?.salary_max).toBe(120000);
      expect(job1?.raw_salary).toBe('$100k - $120k');

      // Verify mean calculation (only includes jobs with valid salaries)
      expect(result.mean).toBe(110000);

      // Verify histogram buckets -- 110000 rounds down to nearest 5000 -> 110000
      expect(result.histogram![110000]).toBe(1);
    });

    it('drops a listing that scores 0 relevance (missing a required domain token) entirely', () => {
      const mockResponse = {
        totalCount: 1,
        jobs: [
          {
            title: 'Unrelated Role',
            location: 'Remote',
            snippet: 'Not relevant',
            salary: '$50k',
            source: 'jooble',
            type: 'full-time',
            link: 'https://example.com/1',
            company: 'Co',
            updated: '2023-01-01',
            id: '1'
          }
        ]
      };

      const result = processJoobleData(mockResponse, 'full-time', 'permanent', 'Software Engineer');

      expect(result.results).toEqual([]);
      expect(result.similarResults).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('sorts multiple listings within each tier by salary_max descending', () => {
      const buildJob = (
        id: string,
        title: string,
        salary: string
      ): JoobleJobResponse['jobs'][number] => ({
        title,
        location: 'Remote',
        snippet: 'Great job',
        salary,
        source: 'jooble',
        type: 'full-time',
        link: `https://example.com/${id}`,
        company: 'Co',
        updated: '2023-01-01',
        id
      });

      const mockResponse = {
        totalCount: 4,
        jobs: [
          buildJob('1', 'Senior Software Engineer', '$60k'), // Tier 1 (full match)
          buildJob('2', 'Senior Software Engineer', '$90k'), // Tier 1, higher salary
          buildJob('3', 'Software Engineer', '$50k'), // Tier 2 (missing optional "senior")
          buildJob('4', 'Software Engineer', '$80k') // Tier 2, higher salary
        ]
      };

      const result = processJoobleData(
        mockResponse,
        'full-time',
        'permanent',
        'Senior Software Engineer'
      );

      expect(result.results.map((r) => r.id)).toEqual([2, 1]);
      expect(result.similarResults?.map((r) => r.id)).toEqual([4, 3]);
    });

    it('classifies a partial (compatible but not full-overlap) match as similarResults', () => {
      const mockResponse = {
        totalCount: 1,
        jobs: [
          {
            title: 'Software Engineer', // scope-modifier-free candidate for a scoped search
            location: 'Remote',
            snippet: 'Great job',
            salary: '$90k',
            source: 'jooble',
            type: 'full-time',
            link: 'https://example.com/1',
            company: 'Co',
            updated: '2023-01-01',
            id: '1'
          }
        ]
      };

      // Search includes an extra optional token ("Senior") that the candidate
      // lacks -- score is < 1 (partial overlap) but still compatible/accepted.
      const result = processJoobleData(
        mockResponse,
        'full-time',
        'permanent',
        'Senior Software Engineer'
      );

      expect(result.results).toEqual([]);
      expect(result.similarResults).toHaveLength(1);
      expect(result.similarResults?.[0]?.title).toBe('Software Engineer');
    });
  });

  describe('fetchJoobleData', () => {
    it('should throw a misconfiguration error when the API key is missing outside dev/e2e', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ joobleApiKey: null }))
      );

      await expect(
        fetchJoobleData('Developer', 'Chicago', 'full-time', 'permanent')
      ).rejects.toThrow('Market data service is misconfigured.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return a static mock listing when the API key is missing during e2e', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ joobleApiKey: null }))
      );
      process.env.E2E = 'true';

      const result = await fetchJoobleData('Developer', 'Chicago', 'full-time', 'permanent');

      expect(result.provider).toBe('jooble');
      expect(result.results).toHaveLength(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should call $fetch with correct parameters', async () => {
      fetchMock.mockResolvedValue({
        totalCount: 0,
        jobs: []
      });

      await fetchJoobleData('Developer', 'Chicago', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://jooble.org/api/test-key',
        expect.objectContaining({
          method: 'POST',
          body: {
            keywords: 'Developer',
            location: 'Chicago',
            page: 1
          },
          timeout: 6000
        })
      );
    });

    it('should enhance keywords with a plain-language category when provided', async () => {
      fetchMock.mockResolvedValue({ totalCount: 0, jobs: [] });

      await fetchJoobleData(
        'Developer',
        'Chicago',
        'full-time',
        'permanent',
        'accounting-finance-jobs'
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'https://jooble.org/api/test-key',
        expect.objectContaining({
          body: expect.objectContaining({
            keywords: 'Developer accounting finance'
          })
        })
      );
    });

    it('should leave keywords unchanged when no category is provided', async () => {
      fetchMock.mockResolvedValue({ totalCount: 0, jobs: [] });

      await fetchJoobleData('Developer', 'Chicago', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://jooble.org/api/test-key',
        expect.objectContaining({
          body: expect.objectContaining({
            keywords: 'Developer'
          })
        })
      );
    });

    it('should send the extracted anchor phrase, not the full raw title, as keywords', async () => {
      fetchMock.mockResolvedValue({ totalCount: 0, jobs: [] });

      // Jooble's matching direction is reversed from Reed/Adzuna: the shorter
      // anchor phrase produces cleaner results, so "Group Head of Finance"
      // (with the recognized "group" modifier stripped) is sent, not the
      // full raw title. See design.md sec 3c.
      await fetchJoobleData('Group Head of Finance', 'Chicago', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://jooble.org/api/test-key',
        expect.objectContaining({
          body: expect.objectContaining({
            keywords: 'Head of Finance'
          })
        })
      );
    });

    it('should throw 500 error if fetch fails', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        fetchJoobleData('Developer', 'Chicago', 'full-time', 'permanent')
      ).rejects.toThrow('Market data temporarily unavailable.');
    });
  });
});
