import { describe, expect, it } from 'vitest';
import { getFileNameFromUrl } from '../file';

describe('getFileNameFromUrl', () => {
  it('decodes a Firebase Storage download URL and returns the object file name', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/recruiter_logos%2Fabc123%2Flogo.png?alt=media&token=xyz';
    expect(getFileNameFromUrl(url)).toBe('logo.png');
  });

  it('returns the last path segment of a plain URL', () => {
    expect(getFileNameFromUrl('https://example.com/path/to/image.jpg')).toBe('image.jpg');
  });

  it('returns an empty string for an empty input', () => {
    expect(getFileNameFromUrl('')).toBe('');
  });

  it('returns an empty string for a URL with no path segments', () => {
    expect(getFileNameFromUrl('https://example.com/')).toBe('');
  });

  it('returns an empty string for an unparseable URL', () => {
    expect(getFileNameFromUrl('not-a-url')).toBe('');
  });
});
