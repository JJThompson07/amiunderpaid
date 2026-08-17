import { describe, expect, it } from 'vitest';
import { sanitizeAdzunaData, sanitizeUrl } from '../sanitize';

describe('sanitizeAdzunaData', () => {
  it('returns primitive values as is', () => {
    expect(sanitizeAdzunaData(null)).toBe(null);
    expect(sanitizeAdzunaData('string')).toBe('string');
    expect(sanitizeAdzunaData(123)).toBe(123);
    expect(sanitizeAdzunaData(undefined)).toBe(undefined);
  });

  it('strips keys that both start AND end with __', () => {
    const input = {
      valid_key: 'value',
      __invalid__: 'bad',
      __proto__: 'hacked',
      __id__: 42
    };
    expect(sanitizeAdzunaData(input)).toEqual({ valid_key: 'value' });
  });

  it('keeps keys that only start with __ (not a Firestore reserved key)', () => {
    const input = { __starts: 1, valid: 2 };
    expect(sanitizeAdzunaData(input)).toEqual({ __starts: 1, valid: 2 });
  });

  it('keeps keys that only end with __ (not a Firestore reserved key)', () => {
    const input = { ends__: 1, valid: 2 };
    expect(sanitizeAdzunaData(input)).toEqual({ ends__: 1, valid: 2 });
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
    expect(sanitizeAdzunaData(input)).toEqual({
      level1: { level2: { good: 'good' } }
    });
  });

  it('recursively processes elements in an array', () => {
    const input = ['string', { __bad__: 1, good: 2 }, [{ __nested_bad__: 3, nested_good: 4 }]];
    expect(sanitizeAdzunaData(input)).toEqual(['string', { good: 2 }, [{ nested_good: 4 }]]);
  });
});

describe('sanitizeUrl', () => {
  it('allows http and https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    expect(sanitizeUrl('http://test.com/path')).toBe('http://test.com/path');
  });

  it('blocks javascript: URLs and returns #', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });

  it('blocks other protocols and invalid URLs', () => {
    expect(sanitizeUrl('data:text/html,<html>')).toBe('#');
    expect(sanitizeUrl('ftp://server/file')).toBe('#');
    expect(sanitizeUrl('not-a-url')).toBe('#');
    expect(sanitizeUrl(undefined)).toBe('#');
    expect(sanitizeUrl('')).toBe('#');
  });
});
