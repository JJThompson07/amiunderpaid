import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

const mockGetRequestURL = vi.fn();
const mockSendRedirect = vi.fn();
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  getRequestURL: (...args: unknown[]): unknown => mockGetRequestURL(...args),
  sendRedirect: (...args: unknown[]): unknown => mockSendRedirect(...args)
}));

type FaviconHandler = (event: H3Event) => Promise<unknown>;

describe('server/routes/favicon.ico', () => {
  let handler: FaviconHandler;

  beforeEach(async () => {
    vi.clearAllMocks();
    if (!handler) {
      const mod = await import('../favicon.ico');
      handler = mod.default as unknown as FaviconHandler;
    }
  });

  it('redirects to the Benchmark-specific favicon on the benchmarkmyrole domain', async () => {
    mockGetRequestURL.mockReturnValue({ hostname: 'www.benchmarkmyrole.com' });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockSendRedirect).toHaveBeenCalledWith(event, '/benchmarkmyrole-favicon.ico', 301);
  });

  it('redirects to the default AmIUnderpaid favicon on any other domain', async () => {
    mockGetRequestURL.mockReturnValue({ hostname: 'www.amiunderpaid.com' });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockSendRedirect).toHaveBeenCalledWith(event, '/amiunderpaid-favicon.ico', 301);
  });
});
