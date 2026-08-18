import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    it('should map jobs to the internal interface and calculate histograms', () => {
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

      const result = processJoobleData(mockResponse, 'full-time', 'permanent');

      expect(result.count).toBe(15);
      expect(result.provider).toBe('jooble');
      expect(result.results).toHaveLength(2);

      // Verify the first mapped job (with salary)
      const job1 = result.results[0];
      expect(job1?.title).toBe('Software Engineer');
      expect(job1?.company.display_name).toBe('Tech Corp');
      expect(job1?.salary_min).toBe(100000);
      expect(job1?.salary_max).toBe(120000);
      expect(job1?.raw_salary).toBe('$100k - $120k');

      // Verify the second mapped job (no salary)
      const job2 = result.results[1];
      expect(job2?.salary_min).toBe(0);
      expect(job2?.salary_max).toBe(0);
      expect(job2?.raw_salary).toBe('');

      // Verify mean calculation (only includes jobs with valid salaries)
      expect(result.mean).toBe(110000); // Average of 100k and 120k

      // Verify histogram buckets
      // 110000 rounds down to nearest 5000 -> 110000
      expect(result.histogram![110000]).toBe(1);
    });
  });

  describe('fetchJoobleData', () => {
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
          }
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
