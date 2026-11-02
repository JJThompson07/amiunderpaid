// ==========================================
// 📅 BENCHMARK DATA YEAR
// ==========================================

/**
 * Restricts benchmark hits to a single data year, so one result never mixes years (e.g. a 2026
 * national figure beside a 2025 regional one). Uses `preferredYear` (the national record's year)
 * when given, otherwise the newest year present. Hits with no year are only kept when no hit has one.
 */
export const pinToSingleYear = <T extends { year?: number }>(
  hits: T[],
  preferredYear?: number
): T[] => {
  const years = hits.map((hit) => hit.year).filter((year): year is number => year !== undefined);
  if (years.length === 0) {
    return hits;
  }

  const year = preferredYear ?? Math.max(...years);
  return hits.filter((hit) => hit.year === year);
};

/**
 * Whether `year` is at least as new as every year already held (an empty list counts as newest).
 * The seeder only syncs the newest regional year to search, so an older upload can't replace it.
 */
export const isLatestYear = (year: number, existingYears: number[]): boolean =>
  existingYears.every((existing) => year >= existing);
