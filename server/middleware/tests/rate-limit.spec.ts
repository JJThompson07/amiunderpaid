import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

vi.stubGlobal('defineEventHandler', (fn: any) => fn);
vi.stubGlobal('getRequestURL', (event: any) => new URL(event.path, 'http://localhost'));
vi.stubGlobal('getRequestIP', (event: any) => event.ip);
vi.stubGlobal('createError', (err: any) => new Error(err.statusMessage));

describe('Rate Limit Middleware', () => {
  let handler: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const mod = await import('../rate-limit');
    handler = mod.default;
  });

  it('should allow requests to unprotected routes', () => {
    const event = { path: '/api/public/data', ip: '1.2.3.4' } as unknown as H3Event;

    // Call it many times, it shouldn't throw
    for (let i = 0; i < 20; i++) {
      expect(() => handler(event)).not.toThrow();
    }
  });

  it('should allow up to 10 requests to protected routes within the window', () => {
    const event = { path: '/api/user/leads/submit', ip: '1.2.3.5' } as unknown as H3Event;

    for (let i = 0; i < 10; i++) {
      expect(() => handler(event)).not.toThrow();
    }
  });

  it('should block the 11th request to protected routes within the window', () => {
    const event = {
      path: '/api/user/recruiter/request-access',
      ip: '1.2.3.6'
    } as unknown as H3Event;

    // First 10 succeed
    for (let i = 0; i < 10; i++) {
      expect(() => handler(event)).not.toThrow();
    }

    // 11th should throw
    expect(() => handler(event)).toThrow('Too Many Requests');
  });

  it('should reset the limit after the window expires', () => {
    const event = { path: '/api/user/suggestion', ip: '1.2.3.7' } as unknown as H3Event;

    // First 10 succeed
    for (let i = 0; i < 10; i++) {
      expect(() => handler(event)).not.toThrow();
    }

    // 11th throws
    expect(() => handler(event)).toThrow('Too Many Requests');

    // Advance time by 61 seconds
    vi.advanceTimersByTime(61000);

    // Should succeed again
    expect(() => handler(event)).not.toThrow();
  });

  it('should fallback to unknown-ip if getRequestIP returns undefined', () => {
    const event = { path: '/api/user/track-search', ip: undefined } as unknown as H3Event;

    for (let i = 0; i < 10; i++) {
      expect(() => handler(event)).not.toThrow();
    }

    expect(() => handler(event)).toThrow('Too Many Requests');
  });
});
