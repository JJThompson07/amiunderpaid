import { describe, expect, it } from 'vitest';
import { generateCacheKey } from '../adzuna';
import { sanitizeAdzunaData } from '~~/shared/utils/sanitize';

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
      const input = [
        'string',
        { __bad__: 1, good: 2 },
        [{ __nested_bad__: 3, nested_good: 4 }]
      ];
      const expected = [
        'string',
        { good: 2 },
        [{ nested_good: 4 }]
      ];
      expect(sanitizeAdzunaData(input)).toEqual(expected);
    });
  });

  describe('generateCacheKey', () => {
    it('generates a lowercase dash-separated key', () => {
      const key = generateCacheKey('Software Developer', 'London', 'gb');
      expect(key).toBe('gb-london-software-developer');
    });

    it('handles empty or missing location', () => {
      const key = generateCacheKey('Software Developer', '', 'gb');
      expect(key).toBe('gb--software-developer');
    });

    it('preserves +, #, and . for specific programming languages', () => {
      const key1 = generateCacheKey('C++ Developer', 'London', 'us');
      const key2 = generateCacheKey('C# Engineer', 'Remote', 'gb');
      const key3 = generateCacheKey('.NET Developer', 'UK', 'gb');
      
      expect(key1).toBe('us-london-c++-developer');
      expect(key2).toBe('gb-remote-c#-engineer');
      expect(key3).toBe('gb-uk-.net-developer');
    });

    it('replaces all other special characters with dashes and trims them', () => {
      const key = generateCacheKey('Developer (Backend) & DevOps!', 'New York, NY', 'us');
      expect(key).toBe('us-new-york-ny-developer-backend-devops-');
    });

    it('truncates and hashes keys longer than 200 characters to prevent Firestore overflow', () => {
      const longTitle = 'a'.repeat(150);
      const longLocation = 'b'.repeat(100);
      const key = generateCacheKey(longTitle, longLocation, 'gb');
      
      expect(key.length).toBeLessThanOrEqual(200);
      expect(key.length).toBe(197); // 180 chars + '-' + 16 char hash
      expect(key.startsWith(`gb-${'b'.repeat(100)}-${'a'.repeat(76)}`)).toBe(true);
      expect(key).toMatch(/-[a-f0-9]{16}$/); // ends with dash and 16 char hex hash
    });
  });
});
