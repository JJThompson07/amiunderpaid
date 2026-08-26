import { runIndustryTrendsSync } from '../../utils/industryTrendsSync';

// Triggered by Vercel Cron (see vercel.json), which always sends GET and
// carries no Firebase session -- so this route lives outside /api/admin/
// (exempt from admin-guard.ts's blanket verifyAdmin check) and authenticates
// via CRON_SECRET instead, matching Vercel's own documented pattern: Vercel
// automatically sends the CRON_SECRET env var value as `Authorization: Bearer
// <value>` when it invokes a cron job.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const expected = config.cronSecret;

  if (!expected) {
    throw createError({ statusCode: 500, statusMessage: 'Cron sync is misconfigured.' });
  }

  const authHeader = getHeader(event, 'authorization');
  if (authHeader !== `Bearer ${expected}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Always a monthly delta here (months=1), never a 12-month backfill -- the
  // one-time historical backfill is a manual admin action via sync-trends.post.ts.
  return await runIndustryTrendsSync(1);
});
