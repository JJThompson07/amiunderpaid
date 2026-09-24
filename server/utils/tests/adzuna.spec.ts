import { describe, expect, it, vi } from 'vitest';
import { fetchAdzunaHistogram, fetchAdzunaJobs, generateCacheKey } from '../adzuna';
import { sanitizeAdzunaData } from '~~/shared/utils/sanitize';
import type { JobListing } from '~~/shared/utils/market-data';

const buildAdzunaJob = (overrides: Partial<JobListing> = {}): JobListing => ({
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
  redirect_url: 'http://adzuna.co.uk/1',
  ...overrides
});

describe('adzuna utils', () => {
  describe('sanitizeAdzunaData', () => {
    it('returns primitive values as is', () => {
      expect(sanitizeAdzunaData(null)).toBe(null);
      expect(sanitizeAdzunaData('string')).toBe('string');
      expect(sanitizeAdzunaData(123)).toBe(123);
      expect(sanitizeAdzunaData(undefined)).toBe(undefined);
    });

    it('strips out keys starting and ending with __', () => {
      const input = {
        valid_key: 'value',
        __invalid__: 'bad',
        __proto__: 'hacked'
      };
      const expected = {
        valid_key: 'value'
      };
      expect(sanitizeAdzunaData(input)).toEqual(expected);
    });

    it('keeps keys that only start or only end with __', () => {
      const input = {
        __starts: 1,
        ends__: 2,
        valid: 3
      };
      expect(sanitizeAdzunaData(input)).toEqual(input);
    });

    it('recursively strips invalid keys from nested objects', () => {
      const input = {
        level1: {
          __bad__: 'bad',
          level2: {
            __worse__: 'worse',
            good: 'good'
          }
        }
      };
      const expected = {
        level1: {
          level2: {
            good: 'good'
          }
        }
      };
      expect(sanitizeAdzunaData(input)).toEqual(expected);
    });

    it('recursively processes elements in an array', () => {
      const input = ['string', { __bad__: 1, good: 2 }, [{ __nested_bad__: 3, nested_good: 4 }]];
      const expected = ['string', { good: 2 }, [{ nested_good: 4 }]];
      expect(sanitizeAdzunaData(input)).toEqual(expected);
    });
  });

  describe('generateCacheKey', () => {
    it('generates a v2-prefixed lowercase dash-separated key', () => {
      const key = generateCacheKey('Software Developer', 'London', 'gb');
      expect(key).toBe('v2-gb-london-software-developer');
    });

    it('handles empty or missing location', () => {
      const key = generateCacheKey('Software Developer', '', 'gb');
      expect(key).toBe('v2-gb--software-developer');
    });

    it('preserves +, #, and . for specific programming languages', () => {
      const key1 = generateCacheKey('C++ Developer', 'London', 'us');
      const key2 = generateCacheKey('C# Engineer', 'Remote', 'gb');
      const key3 = generateCacheKey('.NET Developer', 'UK', 'gb');

      expect(key1).toBe('v2-us-london-c++-developer');
      expect(key2).toBe('v2-gb-remote-c#-engineer');
      expect(key3).toBe('v2-gb-uk-.net-developer');
    });

    it('replaces all other special characters with dashes and trims them', () => {
      const key = generateCacheKey('Developer (Backend) & DevOps!', 'New York, NY', 'us');
      expect(key).toBe('v2-us-new-york-ny-developer-backend-devops-');
    });

    it('truncates and hashes keys longer than 200 characters to prevent Firestore overflow', () => {
      const longTitle = 'a'.repeat(150);
      const longLocation = 'b'.repeat(100);
      const key = generateCacheKey(longTitle, longLocation, 'gb');

      expect(key.length).toBeLessThanOrEqual(200);
      expect(key.length).toBe(197); // 180 chars + '-' + 16 char hash
      expect(key.startsWith(`v2-gb-${'b'.repeat(100)}-${'a'.repeat(73)}`)).toBe(true);
      expect(key).toMatch(/-[a-f0-9]{16}$/); // ends with dash and 16 char hex hash
    });

    it('generates a distinct key when a category is provided', () => {
      const withCategory = generateCacheKey('Software Developer', 'London', 'gb', 'it-jobs');
      const withoutCategory = generateCacheKey('Software Developer', 'London', 'gb');

      expect(withCategory).toBe('v2-gb-london-software-developer-cat-it-jobs');
      expect(withCategory).not.toBe(withoutCategory);
    });

    it('treats an empty or undefined category the same as omitting it', () => {
      const undefinedCategory = generateCacheKey('Software Developer', 'London', 'gb', undefined);
      const emptyCategory = generateCacheKey('Software Developer', 'London', 'gb', '');
      const omitted = generateCacheKey('Software Developer', 'London', 'gb');

      expect(undefinedCategory).toBe(omitted);
      expect(emptyCategory).toBe(omitted);
    });

    it('lowercases and sanitizes the category the same way as title/location', () => {
      const key = generateCacheKey('Developer', 'London', 'gb', 'IT & Software Jobs');
      expect(key).toBe('v2-gb-london-developer-cat-it-software-jobs');
    });
  });

  describe('fetchAdzunaJobs', () => {
    it('should throw error if credentials are missing', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: null, adzunaAppKey: null }))
      );
      vi.stubGlobal(
        'createError',
        (err: { statusMessage?: string }) => new Error(err.statusMessage)
      );

      await expect(fetchAdzunaJobs('Dev', '', 'gb', 'full-time', 'permanent')).rejects.toThrow(
        'Market data service is misconfigured.'
      );
    });

    it('should use title_only (not what) and skip the Tier 2 call when the anchor phrase is a no-op', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const richResponse = {
        count: 3,
        results: [buildAdzunaJob({ id: 1 }), buildAdzunaJob({ id: 2 }), buildAdzunaJob({ id: 3 })]
      };
      const fetchMock = vi.fn().mockResolvedValue(richResponse);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchAdzunaJobs(
        'Developer',
        'London',
        'gb',
        'full-time',
        'permanent',
        'it-jobs'
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.adzuna.com/v1/api/jobs/gb/search/1',
        expect.objectContaining({
          params: expect.objectContaining({
            title_only: 'Developer',
            results_per_page: 100,
            full_time: 1,
            permanent: 1,
            where: 'London',
            distance: 20,
            category: 'it-jobs'
          }),
          timeout: 6000
        })
      );
      expect(result.count).toBe(3);
    });

    it('should map internal location slugs the same way as the old gateway code', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ count: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchAdzunaJobs('Developer', 'east, England', 'gb', '', '');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.adzuna.com/v1/api/jobs/gb/search/1',
        expect.objectContaining({
          params: expect.objectContaining({ where: 'Eastern England' })
        })
      );
    });

    it('should run Tier 1 and Tier 2 (anchor phrase title_only) concurrently and dedupe Tier 2 against Tier 1', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const tier1Response = {
        count: 1,
        results: [buildAdzunaJob({ id: 1, title: 'Head of Finance' })]
      };
      const tier2Response = {
        count: 3,
        results: [
          buildAdzunaJob({ id: 1, title: 'Head of Finance' }),
          buildAdzunaJob({ id: 2, title: 'Head of Finance' }),
          buildAdzunaJob({ id: 3, title: 'Head of Finance' })
        ]
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tier1Response)
        .mockResolvedValueOnce(tier2Response);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchAdzunaJobs(
        'Group Head of Finance',
        '',
        'gb',
        'full-time',
        'permanent'
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://api.adzuna.com/v1/api/jobs/gb/search/1',
        expect.objectContaining({
          params: expect.objectContaining({ title_only: 'Group Head of Finance' })
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://api.adzuna.com/v1/api/jobs/gb/search/1',
        expect.objectContaining({
          params: expect.objectContaining({ title_only: 'Head of Finance' })
        })
      );
      // Tier 1: job 1 only. Tier 2: jobs 2 and 3 (job 1 deduplicated against Tier 1).
      expect(result.results.map((r) => r.id)).toEqual([1]);
      expect(result.similarResults?.map((r) => r.id)).toEqual([2, 3]);
      expect(result.count).toBe(3);
    });

    it('should not retry Tier 2 when the anchor phrase is a no-op (title has no scope modifier)', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const sparseResponse = { count: 1, results: [buildAdzunaJob({ id: 1 })] };
      const fetchMock = vi.fn().mockResolvedValue(sparseResponse);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchAdzunaJobs('Developer', '', 'gb', 'full-time', 'permanent');

      // 'Developer' has no scope modifier to strip, so extractSearchAnchorPhrase
      // is a no-op and a Tier 2 retry would send Adzuna an identical
      // title_only request for no benefit -- it must be skipped.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.count).toBe(1);
    });

    it('should return a valid zero-count response instead of throwing on zero results', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ count: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchAdzunaJobs('Developer', '', 'gb', 'full-time', 'permanent');

      expect(result.count).toBe(0);
      expect(result.provider).toBe('adzuna');
    });

    it('should let the raw HTTP error propagate so the gateway can inspect its status code', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const httpError = Object.assign(new Error('Too Many Requests'), {
        response: { status: 429 }
      });
      vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(httpError));

      await expect(
        fetchAdzunaJobs('Developer', '', 'gb', 'full-time', 'permanent')
      ).rejects.toMatchObject({
        response: { status: 429 }
      });
    });
  });

  describe('fetchAdzunaHistogram', () => {
    it('should throw error if credentials are missing', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: null, adzunaAppKey: null }))
      );
      vi.stubGlobal(
        'createError',
        (err: { statusMessage?: string }) => new Error(err.statusMessage)
      );

      await expect(fetchAdzunaHistogram('Dev', '', 'gb')).rejects.toThrow(
        'Market data service is misconfigured.'
      );
    });

    it('should use title_only and stop after one call when Tier 1 has enough buckets', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const richHistogram = { histogram: { '40000': 3, '50000': 5, '60000': 2 } };
      const fetchMock = vi.fn().mockResolvedValue(richHistogram);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchAdzunaHistogram('Developer', 'London', 'gb', 'it-jobs');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.adzuna.com/v1/api/jobs/gb/histogram',
        expect.objectContaining({
          params: expect.objectContaining({
            title_only: 'Developer',
            where: 'London',
            category: 'it-jobs'
          }),
          timeout: 6000
        })
      );
      expect(result.histogram).toEqual(richHistogram.histogram);
      expect(result.provider).toBe('adzuna');
    });

    it('should not retry Tier 2 when the anchor phrase is a no-op', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const sparseHistogram = { histogram: { '50000': 1 } };
      const fetchMock = vi.fn().mockResolvedValue(sparseHistogram);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchAdzunaHistogram('Developer', '', 'gb');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.histogram).toEqual(sparseHistogram.histogram);
    });

    it('should fall back to Tier 2 (anchor phrase title_only) when Tier 1 has too few buckets', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ adzunaAppId: 'id', adzunaAppKey: 'key' }))
      );
      const sparseHistogram = { histogram: { '90000': 1 } };
      const richHistogram = { histogram: { '80000': 2, '90000': 4, '100000': 3 } };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(sparseHistogram)
        .mockResolvedValueOnce(richHistogram);
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchAdzunaHistogram('Group Head of Finance', '', 'gb');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://api.adzuna.com/v1/api/jobs/gb/histogram',
        expect.objectContaining({
          params: expect.objectContaining({ title_only: 'Head of Finance' })
        })
      );
      expect(result.histogram).toEqual(richHistogram.histogram);
    });
  });
});
