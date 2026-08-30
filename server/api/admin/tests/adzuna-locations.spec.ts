import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import { FetchError } from 'ofetch';

type AdzunaLocationsHandler = (event: H3Event) => Promise<{
  country: string;
  regionsFromSearch: string[];
  regionsFromGeodata: string[];
  totalSearchResults: number;
}>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

let mockConfig: { adzunaAppId?: string; adzunaAppKey?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

let mockQuery: Record<string, string>;
vi.stubGlobal('getQuery', () => mockQuery);

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('admin adzuna-locations endpoint', () => {
  let handler: AdzunaLocationsHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../adzuna-locations.get');
    handler = mod.default as unknown as AdzunaLocationsHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockConfig = { adzunaAppId: 'app_id', adzunaAppKey: 'app_key' };
    mockQuery = {};
  });

  it('fails with a 500 when Adzuna credentials are missing', async () => {
    mockConfig = {};
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Market data service is misconfigured.');
  });

  it('defaults to gb and merges regions from search + geodata', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('geodata')) {
        return Promise.resolve([{ location: { area: ['UK', 'London'], display_name: 'London' } }]);
      }
      return Promise.resolve({ results: [{ location: { area: ['UK', 'Manchester'] } }] });
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.country).toBe('gb');
    // regionsFromSearch merges both the search-result and geodata regions into one Set
    expect(res.regionsFromSearch).toEqual(['London', 'Manchester']);
    expect(res.regionsFromGeodata).toEqual(['London']);
    expect(res.totalSearchResults).toBe(1);
  });

  it('maps a usa query param to the us target country', async () => {
    mockQuery = { country: 'usa' };
    mockFetch.mockResolvedValue({ results: [] });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.country).toBe('us');
  });

  it('tolerates the geodata endpoint failing independently', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('geodata')) {
        return Promise.reject(new Error('geodata unavailable'));
      }
      return Promise.resolve({ results: [] });
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.regionsFromGeodata).toEqual([]);
  });

  it('maps a 429 provider error to an opaque 503', async () => {
    const err = Object.assign(new FetchError('rate limited'), { response: { status: 429 } });
    mockFetch.mockRejectedValueOnce(err);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Market data temporarily unavailable.');
  });

  it('maps a generic failure to a 500', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Market data temporarily unavailable.');
  });
});
