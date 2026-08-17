// In-memory rate limiting cache
// For a multi-instance deployment, this should be moved to Redis or a shared store.
const rateLimits = new Map<string, { count: number; lastReset: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 10; // Max requests per window per IP

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  
  // Security Remediation: Rate limit unauthenticated public write endpoints
  const protectedRoutes = [
    '/api/user/leads/submit',
    '/api/user/recruiter/request-access',
    '/api/user/suggestion',
    '/api/user/track-search'
  ];

  if (!protectedRoutes.some(route => path.startsWith(route))) {
    return;
  }

  // Get client IP, fallback to generic if unable to determine
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown-ip';
  const now = Date.now();

  const record = rateLimits.get(ip);
  
  // If no record exists or the window has expired, reset the counter
  if (!record || now - record.lastReset > WINDOW_MS) {
    rateLimits.set(ip, { count: 1, lastReset: now });
    return;
  }

  // If the IP has exceeded the limit, reject the request
  if (record.count >= MAX_REQUESTS) {
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' });
  }

  // Otherwise, increment the counter
  record.count += 1;
});
