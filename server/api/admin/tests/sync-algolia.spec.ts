import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type SyncAlgoliaHandler = (
  event: H3Event
) => Promise<{ success: boolean; count: number; message: string }>;

const mockReadBody = vi.fn();
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  createError: (err: Partial<H3Error>): Error => {
    const e = new Error(err.message) as Error & { statusCode?: number };
    e.statusCode = err.statusCode;
    return e;
  },
  isError: (e: unknown): boolean => e instanceof Error && 'statusCode' in e,
  readBody: mockReadBody
}));

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

let mockConfig: { algoliaAdminApiKey?: string; algoliaApplicationId?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

const mockSetSettings = vi.fn();
const mockSaveObjects = vi.fn();
const mockInitIndex = vi.fn(() => ({ setSettings: mockSetSettings, saveObjects: mockSaveObjects }));
vi.mock('algoliasearch', () => ({
  default: vi.fn(() => ({ initIndex: mockInitIndex }))
}));

describe('admin sync-algolia endpoint', () => {
  let handler: SyncAlgoliaHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    mockConfig = { algoliaAdminApiKey: 'admin_key', algoliaApplicationId: 'app_id' };
    const mod = await import('../sync-algolia.post');
    handler = mod.default as unknown as SyncAlgoliaHandler;

    mockReadBody.mockResolvedValue({
      data: [{ objectID: '1', title: 'Engineer' }],
      indexName: 'salary_benchmarks'
    });
    mockSetSettings.mockResolvedValue(undefined);
    mockSaveObjects.mockResolvedValue({ objectIDs: ['1'] });
  });

  it('rejects a non-array data payload', async () => {
    mockReadBody.mockResolvedValue({ data: 'not-an-array', indexName: 'salary_benchmarks' });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid data format');
  });

  it('fails with a 500 when Algolia credentials are missing from the environment', async () => {
    mockConfig = { algoliaApplicationId: 'app_id' };
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Search index credentials are not configured.');
  });

  it('syncs data and returns the saved object count', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({
      success: true,
      count: 1,
      message: "Synced 1 records to Algolia index 'salary_benchmarks'"
    });
  });

  it('requires an admin before touching the index', async () => {
    mockVerifyAdmin.mockRejectedValueOnce(new Error('Forbidden'));

    await expect(handler({} as unknown as H3Event)).rejects.toThrow('Forbidden');
    expect(mockSaveObjects).not.toHaveBeenCalled();
  });

  it('rejects an index outside the allow-list', async () => {
    mockReadBody.mockResolvedValue({ data: [], indexName: 'search_history' });

    await expect(handler({} as unknown as H3Event)).rejects.toThrow('Invalid search index');
    expect(mockInitIndex).not.toHaveBeenCalled();
  });

  it('ranks newer data years first so year-agnostic lookups get the latest year', async () => {
    await handler({} as unknown as H3Event);

    expect(mockSetSettings).toHaveBeenCalledWith(
      expect.objectContaining({ customRanking: ['desc(year)'] })
    );
  });

  it('wraps a saveObjects failure in an opaque 500 without leaking the underlying error message', async () => {
    mockSaveObjects.mockRejectedValueOnce(new Error('quota exceeded'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Error syncing search index');
  });
});
