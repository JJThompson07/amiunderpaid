import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import type { SyncSummary } from '../../../utils/industryTrendsSync';

type CronHandler = (event: H3Event) => Promise<SyncSummary>;

const mockConfig: { cronSecret: string | undefined; resendApiKey: string | undefined } = {
  cronSecret: 'cron-secret-123',
  resendApiKey: 're_test_123'
};
const getHeaderMock = vi.fn();

vi.stubGlobal('defineEventHandler', (fn: CronHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('getHeader', getHeaderMock);
vi.stubGlobal(
  'createError',
  (err: { statusCode?: number; statusMessage?: string }) => new Error(err.statusMessage)
);

const { mockResendSend, mockRunIndustryTrendsSync } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
  mockRunIndustryTrendsSync: vi.fn()
}));

vi.mock('resend', () => ({
  Resend: class Resend {
    emails = { send: mockResendSend };
  }
}));

vi.mock('../../../utils/industryTrendsSync', () => ({
  runIndustryTrendsSync: mockRunIndustryTrendsSync
}));

let cronHandler: CronHandler;

describe('cron/sync-trends', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfig.cronSecret = 'cron-secret-123';
    mockConfig.resendApiKey = 're_test_123';
    getHeaderMock.mockReturnValue('Bearer cron-secret-123');
    mockResendSend.mockResolvedValue({ id: 'email-1' });
    if (!cronHandler) {
      cronHandler = (await import('../sync-trends.get')).default;
    }
  });

  it('rejects a request with the wrong bearer token', async () => {
    getHeaderMock.mockReturnValue('Bearer wrong-secret');

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Unauthorized');
    expect(mockRunIndustryTrendsSync).not.toHaveBeenCalled();
  });

  it('rejects a same-length bearer token that still does not match', async () => {
    // Exercises the timingSafeEqual() branch itself (not just the fast
    // length-mismatch return) -- "wrong-secret-99" is deliberately the same
    // length as the configured "cron-secret-123".
    getHeaderMock.mockReturnValue('Bearer wrong-secret-99');

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Unauthorized');
    expect(mockRunIndustryTrendsSync).not.toHaveBeenCalled();
  });

  it('rejects a request with no authorization header at all', async () => {
    getHeaderMock.mockReturnValue(undefined);

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Unauthorized');
    expect(mockRunIndustryTrendsSync).not.toHaveBeenCalled();
  });

  it('errors out if CRON_SECRET is not configured', async () => {
    mockConfig.cronSecret = undefined;

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Cron sync is misconfigured.');
  });

  it('emails a success summary including newly synced data on a clean run', async () => {
    const summary: SyncSummary = {
      success: true,
      months: 2,
      synced: 1,
      failed: 0,
      results: [
        {
          categoryTag: 'it-jobs',
          country: 'gb',
          status: 'ok',
          label: 'IT Jobs',
          latestMonth: '2026-07',
          latestAverage: 65000
        }
      ]
    };
    mockRunIndustryTrendsSync.mockResolvedValue(summary);

    const result = await cronHandler({} as H3Event);

    expect(result).toEqual(summary);
    // Locks in the fix for the real bug this test suite didn't catch: months=1
    // returns an empty {} from Adzuna's live /history endpoint, so the cron
    // must request at least 2 months to actually get new data back.
    expect(mockRunIndustryTrendsSync).toHaveBeenCalledWith(2);
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@amiunderpaid.com',
        from: 'alerts@amiunderpaid.com',
        subject: 'Industry trends sync: 1 synced, 0 failed',
        text: expect.stringContaining('IT Jobs (gb): £65,000 for 2026-07')
      })
    );
  });

  it('emails a failure summary including the error message and still returns the summary', async () => {
    const summary: SyncSummary = {
      success: true,
      months: 2,
      synced: 0,
      failed: 1,
      results: [
        {
          categoryTag: 'it-jobs',
          country: 'gb',
          status: 'error',
          label: 'IT Jobs',
          error: 'Adzuna request failed'
        }
      ]
    };
    mockRunIndustryTrendsSync.mockResolvedValue(summary);

    const result = await cronHandler({} as H3Event);

    expect(result).toEqual(summary);
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '⚠️ Industry trends sync: 1 failed, 0 synced',
        text: expect.stringContaining('IT Jobs (gb): Adzuna request failed')
      })
    );
  });

  it('emails a crash notice and rethrows when the sync itself throws', async () => {
    mockRunIndustryTrendsSync.mockRejectedValue(new Error('Firestore unavailable'));

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Firestore unavailable');

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '🚨 Industry trends sync crashed',
        text: expect.stringContaining('Firestore unavailable')
      })
    );
  });

  it('does not throw if RESEND_API_KEY is missing, just skips the email', async () => {
    mockConfig.resendApiKey = undefined;
    mockRunIndustryTrendsSync.mockResolvedValue({
      success: true,
      months: 2,
      synced: 0,
      failed: 0,
      results: []
    });

    const result = await cronHandler({} as H3Event);

    expect(result.synced).toBe(0);
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});
