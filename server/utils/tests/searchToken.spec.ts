import { describe, expect, it } from 'vitest';
import { generateSearchToken, verifySearchToken } from '../searchToken';

describe('searchToken', () => {
  it('verifies a token generated with the same secret', () => {
    const token = generateSearchToken('search_123', 'secret-a');
    expect(verifySearchToken('search_123', token, 'secret-a')).toBe(true);
  });

  it('rejects a token generated with a different secret', () => {
    const token = generateSearchToken('search_123', 'secret-a');
    expect(verifySearchToken('search_123', token, 'secret-b')).toBe(false);
  });

  it('rejects a token generated for a different search ID', () => {
    const token = generateSearchToken('search_123', 'secret-a');
    expect(verifySearchToken('search_456', token, 'secret-a')).toBe(false);
  });

  it('rejects a malformed token without throwing', () => {
    expect(() =>
      verifySearchToken('search_123', 'not-a-valid-hex-token', 'secret-a')
    ).not.toThrow();
    expect(verifySearchToken('search_123', 'not-a-valid-hex-token', 'secret-a')).toBe(false);
  });

  it('rejects an empty token without throwing', () => {
    expect(verifySearchToken('search_123', '', 'secret-a')).toBe(false);
  });
});
