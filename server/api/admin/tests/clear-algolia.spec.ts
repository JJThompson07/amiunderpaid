import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type ClearAlgoliaHandler = (event: H3Event) => Promise<{ success: boolean }>;

const mockReadBody = vi.fn();
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  createError: (err: Partial<H3Error>): Error => {
    const e = new Error(err.message) as Error & { statusCode?: number };
    e.statusCode = err.statusCode;
    return e;
  },
  readBody: mockReadBody
}));

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

let mockConfig: { algoliaApplicationId?: string; algoliaAdminApiKey?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

const mockDeleteBy = vi.fn();
const mockInitIndex = vi.fn(() => ({ deleteBy: mockDeleteBy }));
vi.mock('algoliasearch', () => ({
  default: vi.fn(() => ({ initIndex: mockInitIndex }))
}));

describe('admin clear-algolia endpoint', () => {
  let handler: ClearAlgoliaHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../clear-algolia.post');
    handler = mod.default as unknown as ClearAlgoliaHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockConfig = { algoliaApplicationId: 'app_id', algoliaAdminApiKey: 'admin_key' };
    mockReadBody.mockResolvedValue({ indexName: 'job_titles', filters: 'country:UK' });
    mockDeleteBy.mockResolvedValue(undefined);
  });

  it('requires both indexName and filters', async () => {
    mockReadBody.mockResolvedValue({ indexName: 'job_titles' });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing indexName or filters');
  });

  it('fails with a 500 when Algolia credentials are missing', async () => {
    mockConfig = {};
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Search service is misconfigured.');
  });

  it('deletes matching records from the index on success', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockInitIndex).toHaveBeenCalledWith('job_titles');
    expect(mockDeleteBy).toHaveBeenCalledWith({ filters: 'country:UK' });
  });

  it('wraps an Algolia deleteBy failure in an opaque 500', async () => {
    mockDeleteBy.mockRejectedValueOnce(new Error('algolia down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to clear search index.');
  });
});
