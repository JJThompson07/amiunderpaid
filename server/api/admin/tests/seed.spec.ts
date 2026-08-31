import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type SeedHandler = (event: H3Event) => Promise<{ success: boolean; count: number }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockBatchSeed = vi.fn();
vi.stubGlobal('batchSeed', mockBatchSeed);

describe('admin seed endpoint', () => {
  let handler: SeedHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../seed.post');
    handler = mod.default as unknown as SeedHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockBatchSeed.mockResolvedValue(3);
  });

  it('rejects a collection name outside the allow-list', async () => {
    mockReadBody.mockResolvedValue({ collectionName: 'not_allowed', data: [] });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid seed target');
    expect(mockBatchSeed).not.toHaveBeenCalled();
  });

  it('seeds an allow-listed collection and returns the written count', async () => {
    mockReadBody.mockResolvedValue({ collectionName: 'job_titles', data: [{ title: 'Engineer' }] });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, count: 3 });
    expect(mockBatchSeed).toHaveBeenCalledWith('job_titles', [{ title: 'Engineer' }]);
  });

  it('enforces admin authorization', async () => {
    mockVerifyAdmin.mockRejectedValueOnce(new Error('Forbidden'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Forbidden');
  });
});
