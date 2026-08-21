import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

import type RateLimitHandler from '../rate-limit';

type MockEvent = H3Event & { ip?: string; headers?: Record<string, string> };

vi.stubGlobal(
  'defineEventHandler',
  (fn: (event: MockEvent) => void): ((event: MockEvent) => void) => fn
);
vi.stubGlobal('getRequestURL', (event: MockEvent) => new URL(event.path, 'http://localhost'));
vi.stubGlobal('getRequestIP', (event: MockEvent) => event.ip);
vi.stubGlobal(
  'getRequestHeader',
  (event: MockEvent, name: string) => event.headers?.[name.toLowerCase()]
);
vi.stubGlobal('createError', (err: { statusMessage?: string }) => new Error(err.statusMessage));

const makeEvent = (
  path: string,
  opts: { ip?: string; headers?: Record<string, string> }
): H3Event => ({ path, ip: opts.ip, headers: opts.headers }) as unknown as H3Event;

describe('Rate Limit Middleware', () => {
  let handler: typeof RateLimitHandler;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();
    const mod = await import('../rate-limit');
    handler = mod.default;
  });

  it('should allow requests to unprotected routes', () => {
    const event = makeEvent('/api/public/data', { ip: '1.2.3.4' });

    for (let i = 0; i < 20; i++) {
      expect(() => handler(event)).not.toThrow();
    }
  });

  it('should allow up to the route limit for a tightly-limited route', () => {
    const event = makeEvent('/api/user/leads/submit', { ip: '1.2.3.5' });

    for (let i = 0; i < 5; i++) {
      expect(() => handler(event)).not.toThrow();
    }
  });

  it('should block the request past the limit for a tightly-limited route', () => {
    const event = makeEvent('/api/user/recruiter/request-access', { ip: '1.2.3.6' });

    for (let i = 0; i < 5; i++) {
      expect(() => handler(event)).not.toThrow();
    }

    expect(() => handler(event)).toThrow('Too Many Requests');
  });

  it('should reset the limit after the window expires', () => {
    const event = makeEvent('/api/user/suggestion', { ip: '1.2.3.7' });

    for (let i = 0; i < 10; i++) {
      expect(() => handler(event)).not.toThrow();
    }

    expect(() => handler(event)).toThrow('Too Many Requests');

    vi.advanceTimersByTime(61000);

    expect(() => handler(event)).not.toThrow();
  });

  it('should fallback to unknown-ip if getRequestIP returns undefined', () => {
    const event = makeEvent('/api/user/track-search', { ip: undefined });

    for (let i = 0; i < 30; i++) {
      expect(() => handler(event)).not.toThrow();
    }

    expect(() => handler(event)).toThrow('Too Many Requests');
  });

  it('should not share a budget between two different routes for the same IP', () => {
    const searchEvent = makeEvent('/api/user/track-search', { ip: '1.2.3.8' });
    const submitEvent = makeEvent('/api/user/leads/submit', { ip: '1.2.3.8' });

    // Exhaust track-search's (generous) budget
    for (let i = 0; i < 30; i++) {
      expect(() => handler(searchEvent)).not.toThrow();
    }
    expect(() => handler(searchEvent)).toThrow('Too Many Requests');

    // The same IP hitting a different route still has its own, untouched budget
    for (let i = 0; i < 5; i++) {
      expect(() => handler(submitEvent)).not.toThrow();
    }
    expect(() => handler(submitEvent)).toThrow('Too Many Requests');
  });

  it('should key on x-vercel-forwarded-for rather than a spoofable header', () => {
    const event = makeEvent('/api/user/leads/submit', {
      headers: { 'x-vercel-forwarded-for': '9.9.9.9' }
    });

    for (let i = 0; i < 5; i++) {
      expect(() => handler(event)).not.toThrow();
    }
    expect(() => handler(event)).toThrow('Too Many Requests');
  });

  it('should not let a spoofed x-forwarded-for value reset the count when x-vercel-forwarded-for is present', () => {
    const trueIP = '9.9.9.9';

    for (let i = 0; i < 5; i++) {
      const event = makeEvent('/api/user/leads/submit', {
        // A client could set a fresh x-forwarded-for per request...
        headers: {
          'x-vercel-forwarded-for': trueIP,
          'x-forwarded-for': `spoofed-${i}`
        }
      });
      expect(() => handler(event)).not.toThrow();
    }

    // ...but since x-vercel-forwarded-for is read first, the true IP's count still hits the limit
    const event = makeEvent('/api/user/leads/submit', {
      headers: { 'x-vercel-forwarded-for': trueIP, 'x-forwarded-for': 'spoofed-final' }
    });
    expect(() => handler(event)).toThrow('Too Many Requests');
  });
});
