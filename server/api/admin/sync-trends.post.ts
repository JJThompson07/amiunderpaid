import { runIndustryTrendsSync } from '../../utils/industryTrendsSync';

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  // months=1 returns an empty {} from Adzuna's /history endpoint every time
  // (confirmed live against the real API) -- 2 is the smallest value that
  // actually returns data, so that's the default for a non-backfill sync.
  const body = await readBody<{ months?: number }>(event).catch(() => ({}) as { months?: number });
  const months = body?.months === 12 ? 12 : 2;

  return await runIndustryTrendsSync(months);
});
