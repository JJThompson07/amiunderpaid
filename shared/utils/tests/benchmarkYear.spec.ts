import { describe, expect, it } from 'vitest';
import { isLatestYear, pinToSingleYear } from '../benchmarkYear';

describe('pinToSingleYear', () => {
  const hits = [
    { searchLocation: 'london', year: 2026 },
    { searchLocation: 'london', year: 2025 },
    { searchLocation: 'orkney', year: 2025 }
  ];

  it('keeps only the preferred year when one is given', () => {
    expect(pinToSingleYear(hits, 2026)).toEqual([{ searchLocation: 'london', year: 2026 }]);
  });

  it('drops a region that only has an older year rather than mixing it in', () => {
    const pinned = pinToSingleYear(hits, 2026);

    expect(pinned.some((hit) => hit.searchLocation === 'orkney')).toBe(false);
  });

  it('falls back to the newest year present when no preferred year is given', () => {
    expect(pinToSingleYear(hits)).toEqual([{ searchLocation: 'london', year: 2026 }]);
  });

  it('returns nothing when the preferred year has no hits', () => {
    expect(pinToSingleYear(hits, 2027)).toEqual([]);
  });

  it('leaves hits untouched when none carry a year', () => {
    const legacy: { searchLocation: string; year?: number }[] = [
      { searchLocation: 'london' },
      { searchLocation: 'leeds' }
    ];

    expect(pinToSingleYear(legacy, 2026)).toEqual(legacy);
  });
});

describe('isLatestYear', () => {
  it('is true for a year newer than every existing one', () => {
    expect(isLatestYear(2026, [2025, 2024])).toBe(true);
  });

  it('is true when re-uploading the newest year', () => {
    expect(isLatestYear(2026, [2026, 2025])).toBe(true);
  });

  it('is false for a year older than the newest existing one', () => {
    expect(isLatestYear(2024, [2026, 2025])).toBe(false);
  });

  it('treats no existing years as newest', () => {
    expect(isLatestYear(2024, [])).toBe(true);
  });
});
