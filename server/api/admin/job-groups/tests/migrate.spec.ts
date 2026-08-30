import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type MigrateHandler = (event: H3Event) => Promise<{ success: boolean; count: number }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

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
    vi.stubEnv('ALGOLIA_APPLICATION_ID', 'app_id');
    vi.stubEnv('ALGOLIA_ADMIN_KEY', 'admin_key');
    const mod = await import('../migrate');
    handler = mod.default as unknown as MigrateHandler;

    mockReadBody.mockResolvedValue({ country: 'UK' });
    mockSetSettings.mockResolvedValue(undefined);
    mockReplaceAllObjects.mockResolvedValue({ objectIDs: ['2136'] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires a country in the request body', async () => {
    mockReadBody.mockResolvedValue({});
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Country is missing from request body');
  });

  it('fails with a 500 when Algolia credentials are missing from the environment', async () => {
    vi.stubEnv('ALGOLIA_APPLICATION_ID', '');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Algolia credentials missing from .env variables');
  });

  it('fails when the Firestore collection is empty', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('No documents found in Firestore collection: uk_job_groups');
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

  it('wraps an Algolia push failure in a 500', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: '2136', data: () => ({ group_name: 'Software Devs', titles: ['engineer'] }) }]
    });
    mockReplaceAllObjects.mockRejectedValueOnce(new Error('algolia down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('algolia down');
  });
});
