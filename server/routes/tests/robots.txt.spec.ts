import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

const mockGetRequestURL = vi.fn();
const mockSetHeader = vi.fn();
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  getRequestURL: (...args: unknown[]): unknown => mockGetRequestURL(...args),
  setHeader: (...args: unknown[]): unknown => mockSetHeader(...args)
}));

type RobotsHandler = (event: H3Event) => string;

describe('server/routes/robots.txt', () => {
  let handler: RobotsHandler;

  beforeEach(async () => {
    vi.clearAllMocks();
    if (!handler) {
      const mod = await import('../robots.txt');
      handler = mod.default as unknown as RobotsHandler;
    }
    mockGetRequestURL.mockReturnValue({ origin: 'https://amiunderpaid.com' });
  });

  it('sets the text/plain content type header', () => {
    const event = {} as unknown as H3Event;

    handler(event);

    expect(mockSetHeader).toHaveBeenCalledWith(event, 'Content-Type', 'text/plain; charset=utf-8');
  });

  it('blocks admin, recruiter, auth, and _nuxt paths and links the origin-scoped sitemap', () => {
    const event = {} as unknown as H3Event;

    const result = handler(event);

    expect(result).toContain('Disallow: /admin/');
    expect(result).toContain('Disallow: /recruiter/');
    expect(result).toContain('Disallow: /auth/');
    expect(result).toContain('Disallow: /_nuxt/');
    expect(result).toContain('Allow: /');
    expect(result).toContain('Sitemap: https://amiunderpaid.com/sitemap.xml');
  });
});
