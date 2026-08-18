/**
 * Shared data sanitization utilities for market data API responses.
 *
 * These utilities are consumed on both the client (useJobs composable)
 * and the server (server/utils/adzuna.ts) to ensure consistent behaviour.
 */

/**
 * Recursively cleans a data object before saving to Firestore or passing
 * to client state. Strips keys that both start AND end with `__` since
 * these are reserved by Firestore and can cause write errors.
 */
export const sanitizeAdzunaData = <T>(data: T): T => {
  if (Array.isArray(data)) {
    return (data as unknown[]).map((item) => sanitizeAdzunaData(item)) as T;
  }
  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      // Remove keys that start AND end with '__' (reserved by Firestore).
      // Uses || so that a key only needs to fail ONE side to be kept.
      if (!key.startsWith('__') || !key.endsWith('__')) {
        result[key] = sanitizeAdzunaData(obj[key]);
      }
    }
    return result as T;
  }
  return data;
};

/**
 * Sanitizes URLs to prevent javascript: execution (XSS)
 * by strictly allowing only http: and https: protocols.
 */
export const sanitizeUrl = (url: string | undefined): string => {
  if (!url) {
    return '#';
  }
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {
    // Invalid URL format
  }
  return '#';
};
