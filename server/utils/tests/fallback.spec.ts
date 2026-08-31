import { describe, expect, it, vi } from 'vitest';

vi.mock('../reed', () => ({
  fetchReedData: vi.fn().mockResolvedValue({
    mean: 40000,
    count: 5,
    results: [{ id: 1, title: 'Reed Job', provider: 'reed' }],
    provider: 'reed'
  })
}));

vi.mock('../jooble', () => ({
  fetchJoobleData: vi.fn().mockResolvedValue({
    mean: 90000,
    count: 8,
    results: [{ id: 2, title: 'Jooble Job', provider: 'jooble' }],
    provider: 'jooble'
  })
}));

describe('server/utils/fallback', () => {
  describe('executeMarketFallback', () => {
    it('routes to Jooble when countryCode is us', async () => {
      const { executeMarketFallback } = await import('../fallback');
      const { fetchJoobleData } = await import('../jooble');

      const result = await executeMarketFallback(
        'engineer',
        'new york',
        'us',
        'full-time',
        'permanent'
      );

      expect(fetchJoobleData).toHaveBeenCalledWith(
        'engineer',
        'new york',
        'full-time',
        'permanent'
      );
      expect(result.provider).toBe('jooble');
    });

    it('routes to Reed for any non-us countryCode', async () => {
      const { executeMarketFallback } = await import('../fallback');
      const { fetchReedData } = await import('../reed');

      const result = await executeMarketFallback('engineer', 'london', 'gb');

      expect(fetchReedData).toHaveBeenCalledWith('engineer', 'london', '', '');
      expect(result.provider).toBe('reed');
    });
  });

  describe('getMockFallbackJobs', () => {
    it('returns a static single-result fixture tagged with the given provider', async () => {
      const { getMockFallbackJobs } = await import('../fallback');

      const result = getMockFallbackJobs('reed');

      expect(result.provider).toBe('reed');
      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.provider).toBe('reed');
    });

    it('tags the fixture with jooble when requested', async () => {
      const { getMockFallbackJobs } = await import('../fallback');

      const result = getMockFallbackJobs('jooble');

      expect(result.provider).toBe('jooble');
      expect(result.results[0]?.provider).toBe('jooble');
    });
  });

  describe('getMockFallbackHistogram', () => {
    it('returns a static histogram fixture tagged with the given provider', async () => {
      const { getMockFallbackHistogram } = await import('../fallback');

      const result = getMockFallbackHistogram('reed');

      expect(result.provider).toBe('reed');
      expect(result.histogram).toEqual({ 50000: 3, 60000: 5, 70000: 2 });
    });
  });
});
