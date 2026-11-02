import { describe, expect, it } from 'vitest';
import { pinToSingleYear } from '../benchmarkYear';

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
