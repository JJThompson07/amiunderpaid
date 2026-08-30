import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type CategoriesHandler = (event: H3Event) => Promise<unknown>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: { statusCode?: number; statusMessage?: string }) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

let mockConfig: { adzunaAppId?: string; adzunaAppKey?: string; public?: Record<string, string> };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

let mockQuery: Record<string, string>;
vi.stubGlobal('getQuery', () => mockQuery);

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('market-data categories endpoint', () => {
  let handler: CategoriesHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../categories');
    handler = mod.default as unknown as CategoriesHandler;

    mockConfig = { adzunaAppId: 'app_id', adzunaAppKey: 'app_key' };
    mockQuery = {};
  });

  it('fails with a 500 when Adzuna credentials are missing', async () => {
    mockConfig = {};
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Market data credentials are not configured.');
  });

  it('defaults to gb and returns the fetched categories', async () => {
    mockFetch.mockResolvedValue({ results: [{ tag: 'it-jobs', label: 'IT Jobs' }] });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ results: [{ tag: 'it-jobs', label: 'IT Jobs' }] });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/gb/categories'),
      expect.objectContaining({ params: expect.objectContaining({ app_id: 'app_id' }) })
    );
  });

  it('maps a usa query param to the us target country', async () => {
    mockQuery = { country: 'usa' };
    mockFetch.mockResolvedValue({ results: [] });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/us/categories'),
      expect.anything()
    );
  });

  it('wraps a rate-limited provider failure in an opaque 503 without leaking provider details', async () => {
    const err = Object.assign(new Error('rate limited'), {
      response: { status: 429 },
      data: { reason: 'rate limit' }
    });
    mockFetch.mockRejectedValueOnce(err);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Market data temporarily unavailable.');
  });

  it('wraps a generic provider failure in an opaque 503', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Market data temporarily unavailable.');
  });
});
