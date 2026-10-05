import { describe, expect, it } from 'vitest';
import {
  chunkForRateLimit,
  countCategoryLookups,
  formatHistoryMonths,
  lastCompleteMonth,
  normalizeCountryCode
} from '../adzunaHistory';

describe('adzunaHistory utils', () => {
  describe('formatHistoryMonths', () => {
    it('sorts months chronologically regardless of input key order', () => {
      // Adzuna's real response does not guarantee key order -- verified live.
      const shuffled = {
        '2026-05': 60000,
        '2025-12': 55000,
        '2026-01': 56000
      };

      expect(formatHistoryMonths(shuffled)).toEqual([
        { month: '2025-12', average: 55000 },
        { month: '2026-01', average: 56000 },
        { month: '2026-05', average: 60000 }
      ]);
    });

    it('returns an empty array for an empty month map', () => {
      expect(formatHistoryMonths({})).toEqual([]);
    });

    it('handles a single month', () => {
      expect(formatHistoryMonths({ '2026-01': 50000 })).toEqual([
        { month: '2026-01', average: 50000 }
      ]);
    });
  });

  describe('countCategoryLookups', () => {
    it('counts docs per categoryTag for the given country', () => {
      const docs = [
        { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
        { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
        { categoryTag: 'sales-jobs', searchParams: { country: 'gb' } }
      ];

      expect(countCategoryLookups(docs, 'gb')).toEqual(
        new Map([
          ['it-jobs', 2],
          ['sales-jobs', 1]
        ])
      );
    });

    it('excludes docs from a different country', () => {
      const docs = [
        { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
        { categoryTag: 'it-jobs', searchParams: { country: 'us' } }
      ];

      expect(countCategoryLookups(docs, 'gb')).toEqual(new Map([['it-jobs', 1]]));
    });

    it('excludes docs with categoryTag "unknown"', () => {
      const docs = [{ categoryTag: 'unknown', searchParams: { country: 'gb' } }];
      expect(countCategoryLookups(docs, 'gb')).toEqual(new Map());
    });

    it('excludes docs with a missing categoryTag', () => {
      const docs = [{ searchParams: { country: 'gb' } }];
      expect(countCategoryLookups(docs, 'gb')).toEqual(new Map());
    });

    it('normalizes country casing before comparing', () => {
      const docs = [{ categoryTag: 'it-jobs', searchParams: { country: 'GB' } }];
      expect(countCategoryLookups(docs, 'gb')).toEqual(new Map([['it-jobs', 1]]));
    });

    it('returns an empty map for empty input', () => {
      expect(countCategoryLookups([], 'gb')).toEqual(new Map());
    });
  });

  describe('normalizeCountryCode', () => {
    it('maps "usa" and "us" to "us"', () => {
      expect(normalizeCountryCode('usa')).toBe('us');
      expect(normalizeCountryCode('us')).toBe('us');
      expect(normalizeCountryCode('USA')).toBe('us');
    });

    it('maps "gb" and anything else to "gb"', () => {
      expect(normalizeCountryCode('gb')).toBe('gb');
      expect(normalizeCountryCode('uk')).toBe('gb');
      expect(normalizeCountryCode('')).toBe('gb');
      expect(normalizeCountryCode(undefined)).toBe('gb');
    });
  });

  describe('lastCompleteMonth', () => {
    it('returns the previous calendar month for a mid-month date', () => {
      expect(lastCompleteMonth(new Date(Date.UTC(2026, 9, 2)))).toBe('2026-09');
    });

    it('rolls back across a year boundary', () => {
      expect(lastCompleteMonth(new Date(Date.UTC(2027, 0, 2)))).toBe('2026-12');
    });

    it('returns the previous month even on the 1st of the month', () => {
      expect(lastCompleteMonth(new Date(Date.UTC(2026, 9, 1)))).toBe('2026-09');
    });
  });

  describe('chunkForRateLimit', () => {
    it('splits items into fixed-size chunks', () => {
      expect(chunkForRateLimit([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns a single chunk when items fit within the size', () => {
      expect(chunkForRateLimit([1, 2], 20)).toEqual([[1, 2]]);
    });

    it('returns an empty array for empty input', () => {
      expect(chunkForRateLimit([], 20)).toEqual([]);
    });

    it('handles an exact multiple of the chunk size', () => {
      expect(chunkForRateLimit([1, 2, 3, 4], 2)).toEqual([
        [1, 2],
        [3, 4]
      ]);
    });
  });
});
