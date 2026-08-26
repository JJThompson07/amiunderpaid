import { describe, expect, it } from 'vitest';
import {
  extractActiveCategoryCountryPairs,
  formatHistoryMonths,
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

  describe('extractActiveCategoryCountryPairs', () => {
    it('extracts unique categoryTag/country pairs from cache docs', () => {
      const docs = [
        { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
        { categoryTag: 'it-jobs', searchParams: { country: 'gb' } },
        { categoryTag: 'sales-jobs', searchParams: { country: 'us' } }
      ];

      expect(extractActiveCategoryCountryPairs(docs)).toEqual([
        { categoryTag: 'it-jobs', country: 'gb' },
        { categoryTag: 'sales-jobs', country: 'us' }
      ]);
    });

    it('excludes docs with categoryTag "unknown"', () => {
      const docs = [{ categoryTag: 'unknown', searchParams: { country: 'gb' } }];
      expect(extractActiveCategoryCountryPairs(docs)).toEqual([]);
    });

    it('excludes docs with a missing categoryTag', () => {
      const docs = [{ searchParams: { country: 'gb' } }];
      expect(extractActiveCategoryCountryPairs(docs)).toEqual([]);
    });

    it('excludes docs with a country outside gb/us', () => {
      const docs = [{ categoryTag: 'it-jobs', searchParams: { country: 'fr' } }];
      expect(extractActiveCategoryCountryPairs(docs)).toEqual([]);
    });

    it('normalizes country casing', () => {
      const docs = [{ categoryTag: 'it-jobs', searchParams: { country: 'GB' } }];
      expect(extractActiveCategoryCountryPairs(docs)).toEqual([
        { categoryTag: 'it-jobs', country: 'gb' }
      ]);
    });

    it('returns an empty array for an empty input', () => {
      expect(extractActiveCategoryCountryPairs([])).toEqual([]);
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
});
