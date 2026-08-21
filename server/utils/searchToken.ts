import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Generates an HMAC SHA256 token for a given search ID to prevent unauthorized updates.
 */
export function generateSearchToken(searchId: string, secret: string): string {
  return createHmac('sha256', secret).update(searchId).digest('hex');
}

/**
 * Verifies that the provided token matches the expected HMAC for the search ID.
 */
export function verifySearchToken(searchId: string, token: string, secret: string): boolean {
  const expected = Buffer.from(generateSearchToken(searchId, secret), 'hex');
  const actual = Buffer.from(token, 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
