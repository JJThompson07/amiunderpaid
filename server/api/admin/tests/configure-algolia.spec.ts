import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type ConfigureAlgoliaHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

let mockConfig: { algoliaApplicationId?: string; algoliaAdminApiKey?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockSetSettings = vi.fn();
const mockInitIndex = vi.fn(() => ({ setSettings: mockSetSettings }));
vi.mock('algoliasearch', () => ({
  default: vi.fn(() => ({ initIndex: mockInitIndex }))
}));

describe('admin configure-algolia endpoint', () => {
  let handler: ConfigureAlgoliaHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../configure-algolia.post');
    handler = mod.default as unknown as ConfigureAlgoliaHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockConfig = { algoliaApplicationId: 'app_id', algoliaAdminApiKey: 'admin_key' };
    mockReadBody.mockResolvedValue({});
    mockSetSettings.mockResolvedValue(undefined);
  });

  it('defaults to the job_titles index when indexName is omitted', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockInitIndex).toHaveBeenCalledWith('job_titles');
  });

  it('fails with a 500 when Algolia credentials are missing', async () => {
    mockConfig = {};
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Search service is misconfigured.');
  });

  it('wraps a setSettings failure in an opaque 500', async () => {
    mockSetSettings.mockRejectedValueOnce(new Error('algolia down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to configure search index.');
  });
});
