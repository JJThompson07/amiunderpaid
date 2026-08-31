import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { runIndustryTrendsSync } from '../../../utils/industryTrendsSync';

type SyncTrendsHandler = (event: H3Event) => ReturnType<typeof runIndustryTrendsSync>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

vi.mock('../../../utils/industryTrendsSync', () => ({
  runIndustryTrendsSync: vi.fn()
}));

describe('admin sync-trends endpoint', () => {
  let handler: SyncTrendsHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../sync-trends.post');
    handler = mod.default as unknown as SyncTrendsHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    vi.mocked(runIndustryTrendsSync).mockResolvedValue({
      success: true,
      months: 1,
      synced: 1,
      failed: 0,
      results: []
    });
  });

  it('defaults to a 1-month sync when months is not exactly 12', async () => {
    mockReadBody.mockResolvedValue({});
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(runIndustryTrendsSync).toHaveBeenCalledWith(1);
  });

  it('runs a 12-month backfill when months is 12', async () => {
    mockReadBody.mockResolvedValue({ months: 12 });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(runIndustryTrendsSync).toHaveBeenCalledWith(12);
  });

  it('tolerates a missing/invalid request body', async () => {
    mockReadBody.mockRejectedValue(new Error('no body'));
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(runIndustryTrendsSync).toHaveBeenCalledWith(1);
  });
});
