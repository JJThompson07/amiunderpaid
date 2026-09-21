import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import type { PurgeSummary } from '../../../utils/cachePurge';

type CronHandler = (event: H3Event) => Promise<PurgeSummary>;

const mockConfig: { cronSecret: string | undefined; resendApiKey: string | undefined } = {
  cronSecret: 'cron-secret-123',
  resendApiKey: 're_test_123'
};
const getHeaderMock = vi.fn();

vi.stubGlobal('defineEventHandler', (fn: CronHandler) => fn);
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('getHeader', getHeaderMock);
vi.stubGlobal('createError', (err: { statusCode?: number; statusMessage?: string }) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const { mockResendSend, mockPurgeExpiredCache } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
  mockPurgeExpiredCache: vi.fn()
}));

vi.mock('resend', () => ({
  Resend: class Resend {
    emails = { send: mockResendSend };
  }
}));

vi.mock('../../../utils/cachePurge', () => ({
  purgeExpiredCache: mockPurgeExpiredCache
}));

let cronHandler: CronHandler;

const emptySummary: PurgeSummary = { deletedJobs: 0, deletedDistributions: 0 };

describe('cron/clean-cache', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfig.cronSecret = 'cron-secret-123';
    mockConfig.resendApiKey = 're_test_123';
    getHeaderMock.mockReturnValue('Bearer cron-secret-123');
    mockResendSend.mockResolvedValue({ id: 'email-1' });
    mockPurgeExpiredCache.mockResolvedValue(emptySummary);
    if (!cronHandler) {
      cronHandler = (await import('../clean-cache.get')).default;
    }
  });

  it('errors out with 500 if CRON_SECRET is not configured', async () => {
    mockConfig.cronSecret = undefined;

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Cron purge is misconfigured.');
    expect(mockPurgeExpiredCache).not.toHaveBeenCalled();
  });

  it('rejects a request with no authorization header at all', async () => {
    getHeaderMock.mockReturnValue(undefined);

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Unauthorized');
    expect(mockPurgeExpiredCache).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer token', async () => {
    getHeaderMock.mockReturnValue('Bearer wrong-secret');

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Unauthorized');
    expect(mockPurgeExpiredCache).not.toHaveBeenCalled();
  });

  it('rejects a same-length bearer token that still does not match, exercising the timing-safe branch', async () => {
    getHeaderMock.mockReturnValue('Bearer wrong-secret-99');

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Unauthorized');
    expect(mockPurgeExpiredCache).not.toHaveBeenCalled();
  });

  it('runs the purge and emails a summary on a successful invocation', async () => {
    const summary: PurgeSummary = { deletedJobs: 5, deletedDistributions: 2 };
    mockPurgeExpiredCache.mockResolvedValue(summary);

    const result = await cronHandler({} as H3Event);

    expect(result).toEqual(summary);
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@amiunderpaid.com',
        from: 'alerts@amiunderpaid.com',
        subject: 'Cache purge: 7 deleted',
        text: expect.stringContaining('Deleted distributions: 2')
      })
    );
  });

  it('does not throw and skips the email if RESEND_API_KEY is missing', async () => {
    mockConfig.resendApiKey = undefined;

    const result = await cronHandler({} as H3Event);

    expect(result).toEqual(emptySummary);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('emails a crash notice and rethrows when the purge itself throws', async () => {
    mockPurgeExpiredCache.mockRejectedValue(new Error('Firestore unavailable'));

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Firestore unavailable');

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '🚨 Cache purge crashed',
        text: expect.stringContaining('Firestore unavailable')
      })
    );
  });

  it('rethrows without emailing when the purge crashes and RESEND_API_KEY is missing', async () => {
    mockConfig.resendApiKey = undefined;
    mockPurgeExpiredCache.mockRejectedValue(new Error('Firestore unavailable'));

    await expect(cronHandler({} as H3Event)).rejects.toThrow('Firestore unavailable');
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});
