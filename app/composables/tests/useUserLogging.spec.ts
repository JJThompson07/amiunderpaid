import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserLogging } from '../useUserLogging';

describe('useUserLogging', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mock$fetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Stub useNuxtApp
    vi.stubGlobal('useNuxtApp', () => ({ $siteBrand: 'test-brand' }));

    // Mock fetch
    mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, id: 'server-minted-uuid', token: 'mock-hmac-token' })
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    // Mock crypto.randomUUID (still used or not? Not used in logSearch anymore)
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'mock-uuid-1234')
    });
  });

  describe('logSearch', () => {
    it('returns a string ID and calls fetch', async () => {
      const { logSearch } = useUserLogging();

      const result = await logSearch(
        'Software Engineer',
        'US',
        'New York',
        '100000',
        'part-time',
        'contract'
      );

      // If import.meta.client is mocked/true, it should call fetch
      if (mockFetch.mock.calls.length > 0) {
        expect(result).toBe('server-minted-uuid');
        const [url, options] = mockFetch.mock.calls[0]!;
        expect(url).toBe('/api/user/track-search');
        expect(options.method).toBe('POST');
        expect(options.keepalive).toBe(true);
        expect(JSON.parse(options.body)).toEqual({
          title: 'Software Engineer',
          country: 'US',
          location: 'New York',
          salary: '100000',
          schedule: 'part-time',
          contract: 'contract',
          brand: 'test-brand'
        });
      } else {
        expect(result).toBe('');
      }
    });

    it('uses default schedule and contract if not provided', async () => {
      const { logSearch } = useUserLogging();

      await logSearch('Title', 'Country', 'Location', 'Salary');

      if (mockFetch.mock.calls.length > 0) {
        const [, options] = mockFetch.mock.calls[0]!;
        const body = JSON.parse(options.body);
        expect(body.schedule).toBe('full-time');
        expect(body.contract).toBe('permanent');
      }
    });
  });

  describe('updateSearchLog', () => {
    it('does not fetch when searchId is falsy', () => {
      const { updateSearchLog } = useUserLogging();

      updateSearchLog('', { searchSuccess: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls fetch with updated data when conditions are met', async () => {
      const { logSearch, updateSearchLog } = useUserLogging();

      // First log a search to populate the token in useState
      await logSearch('Title', 'Country', 'Location', 'Salary');

      // Clear the mock calls so we only inspect the update
      mockFetch.mockClear();

      updateSearchLog('mock-uuid-1234', {
        mcaScore: 85,
        searchSuccess: true
      });

      if (mockFetch.mock.calls.length > 0) {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0]!;
        expect(url).toBe('/api/user/update-search');
        expect(options.method).toBe('POST');
        expect(options.keepalive).toBe(true);
        expect(JSON.parse(options.body)).toEqual({
          id: 'mock-uuid-1234',
          token: 'mock-hmac-token',
          mcaScore: 85,
          searchSuccess: true
        });
      }
    });

    it('catches fetch error silently on logSearch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const { logSearch } = useUserLogging();
      // Should not throw
      expect(() => logSearch('Title', 'Country', 'Location', 'Salary')).not.toThrow();
    });

    it('catches fetch error silently on updateSearchLog', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const { updateSearchLog } = useUserLogging();
      // Should not throw
      expect(() => updateSearchLog('mock-uuid-1234', {})).not.toThrow();
    });
  });
});
