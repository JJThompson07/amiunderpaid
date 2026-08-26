import type { HistoryPoint } from '~~/shared/utils/market-data';

export type ActiveCategoryCountry = { categoryTag: string; country: string };

type CachedSearchDoc = {
  categoryTag?: string;
  searchParams?: { country?: string };
};

/**
 * Adzuna's `/history` response does not guarantee chronological key order
 * (confirmed live: a real request returned its keys shuffled) so this must
 * explicitly sort rather than trust insertion order.
 */
export const formatHistoryMonths = (monthMap: Record<string, number>): HistoryPoint[] => {
  return Object.entries(monthMap)
    .map(([month, average]) => ({ month, average }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Derives the set of category/country combinations that actually have live
 * search traffic, from raw adzuna_jobs_cache documents. adzuna_category is
 * NOT a valid source for this -- nothing in the codebase writes to it.
 */
export const extractActiveCategoryCountryPairs = (
  docs: CachedSearchDoc[]
): ActiveCategoryCountry[] => {
  const seen = new Map<string, ActiveCategoryCountry>();

  for (const doc of docs) {
    const categoryTag = doc.categoryTag;
    const country = doc.searchParams?.country?.toLowerCase();

    if (!categoryTag || categoryTag === 'unknown' || (country !== 'gb' && country !== 'us')) {
      continue;
    }

    const key = `${country}_${categoryTag}`;
    if (!seen.has(key)) {
      seen.set(key, { categoryTag, country });
    }
  }

  return [...seen.values()];
};

/**
 * Counts adzuna_jobs_cache documents per categoryTag for one country, as a
 * real-user-driven proxy for how often each industry gets looked up. Note
 * this counts distinct search variants (title/location/type/contract
 * combos), not raw search frequency -- identical repeat searches overwrite
 * the same cache doc rather than creating a new one or incrementing a
 * counter, since no such counter exists in this schema.
 */
export const countCategoryLookups = (
  docs: CachedSearchDoc[],
  country: string
): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const doc of docs) {
    const categoryTag = doc.categoryTag;
    const docCountry = doc.searchParams?.country?.toLowerCase();

    if (!categoryTag || categoryTag === 'unknown' || docCountry !== country) {
      continue;
    }

    counts.set(categoryTag, (counts.get(categoryTag) ?? 0) + 1);
  }

  return counts;
};

/** Normalizes a raw country query param the same way market-data/jobs.ts does. */
export const normalizeCountryCode = (country: unknown): 'gb' | 'us' => {
  const value = String(country || '').toLowerCase();
  return value === 'usa' || value === 'us' ? 'us' : 'gb';
};

/**
 * Splits items into fixed-size chunks, used to pace Adzuna API calls under
 * its documented 25 requests/minute limit (confirmed by Adzuna support;
 * batches of 20 leave a safety margin, paced one batch per minute).
 */
export const chunkForRateLimit = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};
