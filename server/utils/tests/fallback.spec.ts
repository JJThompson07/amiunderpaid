import { describe, expect, it, vi } from 'vitest';

vi.mock('../adzuna', () => ({
  fetchAdzunaJobs: vi.fn().mockResolvedValue({
    mean: 55000,
    count: 6,
    results: [{ id: 1, title: 'Adzuna Job', provider: 'adzuna' }],
    provider: 'adzuna'
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
        'permanent',
        undefined
      );
      expect(result.provider).toBe('jooble');
    });

    it('routes to Adzuna for any non-us countryCode', async () => {
      const { executeMarketFallback } = await import('../fallback');
      const { fetchAdzunaJobs } = await import('../adzuna');

      const result = await executeMarketFallback('engineer', 'london', 'gb');

      expect(fetchAdzunaJobs).toHaveBeenCalledWith('engineer', 'london', 'gb', '', '', undefined);
      expect(result.provider).toBe('adzuna');
    });

    it('forwards an explicit category to Jooble', async () => {
      const { executeMarketFallback } = await import('../fallback');
      const { fetchJoobleData } = await import('../jooble');

      await executeMarketFallback(
        'engineer',
        'new york',
        'us',
        'full-time',
        'permanent',
        'it-jobs'
      );

      expect(fetchJoobleData).toHaveBeenCalledWith(
        'engineer',
        'new york',
        'full-time',
        'permanent',
        'it-jobs'
      );
    });

    it('forwards an explicit category to Adzuna', async () => {
      const { executeMarketFallback } = await import('../fallback');
      const { fetchAdzunaJobs } = await import('../adzuna');

      await executeMarketFallback('engineer', 'london', 'gb', '', '', 'it-jobs');

      expect(fetchAdzunaJobs).toHaveBeenCalledWith('engineer', 'london', 'gb', '', '', 'it-jobs');
    });

    it('regression guard: never invokes fetchJoobleData for a gb countryCode', async () => {
      const { executeMarketFallback } = await import('../fallback');
      const { fetchJoobleData } = await import('../jooble');

      vi.mocked(fetchJoobleData).mockClear();

      await executeMarketFallback('engineer', 'london', 'gb');

      expect(fetchJoobleData).not.toHaveBeenCalled();
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

    it('tags the fixture with adzuna when requested', async () => {
      const { getMockFallbackJobs } = await import('../fallback');

      const result = getMockFallbackJobs('adzuna');

      expect(result.provider).toBe('adzuna');
      expect(result.results[0]?.provider).toBe('adzuna');
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
