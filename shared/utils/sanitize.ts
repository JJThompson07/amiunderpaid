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
export const sanitizeAdzunaData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(sanitizeAdzunaData);
  }
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      // Remove keys that start AND end with '__' (reserved by Firestore).
      // Uses || so that a key only needs to fail ONE side to be kept.
      if (!key.startsWith('__') || !key.endsWith('__')) {
        acc[key] = sanitizeAdzunaData(data[key]);
      }
      return acc;
    }, {} as any);
  }
  return data;
};
