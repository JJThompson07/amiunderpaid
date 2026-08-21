import type { H3Event } from 'h3';

// In-memory rate limiting cache, bounded via pruneExpiredEntries below.
// Deployed on Vercel (single project, no multi-instance store yet): limits are
// per-instance, so under multi-instance routing the effective limit is looser
// than MAX_REQUESTS suggests. Tracked as a follow-up rather than implemented
// now — see openspec/changes/fix-rate-limiter-bypass/tasks.md section 4.
const rateLimits = new Map<string, { count: number; lastReset: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window

const ROUTE_LIMITS: { route: string; maxRequests: number }[] = [
  { route: '/api/user/leads/submit', maxRequests: 5 },
  { route: '/api/user/recruiter/request-access', maxRequests: 5 },
  { route: '/api/user/suggestion', maxRequests: 10 },
  { route: '/api/user/track-search', maxRequests: 30 }
];

// Vercel overwrites this header at its edge and never forwards a client-supplied
// value (see https://vercel.com/docs/headers/request-headers#x-forwarded-for), so
// x-forwarded-for is not actually spoofable in this deployment today. We read
// x-vercel-forwarded-for specifically as defense-in-depth: unlike x-forwarded-for,
// Vercel guarantees it stays trustworthy even if a proxy/WAF is later added in
// front of Vercel. Falls back to the standard header for local dev, where neither
// Vercel header exists.
const getClientIP = (event: H3Event): string => {
  const vercelForwardedFor = getRequestHeader(event, 'x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0]?.trim() || 'unknown-ip';
  }
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown-ip';
};

// Sweeps every key, not just the one being written, so an attacker (or burst of
// distinct one-off clients) can't leave a trail of dead entries that are never
// revisited and therefore never pruned by the per-key reset-on-expiry logic.
const pruneExpiredEntries = (now: number): void => {
  for (const [key, record] of rateLimits) {
    if (now - record.lastReset > WINDOW_MS) {
      rateLimits.delete(key);
    }
  }
};

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;

  // Security Remediation: Rate limit unauthenticated public write endpoints
  const matchedRoute = ROUTE_LIMITS.find((r) => path.startsWith(r.route));

  if (!matchedRoute) {
    return;
  }

  const ip = getClientIP(event);
  const now = Date.now();
  const key = `${ip}:${matchedRoute.route}`;

  pruneExpiredEntries(now);

  const record = rateLimits.get(key);

  // If no record exists or the window has expired, reset the counter
  if (!record || now - record.lastReset > WINDOW_MS) {
    rateLimits.set(key, { count: 1, lastReset: now });
    return;
  }

  // If this IP has exceeded the limit for this specific route, reject the request
  if (record.count >= matchedRoute.maxRequests) {
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' });
  }

  // Otherwise, increment the counter
  record.count += 1;
});
