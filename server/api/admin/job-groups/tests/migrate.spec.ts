import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type MigrateHandler = (event: H3Event) => Promise<{ success: boolean; count: number }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal('isError', (e: unknown) => e instanceof Error && 'statusCode' in e);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

let mockConfig: { algoliaApplicationId?: string; algoliaAdminApiKey?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

const mockGet = vi.fn();
const mockCollection = vi.fn(() => ({ get: mockGet }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

const mockSetSettings = vi.fn();
const mockReplaceAllObjects = vi.fn();
const mockInitIndex = vi.fn(() => ({
  setSettings: mockSetSettings,
  replaceAllObjects: mockReplaceAllObjects
}));
vi.mock('algoliasearch', () => ({
  default: vi.fn(() => ({ initIndex: mockInitIndex }))
}));

describe('admin job-groups/migrate (Algolia sync) endpoint', () => {
  let handler: MigrateHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    mockConfig = { algoliaApplicationId: 'app_id', algoliaAdminApiKey: 'admin_key' };
    const mod = await import('../migrate');
    handler = mod.default as unknown as MigrateHandler;

    mockReadBody.mockResolvedValue({ country: 'UK' });
    mockSetSettings.mockResolvedValue(undefined);
    mockReplaceAllObjects.mockResolvedValue({ objectIDs: ['2136'] });
  });

  it('requires a country in the request body', async () => {
    mockReadBody.mockResolvedValue({});
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Country is missing from request body');
  });

  it('fails with a 500 when Algolia credentials are missing from the environment', async () => {
    mockConfig = { algoliaAdminApiKey: 'admin_key' };
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Search index credentials are not configured.');
  });

  it('fails when the Firestore collection is empty', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('No job group records found to sync.');
  });

  it('chunks a group with more than 200 titles across multiple Algolia records', async () => {
    const manyTitles = Array.from({ length: 250 }, (_, i) => `title-${i}`);
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: '2136', data: () => ({ group_name: 'Software Devs', titles: manyTitles }) }]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.success).toBe(true);
    expect(mockReplaceAllObjects).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ objectID: '2136', gov_id: '2136' }),
        expect.objectContaining({ objectID: '2136_chunk_1', gov_id: '2136' })
      ]),
      { safe: true }
    );
  });

  it('pushes a group with an empty titles array as a single record', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: '9999', data: () => ({ group_name: 'Empty Group', titles: [] }) }]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, count: 1 });
  });

  it('wraps an Algolia push failure in an opaque 500 without leaking the underlying error message', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: '2136', data: () => ({ group_name: 'Software Devs', titles: ['engineer'] }) }]
    });
    mockReplaceAllObjects.mockRejectedValueOnce(new Error('algolia down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to sync job groups to search index.');
  });
});
