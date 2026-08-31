import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type DeleteHandler = (event: H3Event) => Promise<{ success: boolean; count: number }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockBatchDelete = vi.fn();
vi.stubGlobal('batchDelete', mockBatchDelete);

describe('admin delete endpoint', () => {
  let handler: DeleteHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../delete.post');
    handler = mod.default as unknown as DeleteHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockReadBody.mockResolvedValue({
      collectionName: 'adzuna_jobs_cache',
      filters: { country: 'gb' }
    });
    mockBatchDelete.mockResolvedValue(5);
  });

  it('rejects a collection name outside the allow-list', async () => {
    mockReadBody.mockResolvedValue({ collectionName: 'users', filters: { a: 1 } });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid or restricted collection name');
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  it('rejects an empty filters object to prevent a full collection wipe', async () => {
    mockReadBody.mockResolvedValue({ collectionName: 'adzuna_jobs_cache', filters: {} });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow(
      'Filters are required to prevent full collection wipe'
    );
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  it('deletes matching documents and returns the count', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, count: 5 });
    expect(mockBatchDelete).toHaveBeenCalledWith('adzuna_jobs_cache', { country: 'gb' });
  });
});
