import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type TitleDeleteHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockUpdate = vi.fn();
const mockCollection = vi.fn(() => ({ doc: vi.fn(() => ({ update: mockUpdate })) }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection })),
  FieldValue: { arrayRemove: vi.fn((v: string) => `ARRAY_REMOVE(${v})`) }
}));

describe('admin job-groups/title (delete) endpoint', () => {
  let handler: TitleDeleteHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../title.delete');
    handler = mod.default as unknown as TitleDeleteHandler;

    mockReadBody.mockResolvedValue({ country: 'UK', idCode: '2136', titleToRemove: 'engineer' });
    mockUpdate.mockResolvedValue(undefined);
  });

  it('removes the title from the UK collection', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockCollection).toHaveBeenCalledWith('uk_job_groups');
    expect(mockUpdate).toHaveBeenCalledWith({ titles: 'ARRAY_REMOVE(engineer)' });
  });

  it('routes to the usa collection for USA', async () => {
    mockReadBody.mockResolvedValue({ country: 'USA', idCode: '15-1252', titleToRemove: 'dev' });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockCollection).toHaveBeenCalledWith('usa_job_groups');
  });

  it('wraps a Firestore failure in an opaque 500', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to remove title');
  });
});
